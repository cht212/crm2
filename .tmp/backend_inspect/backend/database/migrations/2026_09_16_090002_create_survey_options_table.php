<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('survey_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('survey_question_id')
                ->constrained('survey_questions')
                ->cascadeOnDelete();
            $table->string('label');
            $table->string('value', 100);
            $table->unsignedInteger('position');
            $table->timestamps();

            $table->unique(['survey_question_id', 'value']);
            $table->unique(['survey_question_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('survey_options');
    }
};
