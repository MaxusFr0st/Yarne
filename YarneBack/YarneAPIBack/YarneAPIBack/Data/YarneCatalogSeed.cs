using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Models;

namespace YarneAPIBack.Data;

/// <summary>
/// Catalog seed ported from YarneDB/SQLQuery1.sql (products, colors, images, sizes).
/// </summary>
internal static class YarneCatalogSeed
{
    private static readonly string[] StandardSizes = ["XS", "S", "M", "L", "XL"];

    private static readonly (string Name, string Hex)[] Colors =
    [
        ("Black", "#1a1a1a"),
        ("White", "#f5f5f5"),
        ("Navy", "#0A1128"),
        ("Burgundy", "#722F37"),
        ("Cream", "#F5F2ED"),
        ("Brown", "#2D241E"),
        ("Gray", "#6B6B6B"),
        ("Parchment", "#E8DCC8"),
        ("Oxblood", "#4A0E0E"),
        ("Midnight", "#0A1128"),
        ("Moss", "#3D5040"),
        ("Ivory", "#F5F0E8"),
        ("Slate", "#8B9099"),
        ("Ecru", "#F0EBD8"),
        ("Caramel", "#9B6B2E"),
        ("Ebony", "#1A1510"),
        ("Oat", "#D4C5A0"),
        ("Bordeaux", "#6B1E1E"),
        ("Smoke", "#9DA3AE"),
        ("Cobalt", "#0A1128"),
        ("Camel", "#C09060"),
    ];

    private static readonly string[] Categories =
    [
        "Tops", "Bottoms", "Outerwear", "Accessories", "Footwear",
        "Sweaters", "Cardigans", "Vests", "Jackets",
    ];

    private static readonly (string Name, DateOnly Start, DateOnly End)[] Collections =
    [
        ("Summer 2025", new DateOnly(2025, 6, 1), new DateOnly(2025, 8, 31)),
        ("Winter 2025", new DateOnly(2025, 11, 1), new DateOnly(2026, 2, 28)),
        ("Spring 2026", new DateOnly(2026, 3, 1), new DateOnly(2026, 5, 31)),
    ];

    private static readonly string[] Countries =
    [
        "United States", "United Kingdom", "Germany", "France", "Croatia",
    ];

    private static readonly CatalogProduct[] Products =
    [
        new(
            "arles-cocoon",
            "Arles Cocoon Sweater",
            "Draped in the spirit of southern France, the Arles Cocoon wraps you in a cloud of extra-fine merino. Its oversized silhouette and deep dropped shoulders create a languid, effortless luxury that moves with you.",
            285m, 50, "Merino Wool Blend", "Sweaters", "Spring 2026", "Yarne Studios",
            "https://images.unsplash.com/photo-1572187076010-85d894e06d82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
            [
                ("Parchment", "https://images.unsplash.com/photo-1572187076010-85d894e06d82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
                ("Oxblood", "https://images.unsplash.com/photo-1668707597105-585748ae50ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
                ("Midnight", "https://images.unsplash.com/photo-1673168871224-c2012dcb2fb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
                ("Moss", "https://images.unsplash.com/photo-1731402967882-087b875b878e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
            ]),
        new(
            "mistral-turtleneck",
            "Mistral Turtleneck",
            "The Mistral is our purest expression of effortless warmth. Knit from grade-A Scottish cashmere, its elongated turtleneck can be worn high and folded or draped loosely around the décolletage.",
            360m, 35, "Pure Cashmere", "Sweaters", "Winter 2025", "Yarne Studios",
            "https://images.unsplash.com/photo-1673168871224-c2012dcb2fb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
            [
                ("Midnight", "https://images.unsplash.com/photo-1673168871224-c2012dcb2fb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
                ("Ivory", "https://images.unsplash.com/photo-1572187076010-85d894e06d82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
                ("Slate", "https://images.unsplash.com/photo-1771092358890-0db24db44e56?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
            ]),
        new(
            "provence-vest",
            "Provence Knit Vest",
            "A warm-weather essential reimagined. The Provence Vest is knit from a breathable lambswool-linen blend, offering texture and weight without warmth—ideal for layering through the seasons.",
            195m, 40, "Lambswool & Linen", "Vests", null, "Yarne Studios",
            "https://images.unsplash.com/photo-1641839272138-5b4eb047e0c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
            [
                ("Ecru", "https://images.unsplash.com/photo-1641839272138-5b4eb047e0c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
                ("Caramel", "https://images.unsplash.com/photo-1731402967882-087b875b878e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
                ("Ebony", "https://images.unsplash.com/photo-1764697907425-62696b280b31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
            ]),
        new(
            "bretagne-pullover",
            "Bretagne Pullover",
            "Named for the rugged coast of Brittany, the Bretagne is constructed from a sculptural bouclé wool that catches the light and holds its shape beautifully. A statement piece that becomes a staple.",
            320m, 45, "Bouclé Wool", "Sweaters", "Spring 2026", "Yarne Studios",
            "https://images.unsplash.com/photo-1731402967882-087b875b878e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
            [
                ("Oat", "https://images.unsplash.com/photo-1731402967882-087b875b878e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
                ("Bordeaux", "https://images.unsplash.com/photo-1668707597105-585748ae50ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
                ("Smoke", "https://images.unsplash.com/photo-1771092358890-0db24db44e56?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
            ]),
        new(
            "riviera-cardigan",
            "Riviera Cardigan",
            "The Riviera is the cardigan of a quiet, sun-drenched afternoon. Its fine-gauge merino drapes in a long, lean silhouette with mother-of-pearl buttons and deep side pockets for effortless carry.",
            245m, 55, "Fine-Gauge Merino", "Cardigans", "Winter 2025", "Yarne Studios",
            "https://images.unsplash.com/photo-1668707597105-585748ae50ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
            [
                ("Bordeaux", "https://images.unsplash.com/photo-1668707597105-585748ae50ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
                ("Ivory", "https://images.unsplash.com/photo-1572187076010-85d894e06d82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
                ("Cobalt", "https://images.unsplash.com/photo-1673168871224-c2012dcb2fb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
            ]),
        new(
            "cote-boucle-jacket",
            "Côte Bouclé Jacket",
            "Our most refined outerwear piece. The Côte is constructed in a dense bouclé weave, then lined in a whisper-soft satin for a jacket that is as comfortable from inside as it is striking from outside.",
            395m, 30, "Structured Bouclé", "Jackets", "Winter 2025", "Yarne Studios",
            "https://images.unsplash.com/photo-1698135857846-b683004283cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
            [
                ("Camel", "https://images.unsplash.com/photo-1698135857846-b683004283cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
                ("Ivory", "https://images.unsplash.com/photo-1771092358890-0db24db44e56?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
                ("Ebony", "https://images.unsplash.com/photo-1764697907425-62696b280b31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"),
            ]),
    ];

    public static async Task SeedAsync(YarneDbContext db, CancellationToken cancellationToken = default)
    {
        foreach (var roleName in new[] { "Admin", "Customer" })
        {
            if (!await db.Roles.AnyAsync(r => r.Name == roleName, cancellationToken))
                db.Roles.Add(new Role { Name = roleName });
        }

        foreach (var pm in new[] { "Credit Card", "Debit Card", "PayPal", "Cash on Delivery", "Bank Transfer" })
        {
            if (!await db.PaymentMethods.AnyAsync(p => p.Name == pm, cancellationToken))
                db.PaymentMethods.Add(new PaymentMethod { Name = pm });
        }

        foreach (var countryName in Countries)
        {
            if (!await db.Countries.AnyAsync(c => c.Name == countryName, cancellationToken))
                db.Countries.Add(new Country { Name = countryName });
        }

        foreach (var (name, hex) in Colors)
        {
            if (!await db.Colors.AnyAsync(c => c.Name == name, cancellationToken))
                db.Colors.Add(new Color { Name = name, HexCode = hex });
        }

        foreach (var cat in Categories)
        {
            if (!await db.Categories.AnyAsync(c => c.Name == cat, cancellationToken))
                db.Categories.Add(new Category { Name = cat });
        }

        foreach (var (name, start, end) in Collections)
        {
            if (!await db.Collections.AnyAsync(c => c.Name == name, cancellationToken))
                db.Collections.Add(new Collection { Name = name, StartDate = start, EndDate = end });
        }

        foreach (var sizeName in StandardSizes.Append("One Size"))
        {
            if (!await db.Sizes.AnyAsync(s => s.Name == sizeName, cancellationToken))
                db.Sizes.Add(new Size { Name = sizeName });
        }

        await db.SaveChangesAsync(cancellationToken);

        var colorByName = await db.Colors.ToDictionaryAsync(c => c.Name, c => c.Id, cancellationToken);
        var categoryByName = await db.Categories.ToDictionaryAsync(c => c.Name, c => c.Id, cancellationToken);
        var collectionByName = await db.Collections.ToDictionaryAsync(c => c.Name, c => c.Id, cancellationToken);
        var sizeByName = await db.Sizes.ToDictionaryAsync(s => s.Name, s => s.Id, cancellationToken);
        var countries = await db.Countries.ToListAsync(cancellationToken);

        foreach (var def in Products)
        {
            if (await db.Products.AnyAsync(p => p.ProductCode == def.Code, cancellationToken))
                continue;

            var categoryId = categoryByName[def.CategoryName];
            int? collectionId = def.CollectionName != null && collectionByName.TryGetValue(def.CollectionName, out var cid)
                ? cid
                : null;

            var product = new Product
            {
                ProductCode = def.Code,
                Name = def.Name,
                Description = def.Description,
                Price = def.Price,
                QuantityInStock = def.QuantityInStock,
                Material = def.Material,
                CategoryId = categoryId,
                CollectionId = collectionId,
                ProducerName = def.ProducerName,
                ImageUrl = def.PrimaryImageUrl,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };

            db.Products.Add(product);
            await db.SaveChangesAsync(cancellationToken);

            db.ProductImages.Add(new ProductImage
            {
                ProductId = product.Id,
                ImageUrl = def.PrimaryImageUrl,
                SortOrder = 0,
                IsPrimary = true,
                CreatedAt = DateTime.UtcNow,
            });

            for (var i = 0; i < def.ColorVariants.Length; i++)
            {
                var (colorName, imageUrl) = def.ColorVariants[i];
                var colorId = colorByName[colorName];

                db.ProductColors.Add(new ProductColor
                {
                    ProductId = product.Id,
                    ColorId = colorId,
                    SortOrder = i,
                });

                db.ProductColorImages.Add(new ProductColorImage
                {
                    ProductId = product.Id,
                    ColorId = colorId,
                    ImageUrl = imageUrl,
                    SortOrder = 0,
                });
            }

            for (var i = 0; i < StandardSizes.Length; i++)
            {
                var sizeName = StandardSizes[i];
                db.ProductSizes.Add(new ProductSize
                {
                    ProductId = product.Id,
                    SizeId = sizeByName[sizeName],
                    SortOrder = i,
                });
            }

            product.DefaultSizeId = sizeByName["M"];
            await db.SaveChangesAsync(cancellationToken);

            var colorImages = await db.ProductColorImages
                .Where(pci => pci.ProductId == product.Id)
                .ToListAsync(cancellationToken);

            var productSizes = await db.ProductSizes
                .Where(ps => ps.ProductId == product.Id)
                .ToListAsync(cancellationToken);

            foreach (var pci in colorImages)
            {
                foreach (var ps in productSizes)
                {
                    db.ProductColorSizeImages.Add(new ProductColorSizeImage
                    {
                        ProductId = product.Id,
                        ColorId = pci.ColorId,
                        SizeId = ps.SizeId,
                        Lace = false,
                        ImageUrl = pci.ImageUrl,
                        SortOrder = pci.SortOrder,
                    });

                    db.ProductVariantStocks.Add(new ProductVariantStock
                    {
                        ProductId = product.Id,
                        ColorId = pci.ColorId,
                        SizeId = ps.SizeId,
                        Lace = false,
                        QuantityInStock = Math.Max(1, def.QuantityInStock / 10),
                    });
                }
            }

            foreach (var country in countries)
            {
                product.Countries.Add(country);
            }

            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private sealed record CatalogProduct(
        string Code,
        string Name,
        string Description,
        decimal Price,
        int QuantityInStock,
        string Material,
        string CategoryName,
        string? CollectionName,
        string ProducerName,
        string PrimaryImageUrl,
        (string ColorName, string ImageUrl)[] ColorVariants);
}
