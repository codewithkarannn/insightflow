namespace InsightFlow.Nl2Sql.Models;

public interface ISqlExecutor
{
    /// <summary>
    /// Executes a sanitized, read-only SQL query against the target connection string
    /// and returns the dataset as a list of column-value dictionaries.
    /// </summary>
    Task<List<Dictionary<string, object?>>> ExecuteReaderAsync(
        string connectionString, 
        string sanitizedSql, 
        int timeoutSeconds = 5, 
        CancellationToken ct = default);
}