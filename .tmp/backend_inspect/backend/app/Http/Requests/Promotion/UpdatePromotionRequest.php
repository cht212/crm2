<?php

namespace App\Http\Requests\Promotion;

use App\Enums\Promotion\PromotionStatus;
use App\Enums\Promotion\PromotionType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePromotionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'summary' => ['sometimes', 'required', 'string'],
            'content' => ['sometimes', 'required', 'string'],
            'type_post' => ['sometimes', 'required', Rule::in(array_column(PromotionType::cases(), 'value'))],
            'image_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'published_at' => ['sometimes', 'nullable', 'date'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date', 'after_or_equal:starts_at'],
            'audience_type' => ['sometimes', Rule::in(['all', 'selected'])],
            'customer_ids' => ['required_if:audience_type,selected', 'array', 'min:1'],
            'customer_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('customer_customers', 'id')->where('is_active', true),
            ],
            'status' => ['sometimes', Rule::in(array_column(PromotionStatus::cases(), 'value'))],
            'images' => ['nullable', 'array', 'max:3'],
            'images.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*' => ['required', 'file', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx', 'max:10240'],
            'image_alt_texts' => ['nullable', 'array'],
            'image_alt_texts.*' => ['nullable', 'string', 'max:255'],
            'deleted_image_ids' => ['nullable', 'array'],
            'deleted_image_ids.*' => ['integer', 'distinct'],
            'deleted_attachment_ids' => ['nullable', 'array'],
            'deleted_attachment_ids.*' => ['integer', 'distinct'],
            'actions' => ['sometimes', 'nullable', 'array', 'max:10'],
            'actions.*.label' => ['required', 'string', 'max:100'],
            'actions.*.type' => ['required', 'in:whatsapp,email,link,quote_request'],
            'actions.*.url' => ['required', 'url', 'max:2048'],
            'actions.*.sort_order' => ['sometimes', 'integer', 'min:0'],
            'embeds' => ['sometimes', 'nullable', 'array', 'max:1'],
            'embeds.*.platform' => ['required', 'in:tiktok,facebook,instagram,youtube'],
            'embeds.*.url' => ['required', 'url', 'max:2048'],
            'embeds.*.title' => ['nullable', 'string', 'max:255'],
            'embeds.*.sort_order' => ['sometimes', 'integer', 'min:0'],
            'embeds_present' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->boolean('embeds_present') && ! $this->has('embeds')) {
            $this->merge(['embeds' => []]);
        }
    }
}
