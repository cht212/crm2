<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleAndUserSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = collect([
            'quotes.view.all',
            'quotes.view.own',
            'quotes.create',
            'quotes.update',
            'quotes.change-status',
            'quotes.view-history',
            'customers.view.all',
            'customers.view.own',
            'customers.create',
            'customers.update.all',
            'users.view',
            'users.create',
            'users.update',
            'roles.view',
            'roles.create',
            'roles.update',
            'promotions.view',
            'promotions.create',
            'promotions.update',
            'promotions.delete',
            'catalog.view',
            'catalog.create',
            'catalog.update',
            'catalog.delete',
        ])->mapWithKeys(function (string $name) {
            return [$name => Permission::findOrCreate($name, 'api')];
        });

        $adminRole = Role::findOrCreate('admin', 'api');
        $commercialRole = Role::findOrCreate('commercial', 'api');
        $customerRole = Role::findOrCreate('customer', 'api');

        $adminRole->syncPermissions(
            $permissions->except([
                'customers.view.own',
                'quotes.create'
            ])->values(),
        );

        $commercialRole->syncPermissions([
            $permissions['quotes.view.all'],
            $permissions['quotes.update'],
            $permissions['quotes.change-status'],
            $permissions['quotes.view-history'],
            $permissions['customers.view.all'],
            $permissions['customers.create'],
            $permissions['customers.update.all'],
            $permissions['users.view'],
            $permissions['users.create'],
            $permissions['users.update'],
        ]);
        $customerRole->syncPermissions([
            $permissions['quotes.view.own'],
            $permissions['quotes.create'],
            $permissions['quotes.update'],
            $permissions['customers.view.own'],
        ]);

        $firstCustomer = Customer::updateOrCreate(
            ['tax_number' => '20111111111'],
            [
                'company_name' => 'First Company SAC',
                'trade_name' => 'First Company',
                'email' => 'contacto@firstcompany.test',
                'phone' => '999111111',
                'address' => 'Av. Principal 123',
                'department' => 'Lima',
                'province' => 'Lima',
                'district' => 'Lima',
                'is_active' => true,
            ],
        );

        $secondCustomer = Customer::updateOrCreate(
            ['tax_number' => '20222222222'],
            [
                'company_name' => 'Second Company EIRL',
                'trade_name' => 'Second Company',
                'email' => 'contacto@secondcompany.test',
                'phone' => '999222222',
                'address' => 'Jr. Comercial 456',
                'department' => 'Lima',
                'province' => 'Lima',
                'district' => 'Miraflores',
                'is_active' => true,
            ],
        );

        $admin = User::updateOrCreate(
            ['email' => 'admin@hpdglass.test'],
            [
                'name' => 'Carlos Mendoza',
                'phone' => '987654321',
                'password' => Hash::make('Admin123*'),
                'is_active' => true,
            ],
        );

        $commercial = User::updateOrCreate(
            ['email' => 'comercial@hpdglass.test'],
            [
                'name' => 'Mariana Torres',
                'phone' => '986543210',
                'password' => Hash::make('Commercial123*'),
                'is_active' => true,
            ],
        );

        $firstCustomerUser = User::updateOrCreate(
            ['email' => 'andrea.quinteros@hpdglass.test'],
            [
                'name' => 'Andrea Quinteros',
                'phone' => '985432109',
                'customer_id' => $firstCustomer->id,
                'password' => Hash::make('User123*'),
                'is_active' => true,
            ],
        );

        $secondCustomerUser = User::updateOrCreate(
            ['email' => 'roberto.salazar@proyectosur.test'],
            [
                'name' => 'Roberto Salazar',
                'phone' => '984321098',
                'customer_id' => $secondCustomer->id,
                'password' => Hash::make('User123*'),
                'is_active' => true,
            ],
        );

        $admin->assignRole($adminRole);
        $commercial->syncRoles([$commercialRole]);
        $firstCustomerUser->syncRoles([$customerRole]);
        $secondCustomerUser->syncRoles([$customerRole]);
    }
}
