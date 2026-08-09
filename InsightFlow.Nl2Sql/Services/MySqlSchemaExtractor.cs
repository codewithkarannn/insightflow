using System.Data;
using InsightFlow.Nl2Sql.Abstractions;
using InsightFlow.Nl2Sql.Models;
using MySqlConnector;

namespace InsightFlow.Nl2Sql.Services;

public class MySqlSchemaExtractor : ISchemaExtractor
{
    public async Task<DatabaseSchema> ExtractSchemaAsync(
        string connectionString, 
        UserSecurityContext? securityContext = null, 
        CancellationToken ct = default)
    {
        var tables = new List<TableInfo>();

        using var connection = new MySqlConnection(connectionString);
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

    private static async Task<List<string>> GetTableNamesAsync(MySqlConnection connection, CancellationToken ct)
    {
        var tableNames = new List<string>();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE';";

        using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            tableNames.Add(reader.GetString(0));
        }

        return tableNames;
    }

    private static async Task<List<ColumnInfo>> GetColumnsForTableAsync(
        MySqlConnection connection, 
        string tableName, 
        UserSecurityContext? securityContext, 
        CancellationToken ct)
    {
        var columns = new List<ColumnInfo>();
        using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tableName;";

        var param = command.CreateParameter();
        param.ParameterName = "@tableName";
        param.Value = tableName;
        command.Parameters.Add(param);

        using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            var columnName = reader.GetString(0);
            var dataType = reader.GetString(1);
            var isNullable = reader.GetString(2).Equals("YES", StringComparison.OrdinalIgnoreCase);
            var isPk = reader.GetString(3).Equals("PRI", StringComparison.OrdinalIgnoreCase);

            if (IsColumnRestricted(tableName, columnName, securityContext))
            {
                continue; // Column-level masking: Skip restricted column
            }

            columns.Add(new ColumnInfo(
                Name: columnName,
                DataType: string.IsNullOrWhiteSpace(dataType) ? "VARCHAR" : dataType.ToUpperInvariant(),
                IsPrimaryKey: isPk,
                IsNullable: isNullable
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