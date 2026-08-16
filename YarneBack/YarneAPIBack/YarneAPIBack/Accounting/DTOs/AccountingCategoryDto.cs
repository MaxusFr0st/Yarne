namespace YarneAPIBack.Accounting.DTOs;

public class AccountingCategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateAccountingCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UpdateAccountingCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
