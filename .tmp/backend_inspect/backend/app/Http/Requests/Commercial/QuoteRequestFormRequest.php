<?php

namespace App\Http\Requests\Commercial;

use App\Models\Catalog\Type;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\Catalog\Subtype;
use App\Models\Commercial\QuoteRequest;

class QuoteRequestFormRequest extends FormRequest
{
    private const MAX_ATTACHMENTS = 3;
    private const MAX_ATTACHMENT_SIZE_KB = 5120;
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null) {
            return false;
        }

        if ($this->isMethod('post')) {
            return $user->can('create', QuoteRequest::class);
        }

        $quoteRequest = $this->route('quote_request');

        return $user->can('update', $quoteRequest);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'subject' => [
                'required',
                'string',
                'max:200',
            ],

            'observations' => [
                'nullable',
                'string',
                'max:1000',
            ],

            'details' => [
                'required',
                'array',
                'min:1',
            ],

            'attachments' => [
                'nullable',
                'array',
                'max:' . self::MAX_ATTACHMENTS,
            ],

            'attachments.*' => [
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:' . self::MAX_ATTACHMENT_SIZE_KB,
            ],
            'deleted_attachments' => [
                'nullable',
                'array',
            ],

            'deleted_attachments.*' => [
                'integer',
            ],
        ];

        foreach ($this->input('details', []) as $index => $detail) {
            $typeId = $detail['product_type_id'] ?? null;
            $subtypeId = $detail['subtype_id'] ?? null;

            $quoteRequest = $this->route('quote_request');
            $quoteRequestId = is_object($quoteRequest)
                ? $quoteRequest->id
                : $quoteRequest;

            $detailIdRule = Rule::exists(
                'commercial_quote_request_details',
                'id',
            );

            if ($quoteRequestId) {
                $detailIdRule->where(
                    'quote_request_id',
                    $quoteRequestId,
                );
            }

            $rules["details.$index.id"] = [
                'nullable',
                'integer',
                $detailIdRule,
            ];

            $rules["details.$index.product_type_id"] = [
                'required',
                'integer',
                'exists:catalog_product_types,id',
            ];

            $rules["details.$index.product_id"] = [
                'required',
                'integer',
                Rule::exists('catalog_products', 'id')
                    ->where('subtype_id', $subtypeId),
            ];

            $rules["details.$index.subtype_id"] = [
                'required',
                'integer',
                Rule::exists('catalog_product_subtypes', 'id')
                    ->where('product_type_id', $typeId),
            ];

            $rules["details.$index.lengths_id"] = [
                'nullable',
                'integer',
                Rule::exists('catalog_product_type_lengths', 'product_length_id')
                    ->where('product_type_id', $typeId),
            ];

            $rules["details.$index.finish_id"] = [
                'nullable',
                'integer',
                Rule::exists('catalog_product_type_finishes', 'finish_id')
                    ->where('product_type_id', $typeId)
                    ->where('is_active', true),
            ];

            $rules["details.$index.thickness"] = [
                'nullable',
                'integer',
                'min:1',
            ];

            $rules["details.$index.base"] = [
                'nullable',
                'integer',
                'min:0',
            ];

            $rules["details.$index.height"] = [
                'nullable',
                'integer',
                'min:0',
            ];

            $rules["details.$index.quantity"] = [
                'required',
                'integer',
                'min:1',
            ];

            $rules["details.$index.observation"] = [
                'nullable',
                'string',
                'max:300',
            ];

            $rules["details.$index.characteristics"] = [
                'nullable',
                'array',
            ];

            $rules["details.$index.characteristics.*"] = [
                'integer',
                'exists:catalog_additional_characteristics,id',
            ];
        }

        return $rules;
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $quoteRequest = $this->route('quote_request');

            // 1. Validación de Adjuntos Máximos
            if (is_object($quoteRequest)) {
                $existingCount = $quoteRequest->attachments()->count();
                $newCount = count($this->file('attachments', []));

                if ($existingCount + $newCount > 5) {
                    $validator->errors()->add(
                        'attachments',
                        "No puede superar 5 archivos por cotización. Ya tiene {$existingCount} adjunto(s) y está agregando {$newCount}."
                    );
                }
            }

            // 2. EAGER LOADING MANUAL ANTI-N+1:
            // Agrupamos todos los product_type_id del request para buscarlos en un único Query colectivo
            $details = $this->input('details', []);
            $typeIds = collect($details)->pluck('product_type_id')->filter()->unique()->toArray();

            // Consultamos la BD una sola vez precargando la configuración y sus acabados activos
            $typesCache = Type::query()
                ->with(['configuration', 'characteristics', 'finishes' => function ($query) {
                    $query->where('is_active', true)->with('finish');
                }])
                ->whereIn('id', $typeIds)
                ->where('is_active', true)
                ->get()
                ->keyBy('id'); // Indexamos por ID para buscar en memoria a velocidad luz

            // 3. Procesamiento de validaciones dinámicas en memoria
            foreach ($details as $index => $detail) {
                $typeId = $detail['product_type_id'] ?? null;

                if (!$typeId) {
                    continue;
                }

                // Buscamos en el caché de colecciones en lugar de lanzar un query SQL por ciclo
                $type = $typesCache->get($typeId);

                if (!$type) {
                    continue;
                }

                $configuration = $type->configuration;

                /*
             * Longitud
             */
                if ($configuration?->uses_lengths && empty($detail['lengths_id'])) {
                    $validator->errors()->add(
                        "details.$index.lengths_id",
                        'Debe seleccionar la longitud.'
                    );
                }

                /*
             * Acabado
             */
                if ($configuration?->uses_finish && empty($detail['finish_id'])) {
                    $validator->errors()->add(
                        "details.$index.finish_id",
                        'Debe seleccionar el acabado.'
                    );
                }

                /*
             * Espesor
             */
                if ($configuration?->uses_thickness && empty($detail['thickness'])) {
                    $validator->errors()->add(
                        "details.$index.thickness",
                        'Debe ingresar un espesor mayor a 0.'
                    );
                }

                /*
             * Base y altura
             */
                if ($configuration?->uses_dimensions) {
                    $base = $detail['base'] ?? null;
                    $height = $detail['height'] ?? null;

                    if ($base === null || $base <= 0) {
                        $validator->errors()->add(
                            "details.$index.base",
                            'La base debe ser mayor a 0.'
                        );
                    }

                    if ($height === null || $height <= 0) {
                        $validator->errors()->add(
                            "details.$index.height",
                            'La altura debe ser mayor a 0.'
                        );
                    }

                    /*
                 * Validación de medidas según el acabado (Resuelto usando colecciones en RAM)
                 */
                    if (!empty($detail['finish_id'])) {
                        // Buscamos el acabado directamente en la relación precargada usando firstWhere
                        $finish = $type->finishes->firstWhere('finish_id', $detail['finish_id']);

                        if ($finish && $finish->apply_measure_validation) {
                            if (
                                $finish->max_width !== null
                                && $base !== null
                                && $base > $finish->max_width
                            ) {
                                $validator->errors()->add(
                                    "details.$index.base",
                                    "La base no puede superar {$finish->max_width}."
                                );
                            }

                            if (
                                $finish->max_height !== null
                                && $height !== null
                                && $height > $finish->max_height
                            ) {
                                $validator->errors()->add(
                                    "details.$index.height",
                                    "La altura no puede superar {$finish->max_height}."
                                );
                            }
                        }
                    }
                }
                /*
             * Caracteristicas adicionales
             */
                $characteristicIds = $detail['characteristics'] ?? [];

                if (!empty($characteristicIds)) {
                    $allowedCharacteristicIds = $type
                        ->characteristics
                        ->pluck('id')
                        ->toArray();

                    foreach ($characteristicIds as $characteristicId) {
                        if (!in_array($characteristicId, $allowedCharacteristicIds)) {
                            $validator->errors()->add(
                                "details.$index.characteristics",
                                "La característica {$characteristicId} no está disponible para este tipo de producto."
                            );
                        }
                    }
                }
            }
        });
    }
}
