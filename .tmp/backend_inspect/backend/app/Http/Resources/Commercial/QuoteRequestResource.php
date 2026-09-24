<?php

namespace App\Http\Resources\Commercial;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuoteRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'request_number' => $this->request_number,
            'customer_id' => $this->customer_id,
            'subject' => $this->subject,
            'observations' => $this->observations,
            'status_id' => $this->status_id,
            'requested_at' => $this->requested_at,
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'is_active' => $this->is_active,

            'customer' => $this->whenLoaded('customer'),

            'status' => $this->whenLoaded('status'),

            'details' => QuoteRequestDetailResource::collection(
                $this->whenLoaded('details')
            ),

            'histories' => $this->whenLoaded('histories'),

            'attachments' => QuoteRequestAttachmentResource::collection(
                $this->whenLoaded('attachments')
            ),
            'characteristics' => $this->whenLoaded('characteristics')
        ];
    }
}