<?php

namespace App\Services\User;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserService
{
    public function create(array $data): User
    {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'customer_id' => $data['customer_id'] ?? null,
            'is_active' => $data['is_active'] ?? true,
            'password' => Hash::make($data['password']),
        ]);

        $user->assignRole($data['role']);

        return $this->loadRelations($user);
    }

    public function update(User $user, array $data): User
    {
        $wasActive = $user->is_active;

        $user->update(array_filter([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'customer_id' => $data['customer_id'] ?? null,
            'is_active' => $data['is_active'] ?? true,
            'password' => ! empty($data['password'])
                ? Hash::make($data['password'])
                : null,
        ], static fn ($value) => $value !== null));

        $user->syncRoles([$data['role']]);

        if ($wasActive && ! $user->is_active) {
            $user->tokens()->update(['revoked' => true]);
        }

        return $this->loadRelations($user);
    }

    public function loadRelations(User $user): User
    {
        return $user->load([
            'customer:id,company_name',
            'roles:id,name',
        ]);
    }
}
