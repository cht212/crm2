<?php

namespace App\Http\Resources\Survey;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SurveyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'promotion_id' => $this->promotion_id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status?->value,
            'starts_at' => $this->starts_at?->toISOString(),
            'ends_at' => $this->ends_at?->toISOString(),
            'published_at' => $this->published_at?->toISOString(),
            'closed_at' => $this->closed_at?->toISOString(),
            'questions' => SurveyQuestionResource::collection($this->whenLoaded('questions')),
        ];
    }
}
