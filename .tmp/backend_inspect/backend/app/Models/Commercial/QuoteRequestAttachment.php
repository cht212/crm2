<?php

namespace App\Models\Commercial;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

#[Table('commercial_quote_request_attachments')]

#[Fillable([
    'quote_request_id',
    'original_name',
    'path',
    'disk',
    'mime_type',
    'size',
    'uploaded_by',
])]
class QuoteRequestAttachment extends Model
{

    protected static function booted(): void
    {
        static::deleting(function (self $attachment) {
            Storage::disk($attachment->disk)->delete($attachment->path);
        });
    }

    public function quoteRequest()
    {
        return $this->belongsTo(QuoteRequest::class, 'quote_request_id');
    }
}
