<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;

class Subtype extends Model
{
    protected $table = 'catalog_product_subtypes';

    protected $fillable = ['product_type_id', 'code', 'name', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function type()
    {
        return $this->belongsTo(Type::class, 'product_type_id');
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'subtype_id');
    }
}
