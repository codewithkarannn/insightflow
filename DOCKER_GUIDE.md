# How to Run InsightFlow with Docker

A simple, step-by-step guide to run the complete InsightFlow project locally using Docker.

---

### Prerequisites

Before starting, make sure you have:
1. **Docker Desktop** installed on your machine. ([Download Docker Desktop](https://www.docker.com/products/docker-desktop/))
2. Docker Desktop is **opened and running** in the background.

---

### Step 1: Check your configuration file (`.env`)

InsightFlow uses an LLM (like OpenRouter or OpenAI) to convert natural language into SQL queries.

1. Open your [.env](file:///Users/karanvishwakarma/code/InsightFlow/.env) file located in the project root (or copy from [.env.example](file:///Users/karanvishwakarma/code/InsightFlow/.env.example) if starting fresh: `cp .env.example .env`).
2. Make sure your API key is configured:
   ```env
   NL2SQL_API_KEY=your_openrouter_api_key_here
   NL2SQL_BASE_URL=https://openrouter.ai/api/v1
   NL2SQL_MODEL_NAME=openai/gpt-4o-mini
   ```

---

### Step 2: Build and run the project

Open your terminal, navigate to the project directory, and run:

```bash
docker compose up --build -d
```

#### What does this command do?
- **`--build`**: Compiles the .NET 10 API and builds the Angular frontend container image.
- **`-d`**: Runs all containers in detached mode (in the background) so your terminal stays free.

This will automatically spin up three services defined in [docker-compose.yml](file:///Users/karanvishwakarma/code/InsightFlow/docker-compose.yml):
1. **`insightflow-lib-tests`**: Runs unit tests and verifies core library logic.
2. **`insightflow-api`**: Starts the .NET 10 Web API and creates/seeds the sample SQLite database.
3. **`insightflow-studio`**: Starts the Angular 21 web interface served via Nginx.

---

### Step 3: Open InsightFlow in your browser

Once the containers are running, open your web browser:

| Service | URL | Description |
| :--- | :--- | :--- |
| **InsightFlow Studio** | [http://localhost:4200](http://localhost:4200) | Main user interface (Dark mode UI to ask questions, view generated SQL, and see charts). |
| **API & Swagger Docs** | [http://localhost:5182/swagger](http://localhost:5182/swagger) | Interactive API documentation and test endpoints. |

---

### Useful Commands

Here are everyday Docker commands you might need:

- **Check if all containers are running:**
  ```bash
  docker compose ps
  ```
- **View live logs (useful for debugging):**
  ```bash
  docker compose logs -f
  ```
  *(Press `Ctrl + C` to exit the log view)*
- **View logs for only the API:**
  ```bash
  docker compose logs -f api
  ```
- **Stop all services:**
  ```bash
  docker compose down
  ```
- **Rebuild after making code changes:**
  ```bash
  docker compose up --build -d
  ```

---

### Quick Troubleshooting

- **"Cannot connect to the Docker daemon"**:
  Make sure Docker Desktop is launched and the Docker whale icon is active in your system menu.
- **"Port is already allocated / address already in use"**:
  Ensure no other app or local service is using port `4200` or `5182`.
- **"Nl2Sql:ApiKey is missing"**:
  Ensure the `NL2SQL_API_KEY` in your [.env](file:///Users/karanvishwakarma/code/InsightFlow/.env) file is set and not empty, then re-run `docker compose up -d`.
