<?php

namespace App\Http\Controllers\Commercial;

use App\Http\Controllers\Controller;
use App\Http\Requests\Commercial\QuoteRequestFormRequest;
use App\Http\Resources\Commercial\QuoteRequestListResource;
use App\Http\Resources\Commercial\QuoteRequestResource;
use App\Models\Commercial\QuoteRequest;
use App\Services\Commercial\QuoteRequestService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class QuoteController extends Controller
{
    public function __construct(
        protected QuoteRequestService $quoteRequestService,
    ) {}

    public function index(Request $request)
    {
        Gate::forUser($request->user())->authorize('viewAny', QuoteRequest::class);

        $listData = $this->quoteRequestService->getList($request);

        return response()->json([
            // Aplicamos la transformación al estilo Laravel legítimo
            'quoteRequests'      => QuoteRequestListResource::collection($listData['quoteRequests']),
            'totalQuoteRequests' => $listData['totalQuoteRequests'],
            'summary'            => $listData['summary'],
            'per_page'           => $listData['per_page'],
            'current_page'       => $listData['current_page'],
        ]);
    }

    public function statuses(Request $request)
    {
        Gate::forUser($request->user())->authorize('viewAny', QuoteRequest::class);

        return response()->json([
            'statuses' => $this->quoteRequestService->getStatuses(),
        ]);
    }

    public function store(QuoteRequestFormRequest $request)
    {
        $quoteRequest = $this->quoteRequestService->create(
            $request->validated(),
            $request->user(),
        );

        return response()->json([
            'message'       => 'Solicitud de cotización registrada correctamente.',
            'quote_request' => new QuoteRequestResource($quoteRequest), // Mantenemos el resource completo aquí
        ], 201);
    }

    public function show(QuoteRequest $quoteRequest)
    {
        Gate::forUser(request()->user())->authorize('view', $quoteRequest);

        $quoteRequest = $this->quoteRequestService->show(
            $quoteRequest,
            request()->user(),
        );

        return response()->json([
            'quote_response' => new QuoteRequestResource($quoteRequest)
        ]);
    }

    public function history(Request $request, QuoteRequest $quoteRequest)
    {
        Gate::forUser($request->user())->authorize('view', $quoteRequest);

        $histories = $quoteRequest->histories()
            ->with([
                'previousStatus:id,name,color_hex',
                'newStatus:id,name,color_hex',
                'user:id,name',
            ])
            ->latest('created_at')
            ->get();

        return response()->json([
            'histories' => $histories,
        ]);
    }

    public function submit(Request $request, QuoteRequest $quoteRequest)
    {
        Gate::forUser($request->user())->authorize('submit', $quoteRequest);

        $quoteRequest = $this->quoteRequestService->submit(
            $quoteRequest,
            $request->user(),
        );

        return response()->json([
            'message' => 'Solicitud de cotización enviada correctamente.',
            'quote_request' => new QuoteRequestResource($quoteRequest),
        ]);
    }

    public function markViewed(Request $request, QuoteRequest $quoteRequest)
    {
        Gate::forUser($request->user())->authorize('markViewed', $quoteRequest);

        $quoteRequest = $this->quoteRequestService->markViewed(
            $quoteRequest,
            $request->user(),
        );

        return response()->json([
            'message' => 'Solicitud marcada como vista.',
            'quote_request' => new QuoteRequestResource($quoteRequest),
        ]);
    }

    public function update(
        QuoteRequestFormRequest $request,
        QuoteRequest $quoteRequest,
    ) {
        Gate::forUser($request->user())->authorize('update', $quoteRequest);

        $quoteRequest = $this->quoteRequestService->update(
            $quoteRequest,
            $request->validated(),
            $request->user(),
        );

        return response()->json([
            'message'       => 'Solicitud de cotización actualizada correctamente.',
            'quote_request' => new QuoteRequestResource($quoteRequest),
        ]);
    }
}
