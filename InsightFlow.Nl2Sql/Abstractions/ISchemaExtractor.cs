namespace InsightFlow.Nl2Sql.Abstractions;

using InsightFlow.Nl2Sql.Models;

public interface ISchemaExtractor
{
    /// <summary>
    /// Connects to the target database and extracts its tables, columns, and data types,
    /// filtering out any restricted columns specified in the UserSecurityContext.
    /// </summary>
    Task<DatabaseSchema> ExtractSchemaAsync( string connectionString, UserSecurityContext? securityContext = null,  CancellationToken ct = default);
}