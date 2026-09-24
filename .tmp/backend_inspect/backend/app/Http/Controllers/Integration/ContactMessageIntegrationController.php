<?php

namespace App\Http\Controllers\Integration;

use App\Http\Controllers\Controller;
use App\Http\Requests\Integration\AcknowledgeIntegrationRequest;
use App\Http\Requests\Integration\FailIntegrationRequest;
use App\Http\Resources\Contact\ContactMessageResource;
use App\Models\ContactMessage;
use App\Models\ContactMessageAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ContactMessageIntegrationController extends Controller
{
    public function index(Request $request)
    {
        $messages = ContactMessage::query()
            ->with(['customer', 'attachments'])
            ->where('integration_status', $request->string('status', 'pending'))
            ->orderBy('id')
            ->paginate(min(max($request->integer('per_page', 50), 1), 100));

        return ContactMessageResource::collection($messages);
    }

    public function show(ContactMessage $contactMessage)
    {
        return new ContactMessageResource(
            $contactMessage->load(['customer', 'attachments']),
        );
    }

    public function downloadAttachment(
        ContactMessage $contactMessage,
        ContactMessageAttachment $attachment,
    ) {
        abort_unless($attachment->contact_message_id === $contactMessage->id, 404);

        if (! Storage::disk($attachment->disk)->exists($attachment->path)) {
            abort(404, 'El archivo físico no existe.');
        }

        return Storage::disk($attachment->disk)->download(
            $attachment->path,
            $attachment->original_name,
            ['Content-Type' => $attachment->mime_type],
        );
    }

    public function acknowledge(
        AcknowledgeIntegrationRequest $request,
        ContactMessage $contactMessage,
    ) {
        $contactMessage->update([
            'integration_status' => 'exported',
            'integration_id' => $request->validated('integration_id'),
            'integration_error' => null,
            'integration_processed_at' => now(),
        ]);

        return new ContactMessageResource($contactMessage->load('attachments'));
    }

    public function fail(
        FailIntegrationRequest $request,
        ContactMessage $contactMessage,
    ) {
        $contactMessage->increment('integration_attempts');
        $contactMessage->update([
            'integration_status' => 'failed',
            'integration_error' => $request->validated('error'),
        ]);

        return new ContactMessageResource($contactMessage->load('attachments'));
    }
}
