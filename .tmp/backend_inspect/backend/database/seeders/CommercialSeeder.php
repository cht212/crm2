<?php

namespace Database\Seeders;

use App\Models\Commercial\QuoteRequestStatus;
use Illuminate\Database\Seeder;

class CommercialSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $statuses = [
            [
                'id' => 7,
                'name' => 'Borrador',
                'color_hex' => '#9E9E9E',
                'sort_order' => 0,
                'is_active' => true,
            ],
            [
                'id' => 1,
                'name' => 'Pendiente',
                'color_hex' => '#F5B027',
                'sort_order' => 1,
                'is_active' => true,
            ],
            [
                'id' => 2,
                'name' => 'En revisión',
                'color_hex' => '#2196F3',
                'sort_order' => 2,
                'is_active' => true,
            ],
            [
                'id' => 3,
                'name' => 'En cotización',
                'color_hex' => '#9C27B0',
                'sort_order' => 3,
                'is_active' => true,
            ],
            [
                'id' => 4,
                'name' => 'Cotizada',
                'color_hex' => '#4CAF50',
                'sort_order' => 4,
                'is_active' => true,
            ],
            [
                'id' => 5,
                'name' => 'Rechazada',
                'color_hex' => '#F44336',
                'sort_order' => 5,
                'is_active' => true,
            ],
            [
                'id' => 6,
                'name' => 'Cancelada',
                'color_hex' => '#757575',
                'sort_order' => 6,
                'is_active' => true,
            ],
        ];

        foreach ($statuses as $status) {
            QuoteRequestStatus::updateOrCreate(
                ['id' => $status['id']],
                $status
            );
        }
    }
}
