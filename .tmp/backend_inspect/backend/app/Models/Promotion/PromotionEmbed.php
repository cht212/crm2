<?php

namespace App\Models\Promotion;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PromotionEmbed extends Model
{
    protected $fillable = [
        'promotion_id',
        'platform',
        'url',
        'title',
        'sort_order',
    ];

    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }
}
