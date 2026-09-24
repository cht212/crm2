<?php

namespace Tests\Feature\Commercial;

use App\Models\Commercial\QuoteRequest;
use App\Models\Commercial\QuoteRequestStatus;
use App\Models\Customer;
use App\Models\User;
use App\Services\Commercial\QuoteRequestService;
use Database\Seeders\RoleAndUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class QuoteNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_enviar_cotizacion_notifica_a_admin_y_comercial(): void
    {
        $this->seed(RoleAndUserSeeder::class);

        $customerUser = User::where('email', 'andrea.quinteros@hpdglass.test')->firstOrFail();
        $admin = User::where('email', 'admin@hpdglass.test')->firstOrFail();
        $commercial = User::where('email', 'comercial@hpdglass.test')->firstOrFail();
        $customer = Customer::findOrFail($customerUser->customer_id);
        $draft = QuoteRequestStatus::where('name', 'Borrador')->firstOrFail();
        QuoteRequestStatus::create([
            'name' => 'Pendiente',
            'color_hex' => '#000000',
            'is_active' => true,
        ]);

        $quoteRequest = QuoteRequest::create([
            'request_number' => 'NOTIFY-001',
            'customer_id' => $customer->id,
            'subject' => 'Cotización notificable',
            'status_id' => $draft->id,
            'requested_at' => now(),
            'created_by' => $customerUser->id,
            'is_active' => true,
        ]);

        app(QuoteRequestService::class)->submit($quoteRequest, $customerUser);

        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $admin->id,
        ]);
        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $commercial->id,
        ]);
        $this->assertDatabaseMissing('notifications', [
            'notifiable_id' => $customerUser->id,
        ]);
    }

    public function test_enviar_cotizacion_envia_correos_de_prueba(): void
    {
        Notification::fake();
        config(['mail.testing_recipient' => 'programador2@hpdglass.com']);
        $this->seed(RoleAndUserSeeder::class);

        $customerUser = User::where('email', 'andrea.quinteros@hpdglass.test')->firstOrFail();
        $customer = Customer::findOrFail($customerUser->customer_id);
        $draft = QuoteRequestStatus::where('name', 'Borrador')->firstOrFail();
        $pending = QuoteRequestStatus::create([
            'name' => 'Pendiente',
            'color_hex' => '#000000',
            'is_active' => true,
        ]);

        $quoteRequest = QuoteRequest::create([
            'request_number' => 'EMAIL-001',
            'customer_id' => $customer->id,
            'subject' => 'Cotización por correo',
            'status_id' => $draft->id,
            'requested_at' => now(),
            'created_by' => $customerUser->id,
            'is_active' => true,
        ]);

        app(QuoteRequestService::class)->submit($quoteRequest, $customerUser);

        Notification::assertSentOnDemand(
            \App\Notifications\QuoteSubmittedAdminEmail::class,
            fn ($notification, $channels, $notifiable) => $notifiable->routes['mail'] === 'programador2@hpdglass.com',
        );
        Notification::assertSentOnDemand(
            \App\Notifications\QuoteSubmittedCustomerEmail::class,
            fn ($notification, $channels, $notifiable) => $notifiable->routes['mail'] === 'programador2@hpdglass.com',
        );
        $this->assertDatabaseHas('commercial_quote_requests', [
            'id' => $quoteRequest->id,
            'status_id' => $pending->id,
        ]);
    }
}
