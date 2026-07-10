using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Data;
using YarneAPIBack.Models;

namespace YarneAPIBack.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly YarneDbContext _context;

    public UsersController(YarneDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<UserDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetAllUsers(CancellationToken cancellationToken = default)
    {
        var users = await _context.Customers
            .Select(c => new UserDto
            {
                Id = c.Id,
                FirstName = c.FirstName,
                LastName = c.LastName,
                UserName = c.UserName,
                Email = c.Email,
                PhoneNumber = c.PhoneNumber,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    /// <summary>
    /// Grants the Admin role to a user. Idempotent — safe to call even if role already assigned.
    /// </summary>
    [HttpPost("{id:int}/roles/admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GrantAdminRole(int id, CancellationToken cancellationToken = default)
    {
        var customer = await _context.Customers
            .Include(c => c.CustomerRoles)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer == null)
            return NotFound(new { message = "User not found." });

        var adminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Admin", cancellationToken);
        if (adminRole == null)
        {
            adminRole = new Role { Name = "Admin" };
            _context.Roles.Add(adminRole);
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (!customer.CustomerRoles.Any(cr => cr.RoleId == adminRole.Id))
        {
            _context.CustomerRoles.Add(new CustomerRole
            {
                CustomerId = customer.Id,
                RoleId = adminRole.Id,
                AssignedAt = DateTime.UtcNow,
            });
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Ok(new { message = $"Admin role granted to {customer.Email}." });
    }

    /// <summary>
    /// Revokes the Admin role from a user. Cannot demote yourself.
    /// </summary>
    [HttpDelete("{id:int}/roles/admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RevokeAdminRole(int id, CancellationToken cancellationToken = default)
    {
        var currentUserIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(currentUserIdRaw, out var currentUserId) && currentUserId == id)
            return BadRequest(new { message = "You cannot remove your own Admin role." });

        var customer = await _context.Customers
            .Include(c => c.CustomerRoles)
                .ThenInclude(cr => cr.Role)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer == null)
            return NotFound(new { message = "User not found." });

        var adminRoleEntry = customer.CustomerRoles.FirstOrDefault(cr => cr.Role.Name == "Admin");
        if (adminRoleEntry == null)
            return Ok(new { message = $"{customer.Email} does not have the Admin role." });

        _context.CustomerRoles.Remove(adminRoleEntry);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = $"Admin role revoked from {customer.Email}." });
    }
}
