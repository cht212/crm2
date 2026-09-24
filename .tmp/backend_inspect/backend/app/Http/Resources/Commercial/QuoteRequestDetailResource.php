<?php

namespace App\Http\Resources\Commercial;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuoteRequestDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'quote_request_id' => $this->quote_request_id,
            'product_type_id' => $this->product_type_id,
            'subtype_id' => $this->subtype_id,
            'product_id' => $this->product_id,
            'lengths_id' => $this->lengths_id,
            'finish_id' => $this->finish_id,
            'thickness' => $this->thickness,
            'base' => $this->base,
            'height' => $this->height,
            'quantity' => $this->quantity,
            'observation' => $this->observation,
            'is_active' => $this->is_active,
            'product_type' => $this->whenLoaded('productType'),
            'product' => $this->whenLoaded('product'),
            'length' => $this->whenLoaded('length'),
            'finish' => $this->whenLoaded('finish'),
            'characteristics' => $this->whenLoaded('characteristics', function () {
                return $this->characteristics->map(fn($characteristic) => [
                    'id' => $characteristic->id,
                    'name' => $characteristic->name,
                ]);
            }),
        ];
    }
}
