<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Validation\Rule;

final class CatalogRules
{
    public static function for(?string $resource, bool $update = false): array
    {
        $required = $update ? ['sometimes'] : ['required'];

        return match ($resource) {
            'types' => [
                'name' => [...$required, 'string', 'max:255'],
                'is_active' => ['sometimes', 'boolean'],
                'configuration' => ['sometimes', 'array'],
                'configuration.uses_finish' => ['sometimes', 'boolean'],
                'configuration.uses_lengths' => ['sometimes', 'boolean'],
                'configuration.uses_thickness' => ['sometimes', 'boolean'],
                'configuration.uses_dimensions' => ['sometimes', 'boolean'],
                'configuration.is_active' => ['sometimes', 'boolean'],
                'length_ids' => ['sometimes', 'array'],
                'length_ids.*' => ['integer', 'exists:catalog_lengths,id'],
                'finish_ids' => ['sometimes', 'array'],
                'finish_ids.*' => ['integer', 'exists:catalog_finishes,id'],
                'characteristic_ids' => ['sometimes', 'array'],
                'characteristic_ids.*' => ['integer', 'exists:catalog_additional_characteristics,id'],
            ],
            'products' => [
                'code' => [...$required, 'string', 'max:20', Rule::unique('catalog_products', 'code')->ignore(request()->route('id'))],
                'subtype_id' => [...$required, 'integer', 'exists:catalog_product_subtypes,id'],
                'name' => [...$required, 'string', 'max:255'], 'description' => ['nullable', 'string', 'max:150'],
                'max_quantity' => [...$required, 'integer', 'min:0'], 'is_active' => ['sometimes', 'boolean'],
            ],
            'subtypes' => [
                'product_type_id' => [...$required, 'integer', 'exists:catalog_product_types,id'],
                'code' => [
                    ...$required,
                    'string',
                    'max:20',
                    Rule::unique('catalog_product_subtypes', 'code')
                        ->where(fn ($query) => $query->where('product_type_id', request()->input('product_type_id')))
                        ->ignore(request()->route('id')),
                ],
                'name' => [...$required, 'string', 'max:255'],
                'is_active' => ['sometimes', 'boolean'],
            ],
            'series' => [
                'product_type_id' => [...$required, 'integer', 'exists:catalog_product_types,id'],
                'code' => [...$required, 'string', 'max:10'], 'description' => ['nullable', 'string', 'max:100'], 'is_active' => ['sometimes', 'boolean'],
            ],
            'finishes' => ['name' => [...$required, 'string', 'max:100'], 'related_value' => [...$required, 'string', 'max:10'], 'is_active' => ['sometimes', 'boolean']],
            'lengths' => ['code' => [...$required, 'string', 'max:2'], 'value' => [...$required, 'numeric', 'min:0'], 'is_active' => ['sometimes', 'boolean']],
            'thicknesses' => [
                'product_type_id' => [...$required, 'integer', 'exists:catalog_product_types,id'], 'value' => [...$required, 'numeric', 'min:0'],
                'unit' => [...$required, 'string', 'max:10'], 'description' => ['nullable', 'string', 'max:100'], 'is_active' => ['sometimes', 'boolean'],
            ],
            'additional-characteristics' => [
                'code' => [
                    ...$required,
                    'string',
                    'max:50',
                    Rule::unique('catalog_additional_characteristics', 'code')->ignore(request()->route('id')),
                ],
                'name' => [...$required, 'string', 'max:255'],
                'is_active' => ['sometimes', 'boolean'],
            ],
            'type-configurations' => [
                'product_type_id' => [...$required, 'integer', 'exists:catalog_product_types,id'],
                'uses_finish' => ['sometimes', 'boolean'], 'uses_lengths' => ['sometimes', 'boolean'], 'uses_series' => ['sometimes', 'boolean'],
                'uses_thickness' => ['sometimes', 'boolean'], 'uses_dimensions' => ['sometimes', 'boolean'], 'is_active' => ['sometimes', 'boolean'],
            ],
            'type-finishes' => [
                'product_type_id' => [...$required, 'integer', 'exists:catalog_product_types,id'], 'finish_id' => [...$required, 'integer', 'exists:catalog_finishes,id'],
                'apply_measure_validation' => ['sometimes', 'boolean'], 'max_width' => ['nullable', 'numeric', 'min:0'], 'max_height' => ['nullable', 'numeric', 'min:0'], 'is_active' => ['sometimes', 'boolean'],
            ],
            'type-lengths' => ['product_type_id' => [...$required, 'integer', 'exists:catalog_product_types,id'], 'product_length_id' => [...$required, 'integer', 'exists:catalog_lengths,id']],
            'type-characteristics' => ['product_type_id' => [...$required, 'integer', 'exists:catalog_product_types,id'], 'characteristic_id' => [...$required, 'integer', 'exists:catalog_additional_characteristics,id']],
            default => [],
        };
    }
}
