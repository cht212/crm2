<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;

class Finish extends Model
{
    protected $table = 'catalog_finishes';

    protected $fillable = [
        'name',
        'related_value',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function productTypes()
    {
        return $this->hasMany(TypeFinish::class, 'finish_id');
    }
}
