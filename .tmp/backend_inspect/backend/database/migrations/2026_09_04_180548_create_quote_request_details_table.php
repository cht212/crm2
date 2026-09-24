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
        Schema::create('commercial_quote_request_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_request_id')
                ->constrained('commercial_quote_requests')
                ->cascadeOnDelete();

            $table->foreignId('product_type_id')
                ->constrained('catalog_product_types')
                ->restrictOnDelete();

            $table->foreignId('subtype_id')
                ->constrained('catalog_product_subtypes')
                ->restrictOnDelete();

            $table->foreignId('product_id')
                ->constrained('catalog_products')
                ->restrictOnDelete();

            $table->unsignedInteger('thickness')->nullable();

            $table->foreignId('lengths_id')
                ->nullable()
                ->constrained('catalog_lengths')
                ->nullOnDelete();

            $table->foreignId('finish_id')
                ->nullable()
                ->constrained('catalog_finishes')
                ->nullOnDelete();


            $table->unsignedInteger('base')
                ->nullable();

            $table->unsignedInteger('height')
                ->nullable();

            $table->unsignedInteger('quantity');

            $table->string('observation', 300)
                ->nullable();

            $table->boolean('is_active')
                ->default(true);

            $table->timestamps();
        });


        Schema::create('commercial_quote_request_attachments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('quote_request_id')
                ->constrained('commercial_quote_requests')
                ->cascadeOnDelete();

            $table->string('original_name', 255);

            $table->string('path', 500);

            $table->string('disk', 50)->default('local');

            $table->string('mime_type', 100);

            $table->unsignedBigInteger('size'); // bytes

            $table->foreignUuid('uploaded_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('commercial_quote_request_attachments');
        Schema::dropIfExists('commercial_quote_request_details');
    }
};
