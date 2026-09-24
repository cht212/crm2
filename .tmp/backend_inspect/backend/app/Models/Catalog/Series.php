<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;

class Series extends Model
{
    protected $table = 'catalog_product_series';

    protected $fillable = [
        'product_type_id',
        'code',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function type()
    {
        return $this->belongsTo(Type::class, 'product_type_id');
    }
}
