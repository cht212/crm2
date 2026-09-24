<?php

namespace App\Models\Commercial;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class QuoteRequestHistory extends Model
{
    protected $table = 'commercial_quote_request_histories';

    public $timestamps = false;

    protected $fillable = [
        'quote_request_id',
        'action',
        'previous_status_id',
        'new_status_id',
        'changes',
        'comment',
        'user_id',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'changes' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function quoteRequest()
    {
        return $this->belongsTo(QuoteRequest::class);
    }

    public function previousStatus()
    {
        return $this->belongsTo(
            QuoteRequestStatus::class,
            'previous_status_id'
        );
    }

    public function newStatus()
    {
        return $this->belongsTo(
            QuoteRequestStatus::class,
            'new_status_id'
        );
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}