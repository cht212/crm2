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
        Schema::create('catalog_product_type_lengths', function (Blueprint $table) {
            $table->foreignId('product_type_id')
                ->constrained('catalog_product_types')
                ->cascadeOnDelete();

            $table->foreignId('product_length_id')
                ->constrained('catalog_lengths')
                ->cascadeOnDelete();

            $table->primary([
                'product_type_id',
                'product_length_id',
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('catalog_product_type_lengths');
    }
};
