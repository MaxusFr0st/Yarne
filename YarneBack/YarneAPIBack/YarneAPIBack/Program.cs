using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using YarneAPIBack.Configuration;
using YarneAPIBack.Data;
using YarneAPIBack.Services;
using YarneAPIBack.Services.Contracts;

var builder = WebApplication.CreateBuilder(args);

// Railway assigns a runtime port via PORT; bind explicitly when present.
var railwayPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(railwayPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{railwayPort}");
}

// Database — Railway Postgres (DATABASE_URL / PG*), with retry on transient startup
var postgresConnectionString = RailwayDatabaseConfiguration.Resolve(builder.Configuration);

builder.Logging.AddSimpleConsole(options =>
{
    options.TimestampFormat = "yyyy-MM-dd HH:mm:ss ";
});

builder.Services.AddDbContext<YarneDbContext>(options =>
    options.UseNpgsql(
        postgresConnectionString,
        npgsqlOptions => npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 10, maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null)));

// JWT
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));
var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
    ?? throw new InvalidOperationException("JWT settings are required");
var legacyJwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET");
if (!string.IsNullOrWhiteSpace(legacyJwtSecret))
{
    jwtSettings.Secret = legacyJwtSecret;
}
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
    });

builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
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
});

// Services (SOLID - dependency injection)
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProductService, ProductService>();

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
            .AllowAnyMethod();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo { Title = "Yarne API", Version = "v1" });
});

var app = builder.Build();

// Railway health check hits /healthz before DB migrations finish — map early and start listening first.
app.MapGet("/healthz", () => Results.Ok(new { status = "ok" }));

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
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { message = "An unexpected error occurred." });
        });
    });
    app.UseHsts();
}

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
});

app.UseWhen(
    context => !context.Request.Path.StartsWithSegments("/healthz"),
    branch => branch.UseHttpsRedirection());
app.UseStaticFiles();
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    await next();
});
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

var runStartupDbPatches = builder.Configuration.GetValue(
    "Database:RunStartupPatches",
    builder.Environment.IsDevelopment());

// Start HTTP server so Railway /healthz succeeds while migrations run.
await app.StartAsync();

try
{
    await DatabaseBootstrap.RunAsync(app, runStartupDbPatches);
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    if (app.Environment.IsDevelopment())
        throw;

    logger.LogError(ex, "Database bootstrap failed. /healthz is up; API routes needing DB may return errors.");
}

await app.WaitForShutdownAsync();
