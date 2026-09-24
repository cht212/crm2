<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;

class TypeLength extends Model
{
    protected $table = 'catalog_product_type_lengths';

    public $incrementing = false;

    protected $fillable = ['product_type_id', 'product_length_id'];

    protected $primaryKey = null;

    public function type()
    {
        return $this->belongsTo(Type::class, 'product_type_id');
    }

    public function length()
    {
        return $this->belongsTo(Length::class, 'product_length_id');
    }
}
