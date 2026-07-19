using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using YarneAPIBack.Accounting.Models;
using StoreModels = YarneAPIBack.Models;

namespace YarneAPIBack.Data;

public sealed class AccountingAuditInterceptor : SaveChangesInterceptor
{
    private static readonly HashSet<Type> NoHardDeleteTypes =
    [
        typeof(AccountingCurrency),
        typeof(CurrencyExchangeRate),
        typeof(Supplier),
        typeof(PurchaseOrder),
        typeof(PurchaseOrderItem),
        typeof(ProductBom),
        typeof(ProductBomItem),
        typeof(ProductionOrder),
        typeof(ProductionMaterialConsumption),
        typeof(FinishedGoodsInventory),
        typeof(SalesChannel),
        typeof(ReturnOrder),
        typeof(ReturnOrderItem),
        typeof(OperatingExpenseCategory),
        typeof(OperatingExpense),
        typeof(StoreModels.Order),
        typeof(StoreModels.OrderItem),
        typeof(StoreModels.Product),
        typeof(Material),
        typeof(ImportTransaction),
        typeof(ImportTransactionLine),
        typeof(Expense),
        typeof(ExpenseCategory),
        typeof(MaterialUsageRecord),
    ];

    private readonly IHttpContextAccessor _httpContextAccessor;

    public AccountingAuditInterceptor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        ApplyAudit(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ApplyAudit(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ApplyAudit(DbContext? context)
    {
        if (context is null)
            return;
        var now = DateTime.UtcNow;
        var actorId = GetActorId();
        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Deleted && NoHardDeleteTypes.Contains(entry.Metadata.ClrType))
            {
                throw new InvalidOperationException(
                    $"{entry.Metadata.ClrType.Name} is a retained accounting record and cannot be hard-deleted.");
            }
            if (entry.State is not (EntityState.Added or EntityState.Modified))
                continue;

            SetTimestamp(entry, "UpdatedAt", now);
            if (entry.State == EntityState.Added)
                SetTimestampIfDefault(entry, "CreatedAt", now);
            if (actorId.HasValue)
                SetActorIfMissing(entry, actorId.Value);
        }
    }

    private int? GetActorId()
    {
        var value = _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var id) ? id : null;
    }

    private static void SetTimestamp(EntityEntry entry, string propertyName, DateTime value)
    {
        if (entry.Metadata.FindProperty(propertyName) is not null)
            entry.Property(propertyName).CurrentValue = value;
    }

    private static void SetTimestampIfDefault(EntityEntry entry, string propertyName, DateTime value)
    {
        if (entry.Metadata.FindProperty(propertyName) is null)
            return;
        var property = entry.Property(propertyName);
        if (property.CurrentValue is null || property.CurrentValue is DateTime { } current && current == default)
            property.CurrentValue = value;
    }

    private static void SetActorIfMissing(EntityEntry entry, int actorId)
    {
        const string propertyName = "CreatedBy";
        if (entry.Metadata.FindProperty(propertyName) is null)
            return;
        var property = entry.Property(propertyName);
        if (property.CurrentValue is null || property.CurrentValue is int current && current == 0)
            property.CurrentValue = actorId;
    }
}
