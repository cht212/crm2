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
        Schema::create('catalog_product_type_configurations', function (Blueprint $table) {
            $table->foreignId('product_type_id')
                ->primary()
                ->constrained('catalog_product_types')
                ->restrictOnDelete();

            $table->boolean('uses_finish')->default(false);
            $table->boolean('uses_lengths')->default(false);
            $table->boolean('uses_series')->default(false);
            $table->boolean('uses_thickness')->default(false);
            $table->boolean('uses_dimensions')->default(false);
            $table->boolean('is_active')->default(true);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('catalog_product_type_configurations');
    }
};
