using System.Data.Common;
using InsightFlow.Nl2Sql.Abstractions;
using InsightFlow.Nl2Sql.Models;
using Microsoft.Data.Sqlite;
using MySqlConnector;

namespace InsightFlow.Nl2Sql.Services;

public class DirectSqlExecutor : ISqlExecutor
{
    public async Task<List<Dictionary<string, object?>>> ExecuteReaderAsync(
        string connectionString, 
        string sanitizedSql, 
        int timeoutSeconds = 5, 
        CancellationToken ct = default)
    {
        var results = new List<Dictionary<string, object?>>();

        // Create cancellation token with forced execution timeout
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

        // Create connection dynamically based on connection string signature
        using DbConnection connection = CreateConnection(connectionString);
        await connection.OpenAsync(timeoutCts.Token);

        using var command = connection.CreateCommand();
        command.CommandText = sanitizedSql;
        command.CommandTimeout = timeoutSeconds;

        using var reader = await command.ExecuteReaderAsync(timeoutCts.Token);
        while (await reader.ReadAsync(timeoutCts.Token))
        {
            var row = new Dictionary<string, object?>();
            for (int i = 0; i < reader.FieldCount; i++)
            {
                var columnName = reader.GetName(i);
                var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                row[columnName] = value;
            }
            results.Add(row);
        }

        return results;
    }

    private static DbConnection CreateConnection(string connectionString)
    {
        // Simple connection string heuristics to instantiate SQLite vs MySQL
        if (connectionString.Contains("Data Source=", StringComparison.OrdinalIgnoreCase) ||
            connectionString.EndsWith(".db", StringComparison.OrdinalIgnoreCase) ||
            connectionString.Contains("Filename=", StringComparison.OrdinalIgnoreCase))
        {
            return new SqliteConnection(connectionString);
        }

        // Default to MySQL connection
        return new MySqlConnection(connectionString);
    }
}