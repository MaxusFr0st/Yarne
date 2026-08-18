using YarneAPIBack.Configuration;
using YarneAPIBack.Models;

namespace YarneAPIBack.Tests;

public class OrderItemSnapshotHelperTests
{
    [Fact]
    public void ApplyProductSnapshot_PrefersShareImageUrl_OverPrimaryProductImage()
    {
        var product = new Product
        {
            Id = 1,
            Name = "Cardigan",
            ProductCode = "CARD-1",
            ShareImageUrl = "https://pub-xxx.r2.dev/share.webp",
            ProductImages = new List<ProductImage>
            {
                new() { ImageUrl = "/uploads/primary.webp", IsPrimary = true },
            },
        };
        var item = new OrderItem();

        OrderItemSnapshotHelper.ApplyProductSnapshot(item, product);

        Assert.Equal("https://pub-xxx.r2.dev/share.webp", item.ProductImageUrl);
    }

    [Fact]
    public void ApplyProductSnapshot_FallsBackToPrimaryImage_WhenShareImageUrlUnset()
    {
        var product = new Product
        {
            Id = 1,
            Name = "Cardigan",
            ProductCode = "CARD-1",
            ShareImageUrl = null,
            ProductImages = new List<ProductImage>
            {
                new() { ImageUrl = "/uploads/primary.webp", IsPrimary = true },
            },
        };
        var item = new OrderItem();

        OrderItemSnapshotHelper.ApplyProductSnapshot(item, product);

        Assert.Equal("/uploads/primary.webp", item.ProductImageUrl);
    }
}
