using YarneAPIBack.Accounting.DTOs;

namespace YarneAPIBack.Accounting.Services.Contracts;

public interface IReturnService
{
    Task<IReadOnlyList<ReturnOrderDto>> GetReturnsAsync(
        DateTime? from,
        DateTime? to,
        CancellationToken ct = default);
    Task<ReturnOrderDto?> GetReturnAsync(int id, CancellationToken ct = default);
    Task<ReturnOrderDto> CreateReturnAsync(
        CreateReturnOrderRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<ReturnOrderDto?> CompleteReturnAsync(
        int id,
        int? actorId,
        CancellationToken ct = default);
    Task<bool> VoidDraftReturnAsync(int id, int? actorId, CancellationToken ct = default);
}
