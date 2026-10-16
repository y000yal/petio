$ErrorActionPreference = 'Stop'
Import-Module "$PSHOME\Modules\Microsoft.PowerShell.Security\Microsoft.PowerShell.Security.psd1"
Set-Location (Split-Path $PSScriptRoot -Parent)

# Only the public thumbprint is saved in the project. Windows protects the
# non-exportable private key in the current user's Personal certificate store.
$signingDir = Join-Path (Get-Location) '.signing'
$thumbprintFile = Join-Path $signingDir 'thumbprint.txt'
New-Item -ItemType Directory -Force -Path $signingDir | Out-Null
$cert = $null
if (Test-Path -LiteralPath $thumbprintFile) {
    $thumbprint = (Get-Content -LiteralPath $thumbprintFile -Raw).Trim()
    if ($thumbprint -notmatch '^[A-Fa-f0-9]{40}$') { throw 'Invalid saved signing thumbprint.' }
    $cert = Get-Item "Cert:\CurrentUser\My\$thumbprint" -ErrorAction SilentlyContinue
    if (!$cert -or !$cert.HasPrivateKey -or $cert.NotAfter -lt (Get-Date)) {
        throw 'The saved signing certificate is missing or expired. Restore access to its Windows account, or remove .signing/thumbprint.txt to create a new identity.'
    }
}
if (!$cert) {
    $cert = New-SelfSignedCertificate -Type CodeSigningCert `
        -Subject 'CN=Petio Development' -FriendlyName 'Petio self-signed development signing' `
        -CertStoreLocation 'Cert:\CurrentUser\My' -KeyAlgorithm RSA -KeyLength 3072 `
        -HashAlgorithm SHA256 -KeyExportPolicy NonExportable `
        -NotAfter (Get-Date).AddYears(3)
    Set-Content -LiteralPath $thumbprintFile -Value $cert.Thumbprint -Encoding ascii
}

node tools/build-helper.cjs
if ($LASTEXITCODE -ne 0) { throw 'Native helper build failed.' }
& .\node_modules\.bin\electron-builder.cmd --win nsis --config tools/self-signed.config.cjs
if ($LASTEXITCODE -ne 0) { throw 'Signed installer build failed.' }

$output = Join-Path (Get-Location) 'release/self-signed'
Export-Certificate -Cert $cert -FilePath (Join-Path $output 'Petio Development.cer') | Out-Null
$package = Get-Content package.json -Raw | ConvertFrom-Json
$version = $package.version
$installerName = $package.build.nsis.artifactName
if (!$installerName) { $installerName = 'Petio Setup ${version}-self-signed.${ext}' }
$installerName = $installerName.Replace('${version}', $version).Replace('${ext}', 'exe')
$targets = @(
    (Join-Path $output $installerName),
    (Join-Path $output 'win-unpacked/Petio.exe'),
    (Join-Path $output 'win-unpacked/resources/app.asar.unpacked/src/helper/aware.exe')
)
foreach ($target in $targets) {
    $signature = Get-AuthenticodeSignature -LiteralPath $target
    if (!$signature.SignerCertificate -or $signature.SignerCertificate.Thumbprint -ne $cert.Thumbprint `
        -or $signature.Status -eq 'HashMismatch' -or $signature.Status -eq 'NotSigned') {
        throw "Signature verification failed: $target ($($signature.Status))"
    }
    Write-Host "$target : $($signature.Status) / $($signature.SignerCertificate.Subject)"
}
Write-Host 'Self-signed build complete. Recipient computers do not automatically trust this certificate.'
