using Microsoft.AspNetCore.SignalR;
using Xochat.Hubs;
using Xochat.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to listen on port 4000 for standalone development (IIS assigns port dynamically)
if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("APP_POOL_ID")) &&
    string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
{
    builder.WebHost.ConfigureKestrel(options =>
    {
        options.ListenAnyIP(4000);
    });
}

// Add Controllers & SignalR
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
});

// Configure CORS for all frontend portals and production domains
builder.Services.AddCors(options =>
{
    options.AddPolicy("XochatCorsPolicy", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Dependency Injection
builder.Services.AddSingleton<IDataStore, DataStore>();
builder.Services.AddSingleton<ILockManager, LockManager>();
builder.Services.AddSingleton<IAutoAssignService, AutoAssignService>();
builder.Services.AddSingleton<IMetricsService, MetricsService>();
builder.Services.AddSingleton<IAiAssistantService, AiAssistantService>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();

var app = builder.Build();

// Enable serving frontend static assets (React build)
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("XochatCorsPolicy");

app.MapControllers();
app.MapHub<ChatHub>("/chatHub");
app.MapFallbackToFile("index.html");

// Background timer to purge expired locks and broadcast unlocks
var lockManager = app.Services.GetRequiredService<ILockManager>();
var hubContext = app.Services.GetRequiredService<IHubContext<ChatHub>>();

var timer = new System.Threading.Timer(async _ =>
{
    var expired = lockManager.PurgeExpired();
    foreach (var convId in expired)
    {
        await hubContext.Clients.All.SendAsync("conversation:unlocked", new { conversationId = convId });
    }
}, null, TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(5));

Console.WriteLine("=================================================");
Console.WriteLine("  XOCHAT .NET ENTERPRISE LIVE CHAT BACKEND READY");
Console.WriteLine("  HTTP REST API: http://localhost:4000/api");
Console.WriteLine("  SignalR Hub:   http://localhost:4000/chatHub");
Console.WriteLine("=================================================");

app.Run();
