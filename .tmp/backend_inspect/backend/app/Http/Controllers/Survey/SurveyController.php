<?php

namespace App\Http\Controllers\Survey;

use App\Http\Controllers\Controller;
use App\Http\Requests\Survey\StoreSurveyRequest;
use App\Http\Requests\Survey\UpdateSurveyRequest;
use App\Http\Requests\Survey\SubmitSurveyResponseRequest;
use App\Http\Resources\Survey\SurveyResource;
use App\Models\Promotion\Promotion;
use App\Models\Survey\Survey;
use App\Services\Survey\SurveyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SurveyController extends Controller
{
    public function __construct(
        protected SurveyService $surveyService,
    ) {}

    public function store(StoreSurveyRequest $request, Promotion $promotion)
    {
        Gate::forUser($request->user())->authorize('create', Survey::class);

        $survey = $this->surveyService->create(
            $promotion,
            $request->validated(),
            $request->user(),
        );

        return response()->json([
            'message' => 'Encuesta registrada correctamente.',
            'survey' => new SurveyResource($survey),
        ], 201);
    }

    public function show(Request $request, Survey $survey)
    {
        Gate::forUser($request->user())->authorize('view', $survey);

        return response()->json([
            'survey' => new SurveyResource($survey->load('questions.options')),
        ]);
    }

    public function update(UpdateSurveyRequest $request, Survey $survey)
    {
        Gate::forUser($request->user())->authorize('update', $survey);

        return response()->json([
            'message' => 'Encuesta actualizada correctamente.',
            'survey' => new SurveyResource(
                $this->surveyService->update($survey, $request->validated())
            ),
        ]);
    }

    public function publish(Request $request, Survey $survey)
    {
        Gate::forUser($request->user())->authorize('publish', $survey);

        return response()->json([
            'message' => 'Encuesta publicada correctamente.',
            'survey' => new SurveyResource($this->surveyService->publish($survey)),
        ]);
    }

    public function close(Request $request, Survey $survey)
    {
        Gate::forUser($request->user())->authorize('close', $survey);

        return response()->json([
            'message' => 'Encuesta cerrada correctamente.',
            'survey' => new SurveyResource($this->surveyService->close($survey)),
        ]);
    }

    public function results(Request $request, Survey $survey)
    {
        Gate::forUser($request->user())->authorize('viewResults', $survey);

        return response()->json([
            'results' => $this->surveyService->results($survey),
        ]);
    }

    public function myResponse(Request $request, Survey $survey)
    {
        Gate::forUser($request->user())->authorize('respond', $survey);

        return response()->json([
            'has_responded' => $survey->responses()
                ->where('user_id', $request->user()->getKey())
                ->exists(),
        ]);
    }

    public function submit(SubmitSurveyResponseRequest $request, Survey $survey)
    {
        Gate::forUser($request->user())->authorize('respond', $survey);

        $response = $this->surveyService->submit(
            $survey,
            $request->user(),
            $request->validated('answers'),
        );

        return response()->json([
            'message' => 'Respuesta registrada correctamente.',
            'response_id' => $response->getKey(),
        ], 201);
    }
}
