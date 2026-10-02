using InsightFlow.Api;
using InsightFlow.Nl2Sql;
using InsightFlow.Nl2Sql.Abstractions;
using InsightFlow.Nl2Sql.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 2. Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 3. Engine Registration from appsettings.json or environment variables
string apiKey = builder.Configuration["Nl2Sql:ApiKey"] 
    ?? builder.Configuration["NL2SQL_API_KEY"]
    ?? builder.Configuration["OPENROUTER_API_KEY"]
    ?? throw new InvalidOperationException("Nl2Sql:ApiKey / NL2SQL_API_KEY is missing.");

builder.Services.AddNl2SqlEngine(options =>
{
    options.ApiKey = apiKey;
    options.BaseUrl = builder.Configuration["Nl2Sql:BaseUrl"] ?? builder.Configuration["NL2SQL_BASE_URL"] ?? "https://openrouter.ai/api/v1";
    options.ModelName = builder.Configuration["Nl2Sql:ModelName"] ?? builder.Configuration["NL2SQL_MODEL_NAME"] ?? "openai/gpt-4o-mini";
    options.MaxRowLimit = 100;
    options.QueryTimeoutSeconds = 10;
    options.ResponseFormat = OutputFormat.Json;
});

var app = builder.Build();

// 4. Seed Local SQLite Database
string dbFilePath = Path.Combine(app.Environment.ContentRootPath, "app_store.db");
string defaultConnectionString = DatabaseSeeder.Seed(dbFilePath);

app.UseCors("AllowAngular");

app.UseSwagger();
app.UseSwaggerUI();

app.MapGet("/", () => Results.Redirect("/swagger"));

app.MapPost("/api/query", async (
    Nl2SqlApiRequest request, 
    INl2SqlEngine engine, 
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(request.Prompt))
    {
        return Results.BadRequest(new { error = "Prompt cannot be empty." });
    }

    // Default to our seeded SQLite DB if no connectionString was passed by client
    string connString = string.IsNullOrWhiteSpace(request.ConnectionString) 
        ? defaultConnectionString 
        : request.ConnectionString;

    // Mask sensitive columns by default
    var restrictedCols = request.RestrictedColumns ?? new HashSet<string>
    {
        "Customers.PasswordHash",
        "Customers.CreditCardNumber"
    };

    var securityContext = new UserSecurityContext(
        UserId: "usr_angular",
        Role: "Analyst",
        RestrictedColumns: restrictedCols);

    int? timeoutSeconds = request.TimeoutSeconds.HasValue
        ? Math.Clamp(request.TimeoutSeconds.Value, 1, 120)
        : null;

    int? maxRowLimit = request.MaxRowLimit.HasValue
        ? Math.Clamp(request.MaxRowLimit.Value, 1, 1000)
        : null;

    var result = await engine.ExecuteQueryAsync(
        request.Prompt, 
        connString, 
        securityContext, 
        timeoutSeconds,
        maxRowLimit,
        ct);

    if (!result.IsSuccess)
    {
        return Results.BadRequest(new
        {
            isSuccess = false,
            error = result.ErrorMessage,
            sql = result.GeneratedSql,
            stats = result.Stats,
            explanation = result.Explanation
        });
    }

    return Results.Ok(new
    {
        isSuccess = true,
        data = result.Data,
        sql = result.GeneratedSql,
        chart = result.Chart,
        stats = result.Stats,
        explanation = result.Explanation
    });
});

app.MapPost("/api/query/export", async (
    string? format,
    Nl2SqlApiRequest request, 
    INl2SqlEngine engine, 
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(request.Prompt))
    {
        return Results.BadRequest(new { error = "Prompt cannot be empty." });
    }

    string connString = string.IsNullOrWhiteSpace(request.ConnectionString) 
        ? defaultConnectionString 
        : request.ConnectionString;

    var restrictedCols = request.RestrictedColumns ?? new HashSet<string>
    {
        "Customers.PasswordHash",
        "Customers.CreditCardNumber"
    };

    var securityContext = new UserSecurityContext(
        UserId: "usr_angular",
        Role: "Analyst",
        RestrictedColumns: restrictedCols);

    int? timeoutSeconds = request.TimeoutSeconds.HasValue
        ? Math.Clamp(request.TimeoutSeconds.Value, 1, 120)
        : null;

    int? maxRowLimit = request.MaxRowLimit.HasValue
        ? Math.Clamp(request.MaxRowLimit.Value, 1, 1000)
        : null;

    var result = await engine.ExecuteQueryAsync(
        request.Prompt, 
        connString, 
        securityContext, 
        timeoutSeconds,
        maxRowLimit,
        ct);

    if (!result.IsSuccess)
    {
        return Results.BadRequest(new
        {
            isSuccess = false,
            error = result.ErrorMessage,
            sql = result.GeneratedSql
        });
    }

    string exportFormat = (format ?? "csv").Trim().ToLowerInvariant();
    string timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");

    if (exportFormat == "json")
    {
        byte[] jsonBytes = System.Text.Encoding.UTF8.GetBytes(result.ToJson(indented: true));
        return Results.File(jsonBytes, "application/json", $"insightflow_export_{timestamp}.json");
    }

    byte[] csvBytes = System.Text.Encoding.UTF8.GetBytes(result.ToCsv());
    return Results.File(csvBytes, "text/csv", $"insightflow_export_{timestamp}.csv");
});

app.Run();

public record Nl2SqlApiRequest(
    string Prompt,
    string? ConnectionString,
    HashSet<string>? RestrictedColumns,
    int? TimeoutSeconds = null,
    int? MaxRowLimit = null);