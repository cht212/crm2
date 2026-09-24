<?php

namespace App\Http\Controllers;

use App\Services\Auth\AuthService;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $authService,
    ) {}

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
            'remember_me' => 'boolean',
        ]);

        return response()->json($this->authService->login(
            $validated['email'],
            $validated['password'],
            (bool) ($validated['remember_me'] ?? false),
            $request->ip(),
        ));
    }

    public function user(Request $request)
    {
        return response()->json([
            'userData' => $this->authService->userData($request->user()),
        ]);
    }

    public function logout(Request $request)
    {
        $this->authService->logout($request->user());

        return response()->json(['message' => 'Successfully logged out']);
    }
}
