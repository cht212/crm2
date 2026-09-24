<?php

namespace App\Policies;

use App\Models\Commercial\QuoteRequest;
use App\Models\User;

class QuoteRequestPolicy
{
    /**
    * Permite acceder al listado si el usuario puede ver todas o sus propias
    * cotizaciones.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyPermission([
            'quotes.view.all',
            'quotes.view.own',
        ]);
    }

    public function view(User $user, QuoteRequest $quoteRequest): bool
    {
       if (
           $user->can('quotes.view.all')
           && $user->hasAnyRole(['admin', 'commercial'])
       ) {
           return $quoteRequest->status?->name !== 'Borrador';
       }

       return $user->can('quotes.view.own')
           && $user->customer_id === $quoteRequest->customer_id;
    }

    /**
    * Solo los usuarios asociados a una empresa pueden crear cotizaciones.
     */
    public function create(User $user): bool
    {
        return $user->can('quotes.create')
            && $user->customer_id !== null;
    }

    public function update(User $user, QuoteRequest $quoteRequest): bool
    {
       return $user->can('quotes.update')
           && $user->customer_id === $quoteRequest->customer_id
           && $quoteRequest->status?->name === 'Borrador';
    }

    public function submit(User $user, QuoteRequest $quoteRequest): bool
    {
       return $this->update($user, $quoteRequest);
    }

    public function markViewed(User $user, QuoteRequest $quoteRequest): bool
    {
       return $user->can('quotes.change-status')
           && $user->hasAnyRole(['admin', 'commercial'])
           && $quoteRequest->status?->name === 'Pendiente';
    }
}