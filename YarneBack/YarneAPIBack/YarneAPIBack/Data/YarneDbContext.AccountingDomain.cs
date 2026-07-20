using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Accounting.Models;

namespace YarneAPIBack.Data;

public partial class YarneDbContext
{
    public DbSet<AccountingCurrency> AccountingCurrencies => Set<AccountingCurrency>();
    public DbSet<CurrencyExchangeRate> CurrencyExchangeRates => Set<CurrencyExchangeRate>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderItem> PurchaseOrderItems => Set<PurchaseOrderItem>();
    public DbSet<ProductBom> ProductBoms => Set<ProductBom>();
    public DbSet<ProductBomItem> ProductBomItems => Set<ProductBomItem>();
    public DbSet<ProductionOrder> ProductionOrders => Set<ProductionOrder>();
    public DbSet<ProductionMaterialConsumption> ProductionMaterialConsumptions =>
        Set<ProductionMaterialConsumption>();
    public DbSet<FinishedGoodsInventory> FinishedGoodsInventories => Set<FinishedGoodsInventory>();
    public DbSet<FinishedGoodsLot> FinishedGoodsLots => Set<FinishedGoodsLot>();
    public DbSet<SalesFinishedGoodsConsumption> SalesFinishedGoodsConsumptions =>
        Set<SalesFinishedGoodsConsumption>();
    public DbSet<SalesChannel> SalesChannels => Set<SalesChannel>();
    public DbSet<ReturnOrder> ReturnOrders => Set<ReturnOrder>();
    public DbSet<ReturnOrderItem> ReturnOrderItems => Set<ReturnOrderItem>();
    public DbSet<OperatingExpenseCategory> OperatingExpenseCategories => Set<OperatingExpenseCategory>();
    public DbSet<OperatingExpense> OperatingExpenses => Set<OperatingExpense>();

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        ConfigureCurrencies(modelBuilder);
        ConfigureProcurement(modelBuilder);
        ConfigureProduction(modelBuilder);
        ConfigureSalesAndReturns(modelBuilder);
        ConfigureExpenses(modelBuilder);
        ConfigureExistingAccountingExtensions(modelBuilder);
    }

    private static void ConfigureCurrencies(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AccountingCurrency>(entity =>
        {
            entity.ToTable("AccountingCurrency");
            entity.HasKey(x => x.Code);
            entity.Property(x => x.Code).HasMaxLength(3);
            entity.Property(x => x.Name).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Symbol).HasMaxLength(8).IsRequired();
            entity.Property(x => x.MinorUnitDigits).HasDefaultValue(2);
            entity.Property(x => x.IsActive).HasDefaultValue(true);
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasIndex(x => x.IsBase)
                .IsUnique()
                .HasFilter("\"IsBase\" = true AND \"IsVoid\" = false");
        });

        modelBuilder.Entity<CurrencyExchangeRate>(entity =>
        {
            entity.ToTable("CurrencyExchangeRate", table =>
            {
                table.HasCheckConstraint("CK_CurrencyExchangeRate_Rate_Positive", "\"Rate\" > 0");
                table.HasCheckConstraint(
                    "CK_CurrencyExchangeRate_DifferentCurrencies",
                    "\"FromCurrencyCode\" <> \"ToCurrencyCode\"");
            });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.FromCurrencyCode).HasMaxLength(3).IsRequired();
            entity.Property(x => x.ToCurrencyCode).HasMaxLength(3).IsRequired();
            entity.Property(x => x.Rate).HasPrecision(18, 8);
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasOne(x => x.FromCurrency)
                .WithMany()
                .HasForeignKey(x => x.FromCurrencyCode)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.ToCurrency)
                .WithMany()
                .HasForeignKey(x => x.ToCurrencyCode)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => new { x.FromCurrencyCode, x.ToCurrencyCode, x.EffectiveAt });
        });
    }

    private static void ConfigureProcurement(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.ToTable("Supplier");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(255).IsRequired();
            entity.Property(x => x.ContactInfo).HasMaxLength(1000);
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasIndex(x => x.Name).IsUnique().HasFilter("\"IsVoid\" = false");
        });

        modelBuilder.Entity<PurchaseOrder>(entity =>
        {
            entity.ToTable("PurchaseOrder", table =>
            {
                table.HasCheckConstraint(
                    "CK_PurchaseOrder_ExchangeRate_Positive",
                    "\"ExchangeRateToBase\" > 0");
                table.HasCheckConstraint(
                    "CK_PurchaseOrder_Status",
                    "\"Status\" IN ('draft', 'received', 'cancelled')");
            });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.InvoiceRef).HasMaxLength(150);
            entity.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("draft");
            entity.Property(x => x.ReceiptUrl).HasMaxLength(2048);
            entity.Property(x => x.CurrencyCode).HasMaxLength(3).HasDefaultValue("UAH");
            entity.Property(x => x.ExchangeRateToBase).HasPrecision(18, 8).HasDefaultValue(1m);
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasOne(x => x.Supplier)
                .WithMany(x => x.PurchaseOrders)
                .HasForeignKey(x => x.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Currency)
                .WithMany()
                .HasForeignKey(x => x.CurrencyCode)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.OrderDate);
            entity.HasIndex(x => x.SupplierId);
        });

        modelBuilder.Entity<PurchaseOrderItem>(entity =>
        {
            entity.ToTable("PurchaseOrderItem", table =>
            {
                table.HasCheckConstraint(
                    "CK_PurchaseOrderItem_QuantityPurchased_Positive",
                    "\"QuantityPurchased\" > 0");
                table.HasCheckConstraint(
                    "CK_PurchaseOrderItem_QuantityRemaining_Range",
                    "\"QuantityRemaining\" >= 0 AND \"QuantityRemaining\" <= \"QuantityPurchased\"");
                table.HasCheckConstraint(
                    "CK_PurchaseOrderItem_Money_NonNegative",
                    "\"UnitPriceCents\" >= 0 AND \"TotalCostCents\" >= 0 AND \"VatAmountCents\" >= 0 " +
                    "AND \"BaseUnitPriceCents\" >= 0 AND \"BaseTotalCostCents\" >= 0 " +
                    "AND \"BaseVatAmountCents\" >= 0");
                table.HasCheckConstraint(
                    "CK_PurchaseOrderItem_ItemShape",
                    "(\"ItemCount\" IS NULL AND \"LengthPerItem\" IS NULL) " +
                    "OR (\"ItemCount\" > 0 AND \"LengthPerItem\" > 0)");
            });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.QuantityPurchased).HasPrecision(18, 4);
            entity.Property(x => x.QuantityRemaining).HasPrecision(18, 4);
            entity.Property(x => x.LengthPerItem).HasPrecision(18, 4);
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasOne(x => x.PurchaseOrder)
                .WithMany(x => x.Items)
                .HasForeignKey(x => x.PurchaseOrderId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Material)
                .WithMany(x => x.PurchaseOrderItems)
                .HasForeignKey(x => x.MaterialId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => new { x.MaterialId, x.Id });
            entity.HasIndex(x => x.PurchaseOrderId);
        });
    }

    private static void ConfigureProduction(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ProductBom>(entity =>
        {
            entity.ToTable("ProductBom", table =>
                table.HasCheckConstraint("CK_ProductBom_LabourCost_NonNegative", "\"LabourCostCents\" >= 0"));
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CurrencyCode).HasMaxLength(3).HasDefaultValue("UAH");
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasOne(x => x.Product)
                .WithOne(x => x.Bom)
                .HasForeignKey<ProductBom>(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Currency)
                .WithMany()
                .HasForeignKey(x => x.CurrencyCode)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.ProductId).IsUnique().HasFilter("\"IsVoid\" = false");
        });

        modelBuilder.Entity<ProductBomItem>(entity =>
        {
            entity.ToTable("ProductBomItem", table =>
                table.HasCheckConstraint("CK_ProductBomItem_Quantity_Positive", "\"QuantityRequired\" > 0"));
            entity.HasKey(x => x.Id);
            entity.Property(x => x.QuantityRequired).HasPrecision(18, 4);
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasOne(x => x.ProductBom)
                .WithMany(x => x.Items)
                .HasForeignKey(x => x.ProductBomId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Material)
                .WithMany(x => x.BomItems)
                .HasForeignKey(x => x.MaterialId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => new { x.ProductBomId, x.MaterialId })
                .IsUnique()
                .HasFilter("\"IsVoid\" = false");
        });

        modelBuilder.Entity<ProductionOrder>(entity =>
        {
            entity.ToTable("ProductionOrder", table =>
            {
                table.HasCheckConstraint(
                    "CK_ProductionOrder_Quantities",
                    "\"QuantityProduced\" > 0 AND \"QuantityRejected\" >= 0 " +
                    "AND \"QuantityRejected\" <= \"QuantityProduced\"");
                table.HasCheckConstraint(
                    "CK_ProductionOrder_Costs_NonNegative",
                    "\"TotalMaterialCostCents\" >= 0 AND \"TotalLabourCostCents\" >= 0 " +
                    "AND \"TotalCogsCents\" >= 0");
                table.HasCheckConstraint(
                    "CK_ProductionOrder_Status",
                    "\"Status\" IN ('draft', 'completed', 'cancelled')");
            });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("draft");
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasOne(x => x.Product)
                .WithMany(x => x.ProductionOrders)
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.ProductionDate);
            entity.HasIndex(x => x.ProductId);
        });

        modelBuilder.Entity<ProductionMaterialConsumption>(entity =>
        {
            entity.ToTable("ProductionMaterialConsumption", table =>
            {
                table.HasCheckConstraint(
                    "CK_ProductionMaterialConsumption_Quantity_Positive",
                    "\"QuantityUsed\" > 0");
                table.HasCheckConstraint(
                    "CK_ProductionMaterialConsumption_Cost_NonNegative",
                    "\"UnitCostAtUseCents\" >= 0 AND \"TotalCostCents\" >= 0");
            });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.QuantityUsed).HasPrecision(18, 4);
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasOne(x => x.ProductionOrder)
                .WithMany(x => x.MaterialConsumptions)
                .HasForeignKey(x => x.ProductionOrderId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.PurchaseOrderItem)
                .WithMany(x => x.Consumptions)
                .HasForeignKey(x => x.PurchaseOrderItemId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.ProductionOrderId);
            entity.HasIndex(x => x.PurchaseOrderItemId);
        });

        modelBuilder.Entity<FinishedGoodsInventory>(entity =>
        {
            entity.ToTable("FinishedGoodsInventory", table =>
            {
                table.HasCheckConstraint(
                    "CK_FinishedGoodsInventory_Quantity_NonNegative",
                    "\"QuantityOnHand\" >= 0");
                table.HasCheckConstraint(
                    "CK_FinishedGoodsInventory_Cost_NonNegative",
                    "\"AverageUnitCostCents\" >= 0");
            });
            entity.HasKey(x => x.ProductId);
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasOne(x => x.Product)
                .WithOne(x => x.FinishedGoodsInventory)
                .HasForeignKey<FinishedGoodsInventory>(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<FinishedGoodsLot>(entity =>
        {
            entity.ToTable("FinishedGoodsLot", table =>
            {
                table.HasCheckConstraint(
                    "CK_FinishedGoodsLot_Quantity_Positive",
                    "\"QuantityProduced\" > 0");
                table.HasCheckConstraint(
                    "CK_FinishedGoodsLot_QuantityRemaining_Range",
                    "\"QuantityRemaining\" >= 0 AND \"QuantityRemaining\" <= \"QuantityProduced\"");
                table.HasCheckConstraint(
                    "CK_FinishedGoodsLot_Cost_NonNegative",
                    "\"UnitCostCents\" >= 0");
                table.HasCheckConstraint(
                    "CK_FinishedGoodsLot_Applied_Range",
                    "\"AppliedToStorefrontQuantity\" >= 0 " +
                    "AND \"AppliedToStorefrontQuantity\" <= \"QuantityProduced\"");
            });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Lace).HasDefaultValue(false);
            entity.Property(x => x.AppliedToStorefrontQuantity).HasDefaultValue(0);
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
            // One-to-many: a single production run yields one lot per distinct unit cost
            // (FIFO can cross a raw-material lot boundary mid-run).
            entity.HasOne(x => x.ProductionOrder)
                .WithMany(x => x.FinishedGoodsLots)
                .HasForeignKey(x => x.ProductionOrderId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Color)
                .WithMany()
                .HasForeignKey(x => x.ColorId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Size)
                .WithMany()
                .HasForeignKey(x => x.SizeId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => new { x.ProductId, x.Id });
            entity.HasIndex(x => x.ProductionOrderId);
        });

        modelBuilder.Entity<SalesFinishedGoodsConsumption>(entity =>
        {
            entity.ToTable("SalesFinishedGoodsConsumption", table =>
            {
                table.HasCheckConstraint(
                    "CK_SalesFinishedGoodsConsumption_Quantity_Positive",
                    "\"Quantity\" > 0");
                table.HasCheckConstraint(
                    "CK_SalesFinishedGoodsConsumption_Cost_NonNegative",
                    "\"UnitCostAtSaleCents\" >= 0 AND \"TotalCostCents\" >= 0");
            });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasOne(x => x.SalesOrderItem)
                .WithMany(x => x.FinishedGoodsConsumptions)
                .HasForeignKey(x => x.SalesOrderItemId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.FinishedGoodsLot)
                .WithMany(x => x.Consumptions)
                .HasForeignKey(x => x.FinishedGoodsLotId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.SalesOrderItemId);
            entity.HasIndex(x => x.FinishedGoodsLotId);
        });
    }

    private static void ConfigureSalesAndReturns(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SalesChannel>(entity =>
        {
            entity.ToTable("SalesChannel", table =>
            {
                table.HasCheckConstraint(
                    "CK_SalesChannel_FeeType",
                    "\"FeeType\" IN ('none', 'percentage', 'flat', 'percentage_plus_flat')");
                table.HasCheckConstraint(
                    "CK_SalesChannel_Fees",
                    "\"FeePercentage\" >= 0 AND \"FeePercentage\" <= 100 AND \"FeeFlatCents\" >= 0");
            });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(150).IsRequired();
            entity.Property(x => x.FeeType).HasMaxLength(30).HasDefaultValue("none");
            entity.Property(x => x.FeePercentage).HasPrecision(7, 4);
            entity.Property(x => x.CurrencyCode).HasMaxLength(3).HasDefaultValue("UAH");
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasOne(x => x.Currency)
                .WithMany()
                .HasForeignKey(x => x.CurrencyCode)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.Name).IsUnique().HasFilter("\"IsVoid\" = false");
        });

        modelBuilder.Entity<ReturnOrder>(entity =>
        {
            entity.ToTable("ReturnOrder", table =>
            {
                table.HasCheckConstraint(
                    "CK_ReturnOrder_Reason",
                    "\"Reason\" IN ('customer_request', 'defective', 'wrong_item', 'other')");
                table.HasCheckConstraint(
                    "CK_ReturnOrder_Resolution",
                    "\"Resolution\" IN ('restock', 'reclaim_materials', 'write_off')");
                table.HasCheckConstraint(
                    "CK_ReturnOrder_Status",
                    "\"Status\" IN ('draft', 'approved', 'completed', 'cancelled')");
                table.HasCheckConstraint(
                    "CK_ReturnOrder_Refund_NonNegative",
                    "\"RefundAmountCents\" >= 0");
                table.HasCheckConstraint(
                    "CK_ReturnOrder_ExchangeRate_Positive",
                    "\"ExchangeRateToBase\" > 0");
            });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Reason).HasMaxLength(30);
            entity.Property(x => x.Resolution).HasMaxLength(20);
            entity.Property(x => x.CurrencyCode).HasMaxLength(3).HasDefaultValue("UAH");
            entity.Property(x => x.ExchangeRateToBase).HasPrecision(18, 8).HasDefaultValue(1m);
            entity.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("draft");
            entity.Property(x => x.Notes).HasMaxLength(2000);
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasOne(x => x.SalesOrder)
                .WithMany(x => x.ReturnOrders)
                .HasForeignKey(x => x.SalesOrderId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Currency)
                .WithMany()
                .HasForeignKey(x => x.CurrencyCode)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.SalesOrderId);
            entity.HasIndex(x => x.ReturnDate);
        });

        modelBuilder.Entity<ReturnOrderItem>(entity =>
        {
            entity.ToTable("ReturnOrderItem", table =>
            {
                table.HasCheckConstraint("CK_ReturnOrderItem_Quantity_Positive", "\"Quantity\" > 0");
                table.HasCheckConstraint(
                    "CK_ReturnOrderItem_Money_NonNegative",
                    "\"RefundAmountCents\" >= 0 AND \"VatReversedCents\" >= 0 " +
                    "AND \"CogsReversedCents\" >= 0 AND \"FeeReversedCents\" >= 0 " +
                    "AND \"MaterialsReclaimedCents\" >= 0");
            });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasOne(x => x.ReturnOrder)
                .WithMany(x => x.Items)
                .HasForeignKey(x => x.ReturnOrderId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.SalesOrderItem)
                .WithMany(x => x.ReturnItems)
                .HasForeignKey(x => x.SalesOrderItemId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.ReturnOrderId);
            entity.HasIndex(x => x.SalesOrderItemId);
        });
    }

    private static void ConfigureExpenses(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OperatingExpenseCategory>(entity =>
        {
            entity.ToTable("OperatingExpenseCategory");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(100).IsRequired();
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasIndex(x => x.Name).IsUnique().HasFilter("\"IsVoid\" = false");
        });

        modelBuilder.Entity<OperatingExpense>(entity =>
        {
            entity.ToTable("OperatingExpense", table =>
            {
                table.HasCheckConstraint(
                    "CK_OperatingExpense_Money_NonNegative",
                    "\"AmountCents\" >= 0 AND \"VatAmountCents\" >= 0 " +
                    "AND \"BaseAmountCents\" >= 0 AND \"BaseVatAmountCents\" >= 0");
                table.HasCheckConstraint(
                    "CK_OperatingExpense_ExchangeRate_Positive",
                    "\"ExchangeRateToBase\" > 0");
                table.HasCheckConstraint(
                    "CK_OperatingExpense_Status",
                    "\"Status\" IN ('draft', 'posted', 'cancelled')");
            });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CurrencyCode).HasMaxLength(3).HasDefaultValue("UAH");
            entity.Property(x => x.ExchangeRateToBase).HasPrecision(18, 8).HasDefaultValue(1m);
            entity.Property(x => x.Vendor).HasMaxLength(255);
            entity.Property(x => x.Description).HasMaxLength(2000);
            entity.Property(x => x.PaymentMethod).HasMaxLength(100);
            entity.Property(x => x.ReceiptUrl).HasMaxLength(2048);
            entity.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("posted");
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            ConfigureAudit(entity);
            entity.HasOne(x => x.Category)
                .WithMany(x => x.Expenses)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Currency)
                .WithMany()
                .HasForeignKey(x => x.CurrencyCode)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.Date);
            entity.HasIndex(x => x.CategoryId);
        });
    }

    private static void ConfigureExistingAccountingExtensions(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Material>(entity =>
        {
            entity.Property(x => x.Category).HasMaxLength(100);
            entity.Property(x => x.ReorderThreshold).HasPrecision(18, 4);
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            entity.Property(x => x.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(x => x.TrackByItem).HasDefaultValue(false);
            entity.Property(x => x.DefaultLengthPerItem).HasPrecision(18, 4);
        });

        modelBuilder.Entity<Models.Product>(entity =>
        {
            entity.Property(x => x.SellingPriceCents).HasDefaultValue(0L);
            entity.Property(x => x.SellingCurrencyCode).HasMaxLength(3).HasDefaultValue("UAH");
            entity.Property(x => x.MarginThresholdPct).HasPrecision(5, 2).HasDefaultValue(60m);
            entity.Property(x => x.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            entity.HasOne(x => x.SellingCurrency)
                .WithMany()
                .HasForeignKey(x => x.SellingCurrencyCode)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Models.Order>(entity =>
        {
            entity.Property(x => x.CurrencyCode).HasMaxLength(3).HasDefaultValue("UAH");
            entity.Property(x => x.ExchangeRateToBase).HasPrecision(18, 8).HasDefaultValue(1m);
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(x => x.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            entity.HasOne(x => x.Channel)
                .WithMany(x => x.SalesOrders)
                .HasForeignKey(x => x.ChannelId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Currency)
                .WithMany()
                .HasForeignKey(x => x.CurrencyCode)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.ChannelId);
        });

        modelBuilder.Entity<Models.OrderItem>(entity =>
        {
            entity.ToTable("OrderItem", table =>
                table.HasCheckConstraint(
                    "CK_OrderItem_AccountingMoney_NonNegative",
                    "\"ListedPriceCents\" >= 0 AND \"NetPriceCents\" >= 0 " +
                    "AND \"ChannelFeeShareCents\" >= 0 AND \"UnitCogsCents\" >= 0 " +
                    "AND \"VatAmountCents\" >= 0"));
            entity.Property(x => x.IsVoid).HasDefaultValue(false);
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(x => x.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });
    }

    private static void ConfigureAudit<TEntity>(Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntity> entity)
        where TEntity : class
    {
        entity.Property<DateTime>("CreatedAt").HasDefaultValueSql("CURRENT_TIMESTAMP");
        entity.Property<DateTime>("UpdatedAt").HasDefaultValueSql("CURRENT_TIMESTAMP");
        entity.HasIndex("CreatedBy");
    }
}
