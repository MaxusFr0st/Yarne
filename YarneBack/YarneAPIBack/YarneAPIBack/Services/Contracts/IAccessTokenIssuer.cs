using YarneAPIBack.DTOs.Auth;
using YarneAPIBack.Models;

namespace YarneAPIBack.Services.Contracts;

public interface IAccessTokenIssuer
{
    Task<AuthResponse> IssueAsync(Customer customer, CancellationToken ct = default);
}
