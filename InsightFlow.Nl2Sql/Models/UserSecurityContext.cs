namespace InsightFlow.Nl2Sql.Models;

public record UserSecurityContext(
    string UserId,
    string Role,
    string? TenantId = null,
    HashSet<string>? RestrictedColumns = null
);
