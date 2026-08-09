using System.Text.RegularExpressions;
using InsightFlow.Nl2Sql.Abstractions;
using InsightFlow.Nl2Sql.Models;

namespace InsightFlow.Nl2Sql.Services;

public partial class AstSqlGuardrail : ISqlGuardrail
{
    // Regex patterns for dangerous SQL operations
    [GeneratedRegex(@"\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|CREATE|EXEC|EXECUTE|GRANT|REVOKE)\b", RegexOptions.IgnoreCase)]
    private static partial Regex DangerousKeywordsRegex();

    [GeneratedRegex(@"```(?:sql)?\s*(.*?)\s*```", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex MarkdownFenceRegex();

    [GeneratedRegex(@"\bLIMIT\s+(\d+)\b", RegexOptions.IgnoreCase)]
    private static partial Regex LimitClauseRegex();

    public (bool IsSafe, string SanitizedSql, string? ViolationError) ValidateAndSecureSql(
        string rawSql, 
        UserSecurityContext? securityContext = null, 
        int maxRows = 100)
    {
        if (string.IsNullOrWhiteSpace(rawSql))
        {
            return (false, string.Empty, "SQL query cannot be empty.");
        }

        // 1. Clean markdown formatting if LLM wrapped SQL in code fences
        var cleanSql = CleanMarkdownFormatting(rawSql);

        // 2. Reject multi-statement queries (semicolon injection protection)
        var statements = cleanSql.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (statements.Length > 1)
        {
            return (false, cleanSql, "Multi-statement execution is blocked for security.");
        }

        cleanSql = statements.FirstOrDefault() ?? cleanSql;

        // 3. Must start with SELECT or WITH (CTE)
        var trimmed = cleanSql.TrimStart();
        if (!trimmed.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase) &&
            !trimmed.StartsWith("WITH", StringComparison.OrdinalIgnoreCase))
        {
            return (false, cleanSql, "Only read-only SELECT queries are permitted.");
        }

        // 4. Block destructive keywords (DROP, DELETE, UPDATE, etc.)
        var dangerousMatch = DangerousKeywordsRegex().Match(cleanSql);
        if (dangerousMatch.Success)
        {
            return (false, cleanSql, $"Forbidden SQL operation detected: '{dangerousMatch.Value}'.");
        }

        // 5. Enforce Max Row Limit (Limit injection/cap)
        cleanSql = EnforceLimit(cleanSql, maxRows);

        return (true, cleanSql, null);
    }

    private static string CleanMarkdownFormatting(string sql)
    {
        var match = MarkdownFenceRegex().Match(sql);
        if (match.Success)
        {
            return match.Groups[1].Value.Trim();
        }

        return sql.Trim('`', ' ', '\r', '\n', '\t');
    }

    private static string EnforceLimit(string sql, int maxRows)
    {
        var match = LimitClauseRegex().Match(sql);
        if (match.Success)
        {
            var existingLimit = int.Parse(match.Groups[1].Value);
            if (existingLimit > maxRows)
            {
                // Cap existing limit down to maximum allowed limit
                return LimitClauseRegex().Replace(sql, $"LIMIT {maxRows}");
            }
            return sql;
        }

        // Append LIMIT if absent
        return $"{sql.TrimEnd(';')} LIMIT {maxRows}";
    }
}