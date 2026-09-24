<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;

class TypeFinish extends Model
{
    protected $table = 'catalog_product_type_finishes';

    protected $fillable = [
        'product_type_id',
        'finish_id',
        'apply_measure_validation',
        'max_width',
        'max_height',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'apply_measure_validation' => 'boolean',
            'max_width' => 'decimal:2',
            'max_height' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function type()
    {
        return $this->belongsTo(Type::class, 'product_type_id');
    }

    public function finish()
    {
        return $this->belongsTo(Finish::class);
    }
}
