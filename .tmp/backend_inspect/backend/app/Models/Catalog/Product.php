<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $table = 'catalog_products';

    protected $fillable = ['code', 'subtype_id', 'name', 'description', 'max_quantity', 'is_active'];

    protected function casts(): array
    {
        return ['max_quantity' => 'integer', 'is_active' => 'boolean'];
    }

    public function subtype()
    {
        return $this->belongsTo(Subtype::class, 'subtype_id');
    }

    public function type()
    {
        return $this->hasOneThrough(
            Type::class,
            Subtype::class,
            'product_type_id',
            'id',
            'subtype_id',
            'product_type_id',
        );
    }
}
