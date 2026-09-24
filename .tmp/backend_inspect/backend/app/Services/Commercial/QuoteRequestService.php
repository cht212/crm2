<?php

namespace App\Services\Commercial;

use App\Models\Commercial\QuoteRequest;
use App\Models\Commercial\QuoteRequestStatus;
use App\Models\User;
use App\Notifications\QuoteSubmittedAdminEmail;
use App\Notifications\QuoteSubmittedCustomerEmail;
use App\Notifications\QuoteSubmittedNotification;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class QuoteRequestService
{
    public function getList(Request $request): array
    {
        $query = $this->buildListQuery($request);

        $summary = $this->buildSummary($query);

        $quoteRequests = $this->paginate($query, $request);

        return [
            'quoteRequests' => $quoteRequests->items(),
            'totalQuoteRequests' => $quoteRequests->total(),
            'summary' => $summary,
            'per_page' => $quoteRequests->perPage(),
            'current_page' => $quoteRequests->currentPage(),
        ];
    }

    public function create(array $data, User $user): QuoteRequest
    {
        return DB::transaction(function () use ($data, $user) {
            $requestNumber = $this->generateRequestNumber();
            $draftStatusId = $this->getStatusId('Borrador');

            $quoteRequest = QuoteRequest::create([
                'request_number' => $requestNumber,
                'customer_id' => $user->customer_id,
                'subject' => $data['subject'],
                'observations' => $data['observations'] ?? null,
                'status_id' => $draftStatusId,
                'requested_at' => now(),
                'created_by' => $user->id,
                'updated_by' => null,
                'is_active' => true,
                'integration_status' => 'pending',
                'integration_attempts' => 0,
            ]);

            $this->syncDetails($quoteRequest, $data['details']);

            if (! empty($data['attachments'])) {
                $this->storeAttachments($quoteRequest, $data['attachments'], $user);
            }

            $this->createHistory(
                $quoteRequest,
                'created',
                null,
                $draftStatusId,
                null,
                'Solicitud de cotización creada.',
                $user,
            );

            return $this->loadQuoteRequest($quoteRequest);
        });
    }

    public function show(QuoteRequest $quoteRequest, User $user): QuoteRequest
    {
        return $this->loadQuoteRequest($quoteRequest);
    }

    public function submit(QuoteRequest $quoteRequest, User $user): QuoteRequest
    {
        return DB::transaction(function () use ($quoteRequest, $user) {
            $quoteRequest->loadMissing('status');
            $draftStatusId = $this->getStatusId('Borrador');
            $pendingStatusId = $this->getStatusId('Pendiente');

            if ($quoteRequest->status_id !== $draftStatusId) {
                throw ValidationException::withMessages([
                    'status' => 'Solo se pueden enviar cotizaciones en borrador.',
                ]);
            }

            $quoteRequest->update([
                'status_id' => $pendingStatusId,
                'requested_at' => now(),
                'updated_by' => $user->id,
            ]);

            $this->createHistory(
                $quoteRequest,
                'status_changed',
                $draftStatusId,
                $pendingStatusId,
                null,
                'Solicitud de cotización enviada para revisión.',
                $user,
            );

            $adminEmail = config('mail.testing_recipient');
            $quoteRequest->load([
                'customer',
                'details.productType',
                'details.product',
                'details.finish',
                'details.length',
                'details.characteristics',
            ]);

            User::query()
                ->whereHas('roles', fn ($query) => $query->whereIn('name', ['admin', 'commercial']))
                ->get()
                ->each(fn (User $recipient) => $recipient->notify(
                    new QuoteSubmittedNotification($quoteRequest)
                ));

            if ($adminEmail) {
                Notification::route('mail', $adminEmail)->notify(
                    new QuoteSubmittedAdminEmail($quoteRequest)
                );
                Notification::route('mail', $adminEmail)->notify(
                    new QuoteSubmittedCustomerEmail($quoteRequest)
                );
            } else {
                User::query()
                    ->role('admin')
                    ->each(fn (User $recipient) => $recipient->notify(
                        new QuoteSubmittedAdminEmail($quoteRequest)
                    ));

                $user->notify(new QuoteSubmittedCustomerEmail($quoteRequest));
            }

            return $this->loadQuoteRequest($quoteRequest);
        });
    }

    public function markViewed(QuoteRequest $quoteRequest, User $user): QuoteRequest
    {
        return DB::transaction(function () use ($quoteRequest, $user) {
            $quoteRequest->loadMissing('status');
            $pendingStatusId = $this->getStatusId('Pendiente');
            $reviewStatusId = $this->getStatusId('En revisión');

            if ($quoteRequest->status_id !== $pendingStatusId) {
                throw ValidationException::withMessages([
                    'status' => 'Solo se pueden marcar como vistas las cotizaciones pendientes.',
                ]);
            }

            $quoteRequest->update([
                'status_id' => $reviewStatusId,
                'updated_by' => $user->id,
            ]);

            $this->createHistory(
                $quoteRequest,
                'status_changed',
                $pendingStatusId,
                $reviewStatusId,
                null,
                'Solicitud de cotización marcada como vista.',
                $user,
            );

            return $this->loadQuoteRequest($quoteRequest);
        });
    }

    public function update(
        QuoteRequest $quoteRequest,
        array $data,
        User $user,
    ): QuoteRequest {
        return DB::transaction(function () use ($quoteRequest, $data, $user) {
            $changes = [
                'header' => [],
                'details' => [
                    'added' => [],
                    'removed' => [],
                    'updated' => [],
                ],
                'attachments' => [
                    'added' => [],
                    'removed' => [],
                ],
            ];

            $newObservations = $data['observations'] ?? null;

            if ($quoteRequest->subject !== $data['subject']) {
                $changes['header']['subject'] = [
                    'old' => $quoteRequest->subject,
                    'new' => $data['subject'],
                ];
            }

            if ($quoteRequest->observations !== $newObservations) {
                $changes['header']['observations'] = [
                    'old' => $quoteRequest->observations,
                    'new' => $newObservations,
                ];
            }

            $detailChanges = $this->syncDetails(
                $quoteRequest,
                $data['details'],
            );

            $changes['details'] = $detailChanges;

            if (! empty($data['attachments'])) {
                $changes['attachments']['added'] = $this->storeAttachments(
                    $quoteRequest,
                    $data['attachments'],
                    $user,
                );
            }
            if (! empty($data['deleted_attachments'])) {
                $changes['attachments']['removed'] = $this->deleteAttachments(
                    $quoteRequest,
                    $data['deleted_attachments'],
                );
            }

            Log::info('Deleted attachments', [
                'ids' => $data['deleted_attachments'] ?? [],
            ]);

            $quoteRequest->update([
                'subject' => $data['subject'],
                'observations' => $newObservations,
                'updated_by' => $user->id,
            ]);

            if ($this->hasChanges($changes)) {
                $this->createHistory(
                    $quoteRequest,
                    'updated',
                    $quoteRequest->status_id,
                    $quoteRequest->status_id,
                    $changes,
                    'Solicitud de cotización editada.',
                    $user,
                );
            }

            return $this->loadQuoteRequest($quoteRequest);
        });
    }

    private function loadQuoteRequest(
        QuoteRequest $quoteRequest,
        array $additionalRelations = [],
    ): QuoteRequest {
        return $quoteRequest->load(array_merge([
            'customer',
            'status',
            'details.productType',
            'details.product',
            'details.length',
            'details.finish',
            'details.characteristics',
            'attachments',
        ], $additionalRelations));
    }

    private function syncDetails(
        QuoteRequest $quoteRequest,
        array $newDetails,
    ): array {
        $now = now();
        $newDetailsCollection = collect($newDetails);

        $incomingIds = $newDetailsCollection
            ->pluck('id')
            ->filter()
            ->toArray();

        if (! empty($incomingIds)) {
            $ownedDetailIds = $quoteRequest->details()
                ->whereIn('id', $incomingIds)
                ->pluck('id')
                ->all();

            if (count($ownedDetailIds) !== count($incomingIds)) {
                throw ValidationException::withMessages([
                    'details' => 'Uno o más detalles no pertenecen a esta solicitud.',
                ]);
            }
        }

        // 1. Identificar y eliminar los detalles que el usuario quitó
        $removedDetails = $quoteRequest->details()
            ->with('product:id,name')
            ->whereNotIn('id', $incomingIds)
            ->get();

        $quoteRequest->details()
            ->whereNotIn('id', $incomingIds)
            ->delete();

        // 2. Preparar los datos para UPSERT masivo
        $detailsToUpsert = $newDetailsCollection->map(function ($detail) use ($quoteRequest, $now) {
            return [
                'id' => $detail['id'] ?? null,
                'quote_request_id' => $quoteRequest->id,
                'product_type_id' => $detail['product_type_id'],
                'subtype_id' => $detail['subtype_id'] ?? null,
                'product_id' => $detail['product_id'],
                'lengths_id' => $detail['lengths_id'] ?? null,
                'finish_id' => $detail['finish_id'] ?? null,
                'thickness' => $detail['thickness'] ?? null,
                'base' => $detail['base'] ?? null,
                'height' => $detail['height'] ?? null,
                'quantity' => $detail['quantity'],
                'observation' => $detail['observation'] ?? null,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        })->toArray();

        // 3. Ejecutar UPSERT nativo
        if (! empty($detailsToUpsert)) {
            $quoteRequest->details()->upsert($detailsToUpsert, ['id'], [
                'product_type_id',
                'subtype_id',
                'product_id',
                'lengths_id',
                'finish_id',
                'thickness',
                'base',
                'height',
                'quantity',
                'observation',
                'is_active',
                'updated_at',
            ]);
        }

        // 4. Refrescar detalles para sincronizar características con IDs reales
        $currentDetails = $quoteRequest->details()->get()->keyBy('id');
        $currentDetails->load('product:id,name');
        $detailIds = $currentDetails->keys()->toArray();

        // Limpiar características anteriores de los detalles existentes
        if (! empty($detailIds)) {
            DB::table('commercial_quote_request_detail_characteristics')
                ->whereIn('quote_request_detail_id', $detailIds)
                ->delete();
        }

        // 5. Construir matriz de características para inserción masiva
        $characteristicRows = [];

        foreach ($newDetailsCollection as $detailData) {
            $characteristics = $detailData['characteristics'] ?? [];

            if (empty($characteristics)) {
                continue;
            }

            $detailId = $detailData['id'] ?? null;

            if ($detailId) {
                $detail = $currentDetails->get($detailId);
            } else {
                // Localizar el registro nuevo autoincremental
                $detail = $currentDetails
                    ->where('product_type_id', $detailData['product_type_id'])
                    ->where('product_id', $detailData['product_id'])
                    ->where('quantity', $detailData['quantity'])
                    ->sortByDesc('id')
                    ->first();
            }

            if (! $detail) {
                continue;
            }

            foreach ($characteristics as $characteristicId) {
                $characteristicRows[] = [
                    'quote_request_detail_id' => $detail->id,
                    'characteristic_id' => $characteristicId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        // 6. Insertar todas las características en una sola consulta
        if (! empty($characteristicRows)) {
            DB::table('commercial_quote_request_detail_characteristics')
                ->insert($characteristicRows);
        }

        // 7. Construir historial de cambios
        return $this->formatSyncChanges($currentDetails, $newDetailsCollection, $removedDetails);
    }

    private function formatSyncChanges($currentDetails, $newDetailsCollection, $removedDetails): array
    {
        $changes = ['added' => [], 'removed' => [], 'updated' => []];

        // Mapear eliminados
        foreach ($removedDetails as $detail) {
            $changes['removed'][] = [
                'detail_id' => $detail->id,
                'product_id' => $detail->product_id,
                'product_name' => $detail->product?->name,
                'quantity' => $detail->quantity,
            ];
        }

        // Clasificar agregados y editados usando la colección fresca
        foreach ($currentDetails as $detail) {
            $incoming = $newDetailsCollection->firstWhere('id', $detail->id);

            if (! $incoming) { // Es uno nuevo que se acaba de insertar (no traía ID)
                $changes['added'][] = [
                    'detail_id' => $detail->id,
                    'product_id' => $detail->product_id,
                    'product_name' => $detail->product?->name,
                    'quantity' => $detail->quantity,
                ];
            } else {
                // Nota: Si necesitas eldiff exacto de campos modificados ('old' vs 'new'),
                // el upsert de base de datos no te lo da directamente en memoria,
                // pero puedes comparar los campos de $incoming con $detail aquí si es necesario.
                $changes['updated'][] = [
                    'detail_id' => $detail->id,
                    'product_id' => $detail->product_id,
                    'product_name' => $detail->product?->name,
                ];
            }
        }

        return $changes;
    }

    private function hasChanges(array $changes): bool
    {
        return ! empty($changes['header'])
            || ! empty($changes['details']['added'])
            || ! empty($changes['details']['removed'])
            || ! empty($changes['details']['updated'])
            || ! empty($changes['attachments']['added'])
            || ! empty($changes['attachments']['removed']);
    }

    private function generateRequestNumber(): string
    {
        $today = now();
        $date = $today->format('Ymd');
        $startOfDay = $today->copy()->startOfDay();
        $startOfTomorrow = $startOfDay->copy()->addDay();

        $lastRequest = QuoteRequest::query()
            ->where('created_at', '>=', $startOfDay)
            ->where('created_at', '<', $startOfTomorrow)
            ->lockForUpdate()
            ->orderByDesc('id')
            ->first();

        $sequence = 1;

        if ($lastRequest) {
            $sequence = (int) substr(
                $lastRequest->request_number,
                -4
            ) + 1;
        }

        return 'SC'
            .$date
            .str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    private function getStatusId(string $name): int
    {
        return QuoteRequestStatus::query()
            ->where('name', $name)
            ->where('is_active', true)
            ->value('id')
            ?? throw new HttpException(
                500,
                "El estado '{$name}' no está configurado."
            );
    }

    public function getStatuses()
    {
        return QuoteRequestStatus::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'name', 'color_hex']);
    }

    private function buildListQuery(Request $request)
    {
        $user = $request->user();
        $query = QuoteRequest::query();

        if (! $user->hasAnyRole(['admin', 'commercial'])) {
            $query->where('customer_id', $user->customer_id);
        } else {
            $query->whereHas('status', function ($statusQuery) {
                $statusQuery->where('name', '!=', 'Borrador');
            });
        }

        if ($request->filled('q')) {
            $search = $request->string('q')->trim();

            $query->where(function ($query) use ($search) {
                $query->where(
                    'request_number',
                    'like',
                    "%{$search}%"
                )->orWhere(
                    'subject',
                    'like',
                    "%{$search}%"
                );
            });
        }

        if ($request->filled('startDate')) {
            $query->whereDate(
                'commercial_quote_requests.created_at',
                '>=',
                $request->input('startDate'),
            );
        }

        if ($request->filled('endDate')) {
            $query->whereDate(
                'commercial_quote_requests.created_at',
                '<=',
                $request->input('endDate'),
            );
        }

        if ($request->filled('status')) {
            $query->whereHas('status', function ($statusQuery) use ($request) {
                $statusQuery->where('name', $request->input('status'));
            });
        }

        return $query;
    }

    private function buildSummary($query): array
    {
        // Hacemos un JOIN o mapeamos por el ID del estado para contar de un solo golpe
        $counts = (clone $query)
            ->join('commercial_quote_request_statuses', 'commercial_quote_requests.status_id', '=', 'commercial_quote_request_statuses.id')
            ->selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN commercial_quote_request_statuses.name = 'Pendiente' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN commercial_quote_request_statuses.name IN ('En revisión', 'En cotización') THEN 1 ELSE 0 END) as in_process,
            SUM(CASE WHEN commercial_quote_request_statuses.name IN ('En revisión', 'En cotización', 'Cotizada', 'Rechazada', 'Cancelada') THEN 1 ELSE 0 END) as reviewed,
            SUM(CASE WHEN commercial_quote_request_statuses.name = 'Cotizada' THEN 1 ELSE 0 END) as quoted
        ")
            ->first();

        return
            [
                'total' => (int) ($counts->total ?? 0),
                'pending' => (int) ($counts->pending ?? 0),
                'inProcess' => (int) ($counts->in_process ?? 0),
                'reviewed' => (int) ($counts->reviewed ?? 0),
                'quoted' => (int) ($counts->quoted ?? 0),
            ];
    }

    private function paginate(
        $query,
        Request $request,
    ): LengthAwarePaginator {
        $sortBy = $request->input('sortBy', 'requested_at');
        $orderBy = $request->input('orderBy', 'desc');

        $allowedSorts = [
            'request_number',
            'subject',
            'requested_at',
            'status_id',
        ];

        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy(
                $sortBy,
                $orderBy === 'asc' ? 'asc' : 'desc'
            );
        }

        $perPage = min(
            max(
                (int) $request->input('itemsPerPage', 10),
                1
            ),
            100
        );

        return $query
            ->with(['status:id,name,color_hex', 'customer:id,company_name,tax_number'])
            ->paginate($perPage);
    }

    private function createHistory(
        QuoteRequest $quoteRequest,
        string $action,
        ?int $previousStatusId,
        int $newStatusId,
        ?array $changes,
        ?string $comment,
        User $user,
    ): void {
        $quoteRequest->histories()->create([
            'action' => $action,
            'previous_status_id' => $previousStatusId,
            'new_status_id' => $newStatusId,
            'changes' => $changes,
            'comment' => $comment,
            'user_id' => $user->id,
            'created_at' => now(),
        ]);
    }

    private function valuesAreEqual(mixed $oldValue, mixed $newValue): bool
    {
        if ($oldValue === null && $newValue === null) {
            return true;
        }

        return (string) $oldValue === (string) $newValue;
    }

    private function storeAttachments(QuoteRequest $quoteRequest, array $files, User $user): array
    {

        $added = [];

        foreach ($files as $file) {
            $path = $file->store('quote-attachments', 'local');

            $attachment = $quoteRequest->attachments()->create([
                'original_name' => $file->getClientOriginalName(),
                'path' => $path,
                'disk' => 'local',
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
                'uploaded_by' => $user->id,
            ]);

            $added[] = [
                'attachment_id' => $attachment->id,
                'original_name' => $attachment->original_name,
            ];
        }

        return $added;
    }

    private function deleteAttachments(
        QuoteRequest $quoteRequest,
        array $attachmentIds,
    ): array {
        $removed = [];

        $attachments = $quoteRequest->attachments()
            ->whereIn('id', $attachmentIds)
            ->get();

        foreach ($attachments as $attachment) {
            $removed[] = [
                'attachment_id' => $attachment->id,
                'original_name' => $attachment->original_name,
            ];

            Storage::disk($attachment->disk)->delete($attachment->path);

            $attachment->delete();
        }

        return $removed;
    }
}
