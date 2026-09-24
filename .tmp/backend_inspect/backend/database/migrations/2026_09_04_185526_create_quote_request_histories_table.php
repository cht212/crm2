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
        Schema::create('commercial_quote_request_histories', function (Blueprint $table) {
            $table->id();

            $table->foreignId('quote_request_id')
                ->constrained('commercial_quote_requests')
                ->restrictOnDelete();

            $table->string('action', 30);

            $table->foreignId('previous_status_id')
                ->nullable()
                ->constrained('commercial_quote_request_statuses')
                ->restrictOnDelete();

            $table->foreignId('new_status_id')
                ->constrained('commercial_quote_request_statuses')
                ->restrictOnDelete();

            $table->json('changes')->nullable();
            $table->string('comment', 500)->nullable();

            $table->foreignUuid('user_id')
                ->constrained('users')
                ->restrictOnDelete();

            $table->timestamp('created_at')->useCurrent();

            $table->index(
                ['quote_request_id', 'created_at'],
                'quote_request_histories_request_created_idx'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('commercial_quote_request_histories');
    }
};
