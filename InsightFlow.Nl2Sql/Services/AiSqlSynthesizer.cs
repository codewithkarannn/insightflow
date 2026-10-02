using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using InsightFlow.Nl2Sql.Abstractions;
using InsightFlow.Nl2Sql.Models;
using Microsoft.Extensions.Options;

namespace InsightFlow.Nl2Sql.Services;

public class AiSqlSynthesizer : ISqlSynthesizer
{
    private readonly HttpClient _httpClient;
    private readonly Nl2SqlOptions _options;

    public AiSqlSynthesizer(HttpClient httpClient, IOptions<Nl2SqlOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<SqlSynthesisResult> SynthesizeSqlAsync(
        string userPrompt, 
        DatabaseSchema schema, 
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey) && !_options.BaseUrl.Contains("localhost"))
        {
            throw new InvalidOperationException("API Key is missing in Nl2SqlOptions.");
        }

        var formattedSchema = FormatSchemaToText(schema);

        string systemPrompt;
        
        if (!string.IsNullOrWhiteSpace(_options.CustomSystemPromptTemplate))
        {
            // Fully custom template provided by consumer
            systemPrompt = string.Format(_options.CustomSystemPromptTemplate, formattedSchema);
        }
        else if (_options.EnableChartSuggestions)
        {
            systemPrompt = $"""
                            You are a strict, expert text-to-SQL engine and data visualization assistant.
                            Your job is to translate user questions into valid SQL queries based strictly on the provided schema, and recommend a graph/chart visualization compatible with Chart.js in Angular.

                            ### TARGET DATABASE SCHEMA
                            {formattedSchema}

                            ### CRITICAL RULES
                            1. Return ONLY a single valid JSON object with fields "sql", "explanation", and "chart". Do NOT use markdown code fences.
                            2. "sql": The raw read-only SQL SELECT query string.
                            3. "explanation": A concise, 1-to-2 sentence non-technical summary explaining what data the query retrieves and how it aggregates (written in clear, executive-ready plain language for business users).
                            4. "chart": An object recommending visualization settings for Chart.js in Angular:
                               - "chartType": String. One of ["bar", "line", "pie", "doughnut", "radar", "scatter", "table", "none"].
                               - "title": String. A descriptive title for the chart.
                               - "xAxisColumn": String. Column name from the SQL SELECT output to be used as category/X-axis labels. ALWAYS prefer the human-readable entity name/title column (e.g. "FullName", "ProductName", "CategoryName") rather than a numeric ID column.
                               - "yAxisColumns": Array of Strings. Column name(s) from the SQL SELECT output containing numeric dataset values.
                               - "reasoning": String. Short explanation of why this chart type is suitable.
                            5. Generate ONLY read-only SELECT queries.
                            6. ENTITY PROJECTION & READABILITY (ID & NAME STANDARD):
                               - When querying entities (e.g. Customers, Products, Categories, Orders) or aggregating metrics by entity, ALWAYS project BOTH the primary identifier (e.g. Id or CustomerId) AND the primary human-readable descriptive name/label (e.g. FullName, ProductName, CategoryName, Title) unless the user explicitly asks for only specific fields.
                               - Foreign Key Auto-Join: When querying tables with foreign keys (e.g. Orders.CustomerId, OrderItems.ProductId, Products.CategoryId), NEVER return bare foreign key IDs alone. Always JOIN the referenced table using the foreign keys provided in the schema to include the human-readable descriptive name (e.g. JOIN Customers ON Orders.CustomerId = Customers.Id and SELECT Customers.Id, Customers.FullName, Orders.TotalAmount).
                               - Descriptive Aliasing: Use clean column aliases when joining multiple tables to avoid name collisions (e.g. c.Id AS CustomerId, c.FullName AS CustomerName).
                            7. If the user asks to modify, update, delete, drop, or alter data/tables, set "sql" to EXACTLY:
                               SELECT 'ERROR: Destructive operations are strictly prohibited' AS Error;
                               set "explanation" to "Operation prohibited: Data modification statements are blocked by enterprise security guardrails."
                               and set "chart" to null.
                            8. If the question cannot be answered using the schema, set "sql" to EXACTLY:
                               SELECT 'ERROR: Question cannot be answered with available schema' AS Error;
                               set "explanation" to "The requested information could not be matched against the available database tables or columns."
                               and set "chart" to null.
                            """;
            if (!string.IsNullOrWhiteSpace(_options.AdditionalSystemInstructions))
            {
                systemPrompt += $"\n\n### ADDITIONAL CONSUMER RULES\n{_options.AdditionalSystemInstructions}";
            }
        }
        else
        {
            systemPrompt = $"""
                            You are a strict, expert text-to-SQL engine.
                            Your job is to translate user questions into valid SQL queries based strictly on the provided schema.

                            ### TARGET DATABASE SCHEMA
                            {formattedSchema}

                            ### CRITICAL RULES
                            1. Return ONLY the raw SQL query. Do NOT use markdown code fences (like ```sql).
                            2. Do NOT add any explanations, introductory text, or concluding notes.
                            3. Generate ONLY read-only SELECT queries.
                            4. ENTITY PROJECTION & READABILITY (ID & NAME STANDARD):
                               - When querying entities or aggregating metrics by entity, ALWAYS project BOTH the primary identifier (e.g. Id) AND the primary human-readable descriptive name/label (e.g. FullName, ProductName, CategoryName, Title).
                               - Foreign Key Auto-Join: When querying tables with foreign keys, NEVER return bare foreign key IDs alone. Always JOIN the referenced table using the foreign keys provided in the schema to include the human-readable descriptive name.
                            5. If the user asks to modify, update, delete, drop, or alter data/tables, return EXACTLY:
                               SELECT 'ERROR: Destructive operations are strictly prohibited' AS Error;
                            6. If the question cannot be answered using the schema, return EXACTLY:
                               SELECT 'ERROR: Question cannot be answered with available schema' AS Error;
                            """;
           
            if (!string.IsNullOrWhiteSpace(_options.AdditionalSystemInstructions))
            {
                systemPrompt += $"\n\n### ADDITIONAL CONSUMER RULES\n{_options.AdditionalSystemInstructions}";
            }
        }

        var requestBody = new
        {
            model = _options.ModelName,
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            },
            temperature = 0.0
        };

        var jsonPayload = JsonSerializer.Serialize(requestBody);

        // Dynamically append /chat/completions to whatever base URL is configured
        var baseUrlTrimmed = _options.BaseUrl.TrimEnd('/');
        var fullEndpoint = new Uri($"{baseUrlTrimmed}/chat/completions");

        using var request = new HttpRequestMessage(HttpMethod.Post, fullEndpoint);
        
        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        }
        
        // OpenRouter optional tracking headers (ignored by OpenAI/Ollama)
        request.Headers.TryAddWithoutValidation("HTTP-Referer", "https://github.com/InsightFlow");
        request.Headers.TryAddWithoutValidation("X-Title", "InsightFlow NL2SQL");

        request.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

        using var response = await _httpClient.SendAsync(request, ct);
        var responseContent = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"LLM Provider API Error ({response.StatusCode}): {responseContent}");
        }

        using var doc = JsonDocument.Parse(responseContent);
        var rawContent = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();

        return ParseSynthesisResponse(rawContent, _options.EnableChartSuggestions, userPrompt);
    }

    private static SqlSynthesisResult ParseSynthesisResponse(string? content, bool chartSuggestionsEnabled, string? userPrompt = null)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return new SqlSynthesisResult(string.Empty, null, null);
        }

        var trimmed = content.Trim();

        // Strip markdown code fences if present (e.g. ```json ... ``` or ```sql ... ``` or ``` ... ```)
        if (trimmed.StartsWith("```"))
        {
            var firstNewline = trimmed.IndexOf('\n');
            if (firstNewline != -1)
            {
                trimmed = trimmed.Substring(firstNewline + 1);
            }
            if (trimmed.EndsWith("```"))
            {
                trimmed = trimmed.Substring(0, trimmed.Length - 3).Trim();
            }
        }

        // Try parsing as JSON object containing "sql" / "explanation" / "chart"
        if (trimmed.StartsWith("{"))
        {
            try
            {
                using var doc = JsonDocument.Parse(trimmed);
                var root = doc.RootElement;

                string sql = string.Empty;
                if (root.TryGetProperty("sql", out var sqlElem) && sqlElem.ValueKind == JsonValueKind.String)
                {
                    sql = sqlElem.GetString() ?? string.Empty;
                }

                string? explanation = null;
                if (root.TryGetProperty("explanation", out var expElem) && expElem.ValueKind == JsonValueKind.String)
                {
                    explanation = expElem.GetString();
                }

                ChartRecommendation? chartRec = null;
                if (chartSuggestionsEnabled && root.TryGetProperty("chart", out var chartElem) && chartElem.ValueKind == JsonValueKind.Object)
                {
                    string chartType = chartElem.TryGetProperty("chartType", out var ctElem) ? ctElem.GetString() ?? "bar" : "bar";
                    string title = chartElem.TryGetProperty("title", out var titleElem) ? titleElem.GetString() ?? "Chart Visualization" : "Chart Visualization";
                    string xAxis = chartElem.TryGetProperty("xAxisColumn", out var xElem) ? xElem.GetString() ?? string.Empty : string.Empty;
                    
                    var yAxisCols = new List<string>();
                    if (chartElem.TryGetProperty("yAxisColumns", out var yElem) && yElem.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var item in yElem.EnumerateArray())
                        {
                            if (item.ValueKind == JsonValueKind.String)
                            {
                                var colName = item.GetString();
                                if (!string.IsNullOrWhiteSpace(colName))
                                {
                                    yAxisCols.Add(colName);
                                }
                            }
                        }
                    }

                    string? reasoning = chartElem.TryGetProperty("reasoning", out var rElem) ? rElem.GetString() : null;

                    chartRec = new ChartRecommendation(chartType, title, xAxis, yAxisCols, reasoning);
                }

                if (!string.IsNullOrWhiteSpace(sql))
                {
                    if (string.IsNullOrWhiteSpace(explanation))
                    {
                        explanation = GenerateFallbackExplanation(sql, userPrompt);
                    }
                    return new SqlSynthesisResult(sql.Trim(), chartRec, explanation);
                }
            }
            catch
            {
                // Fallback to plain text SQL if JSON parsing fails
            }
        }

        // Fallback: Treat content as raw SQL query
        var fallbackExplanation = GenerateFallbackExplanation(trimmed, userPrompt);
        return new SqlSynthesisResult(trimmed, null, fallbackExplanation);
    }

    internal static string GenerateFallbackExplanation(string sql, string? userPrompt)
    {
        if (sql.StartsWith("SELECT 'ERROR:", StringComparison.OrdinalIgnoreCase))
        {
            return "Unable to execute query due to schema constraints or security restrictions.";
        }

        if (!string.IsNullOrWhiteSpace(userPrompt))
        {
            return $"Retrieves and aggregates records for \"{userPrompt.Trim()}\" based on active database schema filters.";
        }

        if (sql.Contains("GROUP BY", StringComparison.OrdinalIgnoreCase) || 
            sql.Contains("SUM(", StringComparison.OrdinalIgnoreCase) || 
            sql.Contains("COUNT(", StringComparison.OrdinalIgnoreCase) ||
            sql.Contains("AVG(", StringComparison.OrdinalIgnoreCase))
        {
            return "Aggregates and summarizes metrics across matching database records according to specified groupings.";
        }

        return "Retrieves matching database records based on the specified criteria and filter rules.";
    }

    internal static string FormatSchemaToText(DatabaseSchema schema)
    {
        var sb = new StringBuilder();

        foreach (var table in schema.Tables)
        {
            sb.AppendLine($"Table: {table.Name}");
            sb.AppendLine("Columns:");
            foreach (var col in table.Columns)
            {
                var pkFlag = col.IsPrimaryKey ? " [PK]" : "";
                var nullFlag = col.IsNullable ? "" : " NOT NULL";
                sb.AppendLine($"  - {col.Name} ({col.DataType}){pkFlag}{nullFlag}");
            }

            if (table.ForeignKeys != null && table.ForeignKeys.Count > 0)
            {
                sb.AppendLine("Foreign Keys / Relationships:");
                foreach (var fk in table.ForeignKeys)
                {
                    sb.AppendLine($"  - {fk.FromColumn} -> {fk.ToTable}({fk.ToColumn})");
                }
            }

            sb.AppendLine();
        }

        return sb.ToString();
    }
}