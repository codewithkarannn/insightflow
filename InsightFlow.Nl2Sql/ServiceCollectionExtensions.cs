using InsightFlow.Nl2Sql.Abstractions;
using InsightFlow.Nl2Sql.Models;
using InsightFlow.Nl2Sql.Services;
using Microsoft.Extensions.DependencyInjection;

namespace InsightFlow.Nl2Sql;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddNl2SqlEngine(this IServiceCollection services, Action<Nl2SqlOptions> configureOptions)
    {
        services.Configure(configureOptions);
        
        // Register Typed HttpClient for OpenAI Synthesizer
        services.AddHttpClient<ISqlSynthesizer, AiSqlSynthesizer>();
        
        
        // Register Security Guardrail
        services.AddScoped<ISqlGuardrail, AstSqlGuardrail>();
        
        // Register SQL Execution Engine
        services.AddScoped<ISqlExecutor, DirectSqlExecutor>();
        
        services.AddScoped<INl2SqlEngine, Nl2SqlEngine>();

        // Default to SQLite extractor if no provider is specified
        services.AddScoped<ISchemaExtractor, SqliteSchemaExtractor>();

        return services;
    }

    public static IServiceCollection UseSqliteExtractor(this IServiceCollection services)
    {
        services.AddScoped<ISchemaExtractor, SqliteSchemaExtractor>();
        return services;
    }

    public static IServiceCollection UseMySqlExtractor(this IServiceCollection services)
    {
        services.AddScoped<ISchemaExtractor, MySqlSchemaExtractor>();
        return services;
    }
}