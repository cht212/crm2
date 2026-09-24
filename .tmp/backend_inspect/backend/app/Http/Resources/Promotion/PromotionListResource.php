<?php

namespace App\Http\Resources\Promotion;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\Survey\SurveyResource;

class PromotionListResource extends JsonResource
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
            'title' => $this->title,
            'summary' => $this->summary,
            'type_post' => $this->type_post,
            'image_url' => $this->image_url,
            'published_at' => $this->published_at?->toISOString(),
            'starts_at' => $this->starts_at?->toISOString(),
            'ends_at' => $this->ends_at?->toISOString(),
            'status' => $this->status,
            'audience_type' => $this->audience_type,
            // 'actions' => PromotionActionResource::collection($this->whenLoaded('actions')),
            'images' => PromotionImageResource::collection($this->whenLoaded('images')),
            'survey' => $this->whenLoaded('survey', fn () => new SurveyResource($this->survey)),
            // 'embeds' => PromotionEmbedResource::collection($this->whenLoaded('embeds')),
        ];
    }
}
