<?php

namespace App\Services\Contact;

use App\Models\ContactMessage;
use App\Models\User;
use App\Notifications\ContactMessageReceivedNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class ContactMessageService
{
    /**
     * @param array<string, mixed> $data
     */
    public function send(array $data, User $user): ContactMessage
    {
        /** @var array<int, UploadedFile> $attachments */
        $attachments = $data['attachments'] ?? [];

        $contactMessage = DB::transaction(function () use ($data, $attachments, $user) {
            $contactMessage = ContactMessage::create([
                ...collect($data)->except('attachments')->all(),
                'user_id' => $user->id,
                'customer_id' => $user->customer_id,
                'integration_status' => 'pending',
            ]);

            foreach ($attachments as $file) {
                $path = $file->store(
                    "contact-messages/{$contactMessage->id}/attachments",
                    'local',
                );

                $contactMessage->attachments()->create([
                    'original_name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'disk' => 'local',
                    'mime_type' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                ]);
            }

            return $contactMessage;
        });

        $contactMessage->load(['customer', 'attachments']);
        $adminEmail = config('mail.testing_recipient');

        if ($adminEmail) {
            Notification::route('mail', $adminEmail)
                ->notify(new ContactMessageReceivedNotification($contactMessage));
        } else {
            User::query()
                ->role('admin')
                ->each(fn (User $recipient) => $recipient->notify(
                    new ContactMessageReceivedNotification($contactMessage),
                ));
        }

        $contactMessage->update(['sent_at' => now()]);

        return $contactMessage->fresh(['customer', 'attachments']);
    }
}
