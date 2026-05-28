$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

function Write-Step {
    param([string]$Text)
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}

function Require-Docker {
    Write-Step "Verificando Docker"

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Docker no esta instalado. Instala Docker Desktop, abre Docker Desktop y vuelve a ejecutar autorun.bat."
    }

    docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker esta instalado, pero no esta iniciado. Abre Docker Desktop y espera a que termine de cargar."
    }

    docker compose version *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose no esta disponible. Actualiza Docker Desktop o instala el plugin de Docker Compose."
    }
}

function Ensure-EnvironmentFile {
    Write-Step "Preparando archivo .env"

    $EnvFile = Join-Path $Root ".env"
    $ExampleFile = Join-Path $Root ".env.example"

    if (-not (Test-Path $EnvFile)) {
        Copy-Item -LiteralPath $ExampleFile -Destination $EnvFile
        Write-Host "Se creo .env desde .env.example"
    } else {
        Write-Host "El archivo .env ya existe"
    }
}

function Start-Application {
    Write-Step "Construyendo y levantando contenedores"

    docker compose up --build -d
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudieron levantar los contenedores. Revisa el mensaje anterior de Docker."
    }
}

function Wait-ForPortal {
    Write-Step "Esperando que el portal este disponible"

    $Url = "http://localhost:8081"
    $Ready = $false

    for ($i = 1; $i -le 45; $i++) {
        try {
            $Response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($Response.StatusCode -ge 200 -and $Response.StatusCode -lt 500) {
                $Ready = $true
                break
            }
        } catch {
            Start-Sleep -Seconds 2
        }
    }

    if (-not $Ready) {
        Write-Host "Los contenedores se levantaron, pero el portal aun no responde en $Url." -ForegroundColor Yellow
        Write-Host "Puedes revisar el estado con: docker compose ps"
        return
    }

    Write-Host "Portal listo en $Url"
}

function Open-Portals {
    Write-Step "Abriendo portales"

    Start-Process "http://localhost:8081"
    Start-Process "http://localhost:8082"

    Write-Host ""
    Write-Host "Paciente: http://localhost:8081"
    Write-Host "Medico:   http://localhost:8082"
}

function Show-Credentials {
    Write-Step "Usuarios demo"

    Write-Host "Medico:   ana.doctor@demo.com / Demo123!"
    Write-Host "Paciente: luis.paciente@demo.com / Demo123!"
    Write-Host ""
    Write-Host "Para ejecutar la prueba automatica:"
    Write-Host ".\scripts\smoke-test.ps1"
    Write-Host ""
    Write-Host "Para detener el sistema:"
    Write-Host "docker compose down"
}

try {
    Write-Host "MediReservas - instalacion local con Docker" -ForegroundColor Green
    Require-Docker
    Ensure-EnvironmentFile
    Start-Application
    Wait-ForPortal
    Open-Portals
    Show-Credentials
    Write-Host ""
    Write-Host "Listo. La aplicacion quedo ejecutandose." -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Solucion rapida:"
    Write-Host "1. Verifica que Docker Desktop este instalado."
    Write-Host "2. Abre Docker Desktop y espera a que diga que esta corriendo."
    Write-Host "3. Vuelve a ejecutar autorun.bat."
    exit 1
}
