<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Nueva cotización {{ $quoteRequest->request_number }}</title>
</head>
<body>
    <h1>Nueva cotización recibida</h1>

    <p><strong>Número:</strong> {{ $quoteRequest->request_number }}</p>
    <p><strong>Cliente:</strong> {{ $quoteRequest->customer?->company_name ?? 'No disponible' }}</p>
    <p><strong>Asunto:</strong> {{ $quoteRequest->subject }}</p>
    @if ($quoteRequest->observations)
        <p><strong>Observaciones:</strong> {{ $quoteRequest->observations }}</p>
    @endif

    <h2>Detalle de la cotización</h2>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
            <tr>
                <th>Tipo</th>
                <th>Producto</th>
                <th>Acabado</th>
                <th>Espesor</th>
                <th>Medidas</th>
                <th>Largo</th>
                <th>Cantidad</th>
                <th>Características</th>
                <th>Observación</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($quoteRequest->details as $detail)
                <tr>
                    <td>{{ $detail->productType?->name ?? '-' }}</td>
                    <td>{{ $detail->product?->name ?? '-' }}</td>
                    <td>{{ $detail->finish?->name ?? '-' }}</td>
                    <td>{{ $detail->thickness ?? '-' }}</td>
                    <td>{{ $detail->base ?? '-' }} x {{ $detail->height ?? '-' }}</td>
                    <td>{{ $detail->length?->value ?? '-' }}</td>
                    <td>{{ $detail->quantity }}</td>
                    <td>{{ $detail->characteristics->pluck('name')->join(', ') ?: '-' }}</td>
                    <td>{{ $detail->observation ?: '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="9">La cotización no tiene detalles.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
