<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'commercial'])
            && $user->can('users.view');
    }

    public function view(User $user, User $target): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'commercial'])
            && $user->can('users.create');
    }

    public function update(User $user, User $target): bool
    {
        if (! $user->hasAnyRole(['admin', 'commercial'])
            || ! $user->can('users.update')) {
            return false;
        }

        return $user->hasRole('admin') || ! $target->hasRole('admin');
    }
}
