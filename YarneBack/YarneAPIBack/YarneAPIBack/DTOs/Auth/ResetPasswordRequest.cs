using System.ComponentModel.DataAnnotations;
using YarneAPIBack.Services;

namespace YarneAPIBack.DTOs.Auth;

public class ResetPasswordRequest
{
    [StringLength(200)]
    public string? Token { get; set; }

    // The password rule is checked in the action (PasswordRules), so a weak password and a bad link get their own answers.
    [StringLength(PasswordRules.MaxLength + 100)]
    public string? NewPassword { get; set; }
}
