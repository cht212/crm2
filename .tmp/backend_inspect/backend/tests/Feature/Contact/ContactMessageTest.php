<?php

namespace Tests\Feature\Contact;

use App\Models\Customer;
use App\Models\User;
use App\Notifications\ContactMessageReceivedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ContactMessageTest extends TestCase
{
    use RefreshDatabase;

    public function test_usuario_puede_guardar_y_enviar_un_mensaje_de_contacto(): void
    {
        Notification::fake();
        Storage::fake('local');
        config(['mail.testing_recipient' => 'admin@example.com']);

        $customer = Customer::create([
            'company_name' => 'Acme S.A.C.',
            'tax_number' => '20123456789',
            'trade_name' => 'Acme',
            'email' => 'contacto@acme.example',
            'phone' => '999111222',
            'address' => 'Av. Principal 123',
            'department' => 'Lima',
            'province' => 'Lima',
            'district' => 'Lima',
            'is_active' => true,
        ]);
        $user = User::factory()->create(['customer_id' => $customer->id]);

        $response = $this->actingAs($user, 'api')->postJson('/api/contact-messages', [
            'full_name' => 'Ana Pérez',
            'email' => 'ana@example.com',
            'phone' => '+51 999 111 222',
            'message' => 'Necesito información sobre sus productos.',
            'attachments' => [
                UploadedFile::fake()->create('catalogo.pdf', 200, 'application/pdf'),
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Tu mensaje fue enviado correctamente.');

        $this->assertDatabaseHas('contact_messages', [
            'user_id' => $user->id,
            'customer_id' => $customer->id,
            'email' => 'ana@example.com',
            'message' => 'Necesito información sobre sus productos.',
        ]);
        $this->assertDatabaseHas('contact_message_attachments', [
            'original_name' => 'catalogo.pdf',
            'mime_type' => 'application/pdf',
        ]);

        Notification::assertSentOnDemand(
            ContactMessageReceivedNotification::class,
            fn ($notification, $channels, $notifiable) =>
                $notifiable->routes['mail'] === 'admin@example.com',
        );
    }

    public function test_mensaje_de_contacto_requiere_nombre_correo_y_mensaje(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'api')
            ->postJson('/api/contact-messages', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['full_name', 'email', 'message']);
    }

    public function test_erp_puede_consultar_y_confirmar_un_mensaje(): void
    {
        config(['services.erp.api_key' => 'erp-secret']);
        config(['services.erp.allowed_ips' => ['127.0.0.1']]);
        $user = User::factory()->create();
        $message = \App\Models\ContactMessage::create([
            'user_id' => $user->id,
            'full_name' => 'Ana Pérez',
            'email' => 'ana@example.com',
            'message' => 'Consulta ERP',
            'integration_status' => 'pending',
        ]);

        $this->getJson('/api/integrations/contact-messages')
            ->assertUnauthorized();

        $integrationResponse = $this->withHeaders(['X-Integration-Key' => 'erp-secret'])
            ->getJson('/api/integrations/contact-messages');
        $integrationResponse
            ->assertOk()
            ->assertJsonPath('data.0.id', $message->id)
            ->assertJsonPath('data.0.integration_status', 'pending');

        $this->withHeaders(['X-Integration-Key' => 'erp-secret'])
            ->postJson("/api/integrations/contact-messages/{$message->id}/acknowledge", [
                'integration_id' => 'ERP-001',
            ])
            ->assertOk()
            ->assertJsonPath('data.integration_status', 'exported')
            ->assertJsonPath('data.integration_id', 'ERP-001');
    }

    public function test_erp_rechaza_una_ip_no_autorizada(): void
    {
        config(['services.erp.api_key' => 'erp-secret']);
        config(['services.erp.allowed_ips' => ['203.0.113.10']]);

        $this->withHeaders(['X-Integration-Key' => 'erp-secret'])
            ->getJson('/api/integrations/contact-messages')
            ->assertForbidden()
            ->assertJsonPath('message', 'La IP de integración no está autorizada.');
    }

    public function test_erp_rechaza_una_api_key_invalida(): void
    {
        config(['services.erp.api_key' => 'erp-secret']);
        config(['services.erp.allowed_ips' => ['127.0.0.1']]);

        $this->withHeaders(['X-Integration-Key' => 'invalid-key'])
            ->getJson('/api/integrations/contact-messages')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Credenciales de integración inválidas.');
    }

    public function test_erp_aplica_rate_limit(): void
    {
        config(['services.erp.api_key' => 'erp-secret']);
        config(['services.erp.allowed_ips' => ['127.0.0.1']]);

        for ($attempt = 0; $attempt < 60; $attempt++) {
            $this->withHeaders(['X-Integration-Key' => 'erp-secret'])
                ->getJson('/api/integrations/contact-messages')
                ->assertOk();
        }

        $this->withHeaders(['X-Integration-Key' => 'erp-secret'])
            ->getJson('/api/integrations/contact-messages')
            ->assertTooManyRequests();
    }
}
