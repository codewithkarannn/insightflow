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

    [GeneratedRegex(@"\bSELECT\s+(DISTINCT\s+)?TOP\s*\(?\s*(\d+)\s*\)?\s*", RegexOptions.IgnoreCase)]
    private static partial Regex TopClauseRegex();

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

        // 5. Enforce Max Row Limit (Limit injection/cap for LIMIT or TOP)
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
        // 1. Handle TOP clause (T-SQL / SQL Server syntax)
        var topMatch = TopClauseRegex().Match(sql);
        if (topMatch.Success)
        {
            var existingTop = int.Parse(topMatch.Groups[2].Value);
            if (existingTop > maxRows)
            {
                var distinctGroup = topMatch.Groups[1].Value;
                return TopClauseRegex().Replace(sql, $"SELECT {distinctGroup}TOP ({maxRows}) ", 1);
            }
            return sql;
        }

        // 2. Handle LIMIT clause (SQLite, MySQL, PostgreSQL syntax)
        var limitMatch = LimitClauseRegex().Match(sql);
        if (limitMatch.Success)
        {
            var existingLimit = int.Parse(limitMatch.Groups[1].Value);
            if (existingLimit > maxRows)
            {
                // Cap existing limit down to maximum allowed limit
                return LimitClauseRegex().Replace(sql, $"LIMIT {maxRows}", 1);
            }
            return sql;
        }

        // 3. Append LIMIT if absent
        return $"{sql.TrimEnd(';', ' ', '\r', '\n', '\t')} LIMIT {maxRows}";
    }
}