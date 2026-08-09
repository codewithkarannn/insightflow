namespace InsightFlow.Nl2Sql.Abstractions;

using InsightFlow.Nl2Sql.Models;

public interface INl2SqlEngine
{
    /// <summary>
    /// Converts a natural language question into safe SQL, validates it against security rules,
    /// and returns the generated query and execution results.
    /// </summary>
    Task<Nl2SqlQueryResult> ExecuteQueryAsync(
        string userPrompt, 
        string connectionString, 
        UserSecurityContext? securityContext = null, 
        CancellationToken ct = default);
}