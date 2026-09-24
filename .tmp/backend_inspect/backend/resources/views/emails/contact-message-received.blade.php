<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Nuevo mensaje de contacto</title>
</head>
<body>
    <h1>Nuevo mensaje de Contáctanos</h1>

    <p><strong>Nombre:</strong> {{ $contactMessage->full_name }}</p>
    <p><strong>Correo:</strong> {{ $contactMessage->email }}</p>
    @if ($contactMessage->phone)
        <p><strong>Teléfono:</strong> {{ $contactMessage->phone }}</p>
    @endif
    @if ($contactMessage->customer)
        <p><strong>Empresa:</strong> {{ $contactMessage->customer->company_name }}</p>
    @endif

    <h2>Mensaje</h2>
    <p>{!! nl2br(e($contactMessage->message)) !!}</p>
</body>
</html>
