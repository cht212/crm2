<?php

namespace App\Http\Controllers;

use App\Http\Requests\Contact\StoreContactMessageRequest;
use App\Http\Resources\Contact\ContactMessageResource;
use App\Services\Contact\ContactMessageService;

class ContactMessageController extends Controller
{
    public function __construct(
        private readonly ContactMessageService $contactMessageService,
    ) {}

    public function store(StoreContactMessageRequest $request)
    {
        $contactMessage = $this->contactMessageService->send(
            $request->validated(),
            $request->user(),
        );

        return response()->json([
            'message' => 'Tu mensaje fue enviado correctamente.',
            'contact_message' => new ContactMessageResource($contactMessage),
        ], 201);
    }
}
