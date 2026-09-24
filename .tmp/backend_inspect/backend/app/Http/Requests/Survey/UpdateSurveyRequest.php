<?php

namespace App\Http\Requests\Survey;

use App\Enums\Survey\SurveyQuestionType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSurveyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date', 'after_or_equal:starts_at'],
            'questions' => ['sometimes', 'array', 'min:1'],
            'questions.*.question' => ['required', 'string', 'max:2000'],
            'questions.*.type' => [
                'required',
                Rule::in(array_column(SurveyQuestionType::cases(), 'value')),
            ],
            'questions.*.position' => ['required', 'integer', 'min:1', 'distinct'],
            'questions.*.required' => ['sometimes', 'boolean'],
            'questions.*.scale_min' => ['nullable', 'integer', 'min:0', 'max:255'],
            'questions.*.scale_max' => ['nullable', 'integer', 'min:1', 'max:255'],
            'questions.*.help_text' => ['nullable', 'string', 'max:500'],
            'questions.*.options' => ['nullable', 'array'],
            'questions.*.options.*.label' => ['required', 'string', 'max:255'],
            'questions.*.options.*.value' => ['required', 'string', 'max:100'],
            'questions.*.options.*.position' => ['required', 'integer', 'min:1'],
        ];
    }
}
