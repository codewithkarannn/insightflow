namespace InsightFlow.Nl2Sql.Models;

// Represents a foreign key constraint linking a column to a referenced table and column
public record ForeignKeyInfo(string FromColumn, string ToTable, string ToColumn);

// Represents column-level metadata
public record ColumnInfo(string Name, string DataType, bool IsPrimaryKey, bool IsNullable);

// Represents a database table with its columns and foreign key relationships
public record TableInfo(string Name, List<ColumnInfo> Columns, List<ForeignKeyInfo>? ForeignKeys = null);

// Represents the entire database schema structure
public record DatabaseSchema(List<TableInfo> Tables);
