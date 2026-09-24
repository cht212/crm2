<?php

namespace Tests\Feature\Notification;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class CleanReadNotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_elimina_notificaciones_leidas_antiguas_y_conserva_las_no_leidas(): void
    {
        $oldReadId = (string) Str::uuid();
        $recentReadId = (string) Str::uuid();
        $unreadId = (string) Str::uuid();

        DB::table('notifications')->insert([
            [
                'id' => $oldReadId,
                'type' => 'test',
                'notifiable_type' => 'App\\Models\\User',
                'notifiable_id' => (string) Str::uuid(),
                'data' => '{}',
                'read_at' => now()->subDays(31),
                'created_at' => now()->subDays(31),
                'updated_at' => now()->subDays(31),
            ],
            [
                'id' => $recentReadId,
                'type' => 'test',
                'notifiable_type' => 'App\\Models\\User',
                'notifiable_id' => (string) Str::uuid(),
                'data' => '{}',
                'read_at' => now()->subDays(29),
                'created_at' => now()->subDays(29),
                'updated_at' => now()->subDays(29),
            ],
            [
                'id' => $unreadId,
                'type' => 'test',
                'notifiable_type' => 'App\\Models\\User',
                'notifiable_id' => (string) Str::uuid(),
                'data' => '{}',
                'read_at' => null,
                'created_at' => now()->subDays(31),
                'updated_at' => now()->subDays(31),
            ],
        ]);

        $this->artisan('notifications:clean-read')
            ->expectsOutput('Se eliminaron 1 notificaciones leídas con más de 30 días.')
            ->assertExitCode(0);

        $this->assertDatabaseMissing('notifications', ['id' => $oldReadId]);
        $this->assertDatabaseHas('notifications', ['id' => $recentReadId]);
        $this->assertDatabaseHas('notifications', ['id' => $unreadId]);
    }

    public function test_rechaza_una_antiguedad_invalida(): void
    {
        $this->artisan('notifications:clean-read', ['--days' => 0])
            ->expectsOutput('La cantidad de días debe ser mayor que cero.')
            ->assertExitCode(1);
    }

    public function test_lista_notificaciones_con_paginacion(): void
    {
        $userId = (string) Str::uuid();

        DB::table('notifications')->insert(
            collect(range(1, 11))->map(fn (int $number) => [
                'id' => (string) Str::uuid(),
                'type' => 'test',
                'notifiable_type' => 'App\\Models\\User',
                'notifiable_id' => $userId,
                'data' => '{}',
                'read_at' => null,
                'created_at' => now()->subMinutes($number),
                'updated_at' => now()->subMinutes($number),
            ])->all()
        );

        $user = \App\Models\User::factory()->create([
            'id' => $userId,
        ]);

        $this->actingAs($user, 'api')
            ->getJson('/api/notifications?page=2&perPage=10')
            ->assertOk()
            ->assertJsonCount(1, 'notifications')
            ->assertJsonPath('totalNotifications', 11)
            ->assertJsonPath('current_page', 2);
    }
}
