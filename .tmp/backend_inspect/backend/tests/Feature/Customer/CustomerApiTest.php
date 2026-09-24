<?php

namespace Tests\Feature\Customer;

use App\Models\Customer;
use App\Models\User;
use Database\Seeders\RoleAndUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerApiTest extends TestCase
{
    use RefreshDatabase;

    private User $commercial;

    private User $firstCustomerUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndUserSeeder::class);
        $this->commercial = User::where('email', 'comercial@hpdglass.test')->firstOrFail();
        $this->firstCustomerUser = User::where('email', 'andrea.quinteros@hpdglass.test')->firstOrFail();
    }

    public function test_comercial_puede_listar_empresas_y_filtrar_activas(): void
    {
        Customer::whereKey($this->firstCustomerUser->customer_id)->update(['is_active' => false]);

        $response = $this->actingAs($this->commercial, 'api')
            ->getJson('/api/customers?is_active=true');

        $response
            ->assertOk()
            ->assertJsonPath('totalCustomers', 1)
            ->assertJsonCount(1, 'customers');
    }

    public function test_cliente_solo_puede_consultar_su_empresa(): void
    {
        $ownCustomer = Customer::findOrFail($this->firstCustomerUser->customer_id);

        $this->actingAs($this->firstCustomerUser, 'api')
            ->getJson("/api/customers/{$ownCustomer->id}")
            ->assertOk()
            ->assertJsonPath('customer.id', $ownCustomer->id);

        $otherCustomer = Customer::where('id', '!=', $ownCustomer->id)->firstOrFail();

        $this->actingAs($this->firstCustomerUser, 'api')
            ->getJson("/api/customers/{$otherCustomer->id}")
            ->assertForbidden();
    }
}
