namespace YarneAPIBack.DTOs.Order;

public class MakingPhotoDto
{
    public int Id { get; set; }

    public DateTime CreatedAt { get; set; }
}

public class MakingPhotosDto
{
    public DateTime? RequestedAt { get; set; }

    public List<MakingPhotoDto> Photos { get; set; } = [];
}
