<?php

namespace Tests\Feature\Customer;

use App\Models\Customer;
use App\Models\User;
use App\Policies\CustomerPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CustomerPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_y_comercial_solo_pueden_consultar_empresas(): void
    {
        $this->crearRolesYPermisos();
        $policy = new CustomerPolicy();

        foreach (['admin', 'commercial'] as $roleName) {
            $user = $this->crearUsuario($roleName);

            $this->assertTrue($policy->viewAny($user));
            $this->assertFalse($policy->create($user));
            $this->assertFalse($policy->update($user, Customer::make()));
        }
    }

    public function test_customer_sin_empresa_no_puede_crear_una_empresa(): void
    {
        $this->crearRolesYPermisos();
        $user = $this->crearUsuario('customer');
        $policy = new CustomerPolicy();

        $this->assertFalse($policy->viewAny($user));
        $this->assertFalse($policy->create($user));
    }

    public function test_customer_solo_puede_ver_y_actualizar_su_empresa(): void
    {
        $this->crearRolesYPermisos();
        $customer = Customer::create($this->datosEmpresa('Own Company', '20666666666'));
        $otherCustomer = Customer::create($this->datosEmpresa('Other Company', '20777777777'));
        $user = $this->crearUsuario('customer', $customer->id);
        $policy = new CustomerPolicy();

        $this->assertTrue($policy->view($user, $customer));
        $this->assertFalse($policy->update($user, $customer));
        $this->assertFalse($policy->view($user, $otherCustomer));
        $this->assertFalse($policy->update($user, $otherCustomer));
    }

    private function crearRolesYPermisos(): void
    {
        foreach ([
            'customers.view.all',
            'customers.view.own',
            'customers.create',
            'customers.update',
        ] as $permissionName) {
            Permission::findOrCreate($permissionName, 'api');
        }

        foreach (['admin', 'commercial', 'customer'] as $roleName) {
            Role::findOrCreate($roleName, 'api');
        }

        Role::findByName('admin', 'api')->syncPermissions([
            'customers.view.all',
            'customers.update',
        ]);
        Role::findByName('commercial', 'api')->syncPermissions([
            'customers.view.all',
            'customers.update',
        ]);
        Role::findByName('customer', 'api')->syncPermissions([
            'customers.view.own',
            'customers.create',
            'customers.update',
        ]);
    }

    private function crearUsuario(string $roleName, ?int $customerId = null): User
    {
        $user = User::factory()->create([
            'customer_id' => $customerId,
        ]);
        $user->assignRole($roleName);

        return $user;
    }

    private function datosEmpresa(string $companyName, string $taxNumber): array
    {
        return [
            'company_name' => $companyName,
            'tax_number' => $taxNumber,
            'trade_name' => $companyName,
            'email' => strtolower(str_replace(' ', '.', $companyName)) . '@test.com',
            'phone' => '999555555',
            'address' => 'Av. Principal 123',
            'department' => 'Lima',
            'province' => 'Lima',
            'district' => 'Lima',
            'is_active' => true,
        ];
    }
}
