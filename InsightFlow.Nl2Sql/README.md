# InsightFlow.Nl2Sql

> **Plug-and-play Natural Language to SQL (NL2SQL) SDK for .NET** with built-in Column Masking, Row-Level Security abstractions, and AST Guardrails.

`InsightFlow.Nl2Sql` allows developers to add safe, production-grade text-to-SQL functionality to any ASP.NET Core API or .NET application in **one line of code**.

---

## ✨ Features

- **Plug & Play Registration:** Single-line dependency injection setup (`AddNl2SqlEngine`).
- **Multi-Database Support:** Native schema extractors for both **SQLite** (`PRAGMA`) and **MySQL** (`INFORMATION_SCHEMA`).
- **Column-Level Masking:** Automatically hide sensitive columns (e.g., `PasswordHash`, `CreditCardNumber`) from the LLM prompt based on the requesting user's security context.
- **AST Security Guardrails:** 
  - Enforces read-only `SELECT` queries.
  - Blocks multi-statement SQL injection attacks (`;` delimiter blocking).
  - Automatically caps result row limits (`LIMIT N`).
- **Chart Synthesizer:** Analyzes SQL output structure to suggest chart visualizations (Bar, Line, Pie, Table) powered by Chart.js compatible metadata.
- **Zero Unnecessary Bloat:** Clean, SOLID architecture designed for standalone NuGet packaging.

---

## 🚀 Installation & Setup

### 1. Install Package
```bash
dotnet add package InsightFlow.Nl2Sql
```

### 2. Register Service in ASP.NET Core (`Program.cs`)
```csharp
using InsightFlow.Nl2Sql;
using InsightFlow.Nl2Sql.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddNl2SqlEngine(options =>
{
    options.ApiKey = builder.Configuration["Nl2Sql:ApiKey"]!;
    options.BaseUrl = "https://openrouter.ai/api/v1";
    options.ModelName = "openai/gpt-4o-mini";
    options.MaxRowLimit = 50;
    options.QueryTimeoutSeconds = 15;
    options.ResponseFormat = OutputFormat.Json;
});
```

---

## 💻 Usage Example

Inject `INl2SqlEngine` into your service or API controller:

```csharp
app.MapPost("/api/query", async (
    string prompt, 
    INl2SqlEngine engine, 
    CancellationToken ct) =>
{
    string connectionString = "Data Source=app_store.db;";
    
    // Define user security context
    var securityContext = new UserSecurityContext(
        UserId: "usr_123",
        Role: "Analyst",
        RestrictedColumns: new HashSet<string> { "Customers.PasswordHash", "Customers.CreditCardNumber" }
    );

    // Execute query asynchronously with security rules applied
    var result = await engine.ExecuteQueryAsync(
        prompt, 
        connectionString, 
        securityContext, 
        ct
    );

    if (!result.IsSuccess)
    {
        return Results.BadRequest(new { error = result.ErrorMessage });
    }

    return Results.Ok(new
    {
        data = result.Data,
        sql = result.GeneratedSql,
        chart = result.Chart
    });
});
```

---

## 🛡 Security Guardrails Breakdown

| Guardrail | Enforcement Mechanism |
| :--- | :--- |
| **Mutation Blocking** | Validates SQL abstract syntax tree (AST) to reject `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER` before execution. |
| **Column Masking** | Prevents schema extractors from passing restricted columns to LLM prompts and strips restricted fields from result payloads. |
| **Delimiter Shielding** | Rejects queries containing statement terminators (`;`) to prevent stacked SQL injection. |
| **Row Limit Cap** | Injects or updates `LIMIT` clause to prevent resource exhaustion attacks. |

---

## 🐳 Building & Testing via Docker

Build the library and run unit tests inside isolated Docker container:

```bash
docker build -t insightflow-lib -f Dockerfile ..
```
