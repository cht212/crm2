<?php

namespace App\Services\Catalog;

use App\Models\Catalog\Type;
use App\Models\Catalog\TypeConfiguration;
use App\Models\Catalog\TypeFinish;
use Illuminate\Support\Facades\DB;

class CatalogTypeService
{
    private const TYPE_RELATIONS = [
        'subtypes.products',
        'finishes.finish',
        'lengths',
        'characteristics',
        'configuration',
    ];

    public function save(array $data, ?int $id = null): Type
    {
        return DB::transaction(function () use ($data, $id) {
            $type = $id ? Type::findOrFail($id) : new Type;

            $type->fill([
                'name' => $data['name'] ?? $type->name,
                'is_active' => $data['is_active'] ?? $type->is_active ?? true,
            ]);
            $type->save();

            $this->syncConfiguration($type, $data);
            $this->syncLengths($type, $data);
            $this->syncFinishes($type, $data);
            $this->syncCharacteristics($type, $data);

            return $type->fresh()->load(self::TYPE_RELATIONS);
        });
    }

    private function syncConfiguration(Type $type, array $data): void
    {
        if (array_key_exists('configuration', $data)) {
            TypeConfiguration::updateOrCreate(
                ['product_type_id' => $type->id],
                [...$data['configuration'], 'product_type_id' => $type->id],
            );
        }
    }

    private function syncLengths(Type $type, array $data): void
    {
        if (array_key_exists('length_ids', $data)) {
            $type->lengths()->sync($data['length_ids']);
        }
    }

    private function syncFinishes(Type $type, array $data): void
    {
        if (! array_key_exists('finish_ids', $data)) {
            return;
        }

        TypeFinish::where('product_type_id', $type->id)
            ->whereNotIn('finish_id', $data['finish_ids'])
            ->delete();

        foreach ($data['finish_ids'] as $finishId) {
            TypeFinish::updateOrCreate(
                ['product_type_id' => $type->id, 'finish_id' => $finishId],
                ['is_active' => true],
            );
        }
    }

    private function syncCharacteristics(Type $type, array $data): void
    {
        if (array_key_exists('characteristic_ids', $data)) {
            $type->characteristics()->sync($data['characteristic_ids']);
        }
    }
}
