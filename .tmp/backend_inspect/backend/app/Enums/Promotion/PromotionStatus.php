<?php

namespace App\Enums\Promotion;

enum PromotionStatus: string
{
    case DRAFT = 'draft';
    case PUBLISHED = 'published';
    case ARCHIVED = 'archived';
}
