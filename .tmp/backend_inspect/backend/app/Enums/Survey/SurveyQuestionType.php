<?php

namespace App\Enums\Survey;

enum SurveyQuestionType: string
{
    case SINGLE_CHOICE = 'single_choice';
    case MULTIPLE_CHOICE = 'multiple_choice';
    case SHORT_TEXT = 'short_text';
    case LONG_TEXT = 'long_text';
    case SCALE = 'scale';
    case BOOLEAN = 'boolean';
}
