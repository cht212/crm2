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
        Schema::create('catalog_product_series', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_type_id')
                ->constrained('catalog_product_types')
                ->restrictOnDelete();
            $table->string('code', 10);
            $table->string('description', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique([
                'product_type_id',
                'code',
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('catalog_product_series');
    }
};
