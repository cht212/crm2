<?php

namespace Tests\Feature\Survey;

use App\Models\Customer;
use App\Models\Promotion\Promotion;
use App\Models\User;
use Database\Seeders\RoleAndUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SurveyTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $customerUser;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndUserSeeder::class);

        $this->admin = User::where('email', 'admin@hpdglass.test')->firstOrFail();
        $this->customerUser = User::where('email', 'andrea.quinteros@hpdglass.test')->firstOrFail();
        $this->customer = Customer::findOrFail($this->customerUser->customer_id);
    }

    public function test_administrador_puede_crear_una_publicacion_de_tipo_encuesta(): void
    {
        $promotion = Promotion::create([
            'title' => 'Encuesta de satisfacción',
            'summary' => 'Queremos conocer tu opinión.',
            'content' => 'Ayúdanos a mejorar.',
            'type_post' => 'survey',
            'author_id' => $this->admin->id,
            'audience_type' => 'all',
            'status' => 'published',
            'published_at' => now()->subMinute(),
        ]);

        $response = $this->actingAs($this->admin, 'api')
            ->postJson("/api/promotions/{$promotion->id}/survey", [
                'title' => 'Encuesta de satisfacción',
                'description' => 'Tu opinión es importante.',
                'status' => 'published',
                'questions' => [
                    [
                        'question' => '¿Cómo calificas la atención?',
                        'type' => 'scale',
                        'position' => 1,
                        'required' => true,
                        'scale_min' => 1,
                        'scale_max' => 5,
                    ],
                    [
                        'question' => '¿Nos recomendarías?',
                        'type' => 'boolean',
                        'position' => 2,
                        'required' => true,
                    ],
                ],
            ]);

        $response->assertCreated()
            ->assertJsonPath('survey.promotion_id', $promotion->id)
            ->assertJsonPath('survey.questions.0.type', 'scale');

        $this->assertDatabaseHas('surveys', [
            'promotion_id' => $promotion->id,
            'status' => 'published',
        ]);
    }

    public function test_las_posiciones_de_opciones_se_reinician_en_cada_pregunta(): void
    {
        $promotion = Promotion::create([
            'title' => 'Encuesta con opciones',
            'summary' => 'Resumen',
            'content' => 'Contenido',
            'type_post' => 'survey',
            'author_id' => $this->admin->id,
            'audience_type' => 'all',
            'status' => 'draft',
        ]);

        $this->actingAs($this->admin, 'api')
            ->postJson("/api/promotions/{$promotion->id}/survey", [
                'title' => 'Encuesta',
                'questions' => [
                    [
                        'question' => '¿Qué producto prefieres?',
                        'type' => 'single_choice',
                        'position' => 1,
                        'options' => [
                            ['label' => 'Opción A', 'value' => 'a', 'position' => 1],
                            ['label' => 'Opción B', 'value' => 'b', 'position' => 2],
                        ],
                    ],
                    [
                        'question' => '¿Qué servicio prefieres?',
                        'type' => 'single_choice',
                        'position' => 2,
                        'options' => [
                            ['label' => 'Opción C', 'value' => 'c', 'position' => 1],
                            ['label' => 'Opción D', 'value' => 'd', 'position' => 2],
                        ],
                    ],
                ],
            ])
            ->assertCreated();
    }

    public function test_administrador_puede_actualizar_el_tipo_de_pregunta_a_seleccion_multiple(): void
    {
        $promotion = Promotion::create([
            'title' => 'Encuesta editable',
            'summary' => 'Resumen',
            'content' => 'Contenido',
            'type_post' => 'survey',
            'author_id' => $this->admin->id,
            'audience_type' => 'all',
            'status' => 'draft',
        ]);

        $this->actingAs($this->admin, 'api')
            ->postJson("/api/promotions/{$promotion->id}/survey", [
                'title' => 'Encuesta editable',
                'questions' => [[
                    'question' => '¿Qué opción prefieres?',
                    'type' => 'single_choice',
                    'position' => 1,
                    'options' => [
                        ['label' => 'Opción A', 'value' => 'a', 'position' => 1],
                        ['label' => 'Opción B', 'value' => 'b', 'position' => 2],
                    ],
                ]],
            ])
            ->assertCreated();

        $survey = $promotion->survey()->firstOrFail();

        $this->actingAs($this->admin, 'api')
            ->patchJson("/api/surveys/{$survey->id}", [
                'questions' => [[
                    'question' => '¿Qué opciones prefieres?',
                    'type' => 'multiple_choice',
                    'position' => 1,
                    'required' => true,
                    'options' => [
                        ['label' => 'Opción A', 'value' => 'a', 'position' => 1],
                        ['label' => 'Opción B', 'value' => 'b', 'position' => 2],
                    ],
                ]],
            ])
            ->assertOk()
            ->assertJsonPath('survey.questions.0.type', 'multiple_choice');

        $this->assertDatabaseHas('survey_questions', [
            'survey_id' => $survey->id,
            'type' => 'multiple_choice',
        ]);
    }

    public function test_cliente_puede_responder_una_encuesta_una_vez(): void
    {
        $promotion = Promotion::create([
            'title' => 'Encuesta publicada',
            'summary' => 'Resumen',
            'content' => 'Contenido',
            'type_post' => 'survey',
            'author_id' => $this->admin->id,
            'audience_type' => 'selected',
            'status' => 'published',
            'published_at' => now()->subMinute(),
        ]);
        $promotion->customers()->attach($this->customer);

        $this->actingAs($this->admin, 'api')
            ->postJson("/api/promotions/{$promotion->id}/survey", [
                'title' => 'Encuesta',
                'status' => 'published',
                'questions' => [[
                    'question' => '¿Recomendarías HPD Glass?',
                    'type' => 'boolean',
                    'position' => 1,
                    'required' => true,
                ]],
            ])
            ->assertCreated();

        $survey = $promotion->survey()->firstOrFail();

        $this->actingAs($this->customerUser, 'api')
            ->postJson("/api/surveys/{$survey->id}/responses", [
                'answers' => [[
                    'question_id' => $survey->questions()->firstOrFail()->id,
                    'value' => true,
                ]],
            ])
            ->assertCreated();

        $this->actingAs($this->customerUser, 'api')
            ->postJson("/api/surveys/{$survey->id}/responses", [
                'answers' => [[
                    'question_id' => $survey->questions()->firstOrFail()->id,
                    'value' => true,
                ]],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('survey');
    }

    public function test_administrador_puede_publicar_cerrar_y_consultar_resultados(): void
    {
        $promotion = Promotion::create([
            'title' => 'Encuesta de servicio',
            'summary' => 'Resumen',
            'content' => 'Contenido',
            'type_post' => 'survey',
            'author_id' => $this->admin->id,
            'audience_type' => 'all',
            'status' => 'published',
            'published_at' => now()->subMinute(),
        ]);

        $this->actingAs($this->admin, 'api')
            ->postJson("/api/promotions/{$promotion->id}/survey", [
                'title' => 'Encuesta',
                'questions' => [[
                    'question' => '¿Recomendarías el servicio?',
                    'type' => 'boolean',
                    'position' => 1,
                    'required' => true,
                ]],
            ])
            ->assertCreated();

        $survey = $promotion->survey()->firstOrFail();
        $question = $survey->questions()->firstOrFail();

        $this->actingAs($this->admin, 'api')
            ->postJson("/api/surveys/{$survey->id}/publish")
            ->assertOk()
            ->assertJsonPath('survey.status', 'published');

        $this->actingAs($this->customerUser, 'api')
            ->postJson("/api/surveys/{$survey->id}/responses", [
                'answers' => [[
                    'question_id' => $question->id,
                    'value' => true,
                ]],
            ])
            ->assertCreated();

        $this->actingAs($this->admin, 'api')
            ->getJson("/api/surveys/{$survey->id}/results")
            ->assertOk()
            ->assertJsonPath('results.total_responses', 1)
            ->assertJsonPath('results.respondents.0.name', $this->customerUser->name)
            ->assertJsonPath('results.respondents.0.email', $this->customerUser->email)
            ->assertJsonPath('results.questions.0.distribution.1', 1);

        $this->actingAs($this->admin, 'api')
            ->postJson("/api/surveys/{$survey->id}/close")
            ->assertOk()
            ->assertJsonPath('survey.status', 'closed');
    }
}
