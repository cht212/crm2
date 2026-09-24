<?php

namespace App\Services\Survey;

use App\Enums\Survey\SurveyQuestionType;
use App\Enums\Survey\SurveyStatus;
use App\Models\Promotion\Promotion;
use App\Models\Survey\Survey;
use App\Models\Survey\SurveyResponse;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SurveyService
{
    public function __construct(
        private readonly SurveyResultsService $resultsService,
    ) {}

    public function create(Promotion $promotion, array $data, User $user): Survey
    {
        if ($promotion->type_post !== 'survey') {
            throw ValidationException::withMessages([
                'promotion' => 'La publicación debe tener el tipo survey.',
            ]);
        }

        if ($promotion->survey()->exists()) {
            throw ValidationException::withMessages([
                'promotion' => 'La publicación ya tiene una encuesta configurada.',
            ]);
        }

        return DB::transaction(function () use ($promotion, $data, $user): Survey {
            $questions = $data['questions'];
            unset($data['questions']);

            $survey = $promotion->survey()->create([
                ...$data,
                'created_by' => $user->getKey(),
                'status' => $data['status'] ?? SurveyStatus::DRAFT,
            ]);

            foreach ($questions as $questionData) {
                $options = $questionData['options'] ?? [];
                unset($questionData['options']);

                $this->validateQuestionConfiguration($questionData, $options);
                $question = $survey->questions()->create($questionData);

                if ($options !== []) {
                    $question->options()->createMany($options);
                }
            }

            return $survey->load('questions.options');
        });
    }

    public function submit(Survey $survey, User $user, array $answers): SurveyResponse
    {
        if (! $survey->isAvailable()) {
            throw ValidationException::withMessages([
                'survey' => 'La encuesta no está disponible para responder.',
            ]);
        }

        if ($survey->responses()->where('user_id', $user->getKey())->exists()) {
            throw ValidationException::withMessages([
                'survey' => 'El usuario ya respondió esta encuesta.',
            ]);
        }

        $questions = $survey->questions()->with('options')->get()->keyBy('id');
        $answerMap = collect($answers)->keyBy('question_id');

        foreach ($questions as $question) {
            if ($question->required && ! $answerMap->has($question->id)) {
                throw ValidationException::withMessages([
                    'answers' => "La pregunta {$question->position} es obligatoria.",
                ]);
            }
        }

        foreach ($answerMap as $questionId => $answer) {
            $question = $questions->get($questionId);

            if ($question === null) {
                throw ValidationException::withMessages([
                    'answers' => 'Una de las preguntas no pertenece a esta encuesta.',
                ]);
            }

            $this->validateAnswer($question, $answer['value']);
        }

        return DB::transaction(function () use ($survey, $user, $answerMap): SurveyResponse {
            $response = $survey->responses()->create([
                'user_id' => $user->getKey(),
                'submitted_at' => now(),
            ]);

            foreach ($answerMap as $questionId => $answer) {
                $response->answers()->create([
                    'survey_question_id' => $questionId,
                    'value' => $answer['value'],
                ]);
            }

            return $response->load('answers');
        });
    }

    public function update(Survey $survey, array $data): Survey
    {
        if ($survey->responses()->exists()) {
            throw ValidationException::withMessages([
                'survey' => 'Una encuesta con respuestas no puede editarse.',
            ]);
        }

        return DB::transaction(function () use ($survey, $data): Survey {
            $questions = $data['questions'] ?? null;
            unset($data['questions']);

            $survey->update($data);

            if ($questions !== null) {
                $survey->questions()->delete();

                foreach ($questions as $questionData) {
                    $options = $questionData['options'] ?? [];
                    unset($questionData['options']);

                    $this->validateQuestionConfiguration($questionData, $options);
                    $question = $survey->questions()->create($questionData);

                    if ($options !== []) {
                        $question->options()->createMany($options);
                    }
                }
            }

            return $survey->fresh('questions.options');
        });
    }

    public function publish(Survey $survey): Survey
    {
        $survey->loadMissing('questions.options');

        if ($survey->questions->isEmpty()) {
            throw ValidationException::withMessages([
                'survey' => 'La encuesta debe tener al menos una pregunta.',
            ]);
        }

        foreach ($survey->questions as $question) {
            $this->validateQuestionConfiguration(
                $question->toArray(),
                $question->options->toArray(),
            );
        }

        $survey->update([
            'status' => SurveyStatus::PUBLISHED,
            'published_at' => $survey->published_at ?? now(),
            'closed_at' => null,
        ]);

        return $survey->fresh('questions.options');
    }

    public function close(Survey $survey): Survey
    {
        $survey->update([
            'status' => SurveyStatus::CLOSED,
            'closed_at' => now(),
        ]);

        return $survey->fresh('questions.options');
    }

    public function results(Survey $survey): array
    {
        return $this->resultsService->getResults($survey);
    }

    private function validateQuestionConfiguration(array $question, array $options): void
    {
        $type = $question['type'];
        $closedTypes = [
            SurveyQuestionType::SINGLE_CHOICE->value,
            SurveyQuestionType::MULTIPLE_CHOICE->value,
        ];

        if (in_array($type, $closedTypes, true) && count($options) < 2) {
            throw ValidationException::withMessages([
                'questions' => 'Las preguntas de selección deben tener al menos dos opciones.',
            ]);
        }

        $optionPositions = array_column($options, 'position');
        $optionValues = array_column($options, 'value');

        if (count($optionPositions) !== count(array_unique($optionPositions))) {
            throw ValidationException::withMessages([
                'questions' => 'Las posiciones de las opciones deben ser únicas dentro de cada pregunta.',
            ]);
        }

        if (count($optionValues) !== count(array_unique($optionValues))) {
            throw ValidationException::withMessages([
                'questions' => 'Los valores de las opciones deben ser únicos dentro de cada pregunta.',
            ]);
        }

        if (! in_array($type, $closedTypes, true) && $options !== []) {
            throw ValidationException::withMessages([
                'questions' => 'Las opciones solo aplican a preguntas de selección.',
            ]);
        }

        if ($type === SurveyQuestionType::SCALE->value) {
            if (
                ! isset($question['scale_min'], $question['scale_max'])
                || $question['scale_min'] >= $question['scale_max']
            ) {
                throw ValidationException::withMessages([
                    'questions' => 'La escala debe tener un mínimo menor que el máximo.',
                ]);
            }
        } elseif (isset($question['scale_min']) || isset($question['scale_max'])) {
            throw ValidationException::withMessages([
                'questions' => 'Los límites solo aplican a preguntas de escala.',
            ]);
        }
    }

    private function validateAnswer($question, mixed $value): void
    {
        $type = $question->type->value;

        if ($type === SurveyQuestionType::SINGLE_CHOICE->value) {
            if (! is_string($value) || ! $question->options->contains('value', $value)) {
                throw ValidationException::withMessages([
                    'answers' => 'La respuesta seleccionada no es válida.',
                ]);
            }

            return;
        }

        if ($type === SurveyQuestionType::MULTIPLE_CHOICE->value) {
            if (
                ! is_array($value)
                || $value === []
                || count($value) !== count(array_unique($value))
                || collect($value)->diff($question->options->pluck('value'))->isNotEmpty()
            ) {
                throw ValidationException::withMessages([
                    'answers' => 'Las opciones seleccionadas no son válidas.',
                ]);
            }

            return;
        }

        if (in_array($type, [
            SurveyQuestionType::SHORT_TEXT->value,
            SurveyQuestionType::LONG_TEXT->value,
        ], true)) {
            $maxLength = $type === SurveyQuestionType::SHORT_TEXT->value ? 255 : 5000;

            if (! is_string($value) || mb_strlen($value) > $maxLength) {
                throw ValidationException::withMessages([
                    'answers' => 'El texto de la respuesta no es válido.',
                ]);
            }

            return;
        }

        if ($type === SurveyQuestionType::SCALE->value) {
            if (
                ! is_int($value)
                || $value < $question->scale_min
                || $value > $question->scale_max
            ) {
                throw ValidationException::withMessages([
                    'answers' => 'El valor de la escala no es válido.',
                ]);
            }

            return;
        }

        if ($type === SurveyQuestionType::BOOLEAN->value && ! is_bool($value)) {
            throw ValidationException::withMessages([
                'answers' => 'La respuesta debe ser sí o no.',
            ]);
        }
    }
}
