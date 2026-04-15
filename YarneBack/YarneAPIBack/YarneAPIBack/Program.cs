using System.Text;
using System.Threading.RateLimiting;
using Microsoft.Data.SqlClient;
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

// Database (EnableRetryOnFailure for Docker/transient startup delays)
var configuredConnectionString =
    Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Database connection string is required. Set DATABASE_URL or ConnectionStrings__DefaultConnection.");

var connectionStringBuilder = new SqlConnectionStringBuilder(configuredConnectionString);
if (!connectionStringBuilder.ContainsKey("TrustServerCertificate"))
{
    connectionStringBuilder.TrustServerCertificate = true;
}

if (!connectionStringBuilder.ContainsKey("Encrypt"))
{
    connectionStringBuilder.Encrypt = false;
}

if (!builder.Environment.IsDevelopment() && connectionStringBuilder.IntegratedSecurity)
{
    throw new InvalidOperationException("Production database connection cannot use Integrated Security / Trusted_Connection.");
}

builder.Services.AddDbContext<YarneDbContext>(options =>
    options.UseSqlServer(connectionStringBuilder.ConnectionString,
        sqlOptions => sqlOptions.EnableRetryOnFailure(maxRetryCount: 10, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null)));

// JWT
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));
var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
    ?? throw new InvalidOperationException("JWT settings are required");
if (!builder.Environment.IsDevelopment())
{
    if (string.IsNullOrWhiteSpace(jwtSettings.Secret)
        || jwtSettings.Secret.Length < 32
        || jwtSettings.Secret.Contains("SuperSecretKey", StringComparison.OrdinalIgnoreCase)
        || jwtSettings.Secret.Contains("Dev-SecretKey", StringComparison.OrdinalIgnoreCase)
        || jwtSettings.Secret.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException("Production JWT secret is weak/default. Set Jwt:Secret via secure environment variables.");
    }
}

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

using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var db = scope.ServiceProvider.GetRequiredService<YarneDbContext>();
    const int maxAttempts = 20;
    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                IF COL_LENGTH('[Order]', 'EstimatedDelivery') IS NULL
                BEGIN
                    ALTER TABLE [Order] ADD [EstimatedDelivery] datetime NULL;
                END
                """
            );
            break;
        }
        catch (Exception ex) when (attempt < maxAttempts)
        {
            var delay = TimeSpan.FromSeconds(Math.Min(30, attempt * 3));
            logger.LogWarning(ex,
                "Database is not ready yet during startup. Attempt {Attempt}/{MaxAttempts}. Retrying in {DelaySeconds}s.",
                attempt, maxAttempts, delay.TotalSeconds);
            await Task.Delay(delay);
        }
    }
}

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

app.UseHttpsRedirection();
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

app.Run();
