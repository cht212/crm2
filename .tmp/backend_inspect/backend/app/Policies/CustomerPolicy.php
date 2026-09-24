<?php

namespace App\Policies;

use App\Models\Customer;
use App\Models\User;

class CustomerPolicy
{
    /**
     * Solo admin y comercial pueden consultar el listado global de empresas.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'commercial'])
            && $user->can('customers.view.all');
    }

    /**
     * Admin y comercial pueden ver cualquier empresa.
     * customer solo puede su empresa que tiene asignada.
     */
    public function view(User $user, Customer $customer): bool
    {
        return (
            $user->hasAnyRole(['admin', 'commercial'])
            && $user->can('customers.view.all')
        ) || (
            $user->hasRole('customer')
            && $user->can('customers.view.own')
            && $user->customer_id === $customer->id
        );
    }

    /**
     * Solo admin y comercial pueden crear empresa
     */
    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'commercial'])
            && $user->can('customers.create');
    }

    /**
     * Solo admin y comercial pueden modificar empresas
     */
    public function update(User $user, Customer $customer): bool
    {
        return $user->hasAnyRole(['admin', 'commercial'])
            && $user->can('customers.update.all');
    }
}
