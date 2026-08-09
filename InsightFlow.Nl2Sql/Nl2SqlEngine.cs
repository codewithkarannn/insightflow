using InsightFlow.Nl2Sql.Abstractions;
using InsightFlow.Nl2Sql.Models;
using Microsoft.Extensions.Options;

namespace InsightFlow.Nl2Sql;

public class Nl2SqlEngine : INl2SqlEngine
{
    private readonly ISchemaExtractor _schemaExtractor;
    private readonly ISqlSynthesizer _synthesizer;
    private readonly ISqlGuardrail _guardrail;
    private readonly Nl2SqlOptions _options;
    private readonly ISqlExecutor _executor;

    public Nl2SqlEngine(
        ISchemaExtractor schemaExtractor,
        ISqlSynthesizer synthesizer,
        ISqlGuardrail guardrail,
        IOptions<Nl2SqlOptions> options,
        ISqlExecutor executor)
    {
        _schemaExtractor = schemaExtractor;
        _synthesizer = synthesizer;
        _guardrail = guardrail;
        _options = options.Value;
        _executor = executor;
    }

    public async Task<Nl2SqlQueryResult> ExecuteQueryAsync(
        string userPrompt, 
        string connectionString, 
        UserSecurityContext? securityContext = null, 
        CancellationToken ct = default)
    {
        try
        {
            // 1. Direct Input Pre-Check: Block raw DDL/DML mutation prompts upfront without hitting LLM
            var trimmedPrompt = userPrompt.TrimStart();
            if (trimmedPrompt.StartsWith("DELETE", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrompt.StartsWith("DROP", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrompt.StartsWith("UPDATE", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrompt.StartsWith("INSERT", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrompt.StartsWith("ALTER", StringComparison.OrdinalIgnoreCase))
            {
                return new Nl2SqlQueryResult(
                    IsSuccess: false,
                    GeneratedSql: userPrompt,
                    Data: null,
                    ErrorMessage: "Security Violation: Direct DDL/DML mutation statements are strictly prohibited.");
            }

            // 2. Extract database schema
            var schema = await _schemaExtractor.ExtractSchemaAsync(connectionString, securityContext, ct);

            // 3. Convert natural language prompt to raw SQL and chart recommendation via LLM synthesizer
            var synthesisResult = await _synthesizer.SynthesizeSqlAsync(userPrompt, schema, ct);
            var rawSql = synthesisResult.Sql;

            // 4. Validate SQL via AST Guardrails
            var (isSafe, sanitizedSql, violationError) = _guardrail.ValidateAndSecureSql(rawSql, securityContext, _options.MaxRowLimit);

            if (!isSafe)
            {
                return new Nl2SqlQueryResult(
                    IsSuccess: false, 
                    GeneratedSql: rawSql, 
                    Data: null, 
                    ErrorMessage: $"Security Violation: {violationError}");
            }

            // 5. Execute query
            var dataRows = await _executor.ExecuteReaderAsync(
                connectionString, 
                sanitizedSql, 
                _options.QueryTimeoutSeconds, 
                ct);

            // 6. Check for LLM synthetic error response
            if (dataRows.Count == 1 && dataRows[0].ContainsKey("Error"))
            {
                var errVal = dataRows[0]["Error"]?.ToString();
                if (!string.IsNullOrWhiteSpace(errVal) && errVal.StartsWith("ERROR:", StringComparison.OrdinalIgnoreCase))
                {
                    return Nl2SqlQueryResult.Failure(errVal, sanitizedSql);
                }
            }

            // 7: Post-Execution Sanitization (Masked columns)
            if (securityContext?.RestrictedColumns != null && securityContext.RestrictedColumns.Count > 0 && dataRows != null)
            {
                SanitizeDataRows(dataRows, securityContext.RestrictedColumns);
            }

            bool returnJson = _options.ResponseFormat == OutputFormat.Json;
            return Nl2SqlQueryResult.Success(sanitizedSql, dataRows, returnJson, synthesisResult.Chart);
        }
        catch (Exception ex)
        {
            return new Nl2SqlQueryResult(
                IsSuccess: false, 
                GeneratedSql: string.Empty, 
                Data: null, 
                ErrorMessage: ex.Message);
        }
    }

    private static void SanitizeDataRows(List<Dictionary<string, object?>> rows, HashSet<string> restrictedColumns)
    {
        var restrictedNames = restrictedColumns
            .Select(col => col.Contains('.') ? col.Split('.')[1] : col)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var row in rows)
        {
            var keysToRemove = row.Keys.Where(key => restrictedNames.Contains(key)).ToList();
            foreach (var key in keysToRemove)
            {
                row.Remove(key);
            }
        }
    }
}