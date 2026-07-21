using YarneAPIBack.Accounting.DTOs;

namespace YarneAPIBack.Accounting.Services.Contracts;

public interface ISalesAccountingService
{
    Task<IReadOnlyList<AccountingCustomerDto>> GetCustomersAsync(CancellationToken ct = default);
    Task<AccountingCustomerDto> CreateCustomerAsync(
        SaveAccountingCustomerRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<AccountingCustomerDto?> UpdateCustomerAsync(
        int id,
        SaveAccountingCustomerRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<bool> VoidCustomerAsync(int id, int? actorId, CancellationToken ct = default);
    Task<IReadOnlyList<SalesChannelDto>> GetChannelsAsync(CancellationToken ct = default);
    Task<SalesChannelDto> CreateChannelAsync(
        SaveSalesChannelRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<SalesChannelDto?> UpdateChannelAsync(
        int id,
        SaveSalesChannelRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<bool> VoidChannelAsync(int id, int? actorId, CancellationToken ct = default);

    Task<IReadOnlyList<AccountingSalesOrderDto>> GetSalesOrdersAsync(
        DateTime? from,
        DateTime? to,
        CancellationToken ct = default);
    Task<AccountingSalesOrderDto?> GetSalesOrderAsync(int id, CancellationToken ct = default);
    Task<AccountingSalesOrderDto> CreateSalesOrderAsync(
        CreateAccountingSalesOrderRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<bool> VoidSalesOrderAsync(int id, int? actorId, CancellationToken ct = default);

    /// <summary>
    /// Retroactively runs FIFO COGS consumption on an already-existing website <c>Order</c>'s
    /// items and assigns it to the "Онлайн магазин" channel, so it starts showing correctly in
    /// the Accounting Sales list. Does not create a new order or touch stock counters (those were
    /// already decremented at checkout) — idempotent, safe to call more than once. If checkout
    /// already recorded FIFO consumption for this order's items (see
    /// <see cref="ConsumeFinishedGoodsFifoAsync"/>), this is a full no-op.
    /// </summary>
    Task ComposeReceivedOrderAsync(int orderId, int? actorId, CancellationToken ct = default);

    /// <summary>
    /// Consumes finished-goods lots FIFO (oldest first) for <paramref name="quantity"/> units of
    /// <paramref name="productId"/>, decrementing each lot's <c>QuantityRemaining</c> and
    /// returning the per-lot slices consumed (for costing and for recording
    /// <c>SalesFinishedGoodsConsumption</c> rows). Must be called inside a transaction that also
    /// locks/decrements the product's pooled <c>QuantityInStock</c> and
    /// <c>FinishedGoodsInventory.QuantityOnHand</c> counters, so the FIFO ledger and the pooled
    /// counters move together. Throws <see cref="AccountingBusinessException"/> if not enough lot
    /// stock remains.
    /// </summary>
    Task<IReadOnlyList<FinishedGoodsFifoConsumption>> ConsumeFinishedGoodsFifoAsync(
        int productId,
        int quantity,
        CancellationToken ct = default);

    /// <summary>
    /// Self-heal: resets <c>Product.QuantityInStock</c> and
    /// <c>FinishedGoodsInventory.QuantityOnHand</c> to the sum of <c>FinishedGoodsLot.QuantityRemaining</c>
    /// (non-void lots) for every product that has a finished-goods ledger. Use when pooled
    /// counters have drifted from the lot-authoritative ledger. Returns the number of rows adjusted.
    /// </summary>
    Task<int> ReconcileFinishedGoodsAsync(int? actorId, CancellationToken ct = default);
}
