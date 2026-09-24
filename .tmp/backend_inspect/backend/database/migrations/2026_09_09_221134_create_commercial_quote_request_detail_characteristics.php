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
        Schema::create('commercial_quote_request_detail_characteristics', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('quote_request_detail_id');
            $table->unsignedBigInteger('characteristic_id');

            $table->foreign('quote_request_detail_id', 'qrdc_detail_fk')
                ->references('id')
                ->on('commercial_quote_request_details')
                ->cascadeOnDelete();

            $table->foreign('characteristic_id', 'qrdc_characteristic_fk')
                ->references('id')
                ->on('catalog_additional_characteristics')
                ->restrictOnDelete();

            $table->timestamps();

            $table->unique(
                ['quote_request_detail_id', 'characteristic_id'],
                'qrdc_detail_characteristic_unique'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('commercial_quote_request_detail_characteristics');
    }
};
