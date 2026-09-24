<?php

namespace Tests\Feature\Seeders;

use App\Models\Customer;
use App\Models\User;
use Database\Seeders\RoleAndUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleAndUserSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_crea_dos_clientes_con_un_usuario_cada_uno(): void
    {
        $this->seed(RoleAndUserSeeder::class);

        $this->assertDatabaseCount('customer_customers', 2);
        $this->assertDatabaseHas('customer_customers', [
            'tax_number' => '20111111111',
            'company_name' => 'First Company SAC',
        ]);
        $this->assertDatabaseHas('customer_customers', [
            'tax_number' => '20222222222',
            'company_name' => 'Second Company EIRL',
        ]);

        $customers = Customer::query()->with('users')->get();
        $firstCustomer = $customers->firstWhere(
            'tax_number',
            '20111111111',
        );
        $secondCustomer = $customers->firstWhere(
            'tax_number',
            '20222222222',
        );

        $this->assertCount(1, $firstCustomer->users);
        $this->assertCount(1, $secondCustomer->users);
        $this->assertSame(
            'First Company SAC',
            $firstCustomer->company_name,
        );
        $this->assertSame(
            'Second Company EIRL',
            $secondCustomer->company_name,
        );
        $this->assertSame(4, User::query()->count());
        $this->assertDatabaseHas('users', [
            'email' => 'comercial@hpdglass.test',
            'name' => 'Mariana Torres',
        ]);

        $firstCustomerUser = $firstCustomer->users->first();

        $this->assertFalse($firstCustomerUser->can('customers.create'));
    }

    public function test_el_rol_comercial_no_tiene_permisos_de_publicaciones(): void
    {
        $this->seed(RoleAndUserSeeder::class);

        $commercial = User::query()
            ->where('email', 'comercial@hpdglass.test')
            ->firstOrFail();

        $this->assertFalse($commercial->can('promotions.view'));
        $this->assertFalse($commercial->can('promotions.create'));
        $this->assertFalse($commercial->can('promotions.update'));
        $this->assertFalse($commercial->can('promotions.delete'));
    }

    public function test_comercial_no_puede_crear_un_usuario_administrador(): void
    {
        $this->seed(RoleAndUserSeeder::class);

        $commercial = User::query()
            ->where('email', 'comercial@hpdglass.test')
            ->firstOrFail();

        $this->actingAs($commercial, 'api')
            ->postJson('/api/users', [
                'name' => 'Usuario de auditoria',
                'email' => 'auditoria@example.test',
                'password' => 'TemporaryPassword123!',
                'password_confirmation' => 'TemporaryPassword123!',
                'role' => 'admin',
                'is_active' => true,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');

        $this->assertDatabaseMissing('users', [
            'email' => 'auditoria@example.test',
        ]);
    }

    public function test_comercial_no_puede_actualizar_un_administrador(): void
    {
        $this->seed(RoleAndUserSeeder::class);

        $commercial = User::query()
            ->where('email', 'comercial@hpdglass.test')
            ->firstOrFail();
        $admin = User::query()
            ->where('email', 'admin@hpdglass.test')
            ->firstOrFail();

        $this->actingAs($commercial, 'api')
            ->putJson("/api/users/{$admin->id}", [
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => 'commercial',
                'is_active' => true,
            ])
            ->assertForbidden();
    }
}
