<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\Auth\AuthService;
use Mockery;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    public function test_user_devuelve_roles_y_permisos(): void
    {
        $user = Mockery::mock(User::class)->makePartial();
        $user->shouldReceive('loadMissing')->once()->with('customer.contacts');
        $user->shouldReceive('getRoleNames')->once()->andReturn(
            collect(['customer']),
        );
        $user->shouldReceive('getAllPermissions')->once()->andReturn(
            collect([
                (object) ['name' => 'quotes.view.own'],
                (object) ['name' => 'quotes.create'],
            ]),
        );
        $user->id = 'user-id';
        $user->name = 'Cliente';
        $user->email = 'cliente@test.com';
        $user->phone = '999999999';
        $user->customer_id = 1;
        $user->is_active = true;
        $user->customer = null;

        $data = (new AuthService)->userData($user);

        $this->assertSame(['customer'], $data['roles']);
        $this->assertSame(
            ['quotes.view.own', 'quotes.create'],
            $data['permissions'],
        );
    }
}
