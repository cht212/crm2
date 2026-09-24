<?php

namespace App\Models\Promotion;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PromotionAttachment extends Model
{
    protected $fillable = [
        'promotion_id',
        'path',
        'original_name',
        'mime_type',
        'size',
        'sort_order',
    ];

    protected function casts(): array
    {
        return ['size' => 'integer', 'sort_order' => 'integer'];
    }

    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }
}
