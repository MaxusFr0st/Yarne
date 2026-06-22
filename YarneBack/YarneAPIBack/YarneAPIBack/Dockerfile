FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["YarneAPIBack.csproj", "./"]
RUN dotnet restore "YarneAPIBack.csproj"

COPY . .
RUN dotnet publish "YarneAPIBack.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production
# Railway injects PORT at runtime — Program.cs binds to it.
# Do NOT set ASPNETCORE_URLS or ASPNETCORE_HTTP_PORTS here; they conflict with PORT.

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "YarneAPIBack.dll"]
