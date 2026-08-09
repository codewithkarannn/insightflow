namespace InsightFlow.Nl2Sql.Models;
//Represents the database structure
public record ColumnInfo(string Name, string DataType, bool IsPrimaryKey, bool IsNullable);
public record TableInfo(string Name, List<ColumnInfo> Columns);
public record DatabaseSchema(List<TableInfo> Tables);
