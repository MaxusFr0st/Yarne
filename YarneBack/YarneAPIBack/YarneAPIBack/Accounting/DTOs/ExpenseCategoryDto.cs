namespace YarneAPIBack.Accounting.DTOs;

public class ExpenseCategoryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateExpenseCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UpdateExpenseCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}
