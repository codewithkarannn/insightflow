using System.Text.Json;

namespace InsightFlow.Nl2Sql.Models;

public record QueryExecutionStats(
    long ElapsedMilliseconds,
    int RowCount,
    int RowLimitApplied,
    int TimeoutSecondsApplied);

public record Nl2SqlQueryResult(
    bool IsSuccess,
    string GeneratedSql,
    List<Dictionary<string, object?>>? Data,
    string? ErrorMessage,
    string? JsonData = null,
    ChartRecommendation? Chart = null,
    QueryExecutionStats? Stats = null)
{
    public static Nl2SqlQueryResult Success(
        string generatedSql, 
        List<Dictionary<string, object?>>? data, 
        bool formatAsJson = false,
        ChartRecommendation? chart = null,
        QueryExecutionStats? stats = null)
    {
        string? jsonOutput = null;

        if (formatAsJson && data != null)
        {
            var options = new JsonSerializerOptions 
            { 
                WriteIndented = true 
            };
            jsonOutput = JsonSerializer.Serialize(data, options);
        }

        return new Nl2SqlQueryResult(
            IsSuccess: true,
            GeneratedSql: generatedSql,
            Data: data,
            ErrorMessage: null,
            JsonData: jsonOutput,
            Chart: chart,
            Stats: stats
        );
    }

    public static Nl2SqlQueryResult Failure(string errorMessage, string generatedSql = "", QueryExecutionStats? stats = null)
    {
        return new Nl2SqlQueryResult(
            IsSuccess: false,
            GeneratedSql: generatedSql,
            Data: null, 
            ErrorMessage: errorMessage,
            JsonData: null,
            Chart: null,
            Stats: stats
        );
    }

    /// <summary>
    /// Exports the query result data rows as an RFC 4180-compliant CSV string.
    /// </summary>
    public string ToCsv()
    {
        if (Data == null || Data.Count == 0)
        {
            return string.Empty;
        }

        var sb = new System.Text.StringBuilder();
        var headers = Data[0].Keys.ToList();

        // Header row
        sb.AppendLine(string.Join(",", headers.Select(EscapeCsvField)));

        // Data rows
        foreach (var row in Data)
        {
            var fields = headers.Select(h =>
            {
                row.TryGetValue(h, out var val);
                return EscapeCsvField(val?.ToString());
            });
            sb.AppendLine(string.Join(",", fields));
        }

        return sb.ToString();
    }

    /// <summary>
    /// Exports the query result data rows as formatted or compact JSON string.
    /// </summary>
    public string ToJson(bool indented = true)
    {
        if (Data == null)
        {
            return "[]";
        }

        var options = new JsonSerializerOptions
        {
            WriteIndented = indented
        };
        return JsonSerializer.Serialize(Data, options);
    }

    private static string EscapeCsvField(string? field)
    {
        if (string.IsNullOrEmpty(field))
        {
            return string.Empty;
        }

        if (field.Contains(',') || field.Contains('"') || field.Contains('\n') || field.Contains('\r'))
        {
            return $"\"{field.Replace("\"", "\"\"")}\"";
        }

        return field;
    }
}