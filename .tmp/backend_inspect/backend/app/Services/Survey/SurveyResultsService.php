<?php

namespace App\Services\Survey;

use App\Enums\Survey\SurveyQuestionType;
use App\Models\Survey\Survey;

class SurveyResultsService
{
    public function getResults(Survey $survey): array
    {
        $survey->loadMissing('questions.options', 'responses.answers', 'responses.user.customer');
        $responses = $survey->responses;

        return [
            'survey_id' => $survey->id,
            'total_responses' => $responses->count(),
            'respondents' => $responses->map(fn ($response): array => [
                'response_id' => $response->id,
                'user_id' => $response->user_id,
                'name' => $response->user?->name,
                'email' => $response->user?->email,
                'company_name' => $response->user?->customer?->company_name,
                'submitted_at' => $response->submitted_at?->toISOString(),
                'answers' => $response->answers->map(fn ($answer): array => [
                    'question_id' => $answer->survey_question_id,
                    'value' => $answer->value,
                ])->values()->all(),
            ])->values()->all(),
            'questions' => $survey->questions->map(function ($question) use ($responses): array {
                $values = $responses
                    ->flatMap(fn ($response) => $response->answers
                        ->where('survey_question_id', $question->id)
                        ->pluck('value'))
                    ->values();

                $result = [
                    'question_id' => $question->id,
                    'question' => $question->question,
                    'type' => $question->type->value,
                    'responses' => $values->count(),
                ];

                if ($question->type === SurveyQuestionType::SCALE) {
                    $numbers = $values->filter(fn ($value) => is_int($value))->values();
                    $result['average'] = $numbers->isEmpty() ? null : round($numbers->avg(), 2);
                    $result['distribution'] = $numbers->countBy()->all();
                } elseif (in_array($question->type, [
                    SurveyQuestionType::SINGLE_CHOICE,
                    SurveyQuestionType::BOOLEAN,
                ], true)) {
                    $result['distribution'] = $values->countBy()->all();
                } elseif ($question->type === SurveyQuestionType::MULTIPLE_CHOICE) {
                    $result['distribution'] = $values
                        ->flatten()
                        ->countBy()
                        ->all();
                } else {
                    $result['text_responses'] = $values->all();
                }

                return $result;
            })->values()->all(),
        ];
    }
}
