using CRM.Data.Data;
using CRM.Data.Models;

namespace CRM.Data.Services;

public partial class WhatsAppService
{
    private readonly CrmDbContext _context;
    private readonly WhatsAppCloudApiService _whatsAppCloudApiService;
    private readonly MetaMessagingService _metaMessagingService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly BotSettingsService _botSettings;
    private readonly ILogger<WhatsAppService> _logger;

    public WhatsAppService(
        CrmDbContext context,
        WhatsAppCloudApiService whatsAppCloudApiService,
        MetaMessagingService metaMessagingService,
        IServiceScopeFactory scopeFactory,
        BotSettingsService botSettings,
        ILogger<WhatsAppService> logger)
    {
        _context = context;
        _whatsAppCloudApiService = whatsAppCloudApiService;
        _metaMessagingService = metaMessagingService;
        _scopeFactory = scopeFactory;
        _botSettings = botSettings;
        _logger = logger;
    }
}
