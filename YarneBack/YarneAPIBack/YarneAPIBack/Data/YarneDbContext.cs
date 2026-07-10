using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Accounting.Models;
using YarneAPIBack.Models;

namespace YarneAPIBack.Data;

public partial class YarneDbContext : DbContext
{
    public YarneDbContext(DbContextOptions<YarneDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Category> Categories { get; set; }

    public virtual DbSet<Color> Colors { get; set; }

    public virtual DbSet<Collection> Collections { get; set; }

    public virtual DbSet<Country> Countries { get; set; }

    public virtual DbSet<Customer> Customers { get; set; }

    public virtual DbSet<CustomerAddress> CustomerAddresses { get; set; }

    public virtual DbSet<CustomerRole> CustomerRoles { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<OrderItem> OrderItems { get; set; }

    public virtual DbSet<PaymentMethod> PaymentMethods { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<ProductImage> ProductImages { get; set; }

    public virtual DbSet<ProductColor> ProductColors { get; set; }

    public virtual DbSet<ProductColorImage> ProductColorImages { get; set; }

    public virtual DbSet<ProductColorSizeImage> ProductColorSizeImages { get; set; }

    public virtual DbSet<ProductSize> ProductSizes { get; set; }

    public virtual DbSet<ProductVariantStock> ProductVariantStocks { get; set; }

    public virtual DbSet<ProductRecommendation> ProductRecommendations { get; set; }

    public virtual DbSet<Size> Sizes { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<AppSetting> AppSettings { get; set; }

    public virtual DbSet<AdminActivityLog> AdminActivityLogs { get; set; }

    public virtual DbSet<AccountingCategory> AccountingCategories { get; set; }

    public virtual DbSet<AccountingPurchase> AccountingPurchases { get; set; }

    public virtual DbSet<MarketingExpenditure> MarketingExpenditures { get; set; }

    // V2 accounting entities
    public virtual DbSet<Material> Materials { get; set; }

    public virtual DbSet<ImportTransaction> ImportTransactions { get; set; }

    public virtual DbSet<ImportTransactionLine> ImportTransactionLines { get; set; }

    public virtual DbSet<Expense> Expenses { get; set; }

    public virtual DbSet<MaterialUsageRecord> MaterialUsageRecords { get; set; }

    public virtual DbSet<StockReport> StockReports { get; set; }

    public virtual DbSet<StockReportLine> StockReportLines { get; set; }

    public virtual DbSet<ExpenseCategory> ExpenseCategories { get; set; }

    public virtual DbSet<ExternalOrder> ExternalOrders { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppSetting>(entity =>
        {
            entity.HasKey(e => e.Key);
            entity.ToTable("AppSetting");
            entity.Property(e => e.Key).HasMaxLength(128);
            entity.Property(e => e.ValueJson).IsRequired();
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<AdminActivityLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("AdminActivityLog");
            entity.Property(e => e.Category).HasMaxLength(32).IsRequired();
            entity.Property(e => e.Action).HasMaxLength(32).IsRequired();
            entity.Property(e => e.EntityId).HasMaxLength(128);
            entity.Property(e => e.EntityLabel).HasMaxLength(255);
            entity.Property(e => e.Summary).HasMaxLength(500).IsRequired();
            entity.Property(e => e.ActorEmail).HasMaxLength(255);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Category__3214EC07C3469575");

            entity.ToTable("Category");

            entity.HasIndex(e => e.Name, "UQ__Category__737584F6060D144F").IsUnique();

            entity.Property(e => e.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<Color>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("Color");
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.HexCode).HasMaxLength(20);
        });

        modelBuilder.Entity<ProductColor>(entity =>
        {
            entity.HasKey(e => new { e.ProductId, e.ColorId });
            entity.ToTable("ProductColor");
            entity.HasOne(d => d.Product).WithMany(p => p.ProductColors)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(d => d.Color).WithMany(p => p.ProductColors)
                .HasForeignKey(d => d.ColorId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProductRecommendation>(entity =>
        {
            entity.HasKey(e => new { e.ProductId, e.RelatedProductId });
            entity.ToTable("ProductRecommendation");
            entity.HasIndex(e => e.ProductId);
            entity.HasOne(d => d.Product)
                .WithMany(p => p.Recommendations)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(d => d.RelatedProduct)
                .WithMany()
                .HasForeignKey(d => d.RelatedProductId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProductSize>(entity =>
        {
            entity.HasKey(e => new { e.ProductId, e.SizeId });
            entity.ToTable("ProductSize");

            entity.HasOne(d => d.Product)
                .WithMany(p => p.ProductSizes)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Size)
                .WithMany(s => s.ProductSizes)
                .HasForeignKey(d => d.SizeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProductColorImage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("ProductColorImage");
            entity.Property(e => e.ImageUrl).HasMaxLength(500);
            entity.HasOne(d => d.Product)
                .WithMany()
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(d => d.Color)
                .WithMany()
                .HasForeignKey(d => d.ColorId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(d => d.ProductColor)
                .WithMany(pc => pc.Images)
                .HasForeignKey(d => new { d.ProductId, d.ColorId })
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProductColorSizeImage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("ProductColorSizeImage");
            entity.Property(e => e.Lace).HasDefaultValue(false);
            entity.Property(e => e.ImageUrl).HasMaxLength(500);

            entity.HasOne(d => d.ProductColor)
                .WithMany(pc => pc.SizeImages)
                .HasForeignKey(d => new { d.ProductId, d.ColorId })
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.ProductSize)
                .WithMany(ps => ps.ColorSizeImages)
                .HasForeignKey(d => new { d.ProductId, d.SizeId })
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProductVariantStock>(entity =>
        {
            entity.HasKey(e => new { e.ProductId, e.ColorId, e.SizeId, e.Lace });
            entity.ToTable("ProductVariantStock");
            entity.Property(e => e.Lace).HasDefaultValue(false);

            entity.HasOne(d => d.ProductColor)
                .WithMany(pc => pc.VariantStocks)
                .HasForeignKey(d => new { d.ProductId, d.ColorId })
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.ProductSize)
                .WithMany(ps => ps.VariantStocks)
                .HasForeignKey(d => new { d.ProductId, d.SizeId })
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Collection>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Collecti__3214EC07FFF54ED3");

            entity.ToTable("Collection");

            entity.Property(e => e.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<Country>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Country__3214EC07F74E3672");

            entity.ToTable("Country");

            entity.HasIndex(e => e.Name, "UQ__Country__737584F6ED59CDE9").IsUnique();

            entity.Property(e => e.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Customer__3214EC07CEFA67EE");

            entity.ToTable("Customer");

            entity.HasIndex(e => e.Email, "UQ__Customer__A9D105341FF85E05").IsUnique();

            entity.HasIndex(e => e.UserName, "UQ__Customer__C9F28456D44CA5C3").IsUnique();

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.FirstName).HasMaxLength(100);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.LastName).HasMaxLength(100);
            entity.Property(e => e.PasswordHash).HasMaxLength(255);
            entity.Property(e => e.PasswordSalt).HasMaxLength(255);
            entity.Property(e => e.PhoneNumber).HasMaxLength(20);
            entity.Property(e => e.UserName).HasMaxLength(100);
            entity.Property(e => e.OAuthProvider).HasMaxLength(50);
            entity.Property(e => e.OAuthProviderId).HasMaxLength(255);
        });

        modelBuilder.Entity<CustomerAddress>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Customer__3214EC07A05519DB");

            entity.ToTable("CustomerAddress");

            entity.Property(e => e.AddressLine1).HasMaxLength(255);
            entity.Property(e => e.AddressLine2).HasMaxLength(255);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.PostalCode).HasMaxLength(20);

            entity.HasOne(d => d.Country).WithMany(p => p.CustomerAddresses)
                .HasForeignKey(d => d.CountryId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__CustomerA__Count__48CFD27E");

            entity.HasOne(d => d.Customer).WithMany(p => p.CustomerAddresses)
                .HasForeignKey(d => d.CustomerId)
                .HasConstraintName("FK__CustomerA__Custo__47DBAE45");
        });

        modelBuilder.Entity<CustomerRole>(entity =>
        {
            entity.HasKey(e => new { e.CustomerId, e.RoleId }).HasName("PK__Customer__1C01C839D888AEE1");

            entity.ToTable("CustomerRole");

            entity.Property(e => e.AssignedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Customer).WithMany(p => p.CustomerRoles)
                .HasForeignKey(d => d.CustomerId)
                .HasConstraintName("FK__CustomerR__Custo__403A8C7D");

            entity.HasOne(d => d.Role).WithMany(p => p.CustomerRoles)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("FK__CustomerR__RoleI__412EB0B6");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Order__3214EC0702DFA63A");

            entity.ToTable("Order");

            entity.Property(e => e.OrderDate).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.EstimatedDelivery).HasColumnType("timestamp without time zone");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValue("Pending");
            entity.Property(e => e.Total).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.Customer).WithMany(p => p.Orders)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Order__CustomerI__628FA481");

            entity.HasOne(d => d.PaymentMethod).WithMany(p => p.Orders)
                .HasForeignKey(d => d.PaymentMethodId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Order__PaymentMe__6383C8BA");

            entity.HasOne(d => d.ShippingAddr).WithMany(p => p.Orders)
                .HasForeignKey(d => d.ShippingAddrId)
                .HasConstraintName("FK__Order__ShippingA__6477ECF3");
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__OrderIte__3214EC0700F58744");

            entity.ToTable("OrderItem");

            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.ProductSubtitle).HasMaxLength(200);
            entity.Property(e => e.ColorName).HasMaxLength(100);
            entity.Property(e => e.SizeName).HasMaxLength(20);

            entity.HasOne(d => d.Country).WithMany(p => p.OrderItems)
                .HasForeignKey(d => d.CountryId)
                .HasConstraintName("FK__OrderItem__Count__6D0D32F4");

            entity.HasOne(d => d.Order).WithMany(p => p.OrderItems)
                .HasForeignKey(d => d.OrderId)
                .HasConstraintName("FK__OrderItem__Order__6B24EA82");

            entity.HasOne(d => d.Product).WithMany(p => p.OrderItems)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__OrderItem__Produ__6C190EBB");
        });

        modelBuilder.Entity<PaymentMethod>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__PaymentM__3214EC074A0EA870");

            entity.ToTable("PaymentMethod");

            entity.HasIndex(e => e.Name, "UQ__PaymentM__737584F6CFDF02D1").IsUnique();

            entity.Property(e => e.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<ProductImage>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.ToTable("ProductImage");

            entity.Property(e => e.ImageUrl).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Product).WithMany(p => p.ProductImages)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Product__3214EC07CAFE7D6A");

            entity.ToTable("Product");

            entity.HasIndex(e => e.ProductCode, "UQ__Product__2F4E024F20B6D95F").IsUnique();

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.ImageUrl).HasMaxLength(500);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.IsNew).HasDefaultValue(false);
            entity.Property(e => e.IsBestseller).HasDefaultValue(false);
            entity.Property(e => e.Lace).HasDefaultValue(false);
            entity.Property(e => e.Material).HasMaxLength(100);
            entity.Property(e => e.Name).HasMaxLength(255);
            entity.Property(e => e.Price).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.ProducerName).HasMaxLength(255);
            entity.Property(e => e.ProductCode).HasMaxLength(50);

            entity.HasOne(d => d.Category).WithMany(p => p.Products)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK__Product__Categor__5629CD9C");

            entity.HasOne(d => d.Collection).WithMany(p => p.Products)
                .HasForeignKey(d => d.CollectionId)
                .HasConstraintName("FK__Product__Collect__571DF1D5");

            entity.HasOne(d => d.DefaultSize)
                .WithMany(s => s.ProductsAsDefaultSize)
                .HasForeignKey(d => d.DefaultSizeId);

            entity.HasOne(d => d.DefaultColor)
                .WithMany(c => c.ProductsAsDefaultColor)
                .HasForeignKey(d => d.DefaultColorId);

            entity.HasMany(d => d.Countries).WithMany(p => p.Products)
                .UsingEntity<Dictionary<string, object>>(
                    "ProductCountry",
                    r => r.HasOne<Country>().WithMany()
                        .HasForeignKey("CountryId")
                        .HasConstraintName("FK__ProductCo__Count__5CD6CB2B"),
                    l => l.HasOne<Product>().WithMany()
                        .HasForeignKey("ProductId")
                        .HasConstraintName("FK__ProductCo__Produ__5BE2A6F2"),
                    j =>
                    {
                        j.HasKey("ProductId", "CountryId").HasName("PK__ProductC__5501D0C4A2BD1DC7");
                        j.ToTable("ProductCountry");
                    });
        });

        modelBuilder.Entity<Size>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("Size");
            entity.Property(e => e.Name).HasMaxLength(50);
            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Role__3214EC07BE20655F");

            entity.ToTable("Role");

            entity.HasIndex(e => e.Name, "UQ__Role__737584F61F3480C1").IsUnique();

            entity.Property(e => e.Name).HasMaxLength(50);
        });

        modelBuilder.Entity<AccountingCategory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("AccountingCategory");
            entity.Property(e => e.Name).HasMaxLength(150).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<AccountingPurchase>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("AccountingPurchase");
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Supplier).HasMaxLength(255);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.UnitCost).HasColumnType("decimal(18,2)");
            entity.Property(e => e.SaleUnitPrice).HasColumnType("decimal(18,2)");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasOne(e => e.Category).WithMany(c => c.Purchases)
                .HasForeignKey(e => e.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => e.CategoryId);
            entity.HasIndex(e => e.PurchaseDate);
        });

        modelBuilder.Entity<MarketingExpenditure>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("MarketingExpenditure");
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.ExpenseDate);
        });

        // ── V2 Accounting ────────────────────────────────────────────────────

        modelBuilder.Entity<Material>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("Material");
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Unit).HasMaxLength(50).IsRequired().HasDefaultValue("pcs");
            entity.Property(e => e.Sku).HasMaxLength(100);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.Name).IsUnique();
            entity.HasIndex(e => e.Sku);
        });

        modelBuilder.Entity<ImportTransaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("ImportTransaction");
            entity.Property(e => e.Supplier).HasMaxLength(255);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.InvoiceRef).HasMaxLength(150);
            entity.Property(e => e.IsLocked).HasDefaultValue(false);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.TransactionDate);
        });

        modelBuilder.Entity<ImportTransactionLine>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("ImportTransactionLine");
            entity.Property(e => e.Quantity).HasColumnType("decimal(18,4)");
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18,2)");
            entity.HasOne(e => e.ImportTransaction)
                .WithMany(t => t.Lines)
                .HasForeignKey(e => e.ImportTransactionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Material)
                .WithMany(m => m.ImportLines)
                .HasForeignKey(e => e.MaterialId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => e.ImportTransactionId);
            entity.HasIndex(e => e.MaterialId);
        });

        modelBuilder.Entity<Expense>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("Expense");
            entity.Property(e => e.Category).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.ExpenseDate);
        });

        modelBuilder.Entity<MaterialUsageRecord>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("MaterialUsageRecord");
            entity.Property(e => e.QuantityUsed).HasColumnType("decimal(18,4)");
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasOne(e => e.Material)
                .WithMany(m => m.UsageRecords)
                .HasForeignKey(e => e.MaterialId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ExternalOrder)
                .WithMany(o => o.UsageRecords)
                .HasForeignKey(e => e.ExternalOrderId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => e.MaterialId);
            entity.HasIndex(e => e.OrderId);
            entity.HasIndex(e => e.ExternalOrderId);
            entity.HasIndex(e => e.UsageDate);
        });

        modelBuilder.Entity<ExpenseCategory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("ExpenseCategory");
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<ExternalOrder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("ExternalOrder");
            entity.Property(e => e.Label).HasMaxLength(255);
            entity.Property(e => e.CustomerName).HasMaxLength(255);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.OrderDate);
        });

        modelBuilder.Entity<StockReport>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("StockReport");
            entity.Property(e => e.Label).HasMaxLength(255);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.IsLocked).HasDefaultValue(true);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.SnapshotDate);
        });

        modelBuilder.Entity<StockReportLine>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("StockReportLine");
            entity.Property(e => e.MaterialName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.MaterialUnit).HasMaxLength(50).IsRequired();
            entity.Property(e => e.QtyImported).HasColumnType("decimal(18,4)");
            entity.Property(e => e.QtyUsed).HasColumnType("decimal(18,4)");
            entity.Property(e => e.QtyOnHand).HasColumnType("decimal(18,4)");
            entity.Property(e => e.AvgUnitCost).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalValue).HasColumnType("decimal(18,2)");
            entity.HasOne(e => e.StockReport)
                .WithMany(r => r.Lines)
                .HasForeignKey(e => e.StockReportId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.StockReportId);
            entity.HasIndex(e => e.MaterialId);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
