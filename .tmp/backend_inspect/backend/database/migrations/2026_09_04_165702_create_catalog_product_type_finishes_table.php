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
        Schema::create('catalog_product_type_finishes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_type_id')
                ->constrained('catalog_product_types')
                ->restrictOnDelete();

            $table->foreignId('finish_id')
                ->constrained('catalog_finishes')
                ->restrictOnDelete();

            $table->boolean('apply_measure_validation')->default(false);
            $table->decimal('max_width', 10, 2)->nullable();
            $table->decimal('max_height', 10, 2)->nullable();
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->unique([
                'product_type_id',
                'finish_id',
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('catalog_product_type_finishes');
    }
};
