<?php

namespace App\Policies;

use App\Models\Survey\Survey;
use App\Models\User;

class SurveyPolicy
{
    public function view(User $user, Survey $survey): bool
    {
        if ($user->hasRole('admin')) {
            return $user->can('promotions.view');
        }

        return $user->hasRole('customer')
            && $survey->promotion->status === 'published'
            && (
                $survey->promotion->audience_type === 'all'
                || $survey->promotion->customers()->whereKey($user->customer_id)->exists()
            )
            && $survey->isAvailable();
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin')
            && $user->can('promotions.create');
    }

    public function update(User $user, Survey $survey): bool
    {
        return $user->hasRole('admin')
            && $user->can('promotions.update')
            && $survey->responses()->doesntExist();
    }

    public function publish(User $user, Survey $survey): bool
    {
        return $user->hasRole('admin')
            && $user->can('promotions.update');
    }

    public function close(User $user, Survey $survey): bool
    {
        return $user->hasRole('admin')
            && $user->can('promotions.update');
    }

    public function respond(User $user, Survey $survey): bool
    {
        return $user->hasRole('customer')
            && $survey->promotion->status === 'published'
            && (
                $survey->promotion->audience_type === 'all'
                || $survey->promotion->customers()->whereKey($user->customer_id)->exists()
            )
            && $survey->isAvailable();
    }

    public function viewResults(User $user, Survey $survey): bool
    {
        return $user->hasRole('admin')
            && $user->can('promotions.view');
    }
}
