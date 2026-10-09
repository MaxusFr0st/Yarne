using System.Reflection;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using YarneAPIBack.Controllers;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Category;
using YarneAPIBack.DTOs.Order;
using YarneAPIBack.DTOs.Product;
using YarneAPIBack.Models;
using YarneAPIBack.Services;
using YarneAPIBack.Services.Contracts;

namespace YarneAPIBack.Tests;

/// <summary>Round nine: English product texts, size measurements, the size photo, and the retried-order id.</summary>
public class ShopContentTests : IDisposable
{
    private readonly YarneDbContext _db = new(new DbContextOptionsBuilder<YarneDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    public void Dispose() => _db.Dispose();

    // ---- one-time English seed ------------------------------------------------------------

    [Fact]
    public void Seed_CoversEveryApprovedProductAndCategory_AndOnlyFillsEmptyFields()
    {
        var sql = ProductEnglishSeed.BuildSql();

        foreach (var code in new[] { "YRN-539393", "YRN-1111", "YRN-360670", "YRN-1011", "YRN-186738", "YRN-064202", "YRN-872988", "YRN-461727", "YRN-456315" })
            Assert.Contains($"\"ProductCode\" = '{code}' AND \"NameEn\" IS NULL", sql, StringComparison.Ordinal);
        foreach (var name in new[] { "Сумки", "Клатчі", "Шляпи", "Костюми" })
            Assert.Contains($"\"Name\" = '{name}' AND \"NameEn\" IS NULL", sql, StringComparison.Ordinal);

        var statements = sql.Split(";\n", StringSplitOptions.RemoveEmptyEntries);
        Assert.All(statements, s =>
        {
            Assert.StartsWith("UPDATE ", s, StringComparison.Ordinal);
            Assert.EndsWith(" IS NULL", s, StringComparison.Ordinal); // every write is guarded by "still empty"
        });
        // 9 names + 9 descriptions + 5 materials + 4 categories
        Assert.Equal(27, statements.Length);
        Assert.Contains("'Knitted yarn (100% cotton)'", sql, StringComparison.Ordinal);
        Assert.Contains("\n\nInside: a practical cotton lining", sql, StringComparison.Ordinal); // real line breaks
    }

    [Fact]
    public void Seed_EscapesQuotes_AndTheBootstrapPatchNeverWritesTexts()
    {
        Assert.Equal("'it''s'", ProductEnglishSeed.Literal("it's"));
        Assert.DoesNotContain("UPDATE", ShopContentSchemaPatches.EnsureSql, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("INSERT", ShopContentSchemaPatches.EnsureSql, StringComparison.OrdinalIgnoreCase);
        Assert.All(ShopContentSchemaPatches.EnsureSql.Split('\n', StringSplitOptions.RemoveEmptyEntries).Select(l => l.Trim()),
            line => Assert.True(line.Contains("IF NOT EXISTS", StringComparison.Ordinal), line));
    }

    // ---- measurements ---------------------------------------------------------------------

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(0.04)]
    [InlineData(500.1)]
    [InlineData(1000)]
    public void Measurement_OutOfRange_IsRefused(double cm)
    {
        Assert.Throws<ProductValidationException>(() => ProductMeasurements.NormalizeCm((decimal)cm, "Width"));
    }

    [Theory]
    [InlineData(0.05, 0.1)]
    [InlineData(12.34, 12.3)]
    [InlineData(500, 500)]
    public void Measurement_InRange_IsKeptToOneDecimal(double cm, double expected)
    {
        Assert.Equal((decimal)expected, ProductMeasurements.NormalizeCm((decimal)cm, "Width"));
        Assert.Null(ProductMeasurements.NormalizeCm(null, "Width"));
    }

    private ProductService NewProductService() =>
        new(_db, Stub.Create<IUploadFileStorageService>(), Stub.Create<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>());

    private async Task<(int CategoryId, int SmallId, int LargeId)> SeedCatalogAsync()
    {
        var category = new Category { Name = "Сумки", NameEn = "Bags" };
        var small = new Size { Name = "S" };
        var large = new Size { Name = "L" };
        _db.AddRange(category, small, large);
        await _db.SaveChangesAsync();
        return (category.Id, small.Id, large.Id);
    }

    [Fact]
    public async Task CreateAndEdit_EnglishTexts_SizePhoto_AndMeasurementsPerSize_RoundTrip()
    {
        var (categoryId, small, large) = await SeedCatalogAsync();
        var service = NewProductService();

        var created = await service.CreateProductAsync(new CreateProductRequest
        {
            ProductCode = "YRN-T1",
            Name = "Шарлотта",
            Price = 100,
            CategoryId = categoryId,
            SizeIds = [small, large],
            NameEn = "  Charlotte ",
            DescriptionEn = "Soft.\nVery.",
            MaterialEn = "  ",
            SizePhotoUrl = "/uploads/size.webp",
            SizeMeasurements = [new() { SizeId = small, WidthCm = 20.04m, HeightCm = 15, DepthCm = 8, HandleCm = 30 }],
        });

        Assert.Equal("Charlotte", created.NameEn);
        Assert.Equal("Soft.\nVery.", created.DescriptionEn);
        Assert.Null(created.MaterialEn); // blank means "not written"
        Assert.Equal("Bags", created.CategoryNameEn);
        Assert.Equal("/uploads/size.webp", created.SizePhotoUrl);
        var s = created.Sizes.Single(x => x.Name == "S");
        Assert.Equal((20.0m, 15m, 8m, 30m), (s.WidthCm, s.HeightCm, s.DepthCm, s.HandleCm));
        Assert.All(created.Sizes.Where(x => x.Name == "L"), l => Assert.Null(l.WidthCm));

        // An edit that does not mention measurements or the photo keeps them.
        var kept = await service.UpdateProductAsync(created.Id, new UpdateProductRequest
        {
            ProductCode = "YRN-T1", Name = "Шарлотта", Price = 110, CategoryId = categoryId, NameEn = "Charlotte", SizeIds = [small, large],
        });
        Assert.Equal("/uploads/size.webp", kept!.SizePhotoUrl);
        Assert.Equal(15m, kept.Sizes.Single(x => x.Name == "S").HeightCm);
        Assert.Null(kept.DescriptionEn); // English texts follow the form: cleared field stays cleared

        // New numbers replace per size; a size without an entry loses its numbers; "" removes the photo.
        var changed = await service.UpdateProductAsync(created.Id, new UpdateProductRequest
        {
            ProductCode = "YRN-T1", Name = "Шарлотта", Price = 110, CategoryId = categoryId, SizePhotoUrl = "",
            SizeMeasurements = [new() { SizeId = large, WidthCm = 40 }],
        });
        Assert.Null(changed!.SizePhotoUrl);
        Assert.Null(changed.Sizes.Single(x => x.Name == "S").WidthCm);
        Assert.Equal(40m, changed.Sizes.Single(x => x.Name == "L").WidthCm);

        // The public detail endpoint's shape carries the same fields.
        var detail = await service.GetProductByCodeAsync("YRN-T1");
        Assert.Equal(40m, detail!.Sizes.Single(x => x.Name == "L").WidthCm);
        Assert.Equal("Bags", detail.CategoryNameEn);
    }

    [Fact]
    public async Task Create_WithAnOutOfRangeMeasurement_IsRefused_AndSavesNothing()
    {
        var (categoryId, small, _) = await SeedCatalogAsync();

        await Assert.ThrowsAsync<ProductValidationException>(() => NewProductService().CreateProductAsync(new CreateProductRequest
        {
            ProductCode = "YRN-T2", Name = "X", Price = 1, CategoryId = categoryId, SizeIds = [small],
            SizeMeasurements = [new() { SizeId = small, WidthCm = 501 }],
        }));
        Assert.Empty(_db.Products);
    }

    [Fact]
    public async Task Categories_ExposeAndEditTheEnglishName()
    {
        var controller = new CategoriesController(_db, Stub.Create<IAdminActivityLogService>())
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
        };
        var created = (CreatedResult)(await controller.CreateCategory(new CreateCategoryRequest { Name = "Шапки", NameEn = " Caps " })).Result!;
        Assert.Equal("Caps", (await _db.Categories.SingleAsync()).NameEn);
        var id = (await _db.Categories.SingleAsync()).Id;

        // null keeps, blank clears
        await controller.UpdateCategory(id, new CreateCategoryRequest { Name = "Шапки" });
        Assert.Equal("Caps", (await _db.Categories.SingleAsync()).NameEn);
        await controller.UpdateCategory(id, new CreateCategoryRequest { Name = "Шапки", NameEn = "" });
        Assert.Null((await _db.Categories.SingleAsync()).NameEn);
        Assert.NotNull(created);
    }

    // ---- retried order --------------------------------------------------------------------

    private const string RequestId = "abcDEF0123456789_-xyz";

    private static CreateOrderRequest NewOrderRequest(string? clientRequestId, string email = "guest@example.com") => new()
    {
        Items = [new CreateOrderItemRequest { ProductIdOrCode = "YRN-T9", Quantity = 1 }],
        Email = email,
        PhoneNumber = "+380501112233",
        RecipientFirstName = "Ira",
        RecipientLastName = "K",
        RecipientPhone = "+380501112233",
        DeliveryCityRef = "c", DeliveryCityName = "Kyiv", DeliveryWarehouseRef = "w", DeliveryWarehouseName = "Branch 1",
        Locale = "uk",
        ClientRequestId = clientRequestId,
    };

    private async Task<(OrdersController Controller, ForeignAndReceiptTests.CountingEmail Email)> NewOrdersAsync(int? customerId = null)
    {
        if (!await _db.Products.AnyAsync())
        {
            var category = new Category { Name = "C" };
            _db.Add(category);
            _db.Add(new Product { ProductCode = "YRN-T9", Name = "P", Price = 50, SellingPriceCents = 5000, IsActive = true, Category = category });
            _db.Add(new Customer { Id = 7, FirstName = "A", LastName = "B", UserName = "a", Email = "a@example.com", PasswordHash = "x", PasswordSalt = "x", IsActive = true });
            _db.Add(new Customer { Id = 8, FirstName = "C", LastName = "D", UserName = "c", Email = "c@example.com", PasswordHash = "x", PasswordSalt = "x", IsActive = true });
            await _db.SaveChangesAsync();
        }

        var email = new ForeignAndReceiptTests.CountingEmail();
        var claims = customerId == null ? [] : new[] { new Claim(ClaimTypes.NameIdentifier, customerId.Value.ToString()) };
        var controller = new OrdersController(
            _db,
            Stub.Create<IAdminActivityLogService>(),
            email,
            Stub.Create<INovaPoshtaService>(),
            new ConfigurationBuilder().Build(),
            NullLogger<OrdersController>.Instance,
            Stub.Create<YarneAPIBack.Accounting.Services.Contracts.ISalesAccountingService>(),
            Stub.Create<IR2ImageStorageService>(),
            null!)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, customerId == null ? null : "test")) } },
        };
        return (controller, email);
    }

    private static int StatusOf(ActionResult<OrderDto> result) => ((ObjectResult)result.Result!).StatusCode!.Value;

    [Fact]
    public async Task TheSameRequestIdTwice_IsOneOrder_AndOneSetOfEmails()
    {
        var (controller, email) = await NewOrdersAsync();

        var first = await controller.CreateOrder(NewOrderRequest(RequestId));
        Assert.Equal(201, StatusOf(first));
        await WaitForEmailsAsync(email, 1);
        var count = email.Messages.Count;

        var second = await controller.CreateOrder(NewOrderRequest(RequestId));
        Assert.Equal(201, StatusOf(second));
        await Task.Delay(300);

        Assert.Equal(1, await _db.Orders.CountAsync());
        Assert.Equal(count, email.Messages.Count);
        var a = (OrderDto)((ObjectResult)first.Result!).Value!;
        var b = (OrderDto)((ObjectResult)second.Result!).Value!;
        Assert.Equal(a.Id, b.Id);
        Assert.Equal((await _db.Orders.SingleAsync()).ClientRequestId, RequestId);
    }

    [Fact]
    public async Task DifferentRequestIds_AreTwoOrders_AndNoIdIsStillAllowed()
    {
        var (controller, _) = await NewOrdersAsync();

        Assert.Equal(201, StatusOf(await controller.CreateOrder(NewOrderRequest(RequestId))));
        Assert.Equal(201, StatusOf(await controller.CreateOrder(NewOrderRequest("zzzDEF0123456789_-xyz"))));
        Assert.Equal(201, StatusOf(await controller.CreateOrder(NewOrderRequest(null))));
        Assert.Equal(201, StatusOf(await controller.CreateOrder(NewOrderRequest(null))));

        Assert.Equal(4, await _db.Orders.CountAsync());
    }

    [Theory]
    [InlineData("short")]
    [InlineData("")]
    [InlineData("has spaces in it 12345")]
    [InlineData("semi;colon-and-more-12345")]
    [InlineData("0123456789012345678901234567890123456789012345678901234567890123456789")]
    public async Task AMalformedRequestId_Is400_AndCreatesNothing(string bad)
    {
        var (controller, _) = await NewOrdersAsync();

        var result = await controller.CreateOrder(NewOrderRequest(bad));

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Empty(_db.Orders);
    }

    [Fact]
    public async Task ARequestIdIsNeverAWayToReadSomeoneElsesOrder()
    {
        // A guest order, then the same id from another email, from a signed-in account: refused, never the order.
        var (guest, _) = await NewOrdersAsync();
        Assert.Equal(201, StatusOf(await guest.CreateOrder(NewOrderRequest(RequestId))));

        var otherEmail = await guest.CreateOrder(NewOrderRequest(RequestId, "someone-else@example.com"));
        Assert.IsType<BadRequestObjectResult>(otherEmail.Result);

        var (signedIn, _) = await NewOrdersAsync(customerId: 8);
        Assert.IsType<BadRequestObjectResult>((await signedIn.CreateOrder(NewOrderRequest(RequestId))).Result);

        // And between two accounts.
        var (seven, _) = await NewOrdersAsync(customerId: 7);
        Assert.Equal(201, StatusOf(await seven.CreateOrder(NewOrderRequest("account7DEF0123456789"))));
        var (eight, _) = await NewOrdersAsync(customerId: 8);
        Assert.IsType<BadRequestObjectResult>((await eight.CreateOrder(NewOrderRequest("account7DEF0123456789"))).Result);

        Assert.Equal(2, await _db.Orders.CountAsync());
    }

    private static async Task WaitForEmailsAsync(ForeignAndReceiptTests.CountingEmail email, int atLeast)
    {
        for (var i = 0; i < 50 && email.Messages.Count < atLeast; i++)
            await Task.Delay(100);
    }

    /// <summary>Does-nothing implementations of the big service interfaces the controllers take but these tests never reach.</summary>
    public class Stub : DispatchProxy
    {
        public static T Create<T>() where T : class => Create<T, Stub>();

        protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
        {
            var type = targetMethod!.ReturnType;
            if (type == typeof(void)) return null;
            if (type == typeof(Task)) return Task.CompletedTask;
            if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Task<>))
            {
                var inner = type.GetGenericArguments()[0];
                var value = inner.IsValueType ? Activator.CreateInstance(inner) : null;
                return typeof(Task).GetMethod(nameof(Task.FromResult))!.MakeGenericMethod(inner).Invoke(null, [value]);
            }

            return type.IsValueType ? Activator.CreateInstance(type) : null;
        }
    }
}
