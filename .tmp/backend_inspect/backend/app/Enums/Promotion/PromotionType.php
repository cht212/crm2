<?php

namespace App\Enums\Promotion;

enum PromotionType: string
{
    case PROMOTION = 'promotion';
    case NEWS = 'news';
    case SURVEY = 'survey';
    case ARTICLE = 'article';
    case ANNOUNCEMENT = 'announcement';
}
