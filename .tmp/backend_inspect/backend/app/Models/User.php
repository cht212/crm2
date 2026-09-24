<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

#[Fillable([
    'customer_id',
    'name',
    'email',
    'phone',
    'is_active',
    'last_login_at',
    'password',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, HasUuids, Notifiable;

    protected $keyType = 'string';
    public $incrementing = false;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>    
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_active' => 'boolean',
            'password' => 'hashed',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function getDefaultGuardName(): string
    {
        return 'api';
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }
}
