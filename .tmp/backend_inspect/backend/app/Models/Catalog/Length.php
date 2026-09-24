<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;

class Length extends Model
{
    protected $table = 'catalog_lengths';

    protected $fillable = [
        'code',
        'value',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function productTypes()
    {
        return $this->belongsToMany(
            Type::class,
            'catalog_product_type_lengths',
            'product_length_id',
            'product_type_id',
        );
    }
}
