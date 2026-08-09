using System.Text.Json;

namespace InsightFlow.Nl2Sql.Models;

public record Nl2SqlQueryResult(
    bool IsSuccess,
    string GeneratedSql,
    List<Dictionary<string, object?>>? Data,
    string? ErrorMessage,
    string? JsonData = null,
    ChartRecommendation? Chart = null)
{
    public static Nl2SqlQueryResult Success(
        string generatedSql, 
        List<Dictionary<string, object?>>? data, 
        bool formatAsJson = false,
        ChartRecommendation? chart = null)
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
            Chart: chart
        );
    }

    public static Nl2SqlQueryResult Failure(string errorMessage, string generatedSql = "")
    {
        return new Nl2SqlQueryResult(
            IsSuccess: false,
            GeneratedSql: generatedSql,
            Data: null, 
            ErrorMessage: errorMessage,
            JsonData: null,
            Chart: null
        );
    }
}