<?php

namespace Database\Seeders;

use App\Models\Catalog\Finish;
use App\Models\Catalog\Length;
use App\Models\Catalog\Product;
use App\Models\Catalog\Subtype;
use App\Models\Catalog\Series;
use App\Models\Catalog\Thickness;
use App\Models\Catalog\Type;
use App\Models\Catalog\TypeConfiguration;
use App\Models\Catalog\TypeFinish;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CatalogSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $glassType = Type::updateOrCreate(
            [
                'name' => 'Vidrio',
            ],
            [
                'is_active' => true,
            ]
        );

        $profilesType = Type::updateOrCreate(
            [
                'name' => 'Perfiles',
            ],
            [
                'is_active' => true,
            ]
        );

        $accessoriesType = Type::updateOrCreate(
            [
                'name' => 'Acc / Otros',
            ],
            [
                'is_active' => true
            ]
        );

        $glassSubtype = Subtype::updateOrCreate(
            ['product_type_id' => $glassType->id, 'code' => 'VID'],
            ['name' => 'Vidrios', 'is_active' => true],
        );
        $profilesSubtype = Subtype::updateOrCreate(
            ['product_type_id' => $profilesType->id, 'code' => 'PER'],
            ['name' => 'Perfiles', 'is_active' => true],
        );
        $accessoriesSubtype = Subtype::updateOrCreate(
            ['product_type_id' => $accessoriesType->id, 'code' => 'ACC'],
            ['name' => 'Accesorios', 'is_active' => true],
        );

        /*
        |--------------------------------------------------------------------------
        | CONFIGURACIÓN DE TIPOS
        |--------------------------------------------------------------------------
        */

        TypeConfiguration::updateOrCreate(
            [
                'product_type_id' => $glassType->id,
            ],
            [
                'uses_finish' => true,
                'uses_lengths' => false,
                'uses_series' => false,
                'uses_thickness' => true,
                'uses_dimensions' => true,
                'is_active' => true,
            ]
        );

        TypeConfiguration::updateOrCreate(
            [
                'product_type_id' => $profilesType->id,
            ],
            [
                'uses_finish' => true,
                'uses_lengths' => true,
                'uses_series' => false,
                'uses_thickness' => false,
                'uses_dimensions' => false,
                'is_active' => true,
            ]
        );

        TypeConfiguration::updateOrCreate(
            [
                'product_type_id' => $accessoriesType->id,
            ],
            [
                'uses_finish' => true,
                'uses_lengths' => false,
                'uses_series' => false,
                'uses_thickness' => false,
                'uses_dimensions' => false,
                'is_active' => true,
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | PRODUCTOS - VIDRIOS
        |--------------------------------------------------------------------------
        */

        $glassProducts = [
            [
                'code' => 'ESP',
                'name' => 'ESPEJOS',
            ],
            [
                'code' => 'INS',
                'name' => 'CRISTALES INSULADO',
            ],
            [
                'code' => 'LAB',
                'name' => 'LAMINADO HPD',
            ],
            [
                'code' => 'SER',
                'name' => 'VIDRIOS SERIGRAFIADOS',
            ],
            [
                'code' => 'TEM',
                'name' => 'CRISTALES TEMPLADOS',
            ],
            [
                'code' => 'TER',
                'name' => 'CRISTALES TERMOENDURECIDO',
            ],
            [
                'code' => 'VCR',
                'name' => 'VIDRIOS CRUDOS',
            ],
        ];

        foreach ($glassProducts as $product) {
            Product::updateOrCreate(
                [
                    'code' => $product['code'],
                ],
                [
                    'subtype_id' => $glassSubtype->id,
                    'name' => $product['name'],
                    'description' => null,
                    'max_quantity' => 999,
                    'is_active' => true,
                ]
            );
        }

        /*
        |--------------------------------------------------------------------------
        | PRODUCTOS - PERFILES
        |--------------------------------------------------------------------------
        */

        $profilesProducts = [
            [
                'code' => 'VCO03101',
                'name' => 'MARCO SUPERIOR DOBLE CORREDIZA',
            ],
            [
                'code' => 'VCO03102',
                'name' => 'MARCO SUPERIOR FIJO CORREDIZA',
            ],
            [
                'code' => 'VCO03103',
                'name' => 'MARCO INFERIOR DOBLE CORREDIZA',
            ],
            [
                'code' => 'VCO03104',
                'name' => 'MARCO IZQUIERDA CORREDIZA',
            ],
            [
                'code' => 'VCO03105',
                'name' => 'MARCO LATERAL',
            ],
            [
                'code' => 'VCO03106',
                'name' => 'MARCO SUPERIOR / INFERIOR / LATERAL FIJO',
            ],
        ];

        foreach ($profilesProducts as $product) {
            Product::updateOrCreate(
                [
                    'code' => $product['code'],
                ],
                [
                    'subtype_id' => $profilesSubtype->id,
                    'name' => $product['name'],
                    'description' => null,
                    'max_quantity' => 999,
                    'is_active' => true,
                ]
            );
        }

        /*
        |--------------------------------------------------------------------------
        | PRODUCTOS - ACC / OTROS
        |--------------------------------------------------------------------------
        */

        $accessoriesProducts = [
            [
                'code' => 'AUT08103',
                'name' => 'TORNILLO 8X1 FLAT PH DOB. ZDO LAQ',
            ],
            [
                'code' => 'AUT08101',
                'name' => 'TORNILLO 8X1/2 FLAT PH DOB. ZDO LAQ',
            ],
            [
                'code' => 'SIL01001',
                'name' => 'SILICONA SIKA IA 280ml/274g',
            ],
            [
                'code' => 'BIS00005',
                'name' => 'BISAGRA CAPUCHINA 3X3',
            ],
        ];

        foreach ($accessoriesProducts as $product) {
            Product::updateOrCreate(
                [
                    'code' => $product['code'],
                ],
                [
                    'subtype_id' => $accessoriesSubtype->id,
                    'name' => $product['name'],
                    'description' => null,
                    'max_quantity' => 999,
                    'is_active' => true,
                ]
            );
        }

        /*
        |--------------------------------------------------------------------------
        | LONGITUDES
        |--------------------------------------------------------------------------
        */

        $length1 = Length::updateOrCreate(
            [
                'code' => '1',
            ],
            [
                'value' => 5.98,
                'is_active' => true,
            ]
        );

        $length2 = Length::updateOrCreate(
            [
                'code' => '2',
            ],
            [
                'value' => 5.00,
                'is_active' => true,
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | RELACIÓN TIPO - LONGITUD
        |--------------------------------------------------------------------------
        */

        $profilesType->lengths()->sync([
            $length1->id,
            $length2->id,
        ]);


        /*
        |--------------------------------------------------------------------------
        | ACABADOS
        |--------------------------------------------------------------------------
        | Datos tomados del SQL original.
        */

        $finishes = [
            // Existentes
            ['name' => 'ARTIC BLUE', 'related_value' => '0110000192'],
            ['name' => 'BLUE GRENN', 'related_value' => '0110000079'],
            ['name' => 'BRONCE', 'related_value' => '0110000003'],
            ['name' => 'COOL LITE SKN 144 II', 'related_value' => 'COOLLITE14'],
            ['name' => 'COOL LITE ST 150', 'related_value' => 'COOLLITE15'],
            ['name' => 'COOL LITE STB120 II', 'related_value' => '0330000012'],
            ['name' => 'COOL-LITE KNT140', 'related_value' => '0110000126'],
            ['name' => 'COOL-LITE KS 138II', 'related_value' => '0110000129'],
            ['name' => 'COOL-LITE SKN 154', 'related_value' => '0110000131'],
            ['name' => 'COOL-LITE SKN 174 II', 'related_value' => '0110000125'],
            ['name' => 'COOL-LITE ST 120', 'related_value' => '0110000130'],
            ['name' => 'COOL-LITE ST 436', 'related_value' => 'COOLITE436'],
            ['name' => 'DARK BLUE', 'related_value' => '0110000088'],
            ['name' => 'ECLIPSE ADVANTAGE CLEAR', 'related_value' => '0110000015'],
            ['name' => 'ECLIPSE ADVANTAGE GREY', 'related_value' => '0110000016'],
            ['name' => 'ENERGY ADVANTAGE LOW-E', 'related_value' => '0110000197'],
            ['name' => 'ENERGY LIGHT', 'related_value' => '0110000199'],
            ['name' => 'EVERGREEN', 'related_value' => '0110000193'],
            ['name' => 'EXTRA CLARO (OPTIWHITE)', 'related_value' => '0110000136'],
            ['name' => 'GRIS', 'related_value' => '0110000004'],
            ['name' => 'INC AL ACIDO', 'related_value' => '0110000175'],
            ['name' => 'INCOLORO', 'related_value' => '0110000005'],
            ['name' => 'INCOLORO AL ACIDO', 'related_value' => '0110000082'],
            ['name' => 'NEGRO', 'related_value' => '0330000008'],
            ['name' => 'NEW DARK BLUE', 'related_value' => 'NDB'],
            ['name' => 'PLANITHERM ONE II', 'related_value' => '0110000202'],
            ['name' => 'PRIVABLUE', 'related_value' => 'PRIVABLUE'],
            ['name' => 'REFLEJANTE ARTICBLUE', 'related_value' => '0110000194'],
            ['name' => 'REFLEJANTE BRONCE', 'related_value' => '0110000011'],
            ['name' => 'REFLEJANTE GRIS', 'related_value' => '0110000012'],
            ['name' => 'REFLEJANTE INCOLORO', 'related_value' => '0110000013'],
            ['name' => 'REFLEJANTE LAKE BLUE', 'related_value' => '0110000191'],
            ['name' => 'REFLEJANTE ST. SUPERSILVER CLEAR', 'related_value' => '0110000190'],
            ['name' => 'REFLEJANTE ST. SUPERSILVER GRIS', 'related_value' => '0110000189'],
            ['name' => 'REFLEJANTE STOPSOL BRONCE', 'related_value' => '0110000188'],
            ['name' => 'REFLEJANTE STOPSOL GRIS', 'related_value' => '0110000195'],
            ['name' => 'ROJO', 'related_value' => '0110000015'],
            ['name' => 'ROYAL BLUE 20', 'related_value' => '0110000295'],
            ['name' => 'SOLAR E PLUS ON GREY', 'related_value' => 'SOLAR E'],
            ['name' => 'SOLARBAN 60 VT', 'related_value' => 'SOLARBAN'],
            ['name' => 'ST BRIGHT SILVER', 'related_value' => '0110000200'],
            ['name' => 'STOPRAY SMART 30/20', 'related_value' => '0110000196'],
            ['name' => 'STOPRAY VISION - 52T', 'related_value' => '0110000201'],
            ['name' => 'STOPRAY VISION-51T', 'related_value' => '0110000198'],
            ['name' => 'SUNCOOL', 'related_value' => 'SUNCOOL'],
            ['name' => 'SUPERGREY', 'related_value' => '0110000138'],
            ['name' => 'VERDE', 'related_value' => '0110000169'],

            // Nuevos - Perfiles
            ['name' => 'GRAFITO', 'related_value' => '0110000002'],
            ['name' => 'MILL FINISH', 'related_value' => '0230000001'],
            ['name' => 'NATURAL', 'related_value' => '0230000002'],
            ['name' => 'TITANIO', 'related_value' => '0230000004'],
            ['name' => 'BLANCO', 'related_value' => '0230000012'],

            // Nuevo - Acc / Otros
            ['name' => 'ACERO BRILLANTE', 'related_value' => '0330000001'],
        ];


        $finishModels = [];

        foreach ($finishes as $finish) {
            $finishModels[$finish['related_value']] = Finish::updateOrCreate(
                [
                    'name' => $finish['name'],
                ],
                [
                    'related_value' => $finish['related_value'],
                    'is_active' => true,
                ]
            );
        }

        /*
        |--------------------------------------------------------------------------
        | RELACIÓN ACABADOS - PERFILES
        |--------------------------------------------------------------------------
        */

        $profilesFinishCodes = [
            '0110000002',
            '0230000001',
            '0230000002',
            '0230000004',
            '0230000012',
            '0330000008',
        ];

        foreach ($profilesFinishCodes as $code) {
            TypeFinish::updateOrCreate(
                [
                    'product_type_id' => $profilesType->id,
                    'finish_id' => $finishModels[$code]->id,
                ],
                [
                    'apply_measure_validation' => false,
                    'max_width' => null,
                    'max_height' => null,
                    'is_active' => true,
                ]
            );
        }

        /*
        |--------------------------------------------------------------------------
        | RELACIÓN ACABADOS - VIDRIOS
        |--------------------------------------------------------------------------
        */

        $glassFinishCodes = [
            '0110000003',
            '0110000004',
            '0110000005',
            '0110000011',
            '0110000012',
            '0110000189',
            'NDB',
        ];

        foreach ($glassFinishCodes as $code) {
            TypeFinish::updateOrCreate(
                [
                    'product_type_id' => $glassType->id,
                    'finish_id' => $finishModels[$code]->id,
                ],
                [
                    'apply_measure_validation' => false,
                    'max_width' => null,
                    'max_height' => null,
                    'is_active' => true,
                ]
            );
        }

        /*
        |--------------------------------------------------------------------------
        | RELACIÓN ACABADOS - ACC / OTROS
        |--------------------------------------------------------------------------
        */

        $accessoriesFinishCodes = [
            '0110000004',
            '0110000005',
            '0230000002',
            '0230000012',
            '0330000001',
            '0330000008',
        ];

        foreach ($accessoriesFinishCodes as $code) {
            TypeFinish::updateOrCreate(
                [
                    'product_type_id' => $accessoriesType->id,
                    'finish_id' => $finishModels[$code]->id,
                ],
                [
                    'apply_measure_validation' => false,
                    'max_width' => null,
                    'max_height' => null,
                    'is_active' => true,
                ]
            );
        }
    }
}
