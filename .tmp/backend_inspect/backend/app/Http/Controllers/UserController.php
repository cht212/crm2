<?php

namespace App\Http\Controllers;

use App\Http\Requests\User\UserRequest;
use App\Models\User;
use App\Services\User\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class UserController extends Controller
{
    public function __construct(
        private readonly UserService $userService,
    ) {}

    public function index(Request $request)
    {
        Gate::forUser($request->user())->authorize('viewAny', User::class);

        $query = User::query()->with('customer:id,company_name')->with('roles:id,name');

        if ($request->filled('q')) {
            $search = $request->string('q')->trim();
            $query->where(fn ($users) => $users
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%"));
        }

        return response()->json([
            'users' => $query->latest()->paginate(min(max((int) $request->input('per_page', 10), 1), 100)),
        ]);
    }

    public function show(Request $request, User $user)
    {
        Gate::forUser($request->user())->authorize('view', $user);

        return response()->json(['user' => $this->userService->loadRelations($user)]);
    }

    public function store(UserRequest $request)
    {
        $user = $this->userService->create($request->validated());

        return response()->json([
            'message' => 'Usuario creado correctamente.',
            'user' => $user,
        ], 201);
    }

    public function update(UserRequest $request, User $user)
    {
        $user = $this->userService->update($user, $request->validated());

        return response()->json([
            'message' => 'Usuario actualizado correctamente.',
            'user' => $user,
        ]);
    }
}
