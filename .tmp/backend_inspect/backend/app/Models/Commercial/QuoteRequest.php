<?php

namespace App\Models\Commercial;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class QuoteRequest extends Model
{
    protected $table = 'commercial_quote_requests';

    protected $fillable = [
        'request_number',
        'customer_id',
        'subject',
        'observations',
        'status_id',
        'requested_at',
        'created_by',
        'updated_by',
        'is_active',
        'integration_status',
        'integration_id',
        'integration_error',
        'integration_processed_at',
        'integration_attempts',
    ];

    protected function casts(): array
    {
        return [
            'requested_at' => 'datetime',
            'is_active' => 'boolean',
            'integration_processed_at' => 'datetime',
            'integration_attempts' => 'integer',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function status()
    {
        return $this->belongsTo(QuoteRequestStatus::class, 'status_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function details()
    {
        return $this->hasMany(QuoteRequestDetail::class);
    }

    public function attachments()
    {
        return $this->hasMany(QuoteRequestAttachment::class, 'quote_request_id');
    }

    public function histories()
    {
        return $this->hasMany(QuoteRequestHistory::class);
    }
}
