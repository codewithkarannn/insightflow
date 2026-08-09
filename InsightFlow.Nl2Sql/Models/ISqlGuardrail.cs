namespace InsightFlow.Nl2Sql.Models;

public interface ISqlGuardrail
{
    /// <summary>
    /// Validates generated SQL for security vulnerabilities, enforces read-only access,
    /// blocks multi-statement injections, and applies hard row limits.
    /// </summary>
    (bool IsSafe, string SanitizedSql, string? ViolationError) ValidateAndSecureSql(
        string rawSql, 
        UserSecurityContext? securityContext = null, 
        int maxRows = 100);
}