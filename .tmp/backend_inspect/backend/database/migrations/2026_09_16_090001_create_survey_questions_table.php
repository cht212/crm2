<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('survey_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('survey_id')
                ->constrained('surveys')
                ->cascadeOnDelete();
            $table->text('question');
            $table->string('type', 30);
            $table->unsignedInteger('position');
            $table->boolean('required')->default(false);
            $table->unsignedTinyInteger('scale_min')->nullable();
            $table->unsignedTinyInteger('scale_max')->nullable();
            $table->string('help_text', 500)->nullable();
            $table->timestamps();

            $table->unique(['survey_id', 'position']);
            $table->index(['survey_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('survey_questions');
    }
};
