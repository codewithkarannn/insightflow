FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Copy project definition files for dependency restore layer caching
COPY ["InsightFlow.Api/InsightFlow.Api.csproj", "InsightFlow.Api/"]
COPY ["InsightFlow.Nl2Sql/InsightFlow.Nl2Sql.csproj", "InsightFlow.Nl2Sql/"]

RUN dotnet restore "InsightFlow.Api/InsightFlow.Api.csproj"

# Copy full source
COPY InsightFlow.Api/. InsightFlow.Api/
COPY InsightFlow.Nl2Sql/. InsightFlow.Nl2Sql/

WORKDIR "/src/InsightFlow.Api"
RUN dotnet build "InsightFlow.Api.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "InsightFlow.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "InsightFlow.Api.dll"]
