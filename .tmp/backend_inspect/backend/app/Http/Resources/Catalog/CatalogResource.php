<?php

namespace App\Http\Resources\Catalog;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CatalogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = $this->resource->toArray();
        foreach (['type', 'finish', 'productTypes', 'products', 'series', 'finishes', 'thicknesses', 'configuration', 'lengths', 'characteristics'] as $relation) {
            if ($this->resource->relationLoaded($relation)) {
                $data[$relation] = $this->resource->{$relation};
            }
        }

        return $data;
    }
}
