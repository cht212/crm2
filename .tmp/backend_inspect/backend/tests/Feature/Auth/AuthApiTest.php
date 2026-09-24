<?php

namespace Tests\Feature\Auth;

use Database\Seeders\RoleAndUserSeeder;
use App\Models\User;
use App\Services\User\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleAndUserSeeder::class);
        DB::table('oauth_clients')->insert([
            'id' => (string) Str::uuid(),
            'name' => 'Testing Personal Access Client',
            'secret' => null,
            'provider' => 'users',
            'redirect_uris' => '[]',
            'grant_types' => json_encode(['personal_access']),
            'revoked' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_usuario_puede_iniciar_y_cerrar_sesion(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'andrea.quinteros@hpdglass.test',
            'password' => 'User123*',
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure([
                'accessToken',
                'token_type',
                'expires_at',
                'userData' => ['id', 'email', 'roles', 'permissions'],
            ]);

        $token = $response->json('accessToken');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/user')
            ->assertOk()
            ->assertJsonPath('userData.email', 'andrea.quinteros@hpdglass.test');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Successfully logged out');
    }

    public function test_login_rechaza_credenciales_invalidas(): void
    {
        $this->postJson('/api/auth/login', [
            'email' => 'andrea.quinteros@hpdglass.test',
            'password' => 'incorrecta',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email')
            ->assertJsonPath('message', 'Datos incorrectos.');
    }

    public function test_token_normal_expira_en_un_dia(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'andrea.quinteros@hpdglass.test',
            'password' => 'User123*',
        ])->assertOk();

        $expiresAt = Carbon::parse($response->json('expires_at'));

        $this->assertEqualsWithDelta(
            now()->addDay()->timestamp,
            $expiresAt->timestamp,
            5,
        );
    }

    public function test_token_con_recordarme_expira_en_una_semana(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'andrea.quinteros@hpdglass.test',
            'password' => 'User123*',
            'remember_me' => true,
        ])->assertOk();

        $expiresAt = Carbon::parse($response->json('expires_at'));

        $this->assertEqualsWithDelta(
            now()->addWeek()->timestamp,
            $expiresAt->timestamp,
            5,
        );
    }

    public function test_usuario_inactivo_no_puede_iniciar_sesion(): void
    {
        User::where('email', 'andrea.quinteros@hpdglass.test')
            ->update(['is_active' => false]);

        $this->postJson('/api/auth/login', [
            'email' => 'andrea.quinteros@hpdglass.test',
            'password' => 'User123*',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email')
            ->assertJsonPath('message', 'Datos incorrectos.');
    }

    public function test_token_de_usuario_desactivado_deja_de_funcionar(): void
    {
        $token = $this->postJson('/api/auth/login', [
            'email' => 'andrea.quinteros@hpdglass.test',
            'password' => 'User123*',
        ])->assertOk();

        $user = User::where('email', 'andrea.quinteros@hpdglass.test')
            ->firstOrFail();

        app(UserService::class)->update($user, [
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'customer_id' => $user->customer_id,
            'role' => $user->getRoleNames()->first(),
            'is_active' => false,
        ]);

        $this->assertDatabaseHas('oauth_access_tokens', [
            'user_id' => $user->id,
            'revoked' => true,
        ]);

        $this->actingAs($user, 'api')
            ->getJson('/api/auth/user')
            ->assertUnauthorized();
    }

    public function test_usuario_reactivado_puede_iniciar_sesion(): void
    {
        User::where('email', 'andrea.quinteros@hpdglass.test')
            ->update(['is_active' => false]);
        User::where('email', 'andrea.quinteros@hpdglass.test')
            ->update(['is_active' => true]);

        $this->postJson('/api/auth/login', [
            'email' => 'andrea.quinteros@hpdglass.test',
            'password' => 'User123*',
        ])->assertOk();
    }
}
