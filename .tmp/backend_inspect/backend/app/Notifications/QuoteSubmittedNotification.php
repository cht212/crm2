<?php

namespace App\Notifications;

use App\Models\Commercial\QuoteRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class QuoteSubmittedNotification extends Notification
{
    use Queueable;

    // Permite identificar la cotización desde el contenido de la notificación.
    public function __construct(
        private readonly QuoteRequest $quoteRequest,
    ) {}

    public function via(object $notifiable): array
    {
        // Se guarda en la base de datos y se transmite en tiempo real al panel.
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        return $this->payload();
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->payload());
    }

    private function payload(): array
    {
        // Se reutiliza el mismo contenido para la campanita y el evento de Reverb.
        return [
            'type' => 'quote_submitted',
            'title' => 'Nueva cotización pendiente',
            'message' => "Se recibió la cotización {$this->quoteRequest->request_number}.",
            'quote_request_id' => $this->quoteRequest->id,
            'request_number' => $this->quoteRequest->request_number,
        ];
    }
}
