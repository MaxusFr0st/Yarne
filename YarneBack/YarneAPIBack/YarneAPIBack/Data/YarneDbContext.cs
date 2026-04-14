using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
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

    public virtual DbSet<Size> Sizes { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
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
            entity.HasKey(e => new { e.ProductId, e.ColorId, e.SizeId });
            entity.ToTable("ProductVariantStock");

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

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.FirstName).HasMaxLength(100);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.LastName).HasMaxLength(100);
            entity.Property(e => e.PasswordHash).HasMaxLength(255);
            entity.Property(e => e.PasswordSalt).HasMaxLength(255);
            entity.Property(e => e.PhoneNumber).HasMaxLength(20);
            entity.Property(e => e.UserName).HasMaxLength(100);
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

            entity.Property(e => e.AssignedAt).HasDefaultValueSql("(getdate())");

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

            entity.Property(e => e.OrderDate).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.EstimatedDelivery).HasColumnType("datetime");
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
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())");

            entity.HasOne(d => d.Product).WithMany(p => p.ProductImages)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Product__3214EC07CAFE7D6A");

            entity.ToTable("Product");

            entity.HasIndex(e => e.ProductCode, "UQ__Product__2F4E024F20B6D95F").IsUnique();

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.ImageUrl).HasMaxLength(500);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
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

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
