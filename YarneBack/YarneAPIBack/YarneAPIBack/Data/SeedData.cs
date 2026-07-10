using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using YarneAPIBack.Models;

namespace YarneAPIBack.Data;

public static class SeedData
{
    public static async Task EnsureSeedDataAsync(
        YarneDbContext db,
        IConfiguration configuration,
        ILogger logger,
        bool isProduction,
        CancellationToken cancellationToken = default)
    {
        if (!await db.Products.AsNoTracking().AnyAsync(cancellationToken))
        {
            logger.LogInformation("Seeding Yarne catalog (products, colors, images, sizes)...");
            await YarneCatalogSeed.SeedAsync(db, cancellationToken);
            logger.LogInformation("Catalog seed completed.");
        }

        await EnsureAdminRoleAndOptionalUserAsync(db, configuration, logger, isProduction, cancellationToken);
    }

    private static async Task EnsureAdminRoleAndOptionalUserAsync(
        YarneDbContext db,
        IConfiguration configuration,
        ILogger logger,
        bool isProduction,
        CancellationToken cancellationToken)
    {
        var adminRole = await db.Roles.FirstOrDefaultAsync(r => r.Name == "Admin", cancellationToken);
        if (adminRole == null)
        {
            adminRole = new Role { Name = "Admin" };
            db.Roles.Add(adminRole);
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Created 'Admin' role.");
        }

        if (isProduction)
            await EnsureAdminUserProductionAsync(db, logger, adminRole, cancellationToken);
        else
            await EnsureAdminUserDevelopmentAsync(db, configuration, logger, adminRole, cancellationToken);
    }

    private static async Task EnsureAdminUserProductionAsync(
        YarneDbContext db,
        ILogger logger,
        Role adminRole,
        CancellationToken cancellationToken)
    {
        var hasAdmin = await db.CustomerRoles
            .AsNoTracking()
            .AnyAsync(cr => cr.RoleId == adminRole.Id, cancellationToken);

        if (hasAdmin)
            return;

        var email = Environment.GetEnvironmentVariable("APP_SEED_ADMIN_EMAIL");
        var password = Environment.GetEnvironmentVariable("APP_SEED_ADMIN_PASSWORD");

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogInformation(
                "Production: no admin user exists. " +
                "Set APP_SEED_ADMIN_EMAIL and APP_SEED_ADMIN_PASSWORD (min 12 chars) to seed one on first deploy, " +
                "or use POST /api/admin/bootstrap with ADMIN_BOOTSTRAP_TOKEN.");
            return;
        }

        if (password.Length < 12)
        {
            logger.LogWarning(
                "Production: APP_SEED_ADMIN_PASSWORD is shorter than 12 characters — skipping admin seed.");
            return;
        }

        await CreateAdminUserAsync(db, logger, adminRole, email, password, cancellationToken);
    }

    private static async Task EnsureAdminUserDevelopmentAsync(
        YarneDbContext db,
        IConfiguration configuration,
        ILogger logger,
        Role adminRole,
        CancellationToken cancellationToken)
    {
        var email = Environment.GetEnvironmentVariable("APP_SEED_ADMIN_EMAIL")
            ?? configuration["Database:SeedAdminEmail"];
        var password = Environment.GetEnvironmentVariable("APP_SEED_ADMIN_PASSWORD")
            ?? configuration["Database:SeedAdminPassword"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogDebug(
                "Development: APP_SEED_ADMIN_EMAIL / APP_SEED_ADMIN_PASSWORD not configured — skipping admin seed.");
            return;
        }

        var hasAdmin = await db.CustomerRoles
            .AsNoTracking()
            .AnyAsync(cr => cr.RoleId == adminRole.Id, cancellationToken);

        if (hasAdmin)
            return;

        await CreateAdminUserAsync(db, logger, adminRole, email, password, cancellationToken);
    }

    private static async Task CreateAdminUserAsync(
        YarneDbContext db,
        ILogger logger,
        Role adminRole,
        string email,
        string password,
        CancellationToken cancellationToken)
    {
        var admin = await db.Customers
            .Include(c => c.CustomerRoles)
            .FirstOrDefaultAsync(c => c.Email == email, cancellationToken);

        if (admin == null)
        {
            var salt = BCrypt.Net.BCrypt.GenerateSalt(12);
            var hash = BCrypt.Net.BCrypt.HashPassword(password, salt);

            admin = new Customer
            {
                FirstName = "Admin",
                LastName = "User",
                UserName = email.Split('@')[0],
                Email = email,
                PasswordHash = hash,
                PasswordSalt = salt,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };
            db.Customers.Add(admin);
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Created seed admin user {Email}.", email);
        }
        else
        {
            logger.LogInformation("Using existing user {Email} for admin role assignment.", email);
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
            logger.LogInformation("Granted Admin role to {Email}.", email);
        }
    }
}
