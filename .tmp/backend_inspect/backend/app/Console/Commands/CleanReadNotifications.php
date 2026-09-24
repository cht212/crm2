<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanReadNotifications extends Command
{
    protected $signature = 'notifications:clean-read {--days=30 : Antigüedad mínima en días}';

    protected $description = 'Elimina notificaciones leídas antiguas y conserva las no leídas';

    public function handle(): int
    {
        $days = (int) $this->option('days');

        if ($days < 1) {
            $this->error('La cantidad de días debe ser mayor que cero.');

            return self::FAILURE;
        }

        $deleted = DB::table('notifications')
            ->whereNotNull('read_at')
            ->where('read_at', '<', now()->subDays($days))
            ->delete();

        $this->info("Se eliminaron {$deleted} notificaciones leídas con más de {$days} días.");

        return self::SUCCESS;
    }
}
