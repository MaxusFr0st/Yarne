using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.Auth;
using YarneAPIBack.Accounting.Services;
using YarneAPIBack.Accounting.Services.Contracts;
using YarneAPIBack.Services;
using YarneAPIBack.Services.Contracts;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddSimpleConsole(options =>
{
    options.TimestampFormat = "yyyy-MM-dd HH:mm:ss ";
});

// Railway injects PORT — always bind to it (healthcheck probes this exact port).
var listenPort = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{listenPort}");

// Database — never throw during service registration; bootstrap validates connectivity.
const string PendingDbConnection =
    "Host=127.0.0.1;Port=5432;Database=yarne_unconfigured;Username=postgres;Password=postgres;Timeout=2;Pooling=false";

builder.Services.AddDbContext<YarneDbContext>((sp, options) =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    var logger = sp.GetService<ILogger<YarneDbContext>>();
    var connectionString = RailwayDatabaseConfiguration.TryResolve(configuration, logger, out var resolved)
        ? resolved
        : PendingDbConnection;

    options.UseNpgsql(
        connectionString,
        npgsqlOptions => npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 10, maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null));
});

// JWT — bind config, then apply JWT_SECRET / Jwt__Secret for token generation (AuthService, OAuthService).
builder.Services.Configure<JwtSettings>(options =>
{
    builder.Configuration.GetSection(JwtSettings.SectionName).Bind(options);
    var legacyJwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET");
    if (!string.IsNullOrWhiteSpace(legacyJwtSecret))
        options.Secret = legacyJwtSecret;
});
var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
    ?? new JwtSettings();
builder.Configuration.GetSection(JwtSettings.SectionName).Bind(jwtSettings);
var jwtSecretOverride = Environment.GetEnvironmentVariable("JWT_SECRET");
if (!string.IsNullOrWhiteSpace(jwtSecretOverride))
    jwtSettings.Secret = jwtSecretOverride;
ProductionStartupValidator.Validate(builder.Environment, jwtSettings);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
            ClockSkew = TimeSpan.Zero,
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                // Prefer Authorization Bearer (tools / migration); else httpOnly cookie.
                var header = context.Request.Headers.Authorization.ToString();
                if (string.IsNullOrWhiteSpace(header)
                    || !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    if (context.Request.Cookies.TryGetValue(AuthCookie.Name, out var cookieToken)
                        && !string.IsNullOrWhiteSpace(cookieToken))
                    {
                        context.Token = cookieToken;
                    }
                }

                return Task.CompletedTask;
            },
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        if (context.Request.Path.StartsWithSegments("/healthz"))
            return RateLimitPartition.GetNoLimiter("healthz");

        var key = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: key,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true,
            });
    });
    options.AddPolicy("auth-login", context =>
    {
        var key = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: key,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 8,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true,
            });
    });
});

// Services (SOLID - dependency injection)
builder.Services.AddHttpClient();
builder.Services.AddScoped<IAccessTokenIssuer, AccessTokenIssuer>();
builder.Services.AddScoped<IRefreshTokenService, RefreshTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IOAuthService, OAuthService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IStorefrontSettingsService, StorefrontSettingsService>();
builder.Services.AddScoped<IAdminActivityLogService, AdminActivityLogService>();
builder.Services.AddScoped<IAccountingService, AccountingService>();
builder.Services.AddScoped<IAccountingPdfService, AccountingPdfService>();
builder.Services.AddSingleton<IEmailService>(sp =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    var provider = (configuration["EMAIL_PROVIDER"] ?? Environment.GetEnvironmentVariable("EMAIL_PROVIDER") ?? "smtp").Trim();

    if (provider.Equals("resend", StringComparison.OrdinalIgnoreCase))
    {
        var httpClientFactory = sp.GetRequiredService<IHttpClientFactory>();
        var logger = sp.GetRequiredService<ILogger<ResendEmailService>>();
        return new ResendEmailService(configuration, httpClientFactory, logger);
    }

    {
        var logger = sp.GetRequiredService<ILogger<SmtpEmailService>>();
        return new SmtpEmailService(configuration, logger);
    }
});
builder.Services.AddSingleton<IImageUploadNormalizer, ImageUploadNormalizer>();
builder.Services.AddScoped<IUploadFileStorageService, UploadFileStorageService>();

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 16 * 1024 * 1024;
});

builder.Services.AddControllers();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
        var configuredSet = new HashSet<string>(configuredOrigins, StringComparer.OrdinalIgnoreCase);
        var isDevelopment = builder.Environment.IsDevelopment();

        policy
            .SetIsOriginAllowed(origin =>
            {
                if (configuredSet.Contains(origin))
                    return true;

                if (!isDevelopment)
                    return false;

                if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                    return false;

                var isLocalHost = uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
                    || uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase);

                return isLocalHost && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo { Title = "Yarne API", Version = "v1" });
});

var app = builder.Build();

if (app.Environment.IsProduction())
    app.Logger.LogInformation("Listening on http://0.0.0.0:{Port}", listenPort);
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Yarne API v1");
    });
}
else
{
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            var feature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
            var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
            if (feature?.Error != null)
                logger.LogError(feature.Error, "Unhandled API exception on {Method} {Path}", context.Request.Method, context.Request.Path);

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { message = "An unexpected error occurred." });
        });
    });
    app.UseHsts();
}

// Trust forwarded headers from Railway's reverse proxy.
// Railway (and most PaaS proxies) sits in front of the app and rewrites X-Forwarded-For/Proto.
// When TRUST_FORWARDED_HEADERS=true or in Production, clear the allow-list restrictions so that
// RemoteIpAddress and Request.Scheme reflect the real client rather than the proxy.
var trustForwardedHeaders =
    app.Environment.IsProduction()
    || string.Equals(Environment.GetEnvironmentVariable("TRUST_FORWARDED_HEADERS"), "true", StringComparison.OrdinalIgnoreCase);

var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
};
if (trustForwardedHeaders)
{
    forwardedHeadersOptions.KnownNetworks.Clear();
    forwardedHeadersOptions.KnownProxies.Clear();
}
app.UseForwardedHeaders(forwardedHeadersOptions);

app.UseWhen(
    context => !context.Request.Path.StartsWithSegments("/healthz"),
    branch => branch.UseHttpsRedirection());

// Serve uploaded images from a stable, explicit path so the Railway volume
// mounted at /app/wwwroot/uploads is always served — even if wwwroot did not
// exist when the host started (which leaves WebRootPath null).
var webRootPath = app.Environment.WebRootPath
    ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
var uploadsPath = Path.Combine(webRootPath, "uploads");
Directory.CreateDirectory(uploadsPath);

app.UseStaticFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads",
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
        ctx.Context.Response.Headers.Append("Access-Control-Allow-Methods", "GET");
    },
});
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    await next();
});
app.UseCors();
app.UseMiddleware<CookieAuthCsrfMiddleware>();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Railway probes /healthz during startup while migrations run.
// Keep this endpoint always-200 and listen BEFORE bootstrap so probes succeed.
app.MapGet("/healthz", () => Results.Ok(new { status = "ok" }))
    .DisableRateLimiting()
    .AllowAnonymous();

app.MapGet("/healthz/db", async (YarneDbContext db, CancellationToken ct) =>
    {
        var hasSnapshotColumns = await OrderItemSchemaPatches.HasSnapshotColumnsAsync(db, ct);
        return Results.Ok(new
        {
            status = hasSnapshotColumns && DatabaseReadiness.IsReady ? "ok" : "degraded",
            ordersSchemaReady = hasSnapshotColumns,
            bootstrapReady = DatabaseReadiness.IsReady,
            bootstrapError = DatabaseReadiness.LastError,
        });
    })
    .DisableRateLimiting()
    .AllowAnonymous();

var runStartupDbPatches = builder.Configuration.GetValue(
    "Database:RunStartupPatches",
    builder.Environment.IsDevelopment());

await app.StartAsync();

try
{
    await DatabaseBootstrap.RunAsync(app, runStartupDbPatches);
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "Database bootstrap failed at startup. /healthz remains available.");
    DatabaseReadiness.MarkFailed(ex.Message);
}

await app.WaitForShutdownAsync();
