<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('catalog_product_type_characteristics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_type_id')
                ->constrained('catalog_product_types')
                ->cascadeOnDelete();
            $table->foreignId('characteristic_id')
                ->constrained('catalog_additional_characteristics')
                ->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['product_type_id', 'characteristic_id'], 'prod_type_char_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('catalog_product_type_characteristics');
    }
};
