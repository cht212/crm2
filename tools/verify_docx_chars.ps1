param(
    [string]$Path = 'PASO_A_PASO_META_FACEBOOK_INSTAGRAM_CRM_LIMPIO.docx'
)

$ErrorActionPreference = 'Stop'

$tmp = Join-Path $env:TEMP ('verify_docx_' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp | Out-Null

try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory((Resolve-Path $Path), $tmp)

    $xmlPath = Join-Path $tmp 'word\document.xml'
    $xml = Get-Content -LiteralPath $xmlPath -Raw

    $badCodes = @(0x00C3, 0x00C2, 0xFFFD, 0x00E2, 0x20AC, 0x0153, 0x00D9, 0x00FD)
    $found = @()

    foreach ($code in $badCodes) {
        $char = [char]$code
        if ($xml.Contains([string]$char)) {
            $found += ('U+' + $code.ToString('X4'))
        }
    }

    if ($found.Count -eq 0) {
        Write-Output 'OK: no se encontraron caracteres corruptos comunes.'
    }
    else {
        Write-Output ('ERROR: se encontraron caracteres sospechosos: ' + ($found -join ', '))
    }

    $plain = $xml -replace '<[^>]+>', ' '
    $plain = $plain -replace '\s+', ' '
    Write-Output '--- Vista previa del texto ---'
    Write-Output $plain.Substring(0, [Math]::Min(1500, $plain.Length))
}
finally {
    if (Test-Path $tmp) {
        Remove-Item -LiteralPath $tmp -Recurse -Force
    }
}
