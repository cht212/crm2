<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactMessage extends Model
{
    protected $fillable = [
        'user_id',
        'customer_id',
        'full_name',
        'email',
        'phone',
        'message',
        'sent_at',
        'integration_status',
        'integration_id',
        'integration_error',
        'integration_processed_at',
        'integration_attempts',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'integration_processed_at' => 'datetime',
            'integration_attempts' => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function attachments()
    {
        return $this->hasMany(ContactMessageAttachment::class);
    }
}
