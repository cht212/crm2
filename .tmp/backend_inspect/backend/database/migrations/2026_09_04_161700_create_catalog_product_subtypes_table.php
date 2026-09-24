<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_product_subtypes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_type_id')
                ->constrained('catalog_product_types')
                ->restrictOnDelete();
            $table->string('code', 20);
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['product_type_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_product_subtypes');
    }
};
