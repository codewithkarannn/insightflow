using InsightFlow.Nl2Sql.Abstractions;
using InsightFlow.Nl2Sql.Models;
using Microsoft.Data.Sqlite;

namespace InsightFlow.Nl2Sql.Services;

public class SqliteSchemaExtractor : ISchemaExtractor
{
    public async Task<DatabaseSchema> ExtractSchemaAsync(
        string connectionString, 
        UserSecurityContext? securityContext = null, 
        CancellationToken ct = default)
    {
        var tables = new List<TableInfo>();

        using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync(ct);

        var tableNames = await GetTableNamesAsync(connection, ct);

        foreach (var tableName in tableNames)
        {
            var columns = await GetColumnsForTableAsync(connection, tableName, securityContext, ct);
            if (columns.Count > 0)
            {
                tables.Add(new TableInfo(tableName, columns));
            }
        }

        return new DatabaseSchema(tables);
    }
    
    private static async Task<List<string>> GetTableNamesAsync(SqliteConnection connection, CancellationToken ct)
    {
        var tableNames = new List<string>();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';";

        using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            tableNames.Add(reader.GetString(0));
        }

        return tableNames;
    }
    
    private static async Task<List<ColumnInfo>> GetColumnsForTableAsync(
        SqliteConnection connection, 
        string tableName, 
        UserSecurityContext? securityContext, 
        CancellationToken ct)
    {
        var columns = new List<ColumnInfo>();
        using var command = connection.CreateCommand();
        command.CommandText = $"PRAGMA table_info('{tableName}');";

        using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            var columnName = reader.GetString(1);
            var dataType = reader.GetString(2);
            var notNull = reader.GetInt32(3) == 1;
            var isPk = reader.GetInt32(5) == 1;

            if (IsColumnRestricted(tableName, columnName, securityContext))
            {
                continue; // Column-level masking: Skip restricted column
            }

            columns.Add(new ColumnInfo(
                Name: columnName,
                DataType: string.IsNullOrWhiteSpace(dataType) ? "TEXT" : dataType,
                IsPrimaryKey: isPk,
                IsNullable: !notNull
            ));
        }

        return columns;
    }
    
    private static bool IsColumnRestricted(string tableName, string columnName, UserSecurityContext? securityContext)
    {
        if (securityContext?.RestrictedColumns == null || securityContext.RestrictedColumns.Count == 0)
        {
            return false;
        }

        var fullPath = $"{tableName}.{columnName}";
        return securityContext.RestrictedColumns.Any(restricted => 
            restricted.Equals(fullPath, StringComparison.OrdinalIgnoreCase) || 
            restricted.Equals(columnName, StringComparison.OrdinalIgnoreCase));
    }
}