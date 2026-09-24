<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class ContactMessageAttachment extends Model
{
    protected $fillable = [
        'contact_message_id',
        'original_name',
        'path',
        'disk',
        'mime_type',
        'size',
    ];

    protected static function booted(): void
    {
        static::deleting(function (self $attachment) {
            Storage::disk($attachment->disk)->delete($attachment->path);
        });
    }

    public function contactMessage()
    {
        return $this->belongsTo(ContactMessage::class);
    }
}
