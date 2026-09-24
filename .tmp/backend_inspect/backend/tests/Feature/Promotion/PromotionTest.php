<?php

namespace Tests\Feature\Promotion;

use App\Models\Customer;
use App\Models\Promotion\Promotion;
use App\Models\User;
use App\Notifications\PromotionPublishedNotification;
use Database\Seeders\RoleAndUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PromotionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $commercial;

    private User $firstCustomerUser;

    private User $secondCustomerUser;

    private Customer $firstCustomer;

    private Customer $secondCustomer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndUserSeeder::class);

        $this->admin = User::where('email', 'admin@hpdglass.test')->firstOrFail();
        $this->commercial = User::where('email', 'comercial@hpdglass.test')->firstOrFail();
        $this->firstCustomerUser = User::where('email', 'andrea.quinteros@hpdglass.test')->firstOrFail();
        $this->secondCustomerUser = User::where('email', 'roberto.salazar@proyectosur.test')->firstOrFail();
        $this->firstCustomer = Customer::findOrFail($this->firstCustomerUser->customer_id);
        $this->secondCustomer = Customer::findOrFail($this->secondCustomerUser->customer_id);
    }

    public function test_administrador_puede_crear_promocion_global(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/promotions', $this->promotionData([
                'status' => 'published',
            ]));

        $response
            ->assertCreated()
            ->assertJsonPath('promotion.audience_type', 'all');

        $this->assertDatabaseHas('promotions', [
            'title' => 'Promoción global',
            'audience_type' => 'all',
        ]);
        $this->assertNotNull(
            Promotion::where('title', 'Promoción global')->firstOrFail()->published_at
        );
        $this->assertDatabaseCount('promotion_customer', 0);
    }

    public function test_contenido_de_promocion_se_sanitiza_antes_de_guardarse(): void
    {
        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/promotions', $this->promotionData([
                'content' => '<p>Contenido válido</p><script>alert("xss")</script>'
                    .'<a href="javascript:alert(1)">Enlace</a>'
                    .'<img src="x" onerror="alert(1)">',
            ]))
            ->assertCreated();

        $promotion = Promotion::findOrFail($response->json('promotion.id'));

        $this->assertStringContainsString('<p>Contenido válido</p>', $promotion->content);
        $this->assertStringNotContainsString('<script', $promotion->content);
        $this->assertStringNotContainsString('javascript:', $promotion->content);
        $this->assertStringNotContainsString('onerror', $promotion->content);
    }

    public function test_comercial_no_puede_gestionar_publicaciones(): void
    {
        $this->actingAs($this->commercial, 'api')
            ->getJson('/api/promotions')
            ->assertForbidden();

        $this->actingAs($this->commercial, 'api')
            ->postJson('/api/promotions', $this->promotionData())
            ->assertForbidden();
    }

    public function test_promocion_seleccionada_solo_aparece_a_la_empresa_destinataria(): void
    {
        $promotion = Promotion::create($this->promotionData([
            'title' => 'Promoción privada',
            'audience_type' => 'selected',
            'status' => 'published',
            'published_at' => now()->subMinute(),
        ]));
        $promotion->customers()->attach($this->firstCustomer);

        $this->actingAs($this->firstCustomerUser, 'api')
            ->getJson('/api/promotions')
            ->assertOk()
            ->assertJsonPath('promotions.0.id', $promotion->id);

        $this->actingAs($this->secondCustomerUser, 'api')
            ->getJson('/api/promotions')
            ->assertOk()
            ->assertJsonCount(0, 'promotions');

        $this->actingAs($this->secondCustomerUser, 'api')
            ->getJson("/api/promotions/{$promotion->id}")
            ->assertForbidden();
    }

    public function test_promocion_seleccionada_exige_empresa_y_sincroniza_al_actualizar(): void
    {
        $this->actingAs($this->admin, 'api')
            ->postJson('/api/promotions', $this->promotionData([
                'audience_type' => 'selected',
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('customer_ids');

        $promotion = Promotion::create($this->promotionData([
            'audience_type' => 'selected',
        ]));
        $promotion->customers()->attach($this->firstCustomer);

        $this->actingAs($this->admin, 'api')
            ->putJson("/api/promotions/{$promotion->id}", $this->promotionData([
                'audience_type' => 'selected',
                'customer_ids' => [$this->secondCustomer->id],
            ]))
            ->assertOk();

        $this->assertDatabaseMissing('promotion_customer', [
            'promotion_id' => $promotion->id,
            'customer_id' => $this->firstCustomer->id,
        ]);
        $this->assertDatabaseHas('promotion_customer', [
            'promotion_id' => $promotion->id,
            'customer_id' => $this->secondCustomer->id,
        ]);
    }

    public function test_publicar_promocion_notifica_solo_a_clientes_de_la_audiencia(): void
    {
        Notification::fake();

        $response = $this->actingAs($this->admin, 'api')
            ->postJson('/api/promotions', $this->promotionData([
                'title' => 'Nueva publicación',
                'image_url' => 'https://example.com/promotion.jpg',
                'audience_type' => 'selected',
                'customer_ids' => [$this->firstCustomer->id],
                'status' => 'published',
                'published_at' => now()->toDateTimeString(),
            ]))
            ->assertCreated();

        $promotion = Promotion::findOrFail($response->json('promotion.id'));

        Notification::assertSentTo(
            $this->firstCustomerUser,
            PromotionPublishedNotification::class,
        );
        Notification::assertNotSentTo(
            $this->secondCustomerUser,
            PromotionPublishedNotification::class,
        );
        $payload = (new PromotionPublishedNotification($promotion))
            ->toArray($this->firstCustomerUser);
        $this->assertSame('Nueva promoción', $payload['title']);
        $this->assertSame('Resumen de prueba', $payload['message']);
        $this->assertSame('Nueva publicación', $payload['promotion_title']);
        $this->assertSame('published', $promotion->status);
    }

    public function test_actualizar_promocion_puede_eliminar_todos_los_embeds(): void
    {
        $promotion = Promotion::create($this->promotionData());
        $promotion->embeds()->create([
            'platform' => 'instagram',
            'url' => 'https://www.instagram.com/reel/example/',
            'sort_order' => 0,
        ]);

        $this->actingAs($this->admin, 'api')
            ->post("/api/promotions/{$promotion->id}", [
                '_method' => 'PUT',
                'title' => $promotion->title,
                'embeds_present' => '1',
            ])
            ->assertOk();

        $this->assertDatabaseCount('promotion_embeds', 0);
    }

    public function test_publicacion_se_archiva_sin_eliminarse(): void
    {
        $promotion = Promotion::create($this->promotionData([
            'title' => 'Publicación para archivar',
            'status' => 'published',
            'published_at' => now()->subMinute(),
        ]));
        $promotion->images()->create([
            'path' => 'promotions/example.jpg',
            'alt_text' => 'Imagen de prueba',
            'sort_order' => 0,
        ]);

        $this->actingAs($this->admin, 'api')
            ->postJson("/api/promotions/{$promotion->id}/archive")
            ->assertOk()
            ->assertJsonPath('promotion.status', 'archived');

        $this->assertDatabaseHas('promotions', [
            'id' => $promotion->id,
            'status' => 'archived',
        ]);
        $this->assertDatabaseHas('promotion_images', [
            'promotion_id' => $promotion->id,
            'path' => 'promotions/example.jpg',
        ]);
    }

    private function promotionData(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Promoción global',
            'summary' => 'Resumen de prueba',
            'content' => 'Contenido de prueba',
            'type_post' => 'promotion',
            'author_id' => $this->admin->id,
            'audience_type' => 'all',
            'status' => 'draft',
        ], $overrides);
    }
}
