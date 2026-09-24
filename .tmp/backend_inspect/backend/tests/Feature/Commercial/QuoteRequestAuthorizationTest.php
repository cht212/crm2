<?php

namespace Tests\Feature\Commercial;

use App\Models\Commercial\QuoteRequest;
use App\Models\Commercial\QuoteRequestStatus;
use App\Models\Customer;
use App\Models\User;
use App\Services\Commercial\QuoteRequestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class QuoteRequestAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_puede_ver_todas_las_cotizaciones(): void
    {
        [$firstQuote, $secondQuote] = $this->createQuotes();
        $admin = $this->createUser('admin', null);

        $response = $this->getQuoteListFor($admin);

        $this->assertSame(2, $response['totalQuoteRequests']);
        $this->assertEqualsCanonicalizing(
            [$firstQuote->id, $secondQuote->id],
            collect($response['quoteRequests'])->pluck('id')->all(),
        );
    }

    public function test_comercial_puede_ver_todas_las_cotizaciones(): void
    {
        [$firstQuote, $secondQuote] = $this->createQuotes();
        $commercial = $this->createUser('commercial', null);

        $response = $this->getQuoteListFor($commercial);

        $this->assertSame(2, $response['totalQuoteRequests']);
        $this->assertEqualsCanonicalizing(
            [$firstQuote->id, $secondQuote->id],
            collect($response['quoteRequests'])->pluck('id')->all(),
        );
    }

    public function test_cliente_solo_puede_ver_cotizaciones_de_su_empresa(): void
    {
        [$firstQuote] = $this->createQuotes();
        $customer = $this->createUser('customer', $firstQuote->customer_id);

        $response = $this->getQuoteListFor($customer);

        $this->assertSame(1, $response['totalQuoteRequests']);
        $this->assertSame(
            $firstQuote->id,
            $response['quoteRequests'][0]->id,
        );
    }

    private function createQuotes(): array
    {
        $firstCustomer = Customer::create([
            'company_name' => 'First Company',
            'tax_number' => '20111111111',
            'trade_name' => 'First',
            'email' => 'first@example.com',
            'phone' => '999111111',
            'address' => 'First address',
            'department' => 'Lima',
            'province' => 'Lima',
            'district' => 'Lima',
            'is_active' => true,
        ]);
        $secondCustomer = Customer::create([
            'company_name' => 'Second Company',
            'tax_number' => '20222222222',
            'trade_name' => 'Second',
            'email' => 'second@example.com',
            'phone' => '999222222',
            'address' => 'Second address',
            'department' => 'Lima',
            'province' => 'Lima',
            'district' => 'Lima',
            'is_active' => true,
        ]);
        $status = QuoteRequestStatus::create([
            'name' => 'Pendiente',
            'color_hex' => '#000000',
            'is_active' => true,
        ]);
        $creator = User::factory()->create([
            'customer_id' => $firstCustomer->id,
        ]);

        return [
            QuoteRequest::create([
                'request_number' => 'SC202609080001',
                'customer_id' => $firstCustomer->id,
                'subject' => 'First quote',
                'status_id' => $status->id,
                'requested_at' => now(),
                'created_by' => $creator->id,
                'is_active' => true,
            ]),
            QuoteRequest::create([
                'request_number' => 'SC202609080002',
                'customer_id' => $secondCustomer->id,
                'subject' => 'Second quote',
                'status_id' => $status->id,
                'requested_at' => now(),
                'created_by' => $creator->id,
                'is_active' => true,
            ]),
        ];
    }

    private function createUser(string $role, ?int $customerId): User
    {
        Role::findOrCreate($role, 'api');

        $user = User::factory()->create([
            'customer_id' => $customerId,
        ]);
        $user->assignRole($role);

        return $user;
    }

    private function getQuoteListFor(User $user): array
    {
        $request = Request::create('/api/quote-requests', 'GET');
        $request->setUserResolver(fn () => $user);

        return app(QuoteRequestService::class)->getList($request);
    }
}