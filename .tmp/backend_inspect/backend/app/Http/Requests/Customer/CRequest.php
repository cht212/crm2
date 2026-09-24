<?php

namespace App\Http\Requests\Customer;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (!$user) {
            return false;
        }

        if ($this->isMethod('POST')) {
            return $user->can('create', \App\Models\Customer::class);
        }

        if ($this->isMethod('PUT') || $this->isMethod('PATCH')) {
            $customer = $this->route('customer');

            return $customer && $user->can('update', $customer);
        }

        return false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $customer = $this->route('customer');

        return [
            'company_name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('customer_customers', 'company_name')
                    ->ignore($customer?->id),
            ],

            'tax_number' => [
                'required',
                'string',
                'max:20',
                Rule::unique('customer_customers', 'tax_number')
                    ->ignore($customer?->id),
            ],

            'trade_name' => [
                'required',
                'string',
                'max:255',
            ],

            'email' => [
                'required',
                'email',
                'max:255',
            ],

            'phone' => [
                'required',
                'string',
                'max:20',
            ],

            'address' => [
                'required',
                'string',
                'max:255',
            ],

            'department' => [
                'required',
                'string',
                'max:100',
            ],

            'province' => [
                'required',
                'string',
                'max:100',
            ],

            'district' => [
                'required',
                'string',
                'max:100',
            ],
            // CONTACTO PRINCIPAL
            'contact' => [
                'nullable',
                'array',
            ],

            'contact.name' => [
                'nullable',
                'string',
                'max:255',
            ],

            'contact.position' => [
                'nullable',
                'string',
                'max:255',
            ],

            'contact.email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'contact.phone' => [
                'nullable',
                'string',
                'max:20',
            ],
            'create_user' => [
                'sometimes',
                'boolean',
            ],
            'user' => [
                'nullable',
                'array',
                'required_if:create_user,true',
            ],
            'user.name' => [
                'required_if:create_user,true',
                'string',
                'max:255',
            ],
            'user.email' => [
                'required_if:create_user,true',
                'email',
                'max:255',
                Rule::unique('users', 'email'),
            ],
            'user.phone' => [
                'nullable',
                'string',
                'max:20',
            ],
            'user.password' => [
                'required_if:create_user,true',
                'string',
                'min:8',
                'confirmed',
            ],
        ];
    }

    /**
     * Custom validation messages.
     */
    public function messages(): array
    {
        return [
            'company_name.required' => 'El nombre de la empresa es obligatorio.',
            'company_name.string' => 'El nombre de la empresa no es válido.',
            'company_name.max' => 'El nombre de la empresa no puede superar los 255 caracteres.',
            'company_name.unique' => 'El nombre de la empresa ya está registrado.',

            'tax_number.required' => 'El número de identificación fiscal es obligatorio.',
            'tax_number.string' => 'El número de identificación fiscal no es válido.',
            'tax_number.max' => 'El número de identificación fiscal no puede superar los 20 caracteres.',
            'tax_number.unique' => 'El número de identificación fiscal ya está registrado.',

            'trade_name.required' => 'El nombre comercial es obligatorio.',
            'trade_name.string' => 'El nombre comercial no es válido.',
            'trade_name.max' => 'El nombre comercial no puede superar los 255 caracteres.',

            'email.required' => 'El correo electrónico de la empresa es obligatorio.',
            'email.email' => 'El correo electrónico de la empresa no tiene un formato válido.',
            'email.max' => 'El correo electrónico no puede superar los 255 caracteres.',

            'phone.required' => 'El teléfono de la empresa es obligatorio.',
            'phone.string' => 'El teléfono de la empresa no es válido.',
            'phone.max' => 'El teléfono no puede superar los 20 caracteres.',

            'address.required' => 'La dirección es obligatoria.',
            'address.string' => 'La dirección no es válida.',
            'address.max' => 'La dirección no puede superar los 255 caracteres.',

            'department.required' => 'El departamento es obligatorio.',
            'department.string' => 'El departamento no es válido.',
            'department.max' => 'El departamento no puede superar los 100 caracteres.',

            'province.required' => 'La provincia es obligatoria.',
            'province.string' => 'La provincia no es válida.',
            'province.max' => 'La provincia no puede superar los 100 caracteres.',

            'district.required' => 'El distrito es obligatorio.',
            'district.string' => 'El distrito no es válido.',
            'district.max' => 'El distrito no puede superar los 100 caracteres.',

            'contact.array' => 'La información del contacto principal no es válida.',

            'contact.name.string' => 'El nombre del contacto no es válido.',
            'contact.name.max' => 'El nombre del contacto no puede superar los 255 caracteres.',

            'contact.position.string' => 'El cargo del contacto no es válido.',
            'contact.position.max' => 'El cargo no puede superar los 255 caracteres.',

            'contact.email.email' => 'El correo del contacto no tiene un formato válido.',
            'contact.email.max' => 'El correo del contacto no puede superar los 255 caracteres.',

            'contact.phone.string' => 'El teléfono del contacto no es válido.',
            'contact.phone.max' => 'El teléfono del contacto no puede superar los 20 caracteres.',

            'user.name.required_if' => 'El nombre del usuario es obligatorio.',
            'user.email.required_if' => 'El correo de acceso es obligatorio.',
            'user.email.email' => 'El correo de acceso no tiene un formato válido.',
            'user.email.unique' => 'El correo de acceso ya está registrado.',
            'user.password.required_if' => 'La contraseña del usuario es obligatoria.',
            'user.password.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'user.password.confirmed' => 'Las contraseñas del usuario no coinciden.',
        ];
    }

    public function attributes(): array
    {
        return [
            'company_name' => 'nombre de la empresa',
            'tax_number' => 'número de identificación fiscal',
            'trade_name' => 'nombre comercial',
            'email' => 'correo electrónico',
            'phone' => 'teléfono',
            'address' => 'dirección',
            'department' => 'departamento',
            'province' => 'provincia',
            'district' => 'distrito',

            'contact' => 'contacto principal',
            'contact.name' => 'nombre del contacto',
            'contact.position' => 'cargo del contacto',
            'contact.email' => 'correo del contacto',
            'contact.phone' => 'teléfono del contacto',
        ];
    }
}
