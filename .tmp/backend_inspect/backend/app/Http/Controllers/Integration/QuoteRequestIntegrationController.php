<?php

namespace App\Http\Controllers\Integration;

use App\Http\Controllers\Controller;
use App\Http\Requests\Integration\AcknowledgeIntegrationRequest;
use App\Http\Requests\Integration\FailIntegrationRequest;
use App\Http\Resources\Integration\QuoteRequestIntegrationResource;
use App\Models\Commercial\QuoteRequest;
use App\Models\Commercial\QuoteRequestAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class QuoteRequestIntegrationController extends Controller
{
    private const DETAIL_RELATIONS = [
        'customer',
        'status',
        'details.productType',
        'details.product',
        'details.length',
        'details.finish',
        'details.characteristics',
        'attachments',
    ];

    public function index(Request $request)
    {
        $integrationStatus = $request->string('status', 'pending')->toString();
        $query = QuoteRequest::query()
            ->with(self::DETAIL_RELATIONS)
            ->where('integration_status', $integrationStatus);

        if ($integrationStatus === 'pending') {
            $query->whereHas('status', fn ($statusQuery) => $statusQuery->where('name', 'Pendiente'));
        }

        $quotes = $query
            ->orderBy('id')
            ->paginate(min(max($request->integer('per_page', 50), 1), 100));

        return QuoteRequestIntegrationResource::collection($quotes);
    }

    public function show(QuoteRequest $quoteRequest)
    {
        return new QuoteRequestIntegrationResource(
            $quoteRequest->load(self::DETAIL_RELATIONS),
        );
    }

    public function downloadAttachment(
        QuoteRequest $quoteRequest,
        QuoteRequestAttachment $attachment,
    ) {
        abort_unless($attachment->quote_request_id === $quoteRequest->id, 404);

        if (! Storage::disk($attachment->disk)->exists($attachment->path)) {
            abort(404, 'El archivo físico no existe.');
        }

        return Storage::disk($attachment->disk)->download(
            $attachment->path,
            $attachment->original_name,
            ['Content-Type' => $attachment->mime_type],
        );
    }

    public function acknowledge(
        AcknowledgeIntegrationRequest $request,
        QuoteRequest $quoteRequest,
    ) {
        $quoteRequest->update([
            'integration_status' => 'exported',
            'integration_id' => $request->validated('integration_id'),
            'integration_error' => null,
            'integration_processed_at' => now(),
        ]);

        return new QuoteRequestIntegrationResource(
            $quoteRequest->load(self::DETAIL_RELATIONS),
        );
    }

    public function fail(
        FailIntegrationRequest $request,
        QuoteRequest $quoteRequest,
    ) {
        $quoteRequest->increment('integration_attempts');
        $quoteRequest->update([
            'integration_status' => 'failed',
            'integration_error' => $request->validated('error'),
        ]);

        return new QuoteRequestIntegrationResource(
            $quoteRequest->load(self::DETAIL_RELATIONS),
        );
    }
}
