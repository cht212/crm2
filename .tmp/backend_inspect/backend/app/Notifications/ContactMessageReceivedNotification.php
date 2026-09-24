<?php

namespace App\Notifications;

use App\Models\ContactMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ContactMessageReceivedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly ContactMessage $contactMessage,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject('Nuevo mensaje del formulario Contáctanos')
            ->view('emails.contact-message-received', [
                'contactMessage' => $this->contactMessage,
            ]);

        foreach ($this->contactMessage->attachments as $attachment) {
            $mail->attachFromStorageDisk(
                $attachment->disk,
                $attachment->path,
                $attachment->original_name,
                [
                    'mime' => $attachment->mime_type,
                ],
            );
        }

        return $mail;
    }
}
