<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;

class Type extends Model
{
    protected $table = 'catalog_product_types';

    protected $fillable = ['name', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function products()
    {
        return $this->hasManyThrough(
            Product::class,
            Subtype::class,
            'product_type_id',
            'subtype_id',
            'id',
            'id',
        );
    }

    public function subtypes()
    {
        return $this->hasMany(Subtype::class, 'product_type_id');
    }

    public function series()
    {
        return $this->hasMany(Series::class, 'product_type_id');
    }

    public function finishes()
    {
        return $this->hasMany(TypeFinish::class, 'product_type_id');
    }

    public function configuration()
    {
        return $this->hasOne(
            TypeConfiguration::class,
            'product_type_id'
        );
    }

    public function lengths()
    {
        return $this->belongsToMany(
            Length::class,
            'catalog_product_type_lengths',
            'product_type_id',
            'product_length_id',
        );
    }

    public function thicknesses()
    {
        return $this->hasMany(Thickness::class, 'product_type_id');
    }

    public function characteristics()
    {
        return $this->belongsToMany(
            AdditionalCharacteristic::class,
            'catalog_product_type_characteristics',
            'product_type_id',
            'characteristic_id'
        );
    }
}
