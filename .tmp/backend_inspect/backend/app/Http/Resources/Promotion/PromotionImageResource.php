<?php

namespace App\Http\Resources\Promotion;

use Illuminate\Support\Facades\Storage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PromotionImageResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'url' => Storage::disk('public')->url($this->path),
            'alt_text' => $this->alt_text,
            'sort_order' => $this->sort_order,
        ];
    }
}
