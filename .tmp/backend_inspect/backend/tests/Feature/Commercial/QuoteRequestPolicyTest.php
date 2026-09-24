<?php

namespace Tests\Feature\Commercial;

use App\Models\Commercial\QuoteRequest;
use App\Models\Commercial\QuoteRequestStatus;
use App\Models\Customer;
use App\Models\User;
use App\Policies\QuoteRequestPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class QuoteRequestPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_cliente_solo_puede_ver_y_editar_sus_borradores(): void
    {
        [$customer, $quote, $otherQuote, $submittedQuote] = $this->createScenario();
        $policy = new QuoteRequestPolicy();

        $this->assertTrue($policy->view($customer, $quote));
        $this->assertTrue($policy->update($customer, $quote));
        $this->assertTrue($policy->submit($customer, $quote));
        $this->assertFalse($policy->view($customer, $otherQuote));
        $this->assertFalse($policy->update($customer, $otherQuote));
        $this->assertFalse($policy->update($customer, $submittedQuote));
    }

    public function test_admin_y_comercial_pueden_ver_y_marcar_cotizaciones_enviadas(): void
    {
        [, $quote, , $submittedQuote] = $this->createScenario();
        $policy = new QuoteRequestPolicy();

        foreach (['admin', 'commercial'] as $roleName) {
            $user = User::factory()->create();
            $user->assignRole($roleName);

            $this->assertFalse($policy->view($user, $quote));
            $this->assertTrue($policy->view($user, $submittedQuote));
            $this->assertFalse($policy->update($user, $submittedQuote));
            $this->assertTrue($policy->markViewed($user, $submittedQuote));
        }
    }

    private function createScenario(): array
    {
        $this->createPermissionsAndRoles();

        $customer = Customer::create([
            'company_name' => 'Policy Company',
            'tax_number' => '20333333333',
            'trade_name' => 'Policy',
            'email' => 'policy@example.com',
            'phone' => '999333333',
            'address' => 'Policy address',
            'department' => 'Lima',
            'province' => 'Lima',
            'district' => 'Lima',
            'is_active' => true,
        ]);
        $otherCustomer = Customer::create([
            'company_name' => 'Other Company',
            'tax_number' => '20444444444',
            'trade_name' => 'Other',
            'email' => 'other@example.com',
            'phone' => '999444444',
            'address' => 'Other address',
            'department' => 'Lima',
            'province' => 'Lima',
            'district' => 'Lima',
            'is_active' => true,
        ]);
        $customerUser = User::factory()->create([
            'customer_id' => $customer->id,
        ]);
        $customerUser->assignRole('customer');

        $draftStatus = QuoteRequestStatus::create([
            'name' => 'Borrador',
            'color_hex' => '#9E9E9E',
            'is_active' => true,
        ]);
        $submittedStatus = QuoteRequestStatus::create([
            'name' => 'Pendiente',
            'color_hex' => '#000000',
            'is_active' => true,
        ]);
        $creator = User::factory()->create([
            'customer_id' => $customer->id,
        ]);

        return [
            $customerUser,
            $this->createQuote($customer, $creator, $draftStatus, 'POLICY001'),
            $this->createQuote($otherCustomer, $creator, $draftStatus, 'POLICY002'),
            $this->createQuote($customer, $creator, $submittedStatus, 'POLICY003'),
        ];
    }

    private function createPermissionsAndRoles(): void
    {
        foreach (['quotes.view.all', 'quotes.view.own', 'quotes.update', 'quotes.change-status'] as $permission) {
            Permission::findOrCreate($permission, 'api');
        }

        foreach (['admin', 'commercial', 'customer'] as $role) {
            Role::findOrCreate($role, 'api');
        }

        Role::findByName('admin', 'api')->givePermissionTo([
            'quotes.view.all',
            'quotes.update',
            'quotes.change-status',
        ]);
        Role::findByName('commercial', 'api')->givePermissionTo([
            'quotes.view.all',
            'quotes.update',
            'quotes.change-status',
        ]);
        Role::findByName('customer', 'api')->givePermissionTo([
            'quotes.view.own',
            'quotes.update',
        ]);
    }

    private function createQuote(
        Customer $customer,
        User $creator,
        QuoteRequestStatus $status,
        string $requestNumber,
    ): QuoteRequest {
        return QuoteRequest::create([
            'request_number' => $requestNumber,
            'customer_id' => $customer->id,
            'subject' => 'Policy quote',
            'status_id' => $status->id,
            'requested_at' => now(),
            'created_by' => $creator->id,
            'is_active' => true,
        ]);
    }
}