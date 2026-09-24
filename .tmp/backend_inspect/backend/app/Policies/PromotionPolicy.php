<?php

namespace App\Policies;

use App\Models\Promotion\Promotion;
use App\Models\User;

class PromotionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'customer']);
    }

    public function view(User $user, Promotion $promotion): bool
    {
        if ($user->hasRole('admin')) {
            return $user->can('promotions.view');
        }

        return $user->hasRole('customer')
            && $promotion->status === 'published'
            && (
                $promotion->audience_type === 'all'
                || $promotion->customers()->whereKey($user->customer_id)->exists()
            )
            && ($promotion->published_at === null || $promotion->published_at->isPast())
            && ($promotion->starts_at === null || $promotion->starts_at->isPast())
            && ($promotion->ends_at === null || $promotion->ends_at->isFuture());
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin')
            && $user->can('promotions.create');
    }

    public function update(User $user, Promotion $promotion): bool
    {
        return $user->hasRole('admin')
            && $user->can('promotions.update');
    }

}
