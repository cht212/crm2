<?php

namespace Tests\Feature\Catalog;

use App\Models\Catalog\Product;
use App\Models\Catalog\Subtype;
use App\Models\Catalog\Type;
use App\Models\Catalog\TypeConfiguration;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\CharacteristicsSeeder;
use Database\Seeders\RoleAndUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogAdminTypeTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([
            RoleAndUserSeeder::class,
            CatalogSeeder::class,
            CharacteristicsSeeder::class,
        ]);
        $this->admin = User::query()->where('email', 'admin@hpdglass.test')->firstOrFail();
    }

    public function test_editar_tipo_devuelve_configuracion_y_relaciones_guardadas(): void
    {
        $type = Type::query()->where('name', 'Vidrio')->firstOrFail();

        $response = $this->actingAs($this->admin, 'api')
            ->getJson("/api/catalog/types/{$type->id}");

        $response
            ->assertOk()
            ->assertJsonPath('data.id', $type->id)
            ->assertJsonPath('data.configuration.product_type_id', $type->id)
            ->assertJsonStructure([
                'data' => [
                    'subtypes',
                    'lengths',
                    'finishes',
                    'characteristics',
                    'configuration',
                ],
            ]);
    }

    public function test_guardar_tipo_actualiza_nombre_configuracion_y_producto(): void
    {
        $type = Type::query()->where('name', 'Vidrio')->firstOrFail();
        $subtype = Subtype::query()->where('product_type_id', $type->id)->firstOrFail();
        $product = Product::query()->where('subtype_id', $subtype->id)->firstOrFail();

        $this->actingAs($this->admin, 'api')
            ->putJson("/api/catalog/types/{$type->id}", [
                'name' => 'Vidrio actualizado',
                'is_active' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Vidrio actualizado');

        $this->actingAs($this->admin, 'api')
            ->putJson("/api/catalog/type-configurations/{$type->id}", [
                'product_type_id' => $type->id,
                'uses_finish' => true,
                'uses_lengths' => true,
                'uses_thickness' => true,
                'uses_dimensions' => true,
                'is_active' => true,
            ])
            ->assertOk();

        $this->actingAs($this->admin, 'api')
            ->putJson("/api/catalog/products/{$product->id}", [
                'subtype_id' => $subtype->id,
            ])
            ->assertOk();

        $this->assertDatabaseHas('catalog_product_types', [
            'id' => $type->id,
            'name' => 'Vidrio actualizado',
        ]);
        $this->assertDatabaseHas('catalog_product_type_configurations', [
            'product_type_id' => $type->id,
            'uses_lengths' => true,
            'uses_thickness' => true,
            'uses_dimensions' => true,
        ]);
        $this->assertDatabaseHas('catalog_products', [
            'id' => $product->id,
            'subtype_id' => $subtype->id,
        ]);
    }
}
