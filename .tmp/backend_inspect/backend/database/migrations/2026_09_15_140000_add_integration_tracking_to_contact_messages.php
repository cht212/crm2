<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->string('integration_status', 20)->default('pending')->index();
            $table->string('integration_id', 100)->nullable()->index();
            $table->text('integration_error')->nullable();
            $table->timestamp('integration_processed_at')->nullable();
            $table->unsignedSmallInteger('integration_attempts')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->dropColumn([
                'integration_status',
                'integration_id',
                'integration_error',
                'integration_processed_at',
                'integration_attempts',
            ]);
        });
    }
};
