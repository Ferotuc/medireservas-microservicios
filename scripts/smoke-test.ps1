$ErrorActionPreference = "Stop"

$baseUrl = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:8081" }

function Invoke-Json {
  param (
    [string]$Method,
    [string]$Uri,
    [object]$Body = $null,
    [hashtable]$Headers = @{}
  )

  $params = @{
    Method = $Method
    Uri = $Uri
    Headers = $Headers
  }

  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = ($Body | ConvertTo-Json -Depth 8)
  }

  Invoke-RestMethod @params
}

Write-Host "1. Login medico"
$doctorLogin = Invoke-Json -Method Post -Uri "$baseUrl/api/auth/login" -Body @{
  email = "ana.doctor@demo.com"
  password = "Demo123!"
}
$doctorHeaders = @{ Authorization = "Bearer $($doctorLogin.token)" }

Write-Host "2. Login paciente"
$patientLogin = Invoke-Json -Method Post -Uri "$baseUrl/api/auth/login" -Body @{
  email = "luis.paciente@demo.com"
  password = "Demo123!"
}
$patientHeaders = @{ Authorization = "Bearer $($patientLogin.token)" }

Write-Host "3. Listar medicos"
$doctors = Invoke-Json -Method Get -Uri "$baseUrl/api/agenda/doctors"
$doctor = $doctors.doctors[0]
if ($null -eq $doctor) {
  throw "No hay medicos registrados"
}

Write-Host "4. Crear disponibilidad"
$startsAt = (Get-Date).AddDays(2).ToUniversalTime().ToString("o")
$endsAt = (Get-Date).AddDays(2).AddMinutes(30).ToUniversalTime().ToString("o")
$slot = Invoke-Json -Method Post -Uri "$baseUrl/api/agenda/availability" -Headers $doctorHeaders -Body @{
  startsAt = $startsAt
  endsAt = $endsAt
}

Write-Host "5. Agendar cita"
$appointment = Invoke-Json -Method Post -Uri "$baseUrl/api/agenda/appointments" -Headers $patientHeaders -Body @{
  doctorId = $doctor.id
  slotId = $slot.slot.id
  reason = "Prueba automatizada de reserva"
}

Write-Host "6. Verificar notificacion"
$notifications = Invoke-Json -Method Get -Uri "$baseUrl/api/notifications/me" -Headers $patientHeaders
if ($notifications.notifications.Count -lt 1) {
  throw "No se genero notificacion para el paciente"
}

Write-Host "7. Registrar resultado medico"
$record = Invoke-Json -Method Post -Uri "$baseUrl/api/records/results" -Headers $doctorHeaders -Body @{
  appointmentId = $appointment.appointment.id
  patientId = $appointment.appointment.patient_id
  summary = "Paciente evaluado correctamente en prueba automatizada."
  prescription = "Reposo e hidratacion."
}

Write-Host "8. Verificar resultado desde paciente"
$results = Invoke-Json -Method Get -Uri "$baseUrl/api/records/me" -Headers $patientHeaders
if ($results.results.Count -lt 1) {
  throw "El paciente no puede ver resultados medicos"
}

Write-Host ""
Write-Host "Smoke test exitoso"
Write-Host "Cita: $($appointment.appointment.id)"
Write-Host "Resultado: $($record.result.id)"
