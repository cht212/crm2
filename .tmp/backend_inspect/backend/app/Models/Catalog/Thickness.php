<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;

class Thickness extends Model
{
    protected $table = 'catalog_product_thicknesses';

    protected $fillable = [
        'product_type_id',
        'value',
        'unit',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function type()
    {
        return $this->belongsTo(Type::class, 'product_type_id');
    }
}
