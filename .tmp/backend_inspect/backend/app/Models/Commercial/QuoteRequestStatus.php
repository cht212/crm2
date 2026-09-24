<?php

namespace App\Models\Commercial;

use Illuminate\Database\Eloquent\Model;

class QuoteRequestStatus extends Model
{
    protected $table = 'commercial_quote_request_statuses';

    protected $fillable = [
        'name',
        'color_hex',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
