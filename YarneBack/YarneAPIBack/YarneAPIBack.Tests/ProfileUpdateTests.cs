using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YarneAPIBack.Controllers;
using YarneAPIBack.Data;
using YarneAPIBack.DTOs.Auth;
using YarneAPIBack.Models;

namespace YarneAPIBack.Tests;

public class ProfileUpdateTests : IDisposable
{
    private readonly YarneDbContext _db;

    public ProfileUpdateTests()
    {
        var options = new DbContextOptionsBuilder<YarneDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new YarneDbContext(options);
        _db.Customers.Add(NewCustomer(1, "anna@example.com", "Anna", "Koval", "+380501112233"));
        _db.Customers.Add(NewCustomer(2, "ivan@example.com", "Ivan", "Petrenko", "+380509998877"));
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private static Customer NewCustomer(int id, string email, string first, string last, string phone) => new()
    {
        Id = id,
        FirstName = first,
        LastName = last,
        UserName = email.Split('@')[0],
        Email = email,
        PhoneNumber = phone,
        PasswordHash = "x",
        PasswordSalt = "x",
        IsActive = true,
    };

    private AuthController As(int? customerId)
    {
        var identity = customerId == null
            ? new ClaimsIdentity()
            : new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, customerId.Value.ToString())], "test");
        return new AuthController(_db, null!, null!, null!, null!, null!)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) },
            },
        };
    }

    [Fact]
    public async Task Save_StoresNameAndPhone_AndReturnsTheProfile()
    {
        var result = await As(1).UpdateMe(new UpdateProfileRequest { FullName = "  Olena Maria Shevchenko ", PhoneNumber = " +380671234567 " }, default);

        var profile = Assert.IsType<CustomerProfileResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Olena Maria Shevchenko", profile.FullName);
        Assert.Equal("+380671234567", profile.PhoneNumber);
        Assert.Equal("anna@example.com", profile.Email);

        var saved = await _db.Customers.AsNoTracking().SingleAsync(c => c.Id == 1);
        Assert.Equal("Olena", saved.FirstName);
        Assert.Equal("Maria Shevchenko", saved.LastName);
        Assert.Equal("+380671234567", saved.PhoneNumber);
        Assert.Equal("anna@example.com", saved.Email);
    }

    [Fact]
    public async Task Save_WithOneWord_LeavesLastNameEmpty_AndBlankPhoneClearsIt()
    {
        var result = await As(1).UpdateMe(new UpdateProfileRequest { FullName = "Olena", PhoneNumber = "  " }, default);

        var profile = Assert.IsType<CustomerProfileResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal("Olena", profile.FullName);
        Assert.Null(profile.PhoneNumber);
    }

    [Fact]
    public async Task Save_DoesNotTouchAnotherCustomer()
    {
        await As(1).UpdateMe(new UpdateProfileRequest { FullName = "Olena Shevchenko", PhoneNumber = "+380671234567" }, default);

        var other = await _db.Customers.AsNoTracking().SingleAsync(c => c.Id == 2);
        Assert.Equal("Ivan", other.FirstName);
        Assert.Equal("Petrenko", other.LastName);
        Assert.Equal("+380509998877", other.PhoneNumber);
    }

    [Theory]
    [InlineData(null, "+380671234567")]
    [InlineData("", null)]
    [InlineData(" a ", null)]
    [InlineData("Olena Shevchenko", "123")]
    public async Task Save_WithInvalidNameOrPhone_Is400_AndChangesNothing(string? fullName, string? phone)
    {
        var result = await As(1).UpdateMe(new UpdateProfileRequest { FullName = fullName, PhoneNumber = phone }, default);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        var unchanged = await _db.Customers.AsNoTracking().SingleAsync(c => c.Id == 1);
        Assert.Equal("Anna", unchanged.FirstName);
        Assert.Equal("+380501112233", unchanged.PhoneNumber);
    }

    [Fact]
    public async Task Save_WithTooLongName_Is400()
    {
        var tooLong = new string('a', 201);
        var oneHugeWord = new string('b', 150) + " Koval";

        Assert.IsType<BadRequestObjectResult>((await As(1).UpdateMe(new UpdateProfileRequest { FullName = tooLong }, default)).Result);
        Assert.IsType<BadRequestObjectResult>((await As(1).UpdateMe(new UpdateProfileRequest { FullName = oneHugeWord }, default)).Result);
    }

    [Fact]
    public async Task Save_WithoutASignedInCustomer_Is401()
    {
        var result = await As(null).UpdateMe(new UpdateProfileRequest { FullName = "Olena Shevchenko" }, default);

        Assert.IsType<UnauthorizedResult>(result.Result);
        Assert.Equal("Anna", (await _db.Customers.AsNoTracking().SingleAsync(c => c.Id == 1)).FirstName);
    }

    [Fact]
    public void Save_RequiresSignIn_AndIsRateLimited()
    {
        var method = typeof(AuthController).GetMethod(nameof(AuthController.UpdateMe))!;

        Assert.NotNull(Attribute.GetCustomAttribute(method, typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute)));
        Assert.NotNull(Attribute.GetCustomAttribute(method, typeof(Microsoft.AspNetCore.RateLimiting.EnableRateLimitingAttribute)));
    }
}
