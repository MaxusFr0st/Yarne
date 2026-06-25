namespace YarneAPIBack.Accounting;

public class AccountingBusinessException : Exception
{
    public AccountingBusinessException(string message) : base(message) { }
}
