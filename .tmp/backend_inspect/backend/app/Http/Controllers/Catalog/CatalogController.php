<?php

namespace App\Http\Controllers\Catalog;

use App\Http\Controllers\Controller;
use App\Models\Catalog\Type;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function quoteConfigurations()
    {
        $types = Type::query()
            ->where('is_active', true)
            ->with([
                'configuration',
                'characteristics',

                'series' => function ($query) {
                    $query->where('is_active', true);
                },

                'subtypes' => function ($query) {
                    $query->where('is_active', true);
                    $query->with(['products' => function ($query) {
                        $query->where('is_active', true);
                    }]);
                },

                'lengths' => function ($query) {
                    $query->where('is_active', true);
                },

                'finishes' => function ($query) {
                    $query->where('is_active', true)
                        ->with([
                            'finish' => function ($query) {
                                $query->where('is_active', true);
                            },
                        ]);
                },
            ])
            ->orderBy('id')
            ->get();


        return response()->json(
            $types->map(function ($type) {
                return [
                    'id' => $type->id,
                    'name' => mb_strtoupper($type->name),

                    'configuration' => $type->configuration
                        ? [
                            'uses_finish' => $type->configuration->uses_finish,
                            'uses_lengths' => $type->configuration->uses_lengths,
                            'uses_thickness' => $type->configuration->uses_thickness,
                            'uses_dimensions' => $type->configuration->uses_dimensions,
                        ]
                        : null,
                    'characteristics' => $type->characteristics
                        ->where('is_active', true)
                        ->map(function ($characteristic) {
                            return [
                                'id' => $characteristic->id,
                                'name' => $characteristic->name,
                            ];
                        })
                        ->values(),

                    'subtypes' => $type->subtypes
                        ->map(function ($subtype) {
                            return [
                                'id' => $subtype->id,
                                'code' => $subtype->code,
                                'name' => $subtype->name,
                                'products' => $subtype->products->map(function ($product) {
                                    return [
                                        'id' => $product->id,
                                        'code' => $product->code,
                                        'name' => $product->name,
                                        'max_quantity' => $product->max_quantity,
                                    ];
                                })->values(),
                            ];
                        })
                        ->values(),

                    'lengths' => $type->lengths
                        ->map(function ($length) {
                            return [
                                'id' => $length->id,
                                'code' => $length->code,
                                'value' => $length->value,
                            ];
                        })
                        ->values(),

                    'series' => $type->series
                        ->map(function ($series) {
                            return [
                                'id' => $series->id,
                                'code' => $series->code,
                                'description' => $series->description,
                            ];
                        })
                        ->values(),

                    'finishes' => $type->finishes
                        ->filter(fn($typeFinish) => $typeFinish->finish)
                        ->map(function ($typeFinish) {
                            return [
                                'id' => $typeFinish->finish->id,
                                'name' => $typeFinish->finish->name,
                                'apply_measure_validation' =>
                                $typeFinish->apply_measure_validation,
                                'max_width' => $typeFinish->max_width,
                                'max_height' => $typeFinish->max_height,
                            ];
                        })
                        ->values(),
                ];
            })
        );
    }
}
