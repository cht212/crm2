<?php

namespace App\Models;

use App\Models\Promotion\Promotion;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $table = 'customer_customers';

    protected $fillable = [
        'company_name',
        'tax_number',
        'trade_name',
        'email',
        'phone',
        'address',
        'department',
        'province',
        'district',
        'is_active',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function contacts()
    {
        return $this->hasMany(CustomerContac::class);
    }

    public function promotions()
    {
        return $this->belongsToMany(Promotion::class, 'promotion_customer');
    }
}
