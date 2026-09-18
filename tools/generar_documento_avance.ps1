$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$markdownPath = Join-Path $root "AVANCE_PROYECTO_CRM.md"
$imagePath = Join-Path $root "ARQUITECTURA_CRM.png"
$dbImagePath = Join-Path $root "MODELO_DATOS_CRM.png"
$docxPath = Join-Path $root "AVANCE_PROYECTO_CRM.docx"

Add-Type -AssemblyName System.Drawing

function Draw-RoundedRectangle {
    param(
        [System.Drawing.Graphics]$Graphics,
        [System.Drawing.Pen]$Pen,
        [System.Drawing.Brush]$Brush,
        [int]$X,
        [int]$Y,
        [int]$Width,
        [int]$Height,
        [int]$Radius
    )

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $Radius * 2
    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
    $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    $Graphics.FillPath($Brush, $path)
    $Graphics.DrawPath($Pen, $path)
    $path.Dispose()
}

function Draw-Box {
    param(
        [System.Drawing.Graphics]$Graphics,
        [string]$Title,
        [string[]]$Lines,
        [int]$X,
        [int]$Y,
        [int]$Width,
        [int]$Height,
        [string]$Fill,
        [string]$Border
    )

    $fillBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($Fill))
    $borderPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($Border), 2)
    Draw-RoundedRectangle -Graphics $Graphics -Pen $borderPen -Brush $fillBrush -X $X -Y $Y -Width $Width -Height $Height -Radius 18

    $titleFont = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)
    $lineFont = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Regular)
    $titleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#102027"))
    $lineBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#43515a"))

    $Graphics.DrawString($Title, $titleFont, $titleBrush, $X + 18, $Y + 14)
    $currentY = $Y + 48
    foreach ($line in $Lines) {
        $Graphics.DrawString($line, $lineFont, $lineBrush, $X + 18, $currentY)
        $currentY += 20
    }

    $fillBrush.Dispose()
    $borderPen.Dispose()
    $titleFont.Dispose()
    $lineFont.Dispose()
    $titleBrush.Dispose()
    $lineBrush.Dispose()
}

function Draw-Arrow {
    param(
        [System.Drawing.Graphics]$Graphics,
        [int]$X1,
        [int]$Y1,
        [int]$X2,
        [int]$Y2,
        [string]$Label = ""
    )

    $pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#0f766e"), 3)
    $pen.CustomEndCap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap(5, 6)
    $Graphics.DrawLine($pen, $X1, $Y1, $X2, $Y2)

    if ($Label) {
        $font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
        $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#0f766e"))
        $Graphics.DrawString($Label, $font, $brush, [Math]::Min($X1, $X2) + [Math]::Abs($X2 - $X1) / 2 - 44, [Math]::Min($Y1, $Y2) + [Math]::Abs($Y2 - $Y1) / 2 - 18)
        $font.Dispose()
        $brush.Dispose()
    }

    $pen.Dispose()
}

function New-ArchitectureImage {
    $width = 1600
    $height = 1050
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#f5f8f6"))

    $titleFont = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Bold)
    $subtitleFont = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Regular)
    $darkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#102027"))
    $mutedBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#5b6870"))

    $graphics.DrawString("Arquitectura local del CRM conectado a WhatsApp", $titleFont, $darkBrush, 60, 42)
    $graphics.DrawString("El CRM corre en la maquina local. ngrok publica temporalmente el webhook HTTPS; a futuro Cloudflare Tunnel puede dar una exposicion mas estable.", $subtitleFont, $mutedBrush, 63, 92)

    Draw-Box $graphics "Usuarios del CRM" @("Administrador", "Supervisor", "Asesor") 70 190 280 170 "#ffffff" "#94a3b8"
    Draw-Box $graphics "Frontend Web local" @("HTML / CSS / JavaScript", "Inbox, Pipeline, Reportes", "Ficha del cliente") 430 160 320 220 "#ecfeff" "#0891b2"
    Draw-Box $graphics "ASP.NET Core local" @("Visual Studio / Kestrel", "Controllers REST", "Autenticacion y roles", "Validaciones de negocio") 830 160 320 220 "#eef2ff" "#4f46e5"
    Draw-Box $graphics "Tunel HTTPS publico" @("ngrok actualmente", "Cloudflare Tunnel futuro", "URL publica para webhooks") 1230 170 300 190 "#fff7ed" "#ea580c"
    Draw-Box $graphics "Servicios internos" @("WhatsAppService", "CloudinaryStorageService", "AuditoriaService", "PasswordHasher") 830 470 320 220 "#f0fdf4" "#16a34a"
    Draw-Box $graphics "SQL Server" @("Clientes y usuarios", "Conversaciones y mensajes", "Tareas, ventas, notas", "Etiquetas y auditoria") 450 730 330 220 "#fff7ed" "#ea580c"
    Draw-Box $graphics "WhatsApp Cloud API" @("Webhook de mensajes", "Envio de respuestas", "Estados y multimedia") 1230 450 300 190 "#e0f2fe" "#0284c7"
    Draw-Box $graphics "Cloudinary" @("Imagenes y documentos", "URL publica HTTPS", "Fallback local si falla") 1230 730 300 190 "#faf5ff" "#9333ea"

    Draw-Arrow $graphics 350 275 430 275 "usa"
    Draw-Arrow $graphics 750 275 830 275 "API"
    Draw-Arrow $graphics 1150 270 1230 270 "publica"
    Draw-Arrow $graphics 990 380 990 470 "logica"
    Draw-Arrow $graphics 830 580 780 805 "EF Core"
    Draw-Arrow $graphics 1380 360 1380 450 "Meta"
    Draw-Arrow $graphics 1230 545 1150 300 "webhook"
    Draw-Arrow $graphics 1150 585 1230 825 "media"
    Draw-Arrow $graphics 1380 730 1380 640 "URLs"

    $footerFont = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Regular)
    $graphics.DrawString("Lectura recomendada: todo corre local; ngrok/Cloudflare solo abre una puerta HTTPS para que WhatsApp pueda llamar al webhook local.", $footerFont, $mutedBrush, 63, 995)

    $bitmap.Save($imagePath, [System.Drawing.Imaging.ImageFormat]::Png)

    $footerFont.Dispose()
    $titleFont.Dispose()
    $subtitleFont.Dispose()
    $darkBrush.Dispose()
    $mutedBrush.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}

function New-DatabaseImage {
    $width = 1600
    $height = 1050
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#f8fafc"))

    $titleFont = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Bold)
    $subtitleFont = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Regular)
    $darkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#102027"))
    $mutedBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#5b6870"))

    $graphics.DrawString("Modelo de datos del CRM", $titleFont, $darkBrush, 60, 42)
    $graphics.DrawString("Vista explicativa del diagrama SQL Server: el cliente es el eje de conversaciones, ventas, tareas, etiquetas, notas y auditoria.", $subtitleFont, $mutedBrush, 63, 92)

    Draw-Box $graphics "crm_cliente" @("n_cliente PK", "nombre, telefono, email", "documento, estado") 650 170 300 170 "#ffffff" "#0f766e"
    Draw-Box $graphics "crm_conversacion" @("n_conversacion PK", "n_cliente FK", "estado, asesor", "ultimos mensajes") 170 360 300 190 "#eff6ff" "#2563eb"
    Draw-Box $graphics "crm_mensaje" @("n_mensaje PK", "n_conversacion FK", "direccion E/S", "tipo, texto, fecha") 170 650 300 190 "#dbeafe" "#2563eb"
    Draw-Box $graphics "crm_etiqueta" @("n_etiqueta PK", "nombre, color") 1110 170 300 150 "#fefce8" "#ca8a04"
    Draw-Box $graphics "crm_cliente_etiqueta" @("n_cliente FK", "n_etiqueta FK", "fecha_asignacion") 1110 390 300 160 "#fff7ed" "#ea580c"
    Draw-Box $graphics "crm_nota_interna" @("n_nota PK", "n_cliente FK", "n_conversacion FK", "texto, creado_por") 650 430 300 180 "#fdf2f8" "#db2777"
    Draw-Box $graphics "crm_oportunidad" @("n_oportunidad PK", "n_cliente FK", "monto, moneda", "etapa, probabilidad") 650 710 300 200 "#f0fdf4" "#16a34a"
    Draw-Box $graphics "crm_tarea" @("n_tarea PK", "cliente/conversacion/oportunidad", "vencimiento, estado", "asignado_a") 1110 690 300 190 "#ecfeff" "#0891b2"
    Draw-Box $graphics "crm_usuario" @("n_usuario PK", "usuario, nombre", "rol, estado") 650 910 300 120 "#eef2ff" "#4f46e5"
    Draw-Box $graphics "crm_actividad_log" @("entidad, entidad_id", "accion", "valor anterior/nuevo", "usuario, fecha") 170 900 300 120 "#f1f5f9" "#64748b"
    Draw-Box $graphics "__EFMigrationsHistory" @("tabla tecnica EF Core", "controla migraciones") 70 170 300 130 "#ffffff" "#94a3b8"

    Draw-Arrow $graphics 650 255 470 430 "1 a N"
    Draw-Arrow $graphics 320 550 320 650 "1 a N"
    Draw-Arrow $graphics 950 250 1110 455 "N a N"
    Draw-Arrow $graphics 1260 320 1260 390 "catalogo"
    Draw-Arrow $graphics 800 340 800 430 "notas"
    Draw-Arrow $graphics 800 340 800 710 "ventas"
    Draw-Arrow $graphics 950 795 1110 785 "seguimiento"
    Draw-Arrow $graphics 950 970 1110 790 "asigna"
    Draw-Arrow $graphics 650 970 470 960 "audita"
    Draw-Arrow $graphics 650 970 800 890 "crea"

    $footerFont = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Regular)
    $graphics.DrawString("Lectura recomendada: primero explicar crm_cliente; luego WhatsApp (conversacion/mensaje); despues gestion comercial (oportunidad/tarea/nota/etiqueta); finalmente usuarios y auditoria.", $footerFont, $mutedBrush, 63, 1010)

    $bitmap.Save($dbImagePath, [System.Drawing.Imaging.ImageFormat]::Png)

    $footerFont.Dispose()
    $titleFont.Dispose()
    $subtitleFont.Dispose()
    $darkBrush.Dispose()
    $mutedBrush.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}

function Add-Paragraph {
    param(
        $Document,
        [string]$Text,
        [string]$StyleName = "Normal",
        [bool]$Bullet = $false
    )

    $paragraph = $Document.Paragraphs.Add()
    $paragraph.Range.Text = $Text
    $style = switch ($StyleName) {
        "Title" { -63 }
        "Subtitle" { -75 }
        "Heading 1" { -2 }
        "Heading 2" { -3 }
        default { -1 }
    }
    $paragraph.Range.Style = $style
    if ($Bullet) {
        $paragraph.Range.ListFormat.ApplyBulletDefault()
    }
    $paragraph.Range.InsertParagraphAfter()
}

function New-WordDocument {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $document = $word.Documents.Add()

    $document.PageSetup.TopMargin = 50
    $document.PageSetup.BottomMargin = 50
    $document.PageSetup.LeftMargin = 54
    $document.PageSetup.RightMargin = 54

    $selection = $word.Selection
    $selection.Style = -63
    $selection.TypeText("Avance del Proyecto CRM")
    $selection.TypeParagraph()
    $selection.Style = -75
    $selection.TypeText("CRM local conectado a WhatsApp mediante ngrok, con Cloudflare como siguiente etapa")
    $selection.TypeParagraph()
    $selection.Style = -1
    $selection.TypeText("Fecha: 15 de septiembre de 2026")
    $selection.TypeParagraph()
    $selection.TypeParagraph()

    Add-Paragraph $document "Arquitectura general" "Heading 1"
    Add-Paragraph $document "La siguiente imagen resume como se conectan los usuarios, la interfaz web local, el backend ASP.NET Core local, la base de datos SQL Server local y los servicios externos. ngrok funciona como tunel HTTPS para que WhatsApp Cloud API pueda enviar webhooks hacia la maquina local; a futuro puede reemplazarse por Cloudflare Tunnel." "Normal"

    $paragraph = $document.Paragraphs.Add()
    $range = $paragraph.Range
    $inlineShape = $document.InlineShapes.AddPicture($imagePath, $false, $true, $range)
    $inlineShape.Width = 470
    $inlineShape.Height = 309
    $paragraph.Range.InsertParagraphAfter()

    Add-Paragraph $document "Modelo de base de datos" "Heading 1"
    Add-Paragraph $document "Esta imagen resume el diagrama de SQL Server de forma mas facil de explicar. La tabla principal es crm_cliente; desde ella se conectan la atencion de WhatsApp, la gestion comercial y el control interno del sistema." "Normal"

    $dbParagraph = $document.Paragraphs.Add()
    $dbRange = $dbParagraph.Range
    $dbShape = $document.InlineShapes.AddPicture($dbImagePath, $false, $true, $dbRange)
    $dbShape.Width = 470
    $dbShape.Height = 309
    $dbParagraph.Range.InsertParagraphAfter()

    Add-Paragraph $document "Detalle del avance" "Heading 1"

    $lines = Get-Content $markdownPath -Encoding UTF8
    foreach ($line in $lines) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        if ($line.StartsWith("# ")) {
            continue
        }

        if ($line.StartsWith("## ")) {
            Add-Paragraph $document $line.Substring(3) "Heading 1"
            continue
        }

        if ($line.StartsWith("### ")) {
            Add-Paragraph $document $line.Substring(4) "Heading 2"
            continue
        }

        if ($line.StartsWith("- ")) {
            Add-Paragraph $document $line.Substring(2) "Normal" $true
            continue
        }

        Add-Paragraph $document ($line -replace '`', '') "Normal"
    }

    if (Test-Path $docxPath) {
        Remove-Item $docxPath -Force
    }

    $savePath = [object][string]$docxPath
    $fileFormat = [object]16
    $document.SaveAs([ref]$savePath, [ref]$fileFormat)
    $document.Close()
    $word.Quit()
}

New-ArchitectureImage
New-DatabaseImage
New-WordDocument

Write-Host "Documento creado: $docxPath"
Write-Host "Imagen creada: $imagePath"
Write-Host "Imagen BD creada: $dbImagePath"
