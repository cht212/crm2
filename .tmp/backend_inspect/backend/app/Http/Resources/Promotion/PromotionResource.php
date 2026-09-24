<?php

namespace App\Http\Resources\Promotion;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\Survey\SurveyResource;
use App\Services\Security\PromotionContentSanitizer;

class PromotionResource extends JsonResource
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
            'content' => app(PromotionContentSanitizer::class)->sanitize($this->content),
            'type_post' => $this->type_post,
            'author_id' => $this->author_id,
            'author' => $this->whenLoaded('author', fn () => [
                'id' => $this->author->getKey(),
                'name' => $this->author->name,
            ]),
            'image_url' => $this->image_url,
            'published_at' => $this->published_at?->toISOString(),
            'starts_at' => $this->starts_at?->toISOString(),
            'ends_at' => $this->ends_at?->toISOString(),
            'status' => $this->status,
            'audience_type' => $this->audience_type,
            'customers' => $this->whenLoaded('customers', fn () => $this->customers->map(fn ($customer) => [
                'id' => $customer->id,
                'company_name' => $customer->company_name,
            ])),
            'images' => PromotionImageResource::collection($this->whenLoaded('images')),
            'attachments' => PromotionAttachmentResource::collection($this->whenLoaded('attachments')),
            'actions' => PromotionActionResource::collection($this->whenLoaded('actions')),
            'embeds' => PromotionEmbedResource::collection($this->whenLoaded('embeds')),
            'survey' => $this->whenLoaded('survey', fn () => new SurveyResource($this->survey)),
        ];
    }
}
