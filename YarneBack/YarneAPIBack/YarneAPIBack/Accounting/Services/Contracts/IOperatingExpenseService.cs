using YarneAPIBack.Accounting.DTOs;

namespace YarneAPIBack.Accounting.Services.Contracts;

public interface IOperatingExpenseService
{
    Task<IReadOnlyList<OperatingExpenseCategoryDto>> GetCategoriesAsync(CancellationToken ct = default);
    Task<OperatingExpenseCategoryDto> CreateCategoryAsync(
        SaveOperatingExpenseCategoryRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<OperatingExpenseCategoryDto?> UpdateCategoryAsync(
        int id,
        SaveOperatingExpenseCategoryRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<bool> VoidCategoryAsync(int id, int? actorId, CancellationToken ct = default);

    Task<IReadOnlyList<OperatingExpenseDto>> GetExpensesAsync(
        DateTime? from,
        DateTime? to,
        int? categoryId,
        CancellationToken ct = default);
    Task<OperatingExpenseDto?> GetExpenseAsync(int id, CancellationToken ct = default);
    Task<OperatingExpenseDto> CreateExpenseAsync(
        SaveOperatingExpenseRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<OperatingExpenseDto?> UpdateExpenseAsync(
        int id,
        SaveOperatingExpenseRequest request,
        int? actorId,
        CancellationToken ct = default);
    Task<bool> VoidExpenseAsync(int id, int? actorId, CancellationToken ct = default);
}
