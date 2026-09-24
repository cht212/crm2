<?php

namespace App\Services\Auth;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function login(
        string $email,
        string $password,
        bool $rememberMe,
        string $ipAddress,
    ): array {
        $throttleKey = Str::lower($email).'|'.$ipAddress;

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            throw ValidationException::withMessages([
                'email' => ["Demasiados intentos. Intenta nuevamente en {$seconds} segundos."],
            ]);
        }

        $user = User::where('email', $email)->first();

        if (
            ! $user
            || ! $user->is_active
            || ! Hash::check($password, $user->password)
        ) {
            RateLimiter::hit($throttleKey, 60);

            throw ValidationException::withMessages([
                'email' => ['Datos incorrectos.'],
            ]);
        }


        RateLimiter::clear($throttleKey);
        Auth::login($user);

        $user->tokens()->update(['revoked' => true]);
        $tokenResult = $user->createToken('Carrito Compras Web - API');
        $token = $tokenResult->token;

        $token->expires_at = $rememberMe
            ? Carbon::now()->addWeek()
            : Carbon::now()->addDay();

        $token->save();
        $user->loadMissing('customer.contacts');

        return [
            'accessToken' => $tokenResult->accessToken,
            'token_type' => 'Bearer',
            'expires_at' => Carbon::parse($token->expires_at)->toDateTimeString(),
            'userData' => $this->userData($user),
        ];
    }

    public function userData(User $user): array
    {
        $user->loadMissing('customer.contacts');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'customer_id' => $user->customer_id,
            'is_active' => $user->is_active,
            'customer' => $user->customer,
            'roles' => $user->getRoleNames()->values()->all(),
            'permissions' => $user->getAllPermissions()
                ->pluck('name')
                ->values()
                ->all(),
        ];
    }

    public function logout(User $user): void
    {
        $user->token()?->revoke();
    }
}
