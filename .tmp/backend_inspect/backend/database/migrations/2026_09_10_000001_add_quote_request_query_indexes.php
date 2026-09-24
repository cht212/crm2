<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commercial_quote_requests', function (Blueprint $table) {
            $table->index(
                ['customer_id', 'status_id', 'requested_at'],
                'quote_requests_customer_status_requested_idx'
            );
            $table->index(
                ['status_id', 'requested_at'],
                'quote_requests_status_requested_idx'
            );
            $table->index(
                ['created_at', 'id'],
                'quote_requests_created_id_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::table('commercial_quote_requests', function (Blueprint $table) {
            $table->dropIndex('quote_requests_customer_status_requested_idx');
            $table->dropIndex('quote_requests_status_requested_idx');
            $table->dropIndex('quote_requests_created_id_idx');
        });
    }
};
