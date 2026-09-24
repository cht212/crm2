<?php

namespace App\Http\Requests\User;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if (!$user) {
            return false;
        }

        if ($this->isMethod('POST')) {
            return $user->can('create', User::class);
        }

        $target = $this->route('user');

        return $target && $user->can('update', $target);
    }

    public function rules(): array
    {
        $target = $this->route('user');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($target?->id),
            ],
            'phone' => ['nullable', 'string', 'max:20'],
            'customer_id' => [
                'nullable',
                'required_if:role,customer',
                'integer',
                'exists:customer_customers,id',
                Rule::unique('users', 'customer_id')->ignore($target?->id),
            ],
            'role' => [
                'required',
                'string',
                Rule::in($this->user()?->hasRole('admin')
                    ? ['customer', 'commercial', 'admin']
                    : ['customer', 'commercial']),
            ],
            'is_active' => ['boolean'],
            'password' => [
                $this->isMethod('POST') ? 'required' : 'nullable',
                'string',
                'min:8',
                'confirmed',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'El nombre completo es obligatorio.',
            'name.string' => 'El nombre completo no es válido.',
            'name.max' => 'El nombre completo no puede superar los 255 caracteres.',

            'email.required' => 'El correo electrónico es obligatorio.',
            'email.email' => 'El correo electrónico no tiene un formato válido.',
            'email.max' => 'El correo electrónico no puede superar los 255 caracteres.',
            'email.unique' => 'El correo electrónico ya está registrado.',

            'phone.string' => 'El teléfono no es válido.',
            'phone.max' => 'El teléfono no puede superar los 20 caracteres.',

            'customer_id.required_if' => 'La empresa es obligatoria para los usuarios cliente.',
            'customer_id.integer' => 'La empresa seleccionada no es válida.',
            'customer_id.exists' => 'La empresa seleccionada no existe.',
            'customer_id.unique' => 'La empresa ya tiene un usuario asignado.',

            'role.required' => 'El rol es obligatorio.',
            'role.string' => 'El rol no es válido.',
            'role.in' => 'El rol seleccionado no es válido.',

            'is_active.boolean' => 'El estado activo no es válido.',

            'password.required' => 'La contraseña es obligatoria.',
            'password.string' => 'La contraseña no es válida.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'password.confirmed' => 'Las contraseñas no coinciden.',
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nombre completo',
            'email' => 'correo electrónico',
            'phone' => 'teléfono',
            'customer_id' => 'empresa',
            'role' => 'rol',
            'is_active' => 'estado activo',
            'password' => 'contraseña',
        ];
    }
}
