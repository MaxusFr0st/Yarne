FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["YarneAPIBack.csproj", "./"]
RUN dotnet restore "YarneAPIBack.csproj"

COPY . .
RUN dotnet publish "YarneAPIBack.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "YarneAPIBack.dll"]