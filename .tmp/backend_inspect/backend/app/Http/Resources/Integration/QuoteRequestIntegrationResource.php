<?php

namespace App\Http\Resources\Integration;

use App\Http\Resources\Commercial\QuoteRequestAttachmentResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuoteRequestIntegrationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'requestNumber' => $this->request_number,
            'subject' => $this->subject,
            'observations' => $this->observations,
            'requestedAt' => $this->requested_at,
            'company' => $this->whenLoaded('customer', fn () => [
                'id' => $this->customer->id,
                'companyName' => $this->customer->company_name,
                'taxNumber' => $this->customer->tax_number,
                'tradeName' => $this->customer->trade_name,
                'email' => $this->customer->email,
                'phone' => $this->customer->phone,
            ]),
            'products' => $this->whenLoaded('details', fn () => $this->details->map(
                fn ($detail) => [
                    'productCode' => $detail->product?->code,
                    'productName' => $detail->product?->name,
                    'productType' => $detail->productType?->name,
                    'finish' => $detail->finish?->name,
                    'length' => $detail->length?->name,
                    'thickness' => $detail->thickness,
                    'base' => $detail->base,
                    'height' => $detail->height,
                    'quantity' => $detail->quantity,
                    'observation' => $detail->observation,
                    'characteristics' => $detail->characteristics
                        ->pluck('name')
                        ->values(),
                ],
            )),
            'attachments' => QuoteRequestAttachmentResource::collection(
                $this->whenLoaded('attachments')
            ),
            'integration_status' => $this->integration_status,
            'integrationId' => $this->integration_id,
            'integrationError' => $this->integration_error,
            'integrationProcessedAt' => $this->integration_processed_at,
            'integrationAttempts' => $this->integration_attempts,
        ];
    }
}
