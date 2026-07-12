namespace YarneAPIBack.Data;

public static class DatabaseReadiness
{
    private static volatile bool _isReady;
    private static string? _lastError;

    public static bool IsReady => _isReady;

    public static string? LastError => _isReady ? null : _lastError;

    public static void MarkReady()
    {
        _isReady = true;
        _lastError = null;
    }

    public static void MarkFailed(string message)
    {
        _isReady = false;
        _lastError = message;
    }
}
