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
        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('summary');
            $table->longText('content');
            $table->string('type_post', 30)->default('article');
            $table->foreignUuid('author_id')->constrained('users')->restrictOnDelete();
            $table->string('image_url')->nullable();
            $table->dateTime('published_at')->nullable();
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->enum('audience_type', ['all', 'selected'])->default('all');
            $table->string('status', 30)->default('draft');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promotions');
    }
};
