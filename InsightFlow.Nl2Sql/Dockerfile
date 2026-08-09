FROM mcr.microsoft.com/dotnet/sdk:10.0 AS testrunner
WORKDIR /src

# Copy project files for caching restore layer
COPY ["InsightFlow.Nl2Sql/InsightFlow.Nl2Sql.csproj", "InsightFlow.Nl2Sql/"]
COPY ["InsightFlow.Nl2Sql.Tests/InsightFlow.Nl2Sql.Tests.csproj", "InsightFlow.Nl2Sql.Tests/"]

# Restore dependencies
RUN dotnet restore "InsightFlow.Nl2Sql/InsightFlow.Nl2Sql.csproj"
RUN dotnet restore "InsightFlow.Nl2Sql.Tests/InsightFlow.Nl2Sql.Tests.csproj"

# Copy source files
COPY InsightFlow.Nl2Sql/. InsightFlow.Nl2Sql/
COPY InsightFlow.Nl2Sql.Tests/. InsightFlow.Nl2Sql.Tests/

# Run unit tests
WORKDIR "/src/InsightFlow.Nl2Sql.Tests"
RUN dotnet test "InsightFlow.Nl2Sql.Tests.csproj" -c Release --logger "console;verbosity=normal"

# Build and pack library
WORKDIR "/src/InsightFlow.Nl2Sql"
RUN dotnet pack "InsightFlow.Nl2Sql.csproj" -c Release -o /app/nupkg

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS final
WORKDIR /app
COPY --from=testrunner /app/nupkg ./nupkg
ENTRYPOINT ["echo", "InsightFlow.Nl2Sql library tested and packaged successfully."]
