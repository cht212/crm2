<?php

namespace App\Http\Controllers\Commercial;

use App\Http\Controllers\Controller;
use App\Models\Commercial\QuoteRequestAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class AttachmentController extends Controller
{
    /**
     * Muestra el archivo en el navegador.
     */
    public function preview(
        Request $request,
        QuoteRequestAttachment $attachment
    ) {
        Gate::forUser($request->user())->authorize(
            'viewAny',
            $attachment->quoteRequest
        );

        if (!Storage::disk($attachment->disk)->exists($attachment->path)) {
            abort(404, 'El archivo físico no existe.');
        }

        return Storage::disk($attachment->disk)->response(
            $attachment->path,
            $attachment->original_name,
            ['Content-Type' => $attachment->mime_type],
            'inline',
        );
    }

    /**
     * Descarga el archivo en la computadora.
     */
    public function download(
        Request $request,
        QuoteRequestAttachment $attachment
    ) {
        Gate::forUser($request->user())->authorize(
            'view',
            $attachment->quoteRequest
        );

        if (!Storage::disk($attachment->disk)->exists($attachment->path)) {
            abort(404, 'El archivo físico no existe.');
        }

        return Storage::disk($attachment->disk)->download(
            $attachment->path,
            $attachment->original_name,
            ['Content-Type' => $attachment->mime_type],
        );
    }
}
