# InsightFlow.Api

> **ASP.NET Core 10 Web API for Natural Language to SQL Processing**

`InsightFlow.Api` provides a RESTful API layer built on top of `.NET 10` and `InsightFlow.Nl2Sql`. It features automatic SQLite database seeding, OpenAPI/Swagger interactive UI, configurable CORS policies, and Docker support.

---

## 🚀 Features

- **Natural Language Endpoint (`POST /api/query`):** Translates prompts into SQL, executes queries safely against SQLite or external databases, and returns results + chart recommendations.
- **Seeded Demo Database:** Automatically seeds a local SQLite database (`app_store.db`) containing e-commerce data (Customers, Products, Orders, OrderItems).
- **OpenAPI / Swagger Integration:** Interactive API browser served at `/swagger` for testing endpoints.
- **Flexible Configuration:** Puts OpenRouter/OpenAI credentials in `appsettings.json` or environment variables (`NL2SQL_API_KEY`, `NL2SQL_BASE_URL`, `NL2SQL_MODEL_NAME`).
- **Cross-Origin Resource Sharing (CORS):** Pre-configured to allow local and containerized Angular client connections.

---

## 📡 REST API Reference

### Execute Natural Language Query

```http
POST /api/query
Content-Type: application/json
```

#### Request Body
```json
{
  "prompt": "Show top 5 customers by sales",
  "connectionString": null,
  "restrictedColumns": ["Customers.PasswordHash", "Customers.CreditCardNumber"]
}
```

*Note: If `connectionString` is `null` or omitted, the API defaults to the seeded local `app_store.db`.*

#### Successful Response (`200 OK`)
```json
{
  "isSuccess": true,
  "data": [
    { "Id": 1, "FullName": "Kavita Sharma", "Email": "kavita.sharma1@example.com", "City": "Delhi", "Country": "India" }
  ],
  "sql": "SELECT Id, FullName, Email, City, Country FROM Customers ORDER BY Id LIMIT 5",
  "chart": {
    "chartType": "table",
    "title": "Top 5 Customers",
    "xAxisColumn": "FullName",
    "yAxisColumns": []
  }
}
```

#### Error Response (`400 Bad Request`)
```json
{
  "isSuccess": false,
  "error": "Guardrail violation: Direct data mutation queries (UPDATE) are strictly prohibited.",
  "sql": null
}
```

---

## ⚙️ Configuration & Environment Variables

Key application settings can be configured via `appsettings.json` or overridden via environment variables:

| Setting | Environment Variable | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `Nl2Sql:ApiKey` | `NL2SQL_API_KEY` | *(Required)* | OpenRouter / OpenAI API Key |
| `Nl2Sql:BaseUrl` | `NL2SQL_BASE_URL` | `https://openrouter.ai/api/v1` | LLM Provider Base URL |
| `Nl2Sql:ModelName` | `NL2SQL_MODEL_NAME` | `openai/gpt-4o-mini` | LLM Model Name |

---

## 🏃 Local Execution

```bash
# Run API directly
dotnet run

# Access Swagger UI in browser
open http://localhost:5182/swagger
```

---

## 🐳 Docker Execution

Build and run standalone container:

```bash
docker build -t insightflow-api -f Dockerfile ..
docker run -d -p 5182:8080 -e NL2SQL_API_KEY="your_key" insightflow-api
```
