namespace CRM.Data.Services;

public sealed class SocialInboxRecoveryWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SocialInboxRecoveryWorker> _logger;
    private readonly TimeSpan _interval;

    public SocialInboxRecoveryWorker(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<SocialInboxRecoveryWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        var seconds = int.TryParse(configuration["SocialRecovery:IntervalSeconds"], out var configured)
            ? Math.Clamp(configured, 30, 900)
            : 60;
        _interval = TimeSpan.FromSeconds(seconds);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        using var timer = new PeriodicTimer(_interval);
        do
        {
            await RecoverAsync(stoppingToken);
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RecoverAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var graph = scope.ServiceProvider.GetRequiredService<MetaGraphApiService>();
            var inbound = scope.ServiceProvider.GetRequiredService<SocialInboundService>();

            var instagram = await graph.SincronizarInstagramLoginAsync(inbound);
            var facebook = await graph.SincronizarFacebookAsync(inbound);

            if (instagram.MensajesImportados > 0 || facebook.MensajesImportados > 0)
            {
                _logger.LogDebug(
                    "Recuperación social finalizada. Instagram={Instagram}, Facebook={Facebook} mensajes procesados.",
                    instagram.MensajesImportados,
                    facebook.MensajesImportados);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Cierre normal de la aplicación.
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo completar la recuperación automática de mensajes sociales.");
        }
    }
}
