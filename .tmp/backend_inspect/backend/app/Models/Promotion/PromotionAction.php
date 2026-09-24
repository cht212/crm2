<?php

namespace App\Models\Promotion;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PromotionAction extends Model
{
    protected $fillable = [
        'promotion_id',
        'label',
        'type',
        'url',
        'sort_order',
    ];

    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }
}
