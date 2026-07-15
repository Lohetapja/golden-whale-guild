param(
  [Parameter(Mandatory = $true)][string]$Archive,
  [Parameter(Mandatory = $true)][string]$MonsterId,
  [Parameter(Mandatory = $true)][string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("gwg-pixellab-" + [Guid]::NewGuid())
New-Item -ItemType Directory -Path $temp | Out-Null
try {
  Expand-Archive -LiteralPath $Archive -DestinationPath $temp -Force
  $metadataPath = Join-Path $temp 'metadata.json'
  $animations = $null
  if (Test-Path -LiteralPath $metadataPath) {
    $metadata = Get-Content -LiteralPath $metadataPath -Raw | ConvertFrom-Json
    $state = @($metadata.states)[0]
    if ($state) { $animations = $state.frames.animations }
  }

  New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
  $directions = @('south', 'east', 'north', 'west')
  $states = @('walk', 'attack', 'hurt', 'death')
  $written = 0

  foreach ($animationState in $states) {
    foreach ($direction in $directions) {
      $paths = @()
      if ($animations) {
        foreach ($property in $animations.PSObject.Properties) {
          if ($property.Name -ne $animationState -and -not $property.Name.StartsWith($animationState + '-')) { continue }
          $candidate = $property.Value.$direction
          if ($candidate) { $paths = @($candidate); break }
        }
      } else {
        # Object exports currently omit metadata.json. Their animation folder is
        # derived from the prompt, so classify its explicit action words.
        $groups = Get-ChildItem -LiteralPath (Join-Path $temp 'animations') -Directory -ErrorAction SilentlyContinue
        foreach ($group in $groups) {
          $label = $group.Name.ToLowerInvariant()
          $inferred = if ($label -match 'death|dying|collapse') { 'death' }
            elseif ($label -match 'hurt|hit|recoil|damage') { 'hurt' }
            elseif ($label -match 'attack|bite|strike|lunge') { 'attack' }
            else { 'walk' }
          if ($inferred -ne $animationState) { continue }
          $directionDirectory = Join-Path $group.FullName $direction
          if (Test-Path -LiteralPath $directionDirectory) {
            $paths = @(Get-ChildItem -LiteralPath $directionDirectory -Filter '*.png' | Sort-Object Name | ForEach-Object { $_.FullName })
            break
          }
        }
      }
      if (-not $paths.Count) { continue }

      $frames = @($paths | ForEach-Object {
        $path = if ([IO.Path]::IsPathRooted($_)) { $_ } else { Join-Path $temp $_ }
        [Drawing.Bitmap]::FromFile($path)
      })
      try {
        $frameWidth = $frames[0].Width
        $frameHeight = $frames[0].Height
        if ($frames.Where({ $_.Width -ne $frameWidth -or $_.Height -ne $frameHeight }).Count) {
          throw "Animation $animationState/$direction has inconsistent frame dimensions"
        }
        $sheet = New-Object Drawing.Bitmap ($frameWidth * $frames.Count), $frameHeight, ([Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
          $graphics = [Drawing.Graphics]::FromImage($sheet)
          try {
            $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
            $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
            $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::Half
            for ($index = 0; $index -lt $frames.Count; $index += 1) {
              $graphics.DrawImageUnscaled($frames[$index], $index * $frameWidth, 0)
            }
          } finally { $graphics.Dispose() }
          $target = Join-Path $OutputDirectory ($animationState + '_' + $direction + '.png')
          $sheet.Save($target, [Drawing.Imaging.ImageFormat]::Png)
          $written += 1
        } finally { $sheet.Dispose() }
      } finally { $frames | ForEach-Object { $_.Dispose() } }
    }
  }

  if (-not $written) { throw "No cardinal animation sheets were produced for $MonsterId" }
  Write-Output "Packed $written animation sheets for $MonsterId"
} finally {
  if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Recurse -Force }
}
