using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using YarneAPIBack.Models;

namespace YarneAPIBack.Data;

public static class SeedData
{
    public static async Task EnsureSeedDataAsync(
        YarneDbContext db,
        ILogger logger,
        IWebHostEnvironment env)
    {
        // Keep seeding predictable and safe:
        // - Only seed when the database is empty (idempotent)
        // - Default to development only, unless explicitly enabled
        var enabled = env.IsDevelopment();
        if (!enabled)
        {
            // You can enable in Production by setting: Database__SeedSampleData=true
            // (read in Program.cs via configuration if you want later; for now keep prod-safe)
            return;
        }

        if (await db.Products.AsNoTracking().AnyAsync())
            return;

        logger.LogInformation("Seeding sample data (development only).");

        var category = new Category { Name = "Bags" };
        var collection = new Collection { Name = "Sample Collection" };
        var size = new Size { Name = "One Size" };

        db.Categories.Add(category);
        db.Collections.Add(collection);
        db.Sizes.Add(size);

        // Save first so FK ids exist (no identity assumptions).
        await db.SaveChangesAsync();

        var product1 = new Product
        {
            ProductCode = "SAMPLE-001",
            Name = "Sample Bag",
            Description = "Sample product seeded for local development.",
            Price = 1200m,
            QuantityInStock = 10,
            Material = "Cotton",
            ImageUrl = "https://example.com/sample.jpg",
            CategoryId = category.Id,
            CollectionId = collection.Id,
            ProducerName = "Yarne",
            DefaultSizeId = size.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        var product2 = new Product
        {
            ProductCode = "SAMPLE-002",
            Name = "Sample Tote",
            Description = "Another sample product seeded for local development.",
            Price = 1500m,
            QuantityInStock = 5,
            Material = "Canvas",
            ImageUrl = "https://example.com/sample-2.jpg",
            CategoryId = category.Id,
            CollectionId = collection.Id,
            ProducerName = "Yarne",
            DefaultSizeId = size.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        db.Products.AddRange(product1, product2);
        await db.SaveChangesAsync();
    }
}

