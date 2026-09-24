<?php

namespace App\Services\Security;

use HTMLPurifier;
use HTMLPurifier_Config;

class PromotionContentSanitizer
{
    public function sanitize(string $content): string
    {
        $config = HTMLPurifier_Config::createDefault();
        $config->set(
            'HTML.Allowed',
            'p,br,hr,h1,h2,h3,h4,h5,h6,strong,em,u,s,sub,sup,ul,ol,li,blockquote,pre,code,'
            .'a[href|target|rel],img[src|alt|title|width|height]'
        );
        $config->set('CSS.AllowedProperties', ['text-align']);
        $config->set('URI.AllowedSchemes', [
            'http' => true,
            'https' => true,
        ]);
        $config->set('Attr.EnableID', false);

        return (new HTMLPurifier($config))->purify($content);
    }
}
