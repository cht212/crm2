<?php

namespace App\Enums\Survey;

enum SurveyStatus: string
{
    case DRAFT = 'draft';
    case PUBLISHED = 'published';
    case CLOSED = 'closed';
}
