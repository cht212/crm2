<?php

namespace Database\Seeders;

use App\Models\Catalog\AdditionalCharacteristic;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CharacteristicsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $characteristics = [
            [
                'id' => 1,
                'code' => 'EN',
                'name' => 'Entalle',
            ],
            [
                'id' => 2,
                'code' => 'MO',
                'name' => 'Molde',
            ],
            [
                'id' => 3,
                'code' => 'BR',
                'name' => 'Brillante',
            ],
            [
                'id' => 4,
                'code' => 'RA',
                'name' => 'Radio',
            ],
            [
                'id' => 5,
                'code' => 'DE',
                'name' => 'Descuadre',
            ],
            [
                'id' => 6,
                'code' => 'CNC',
                'name' => 'CNC',
            ],
            [
                'id' => 7,
                'code' => 'IS',
                'name' => 'Isotopo',
            ],
        ];

        foreach ($characteristics as $char) {
            AdditionalCharacteristic::updateOrCreate(
                ['id' => $char['id']],
                $char
            );
        }

        $characteristicIds = [1, 2, 3, 4, 5, 6, 7];

        foreach ($characteristicIds as $charId) {
            DB::table('catalog_product_type_characteristics')->updateOrInsert([
                'product_type_id' => 1,
                'characteristic_id' => $charId,
            ], [
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
