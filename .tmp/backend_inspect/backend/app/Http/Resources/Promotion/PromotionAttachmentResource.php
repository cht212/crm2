<?php

namespace App\Http\Resources\Promotion;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PromotionAttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'url' => Storage::disk('public')->url($this->path),
            'sort_order' => $this->sort_order,
        ];
    }
}
