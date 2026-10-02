namespace InsightFlow.Nl2Sql.Models;

/// <summary>
/// Represents the output of the AI SQL Synthesizer, containing both the generated SQL
/// and optional graph/chart recommendations.
/// </summary>
public record SqlSynthesisResult(
    string Sql,
    ChartRecommendation? Chart = null,
    string? Explanation = null);
