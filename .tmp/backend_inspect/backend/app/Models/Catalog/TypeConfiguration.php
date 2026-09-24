<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;

class TypeConfiguration extends Model
{
    protected $table = 'catalog_product_type_configurations';

    protected $primaryKey = 'product_type_id';

    public $incrementing = false;

    protected $fillable = [
        'product_type_id',
        'uses_finish',
        'uses_series',
        'uses_lengths',
        'uses_thickness',
        'uses_dimensions',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'uses_finish' => 'boolean',
            'uses_series' => 'boolean',
            'uses_lengths' => 'boolean',
            'uses_thickness' => 'boolean',
            'uses_dimensions' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function type()
    {
        return $this->belongsTo(Type::class, 'product_type_id');
    }
}
