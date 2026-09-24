<?php

namespace App\Http\Resources\Commercial;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuoteRequestListResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'request_number' => $this->request_number,
            'subject'        => $this->subject,
            'requested_at'   => $this->requested_at,
            'is_active'      => $this->is_active,
            'company'        => $this->whenLoaded('customer'),

            // Cargamos el estado de forma segura previniendo el N+1
            'status'         => $this->whenLoaded('status', function () {
                return [
                    'id'        => $this->status->id,
                    'name'      => $this->status->name,
                    'color_hex' => $this->status->color_hex,
                ];
            }),
        ];
    }
}
