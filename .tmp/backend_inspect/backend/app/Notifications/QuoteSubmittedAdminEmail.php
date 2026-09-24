<?php

namespace App\Notifications;

use App\Models\Commercial\QuoteRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class QuoteSubmittedAdminEmail extends Notification
{
    use Queueable;

    // Mantiene la cotización completa disponible para la plantilla del correo.
    public function __construct(
        private readonly QuoteRequest $quoteRequest,
    ) {}

    public function via(object $notifiable): array
    {
        // Esta notificación se entrega únicamente por correo al equipo administrativo.
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // La vista contiene el detalle completo de la solicitud recibida.
        return (new MailMessage)
            ->subject("Nueva cotización {$this->quoteRequest->request_number}")
            ->view('emails.quote-submitted-admin', [
                'quoteRequest' => $this->quoteRequest,
            ]);
    }
}
