<?php

namespace App\Models\Promotion;

use App\Models\Customer;
use App\Models\Survey\Survey;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Promotion extends Model
{
    protected $fillable = [
        'title',
        'summary',
        'content',
        'type_post',
        'author_id',
        'image_url',
        'published_at',
        'starts_at',
        'ends_at',
        'audience_type',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(PromotionImage::class)->orderBy('sort_order');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(PromotionAttachment::class)->orderBy('sort_order');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(PromotionAction::class)->orderBy('sort_order');
    }

    public function embeds(): HasMany
    {
        return $this->hasMany(PromotionEmbed::class)->orderBy('sort_order');
    }

    public function customers()
    {
        return $this->belongsToMany(Customer::class, 'promotion_customer');
    }

    public function survey(): HasOne
    {
        return $this->hasOne(Survey::class);
    }
}
