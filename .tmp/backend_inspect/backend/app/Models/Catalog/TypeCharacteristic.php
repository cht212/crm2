<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;

class TypeCharacteristic extends Model
{
    protected $table = 'catalog_product_type_characteristics';

    protected $fillable = ['product_type_id', 'characteristic_id'];

    public function type()
    {
        return $this->belongsTo(Type::class, 'product_type_id');
    }

    public function characteristic()
    {
        return $this->belongsTo(AdditionalCharacteristic::class, 'characteristic_id');
    }
}
