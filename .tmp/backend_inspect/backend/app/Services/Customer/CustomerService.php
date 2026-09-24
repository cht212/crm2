<?php

namespace App\Services\Customer;

use App\Models\Customer;
use App\Services\User\UserService;
use Illuminate\Support\Facades\DB;

class CustomerService
{
    public function __construct(
        private readonly UserService $userService,
    ) {}

    public function create(array $data): Customer
    {
        return DB::transaction(function () use ($data) {
            $contactData = $data['contact'];
            $createUser = (bool) ($data['create_user'] ?? false);
            $userData = $data['user'] ?? null;
            unset($data['contact']);
            unset($data['create_user'], $data['user']);

            $customer = Customer::create($data);

            $customer->contacts()->create([
                'name' => $contactData['name'],
                'position' => $contactData['position'] ?? null,
                'email' => $contactData['email'],
                'phone' => $contactData['phone'],
                'is_primary' => true,
                'is_active' => true,
            ]);

            if ($createUser && $userData) {
                $this->userService->create([
                    ...$userData,
                    'customer_id' => $customer->id,
                    'role' => 'customer',
                    'is_active' => true,
                ]);
            }

            return $customer->load('contacts');
        });
    }

    public function update(Customer $customer, array $data): Customer
    {
        return DB::transaction(function () use ($customer, $data) {
            $contactData = $data['contact'] ?? null;
            unset($data['contact']);

            $customer->update($data);

            if (! empty($contactData)) {
                $customer->contacts()
                    ->where('is_primary', true)
                    ->update([
                        'name' => $contactData['name'] ?? null,
                        'position' => $contactData['position'] ?? null,
                        'email' => $contactData['email'] ?? null,
                        'phone' => $contactData['phone'] ?? null,
                    ]);
            }

            return $customer->load('contacts');
        });
    }
}
