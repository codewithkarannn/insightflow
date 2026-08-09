namespace InsightFlow.Nl2Sql.Models;

public interface ISqlSynthesizer
{
    /// <summary>
    /// Translates a natural language prompt into a raw dialect-specific SQL query
    /// and graph/chart recommendations based on the provided database schema.
    /// </summary>
    Task<SqlSynthesisResult> SynthesizeSqlAsync(
        string userPrompt, 
        DatabaseSchema schema, 
        CancellationToken ct = default);
}