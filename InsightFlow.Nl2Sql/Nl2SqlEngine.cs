using System.Diagnostics;
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
        int? timeoutSeconds = null,
        int? maxRowLimit = null,
        CancellationToken ct = default)
    {
        int effectiveTimeout = (timeoutSeconds.HasValue && timeoutSeconds.Value > 0)
            ? timeoutSeconds.Value
            : _options.QueryTimeoutSeconds;

        int effectiveMaxRows = (maxRowLimit.HasValue && maxRowLimit.Value > 0)
            ? maxRowLimit.Value
            : _options.MaxRowLimit;

        var stopwatch = Stopwatch.StartNew();
        string sanitizedSql = string.Empty;

        try
        {
            // 1. Direct Input Pre-Check: Block raw DDL/DML mutation prompts upfront without hitting LLM
            var trimmedPrompt = userPrompt.TrimStart();
            if (trimmedPrompt.StartsWith("DELETE", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrompt.StartsWith("DROP", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrompt.StartsWith("UPDATE", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrompt.StartsWith("INSERT", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrompt.StartsWith("EXEC", StringComparison.OrdinalIgnoreCase) ||
                trimmedPrompt.StartsWith("ALTER", StringComparison.OrdinalIgnoreCase))
            {
                stopwatch.Stop();
                return Nl2SqlQueryResult.Failure(
                    "Security Violation: Direct DDL/DML mutation statements are strictly prohibited.",
                    userPrompt,
                    new QueryExecutionStats(stopwatch.ElapsedMilliseconds, 0, effectiveMaxRows, effectiveTimeout));
            }

            // 2. Extract database schema
            var schema = await _schemaExtractor.ExtractSchemaAsync(connectionString, securityContext, ct);

            // 3. Convert natural language prompt to raw SQL and chart recommendation via LLM synthesizer
            var synthesisResult = await _synthesizer.SynthesizeSqlAsync(userPrompt, schema, ct);
            var rawSql = synthesisResult.Sql;

            // 4. Validate SQL via AST Guardrails (enforce effectiveMaxRows)
            var (isSafe, securedSql, violationError) = _guardrail.ValidateAndSecureSql(rawSql, securityContext, effectiveMaxRows);
            sanitizedSql = securedSql;

            if (!isSafe)
            {
                stopwatch.Stop();
                return Nl2SqlQueryResult.Failure(
                    $"Security Violation: {violationError}", 
                    rawSql,
                    new QueryExecutionStats(stopwatch.ElapsedMilliseconds, 0, effectiveMaxRows, effectiveTimeout));
            }

            // 5. Execute query (enforce effectiveTimeout)
            var dataRows = await _executor.ExecuteReaderAsync(
                connectionString, 
                sanitizedSql, 
                effectiveTimeout, 
                ct);

            // 6. Check for LLM synthetic error response
            if (dataRows.Count == 1 && dataRows[0].ContainsKey("Error"))
            {
                var errVal = dataRows[0]["Error"]?.ToString();
                if (!string.IsNullOrWhiteSpace(errVal) && errVal.StartsWith("ERROR:", StringComparison.OrdinalIgnoreCase))
                {
                    stopwatch.Stop();
                    return Nl2SqlQueryResult.Failure(
                        errVal, 
                        sanitizedSql,
                        new QueryExecutionStats(stopwatch.ElapsedMilliseconds, 0, effectiveMaxRows, effectiveTimeout));
                }
            }

            // 7: Post-Execution Sanitization (Masked columns)
            if (securityContext?.RestrictedColumns != null && securityContext.RestrictedColumns.Count > 0 && dataRows != null)
            {
                SanitizeDataRows(dataRows, securityContext.RestrictedColumns);
            }

            stopwatch.Stop();
            var stats = new QueryExecutionStats(
                stopwatch.ElapsedMilliseconds, 
                dataRows?.Count ?? 0, 
                effectiveMaxRows, 
                effectiveTimeout);

            bool returnJson = _options.ResponseFormat == OutputFormat.Json;
            return Nl2SqlQueryResult.Success(sanitizedSql, dataRows, returnJson, synthesisResult.Chart, stats);
        }
        catch (TimeoutException tex)
        {
            stopwatch.Stop();
            return Nl2SqlQueryResult.Failure(
                tex.Message, 
                sanitizedSql, 
                new QueryExecutionStats(stopwatch.ElapsedMilliseconds, 0, effectiveMaxRows, effectiveTimeout));
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            stopwatch.Stop();
            return Nl2SqlQueryResult.Failure(
                $"Query execution timed out after {effectiveTimeout} seconds.", 
                sanitizedSql, 
                new QueryExecutionStats(stopwatch.ElapsedMilliseconds, 0, effectiveMaxRows, effectiveTimeout));
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return Nl2SqlQueryResult.Failure(
                ex.Message, 
                sanitizedSql, 
                new QueryExecutionStats(stopwatch.ElapsedMilliseconds, 0, effectiveMaxRows, effectiveTimeout));
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