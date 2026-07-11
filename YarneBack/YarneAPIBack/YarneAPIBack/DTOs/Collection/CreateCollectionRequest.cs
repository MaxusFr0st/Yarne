namespace YarneAPIBack.DTOs.Collection;

public class CreateCollectionRequest
{
    public string Name { get; set; } = null!;

    public DateOnly? StartDate { get; set; }

    public DateOnly? EndDate { get; set; }
}
