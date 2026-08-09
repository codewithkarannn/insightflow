# InsightFlow Studio

> **Modern Dark-Mode Angular 21 Interface for Natural Language Analytics**

InsightFlow Studio provides an intuitive, high-performance web dashboard allowing users to query databases using plain English, inspect generated SQL statements, review tabular data, and view automated chart visualizations powered by Chart.js.

---

## ✨ Features

- **Natural Language Query Console:** Prominent search bar with prompt suggestions for quick data exploration.
- **SQL Preview & Safety Notice:** Displays transparent generated SQL queries and alerts users if guardrails or column masking were applied.
- **Interactive Data Grid:** Renders result sets with clean pagination, column sorting, and responsive typography.
- **Dynamic Chart Visualizations:** Automatically renders Bar, Line, Pie, and Summary tables based on backend chart recommendations.
- **Nginx Reverse Proxy Ready:** Built-in Nginx production container configuration proxying `/api/` calls cleanly without CORS issues.

---

## 🏗 Architecture & Nginx Routing

When containerized, InsightFlow Studio runs inside an optimized `nginx:alpine` web server:

```
[Browser Client] 
      │
      ├──> http://localhost:4200/ (Static Angular Assets)
      │
      └──> http://localhost:4200/api/query 
                 │ (Nginx Reverse Proxy)
                 ▼
           http://api:8080/api/query (InsightFlow.Api)
```

---

## 🛠 Local Development Setup

### Prerequisites
- [Node.js (v20+)](https://nodejs.org/) & `npm`
- [Angular CLI](https://angular.dev/tools/cli)

### Installation & Run
```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm start
```

Navigate to `http://localhost:4200/` in your browser. The app will automatically reload when source files are modified.

---

## 🧪 Testing & Building

### Run Unit Tests
```bash
npm test
```

### Build Production Bundle
```bash
npm run build
```
Build artifacts will be stored in `dist/InsightFlowStudio/browser/`.

---

## 🐳 Running with Docker

Build and run standalone Studio container:

```bash
docker build -t insightflow-studio .
docker run -d -p 4200:80 insightflow-studio
```
