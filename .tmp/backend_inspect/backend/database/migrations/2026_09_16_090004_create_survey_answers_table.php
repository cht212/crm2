<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('survey_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('survey_response_id')
                ->constrained('survey_responses')
                ->cascadeOnDelete();
            $table->foreignId('survey_question_id')
                ->constrained('survey_questions')
                ->restrictOnDelete();
            $table->json('value');
            $table->timestamps();

            $table->unique(['survey_response_id', 'survey_question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('survey_answers');
    }
};
