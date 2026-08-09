namespace InsightFlow.Nl2Sql.Models;

public class Nl2SqlOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string ModelName { get; set; } = "gpt-4o-mini";
    public string BaseUrl { get; set; } = "https://api.openai.com/v1";
    public int MaxRowLimit { get; set; } = 100;
    public int QueryTimeoutSeconds { get; set; } = 55;
    
    public OutputFormat ResponseFormat { get; set; } = OutputFormat.Dictionary;
    
    /// <summary>
    /// When enabled, the model will analyze synthesized SQL queries and suggest graph / chart recommendations for Chart.js in Angular.
    /// </summary>
    public bool EnableChartSuggestions { get; set; } = true;
    
    /// <summary>
    /// Custom instructions appended to the default system prompt rules.
    /// Example: "Always use uppercase SQL keywords. Prefer JOIN over subqueries."
    /// </summary>
    public string? AdditionalSystemInstructions { get; set; }

    /// <summary>
    /// Completely overrides the default system prompt template. 
    /// Use {0} as a placeholder for the formatted database schema.
    /// </summary>
    public string? CustomSystemPromptTemplate { get; set; }
}

public enum OutputFormat
{
    Dictionary, 
    Json       
}