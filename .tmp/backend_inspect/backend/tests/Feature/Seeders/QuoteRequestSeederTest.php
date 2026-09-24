<?php

namespace Tests\Feature\Seeders;

use App\Models\Commercial\QuoteRequest;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\CommercialSeeder;
use Database\Seeders\QuoteRequestSeeder;
use Database\Seeders\RoleAndUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuoteRequestSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_crea_una_cotizacion_para_cada_cliente_sembrado(): void
    {
        $this->seed([
            RoleAndUserSeeder::class,
            CatalogSeeder::class,
            CommercialSeeder::class,
            QuoteRequestSeeder::class,
        ]);

        $quotes = QuoteRequest::query()->with('details')->get();

        $this->assertCount(2, $quotes);
        $this->assertCount(1, $quotes[0]->details);
        $this->assertCount(1, $quotes[1]->details);
        $this->assertSame(
            'Pendiente',
            $quotes[0]->status()->first()->name,
        );
        $this->assertSame(
            'Pendiente',
            $quotes[1]->status()->first()->name,
        );
        $this->assertNotSame(
            $quotes[0]->customer_id,
            $quotes[1]->customer_id,
        );
    }
}