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
        Schema::create('commercial_quote_requests', function (Blueprint $table) {
            $table->id();

            $table->string('request_number', 20)->unique();

            $table->foreignId('customer_id')
                ->constrained('customer_customers')
                ->restrictOnDelete();

            $table->string('subject', 200);

            $table->string('observations', 1000)->nullable();

            $table->foreignId('status_id')
                ->constrained('commercial_quote_request_statuses')
                ->restrictOnDelete();

            $table->datetime('requested_at')->useCurrent();

            $table->foreignUuid('created_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->foreignUuid('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->boolean('is_active')->default(true);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('commercial_quote_requests');
    }
};
