param(
  [int]$Port = 8765
)

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "Book stand app is running at http://127.0.0.1:$Port/"
Write-Host "Close this window to stop the local server."

function Get-ContentType($path) {
  switch ([System.IO.Path]::GetExtension($path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8"; break }
    ".css" { "text/css; charset=utf-8"; break }
    ".js" { "application/javascript; charset=utf-8"; break }
    ".sql" { "text/plain; charset=utf-8"; break }
    ".md" { "text/markdown; charset=utf-8"; break }
    default { "application/octet-stream" }
  }
}

function Send-Response($stream, $status, $contentType, [byte[]]$body) {
  $reason = if ($status -eq 200) { "OK" } elseif ($status -eq 403) { "Forbidden" } else { "Not Found" }
  $headers = "HTTP/1.1 $status $reason`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
  $stream.Write($body, 0, $body.Length)
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
    $requestLine = $reader.ReadLine()
    while ($reader.ReadLine()) {}

    $parts = $requestLine -split " "
    $requestPath = if ($parts.Length -ge 2) { $parts[1] } else { "/" }
    $requestPath = [Uri]::UnescapeDataString(($requestPath -split "\?")[0]).TrimStart("/")
    if ([string]::IsNullOrWhiteSpace($requestPath)) { $requestPath = "index.html" }

    $fullPath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($rootPath, $requestPath))
    if (-not $fullPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
      Send-Response $stream 403 "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Forbidden"))
      continue
    }

    if (-not [System.IO.File]::Exists($fullPath)) {
      Send-Response $stream 404 "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Not found"))
      continue
    }

    Send-Response $stream 200 (Get-ContentType $fullPath) ([System.IO.File]::ReadAllBytes($fullPath))
  }
  finally {
    $client.Close()
  }
}
