<?php

namespace App\Notifications;

use App\Models\Commercial\QuoteRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class QuoteSubmittedCustomerEmail extends Notification
{
    use Queueable;

    // Conserva los datos de la cotización para personalizar el mensaje de confirmación.
    public function __construct(
        private readonly QuoteRequest $quoteRequest,
    ) {}

    public function via(object $notifiable): array
    {
        // El cliente recibe la confirmación únicamente por correo.
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // Confirma al cliente que su solicitud fue recibida correctamente.
        return (new MailMessage)
            ->subject("Cotización {$this->quoteRequest->request_number} recibida")
            ->greeting('Hemos recibido tu solicitud')
            ->line("Recibimos tu cotización {$this->quoteRequest->request_number}.")
            ->line('Pronto revisaremos tu solicitud y nos pondremos en contacto contigo.');
    }
}
