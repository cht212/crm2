<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerContac extends Model
{
    protected $table = 'customer_contacts';

    protected $fillable = [
        'customer_id',
        'name',
        'position',
        'email',
        'phone',
        'is_primary',
        'is_active',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
