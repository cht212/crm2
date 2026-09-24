<?php

namespace App\Notifications;

use App\Models\Promotion\Promotion;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Storage;

class PromotionPublishedNotification extends Notification
{   
    use Queueable;

    // Conserva la publicación y sus relaciones para construir el aviso al cliente.
    public function __construct(
        private readonly Promotion $promotion,
    ) {}

    public function via(object $notifiable): array
    {
        // Se persiste para la campanita y se transmite para mostrar el snackbar.
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        // Laravel usa este formato para almacenar la notificación en la base de datos.
        return $this->payload();
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        // El mismo payload llega al frontend mediante Laravel Reverb.
        return new BroadcastMessage($this->payload());
    }

    private function payload(): array
    {
        // Usa la imagen externa primero y, si no existe, la primera imagen subida al post.
        $imageUrl = $this->promotion->image_url
            ?: $this->promotion->images->first()?->path;

        return [
            // Estos datos se almacenan y también se envían al cliente mediante Reverb.
            'type' => 'promotion_published',
            'title' => $this->promotion->type_post === 'promotion'
                ? 'Nueva promoción'
                : 'Nueva novedad',
            'message' => $this->promotion->summary ?: $this->promotion->title,
            'promotion_title' => $this->promotion->title,
            'promotion_id' => $this->promotion->id,
            'image_url' => $imageUrl
                ? ($this->promotion->image_url ?: Storage::disk('public')->url($imageUrl))
                : null,
        ];
    }
}
