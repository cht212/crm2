$ErrorActionPreference = 'Stop'

$docPath = Join-Path (Get-Location) 'PASO_A_PASO_META_FACEBOOK_INSTAGRAM_CRM_VERIFICADO.docx'
$tempRoot = Join-Path $env:TEMP ('crm_meta_docx_' + [guid]::NewGuid().ToString('N'))
$wordDir = Join-Path $tempRoot 'word'
$relsDir = Join-Path $tempRoot '_rels'

New-Item -ItemType Directory -Path $wordDir -Force | Out-Null
New-Item -ItemType Directory -Path $relsDir -Force | Out-Null

function XmlEscape([string]$text) {
    if ($null -eq $text) { return '' }
    return [System.Security.SecurityElement]::Escape($text)
}

function P([string]$text, [string]$style = 'Normal') {
    $escaped = XmlEscape $text
    $styleXml = if ($style -ne 'Normal') { "<w:pPr><w:pStyle w:val=""$style""/></w:pPr>" } else { '' }
    return "<w:p>$styleXml<w:r><w:t xml:space=""preserve"">$escaped</w:t></w:r></w:p>"
}

function Bullet([string]$text) {
    $escaped = XmlEscape $text
    return "<w:p><w:pPr><w:pStyle w:val=""ListParagraph""/><w:ind w:left=""720"" w:hanging=""360""/></w:pPr><w:r><w:t xml:space=""preserve"">- $escaped</w:t></w:r></w:p>"
}

function CodeLine([string]$text) {
    $escaped = XmlEscape $text
    return "<w:p><w:pPr><w:pStyle w:val=""Code""/></w:pPr><w:r><w:t xml:space=""preserve"">$escaped</w:t></w:r></w:p>"
}

function Table([string[][]]$rows) {
    $xml = '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="D9E2E8"/><w:left w:val="single" w:sz="4" w:space="0" w:color="D9E2E8"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="D9E2E8"/><w:right w:val="single" w:sz="4" w:space="0" w:color="D9E2E8"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="D9E2E8"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="D9E2E8"/></w:tblBorders></w:tblPr>'
    foreach ($row in $rows) {
        $xml += '<w:tr>'
        foreach ($cell in $row) {
            $xml += '<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>' + (P $cell) + '</w:tc>'
        }
        $xml += '</w:tr>'
    }
    $xml += '</w:tbl>'
    return $xml
}

$parts = New-Object System.Collections.Generic.List[string]

$parts.Add((P 'Paso a paso para conectar Facebook e Instagram al CRM HPD' 'Title'))
$parts.Add((P 'Objetivo' 'Heading1'))
$parts.Add((P 'Este documento indica que debe configurar la persona que administra Meta Business/Meta Developers para que el CRM local HPD pueda recibir y gestionar WhatsApp, Facebook e Instagram. WhatsApp ya esta configurado; Facebook e Instagram requieren productos, permisos, OAuth y webhooks adicionales.'))

$parts.Add((P 'URLs actuales del CRM' 'Heading1'))
$parts.Add((Table @(
    @('Uso', 'URL que debe colocarse'),
    @('Webhook WhatsApp existente', 'https://portion-reclusive-polka.ngrok-free.dev/api/whatsapp/webhook'),
    @('Webhook Facebook/Instagram', 'https://portion-reclusive-polka.ngrok-free.dev/api/integraciones/meta/webhook'),
    @('Redirect OAuth Instagram', 'https://portion-reclusive-polka.ngrok-free.dev/api/integraciones/instagram/oauth/callback'),
    @('Redirect OAuth Facebook', 'https://portion-reclusive-polka.ngrok-free.dev/api/integraciones/facebook/oauth/callback')
)))
$parts.Add((P 'Importante: no reemplazar el webhook de WhatsApp. WhatsApp usa /api/whatsapp/webhook. Facebook e Instagram deben configurarse en el producto Webhooks/Messenger/Instagram con /api/integraciones/meta/webhook.'))

$parts.Add((P '1. Verificar requisitos en Meta Business' 'Heading1'))
$parts.Add((Bullet 'La Pagina de Facebook debe estar dentro del Business Manager correcto.'))
$parts.Add((Bullet 'La cuenta de Instagram debe ser profesional: Business o Creator.'))
$parts.Add((Bullet 'Instagram debe estar vinculado a la Pagina de Facebook.'))
$parts.Add((Bullet 'El usuario que hara la configuracion debe tener permisos de administrador sobre la empresa, la Pagina, Instagram y la App de Meta.'))
$parts.Add((Bullet 'La App de Meta debe ser la misma o una App relacionada a la operacion del CRM. Si hoy solo tiene WhatsApp, hay que agregar productos adicionales.'))

$parts.Add((P '2. Mantener WhatsApp como esta' 'Heading1'))
$parts.Add((P 'En Meta Developers > App > WhatsApp > Configuration/Webhooks, dejar configurado:'))
$parts.Add((CodeLine 'Callback URL: https://portion-reclusive-polka.ngrok-free.dev/api/whatsapp/webhook'))
$parts.Add((CodeLine 'Verify Token: el mismo valor que se colocara en CRM > Conexiones > WhatsApp > Webhook Verify Token'))
$parts.Add((P 'No usar esta pantalla para Facebook o Instagram. Ese apartado pertenece al producto WhatsApp.'))

$parts.Add((P '3. Agregar productos necesarios en Meta Developers' 'Heading1'))
$parts.Add((P 'En la App de Meta Developers, agregar o configurar estos productos segun aparezcan disponibles:'))
$parts.Add((Bullet 'Facebook Login for Business o Facebook Login: necesario para iniciar sesion/OAuth y autorizar permisos.'))
$parts.Add((Bullet 'Webhooks: necesario para recibir eventos de Facebook e Instagram.'))
$parts.Add((Bullet 'Messenger: necesario para mensajes de la Pagina de Facebook.'))
$parts.Add((Bullet 'Instagram / Instagram Messaging / Instagram Graph API: necesario para mensajes, comentarios e informacion de Instagram.'))

$parts.Add((P '4. Configurar OAuth / Login' 'Heading1'))
$parts.Add((P 'En Facebook Login for Business > Settings, agregar estas URLs como Valid OAuth Redirect URIs:'))
$parts.Add((CodeLine 'https://portion-reclusive-polka.ngrok-free.dev/api/integraciones/instagram/oauth/callback'))
$parts.Add((CodeLine 'https://portion-reclusive-polka.ngrok-free.dev/api/integraciones/facebook/oauth/callback'))
$parts.Add((P 'Tambien revisar App Domains. Si Meta lo pide, agregar:'))
$parts.Add((CodeLine 'portion-reclusive-polka.ngrok-free.dev'))

$parts.Add((P '5. Configurar webhook para Facebook/Instagram' 'Heading1'))
$parts.Add((P 'En el producto Webhooks de la App, configurar:'))
$parts.Add((CodeLine 'Callback URL: https://portion-reclusive-polka.ngrok-free.dev/api/integraciones/meta/webhook'))
$parts.Add((CodeLine 'Verify Token: el mismo valor que se pondra en CRM > Conexiones > Instagram/Facebook > Meta Webhook Verify Token'))
$parts.Add((P 'Suscribir la App a los objetos/campos que Meta permita para la App:'))
$parts.Add((Bullet 'Para Facebook Page/Messenger: mensajes, eventos de messaging, comentarios/feed, metadata de pagina.'))
$parts.Add((Bullet 'Para Instagram: mensajes de Instagram, comentarios, menciones o eventos de la cuenta profesional disponibles.'))
$parts.Add((Bullet 'En modo desarrollo solo funcionara con usuarios, paginas y cuentas autorizadas/testers. Para produccion, Meta puede pedir revision de permisos.'))

$parts.Add((P '6. permisos que debe solicitar/agregar' 'Heading1'))
$parts.Add((P 'permisos base recomendados para la App:'))
$parts.Add((CodeLine 'pages_show_list'))
$parts.Add((CodeLine 'pages_read_engagement'))
$parts.Add((CodeLine 'pages_manage_metadata'))
$parts.Add((CodeLine 'pages_messaging'))
$parts.Add((CodeLine 'instagram_basic'))
$parts.Add((CodeLine 'instagram_manage_messages'))
$parts.Add((CodeLine 'instagram_manage_comments'))
$parts.Add((CodeLine 'read_insights'))
$parts.Add((CodeLine 'instagram_manage_insights'))
$parts.Add((P 'Nota: algunos permisos requieren App Review para funcionar con clientes reales fuera de usuarios de prueba.'))

$parts.Add((P '7. Datos que debe entregarnos o colocar en el CRM' 'Heading1'))
$parts.Add((P 'La persona debe ir al CRM > conexiones > Configurar y completar los campos correspondientes.'))
$parts.Add((Table @(
    @('Canal', 'Datos requeridos'),
    @('Instagram', 'Meta App ID, Meta App Secret, Meta Webhook Verify Token, Facebook Page ID vinculada, Instagram Business Account ID, Instagram/Page Access Token'),
    @('Facebook', 'Meta App ID, Meta App Secret, Meta Webhook Verify Token, Facebook Page ID, Page Access Token'),
    @('WhatsApp', 'Webhook Verify Token, Access Token, Phone Number ID, Business Account ID, API Version, SendMessagesToMeta true/false')
)))

$parts.Add((P '8. Probar conexion desde el CRM' 'Heading1'))
$parts.Add((Bullet 'Abrir el CRM.'))
$parts.Add((Bullet 'Entrar a conexiones.'))
$parts.Add((Bullet 'En Instagram o Facebook, presionar Configurar y guardar las credenciales.'))
$parts.Add((Bullet 'Presionar Copiar webhook y verificar que sea /api/integraciones/meta/webhook.'))
$parts.Add((Bullet 'Presionar Conectar para abrir el login/OAuth de Meta.'))
$parts.Add((Bullet 'Aceptar permisos con un usuario administrador del Business/Pagina.'))
$parts.Add((Bullet 'Volver al CRM y verificar que el canal aparezca conectado o que indique unicamente permisos pendientes.'))

$parts.Add((P '9. Prueba funcional esperada' 'Heading1'))
$parts.Add((Bullet 'Enviar un mensaje de prueba a Facebook Messenger o Instagram DM desde una cuenta autorizada.'))
$parts.Add((Bullet 'Hacer un comentario de prueba en una publicacion si se activaron comentarios.'))
$parts.Add((Bullet 'Confirmar que Meta envia eventos al webhook del CRM.'))
$parts.Add((Bullet 'Confirmar que el CRM crea conversacion con canal FACEBOOK o INSTAGRAM.'))
$parts.Add((Bullet 'Confirmar que los reportes empiezan a separar interacciones por canal.'))

$parts.Add((P '10. Notas importantes' 'Heading1'))
$parts.Add((Bullet 'Si ngrok cambia de URL, hay que actualizar Callback URL y Redirect URIs en Meta.'))
$parts.Add((Bullet 'Para produccion conviene usar Cloudflare Tunnel o dominio fijo.'))
$parts.Add((Bullet 'WhatsApp, Facebook e Instagram no necesariamente se configuran en la misma pantalla de Meta. WhatsApp tiene su webhook propio; Facebook/Instagram usan Webhooks/Messenger/Instagram.'))
$parts.Add((Bullet 'En modo desarrollo, Meta puede limitar eventos a usuarios con rol en la App. Para clientes reales, la App debe estar Live y con permisos aprobados.'))

$parts.Add((P 'Checklist para la persona de Meta' 'Heading1'))
$parts.Add((Bullet 'No tocar ni reemplazar el webhook de WhatsApp existente.'))
$parts.Add((Bullet 'Agregar Facebook Login for Business/Facebook Login.'))
$parts.Add((Bullet 'Agregar Webhooks.'))
$parts.Add((Bullet 'Agregar Messenger si se manejaran mensajes de Facebook.'))
$parts.Add((Bullet 'Agregar/configurar Instagram Messaging o Instagram Graph API.'))
$parts.Add((Bullet 'Configurar redirect URIs de Instagram y Facebook.'))
$parts.Add((Bullet 'Configurar webhook Meta para Facebook/Instagram.'))
$parts.Add((Bullet 'Suscribir eventos de mensajes, comentarios e insights segun permisos.'))
$parts.Add((Bullet 'Entregar App ID, App Secret, Page ID, Instagram Business Account ID, access tokens y verify token.'))

$parts.Add((P 'Referencias oficiales' 'Heading1'))
$parts.Add((Bullet 'Meta Webhooks: https://developers.facebook.com/docs/graph-api/webhooks/'))
$parts.Add((Bullet 'Instagram Webhooks: https://developers.facebook.com/documentation/instagram-platform/webhooks'))
$parts.Add((Bullet 'Webhooks para Instagram Messaging: https://developers.facebook.com/documentation/business-messaging/instagram-messaging/webhooks'))
$parts.Add((Bullet 'TikTok Developers: https://developers.tiktok.com/'))

$body = ($parts -join "`n")
$documentXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
$body
<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
</w:body></w:document>
"@

$contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>
'@

$rels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>
'@

$styles = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:color w:val="005D7C"/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="280" w:after="120"/></w:pPr><w:rPr><w:b/><w:color w:val="007FAE"/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:pPr><w:spacing w:after="80"/></w:pPr><w:rPr><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:pPr><w:spacing w:after="80"/><w:shd w:fill="F4F8FA"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/><w:color w:val="142A35"/></w:rPr></w:style><w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="D9E2E8"/><w:left w:val="single" w:sz="4" w:space="0" w:color="D9E2E8"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="D9E2E8"/><w:right w:val="single" w:sz="4" w:space="0" w:color="D9E2E8"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="D9E2E8"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="D9E2E8"/></w:tblBorders></w:tblPr></w:style></w:styles>
'@

Set-Content -LiteralPath (Join-Path $tempRoot '[Content_Types].xml') -Value $contentTypes -Encoding UTF8
Set-Content -LiteralPath (Join-Path $relsDir '.rels') -Value $rels -Encoding UTF8
Set-Content -LiteralPath (Join-Path $wordDir 'document.xml') -Value $documentXml -Encoding UTF8
Set-Content -LiteralPath (Join-Path $wordDir 'styles.xml') -Value $styles -Encoding UTF8

if (Test-Path $docPath) {
    Remove-Item -LiteralPath $docPath -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempRoot, $docPath)
Remove-Item -LiteralPath $tempRoot -Recurse -Force

Write-Output $docPath


