namespace YarneAPIBack.Models;

public class AppSetting
{
    public string Key { get; set; } = null!;

    public string ValueJson { get; set; } = "{}";

    public DateTime UpdatedAt { get; set; }
}
