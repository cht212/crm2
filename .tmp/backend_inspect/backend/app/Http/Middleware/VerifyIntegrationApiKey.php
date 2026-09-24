<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyIntegrationApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $configuredKey = (string) config('services.erp.api_key');
        $providedKey = (string) $request->header('X-Integration-Key');
        $allowedIps = config('services.erp.allowed_ips', []);

        if (
            $configuredKey === ''
            || $providedKey === ''
            || !hash_equals($configuredKey, $providedKey)
        ) {
            abort(401, 'Credenciales de integración inválidas.');
        }

        if (!in_array($request->ip(), $allowedIps, true)) {
            abort(403, 'La IP de integración no está autorizada.');
        }

        return $next($request);
    }
}
