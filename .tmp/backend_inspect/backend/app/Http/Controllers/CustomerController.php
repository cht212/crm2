<?php

namespace App\Http\Controllers;

use App\Http\Requests\Customer\CRequest;
use App\Http\Requests\Customer\ShowRequest;
use App\Models\Customer;
use App\Services\Customer\CustomerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

class CustomerController extends Controller
{
    public function __construct(
        private readonly CustomerService $customerService,
    ) {}

    public function index(Request $request)
    {
        Gate::forUser($request->user())->authorize('viewAny', Customer::class);

        $query = Customer::query()
            ->withCount('users')
            ->with('users:id,customer_id,name,email,phone,is_active');

        if ($request->filled('q')) {
            $search = $request->q;

            $query->where(function ($q2) use ($search) {
                $q2->where('company_name', 'like', "%{$search}%")
                    ->orWhere('tax_number', 'like', "%{$search}%")
                    ->orWhere('trade_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%")
                    ->orWhere('province', 'like', "%{$search}%")
                    ->orWhere('district', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $sortBy = $request->input('sortBy', 'company_name');
        $orderBy = $request->input('orderBy', 'asc');

        $allowed = [
            'company_name',
            'tax_number',
            'trade_name',
            'address',
            'department',
            'province',
            'district',
            'is_active',
        ];

        if (in_array($sortBy, $allowed, true)) {
            $query->orderBy(
                $sortBy,
                $orderBy === 'desc' ? 'desc' : 'asc'
            );
        }

        $perPage = min(
            max((int) $request->input('itemsPerPage', 10), 1),
            100
        );

        $customers = $query->paginate($perPage);

        return response()->json([
            'customers' => $customers->items(),
            'totalCustomers' => $customers->total(),
            'per_page' => $customers->perPage(),
            'current_page' => $customers->currentPage(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(CRequest $request)
    {
        try {
            $customer = $this->customerService->create($request->validated());

            return response()->json([
                'message' => 'Empresa registrada correctamente.',
                'customer' => $customer,
            ], 201);
        } catch (\Throwable $e) {
            Log::error('Error al registrar empresa', [
                'user_id' => $request->user()?->id,
                'exception' => $e,
            ]);

            return response()->json([
                'message' => 'No se pudo registrar la empresa.',
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(ShowRequest $request, Customer $customer)
    {
        Gate::forUser($request->user())->authorize('view', $customer);

        return response()->json([
            'customer' => $customer->load('contacts', 'users:id,customer_id,name,email,phone,is_active'),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(CRequest $request, Customer $customer)
    {
        Gate::forUser($request->user())->authorize('update', $customer);

        try {
            $customer = $this->customerService->update(
                $customer,
                $request->validated(),
            );

            return response()->json([
                'message' => 'Empresa actualizada correctamente.',
                'customer' => $customer->load('contacts'),
            ]);
        } catch (\Throwable $e) {

            Log::error('Error al actualizar empresa', [
                'user_id' => $request->user()?->id,
                'customer_id' => $customer->id,
                'exception' => $e,
            ]);

            return response()->json([
                'message' => 'No se pudo actualizar la empresa.',
            ], 500);
        }
    }
}
