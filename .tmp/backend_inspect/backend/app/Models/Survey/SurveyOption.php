<?php

namespace App\Models\Survey;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SurveyOption extends Model
{
    protected $fillable = [
        'survey_question_id',
        'label',
        'value',
        'position',
    ];

    public function question(): BelongsTo
    {
        return $this->belongsTo(SurveyQuestion::class, 'survey_question_id');
    }
}
