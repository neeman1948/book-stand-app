# יוצר את קבצי האייקון של האפליקציה (ספר לבן על רקע טורקיז).
# הרצה:  powershell -ExecutionPolicy Bypass -File .\tools\make-icons.ps1
# הקבצים נכתבים לתיקיית icons/ ליד index.html.
# הסקריפט שמור בריפו כדי שאפשר יהיה לייצר את האייקונים מחדש אם משנים צבע או עיצוב.

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$outDir = Join-Path (Split-Path -Parent $PSScriptRoot) "icons"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$teal = [System.Drawing.ColorTranslator]::FromHtml("#00c2a8")
$white = [System.Drawing.Color]::White

function New-RoundedPath {
  param([single]$x, [single]$y, [single]$w, [single]$h, [single]$r)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc(($x + $w - $d), $y, $d, $d, 270, 90)
  $path.AddArc(($x + $w - $d), ($y + $h - $d), $d, $d, 0, 90)
  $path.AddArc($x, ($y + $h - $d), $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-BookIcon {
  param([int]$size, [string]$fileName, [switch]$Maskable)

  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $bgBrush = New-Object System.Drawing.SolidBrush($teal)
  if ($Maskable) {
    # maskable: ריבוע מלא. אנדרואיד חותך את הקצוות בעצמו לצורה שהוא בוחר.
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)
  }
  else {
    $path = New-RoundedPath 0 0 $size $size ($size * 0.22)
    $g.FillPath($bgBrush, $path)
    $path.Dispose()
  }

  # במצב maskable הספר קטן יותר כדי להישאר בתוך 80% המרכזיים (safe zone).
  $s = if ($Maskable) { 0.46 } else { 0.60 }

  $cx = $size * 0.5
  $cy = $size * 0.5
  $halfW = $size * $s * 0.5
  $innerHalfH = $size * $s * 0.36
  $outerHalfH = $size * $s * 0.27
  $gap = [Math]::Max(1.0, $size * $s * 0.030)

  $bookBrush = New-Object System.Drawing.SolidBrush($white)

  $leftPage = @(
    (New-Object System.Drawing.PointF(($cx - $halfW), ($cy - $outerHalfH))),
    (New-Object System.Drawing.PointF(($cx - $gap), ($cy - $innerHalfH))),
    (New-Object System.Drawing.PointF(($cx - $gap), ($cy + $innerHalfH))),
    (New-Object System.Drawing.PointF(($cx - $halfW), ($cy + $outerHalfH)))
  )
  $rightPage = @(
    (New-Object System.Drawing.PointF(($cx + $gap), ($cy - $innerHalfH))),
    (New-Object System.Drawing.PointF(($cx + $halfW), ($cy - $outerHalfH))),
    (New-Object System.Drawing.PointF(($cx + $halfW), ($cy + $outerHalfH))),
    (New-Object System.Drawing.PointF(($cx + $gap), ($cy + $innerHalfH)))
  )

  $g.FillPolygon($bookBrush, $leftPage)
  $g.FillPolygon($bookBrush, $rightPage)

  $g.Dispose()
  $target = Join-Path $outDir $fileName
  $bmp.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $bgBrush.Dispose()
  $bookBrush.Dispose()
  Write-Host "wrote $target ($size x $size)"
}

New-BookIcon -size 192 -fileName "icon-192.png"
New-BookIcon -size 512 -fileName "icon-512.png"
New-BookIcon -size 512 -fileName "icon-maskable-512.png" -Maskable
New-BookIcon -size 180 -fileName "apple-touch-icon.png"
New-BookIcon -size 32  -fileName "favicon-32.png"

Write-Host "done."
