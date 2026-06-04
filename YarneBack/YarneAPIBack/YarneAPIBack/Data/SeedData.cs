using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using YarneAPIBack.Models;

namespace YarneAPIBack.Data;

public static class SeedData
{
    /// <summary>
    /// From YarneDB/SQLQuery1.sql — max@gmail.com / maxadmin.
    /// Override with APP_SEED_ADMIN_PASSWORD or Database:SeedAdminPassword on Railway.
    /// </summary>
    public const string DefaultAdminEmail = "max@gmail.com";
    public const string DefaultAdminUserName = "maxadmin";
    public const string DefaultAdminPassword = "Admin123!";

    public static async Task EnsureSeedDataAsync(
        YarneDbContext db,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (!await db.Products.AsNoTracking().AnyAsync(cancellationToken))
        {
            logger.LogInformation("Seeding Yarne catalog (products, colors, images, sizes)...");
            await YarneCatalogSeed.SeedAsync(db, cancellationToken);
            logger.LogInformation("Catalog seed completed.");
        }

        await EnsureAdminUserAsync(db, configuration, logger, cancellationToken);
    }

    private static async Task EnsureAdminUserAsync(
        YarneDbContext db,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var adminRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == "Admin", cancellationToken);
        if (adminRole == null)
        {
            adminRole = new Role { Name = "Admin" };
            db.Roles.Add(adminRole);
            await db.SaveChangesAsync(cancellationToken);
        }

        var hasAdmin = await db.CustomerRoles
            .AnyAsync(cr => cr.RoleId == adminRole.Id, cancellationToken);

        if (hasAdmin)
            return;

        var password = configuration["Database:SeedAdminPassword"]
            ?? Environment.GetEnvironmentVariable("APP_SEED_ADMIN_PASSWORD")
            ?? DefaultAdminPassword;

        var salt = BCrypt.Net.BCrypt.GenerateSalt(12);
        var hash = BCrypt.Net.BCrypt.HashPassword(password, salt);

        var admin = await db.Customers
            .Include(c => c.CustomerRoles)
            .FirstOrDefaultAsync(c => c.Email == DefaultAdminEmail, cancellationToken);

        if (admin == null)
        {
            admin = new Customer
            {
                FirstName = "Max",
                LastName = "Admin",
                UserName = DefaultAdminUserName,
                Email = DefaultAdminEmail,
                PasswordHash = hash,
                PasswordSalt = salt,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };
            db.Customers.Add(admin);
            await db.SaveChangesAsync(cancellationToken);
        }
        else if (!BCrypt.Net.BCrypt.Verify(password, admin.PasswordHash))
        {
            admin.PasswordHash = hash;
            admin.PasswordSalt = salt;
            await db.SaveChangesAsync(cancellationToken);
            logger.LogWarning(
                "Reset password for existing admin {Email} from seed configuration.",
                DefaultAdminEmail);
        }

        if (!admin.CustomerRoles.Any(cr => cr.RoleId == adminRole.Id))
        {
            db.CustomerRoles.Add(new CustomerRole
            {
                CustomerId = admin.Id,
                RoleId = adminRole.Id,
                AssignedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync(cancellationToken);
        }

        logger.LogInformation(
            "Admin user ready: {Email} / {UserName} (password from APP_SEED_ADMIN_PASSWORD or default seed password).",
            DefaultAdminEmail,
            DefaultAdminUserName);
    }
}
