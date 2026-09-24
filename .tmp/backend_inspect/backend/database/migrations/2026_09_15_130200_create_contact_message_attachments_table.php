<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_message_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_message_id')
                ->constrained('contact_messages')
                ->cascadeOnDelete();
            $table->string('original_name', 255);
            $table->string('path', 500);
            $table->string('disk', 50)->default('local');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_message_attachments');
    }
};
