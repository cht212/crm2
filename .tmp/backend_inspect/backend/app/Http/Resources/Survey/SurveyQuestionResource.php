<?php

namespace App\Http\Resources\Survey;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SurveyQuestionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'question' => $this->question,
            'type' => $this->type?->value,
            'position' => $this->position,
            'required' => $this->required,
            'scale_min' => $this->scale_min,
            'scale_max' => $this->scale_max,
            'help_text' => $this->help_text,
            'options' => SurveyOptionResource::collection($this->whenLoaded('options')),
        ];
    }
}
