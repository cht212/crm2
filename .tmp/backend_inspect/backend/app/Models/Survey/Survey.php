<?php

namespace App\Models\Survey;

use App\Enums\Survey\SurveyStatus;
use App\Models\Promotion\Promotion;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Survey extends Model
{
    protected $fillable = [
        'promotion_id',
        'title',
        'description',
        'status',
        'starts_at',
        'ends_at',
        'published_at',
        'closed_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => SurveyStatus::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'published_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(SurveyQuestion::class)->orderBy('position');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(SurveyResponse::class);
    }

    public function isAvailable(): bool
    {
        if ($this->status !== SurveyStatus::PUBLISHED) {
            return false;
        }

        $now = now();

        return ($this->starts_at === null || $this->starts_at->lte($now))
            && ($this->ends_at === null || $this->ends_at->gte($now));
    }
}
