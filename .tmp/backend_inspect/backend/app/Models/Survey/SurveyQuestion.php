<?php

namespace App\Models\Survey;

use App\Enums\Survey\SurveyQuestionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SurveyQuestion extends Model
{
    protected $fillable = [
        'survey_id',
        'question',
        'type',
        'position',
        'required',
        'scale_min',
        'scale_max',
        'help_text',
    ];

    protected function casts(): array
    {
        return [
            'type' => SurveyQuestionType::class,
            'required' => 'boolean',
            'scale_min' => 'integer',
            'scale_max' => 'integer',
        ];
    }

    public function survey(): BelongsTo
    {
        return $this->belongsTo(Survey::class);
    }

    public function options(): HasMany
    {
        return $this->hasMany(SurveyOption::class)->orderBy('position');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(SurveyAnswer::class);
    }
}
