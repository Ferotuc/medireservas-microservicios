# MediReservas

Plataforma de reservas para consultas medicas implementada con arquitectura de microservicios. El sistema permite registrar pacientes y medicos, publicar disponibilidad, agendar/cancelar citas, emitir notificaciones internas y consultar resultados medicos.

## Arquitectura

- API Gateway: NGINX en `http://localhost:8081` y `http://localhost:8082`.
- Auth Service: usuarios, roles y tokens.
- Agenda Service: perfiles medicos, disponibilidad y citas.
- Notifications Service: mensajes internos generados por eventos de agenda.
- Records Service: resultados o historial basico de consulta.
- PostgreSQL: persistencia local del MVP.
- Frontend: HTML, CSS y JavaScript servido desde el gateway.

## Ejecucion local

### Opcion rapida en Windows

1. Instala y abre Docker Desktop.
2. Descarga o clona este repositorio.
3. Ejecuta doble clic sobre `autorun.bat`.

El autorun crea `.env` si no existe, construye los contenedores, levanta la aplicacion y abre los portales:

- Paciente: `http://localhost:8081`
- Medico: `http://localhost:8082`

### Opcion manual

```bash
cp .env.example .env
docker compose up --build
```

Luego abre uno de los portales:

- Paciente: `http://localhost:8081`
- Medico: `http://localhost:8082`

Usuarios demo:

| Rol | Correo | Contrasena |
|---|---|---|
| Medico | `ana.doctor@demo.com` | `Demo123!` |
| Paciente | `luis.paciente@demo.com` | `Demo123!` |

## Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/users?role=patient`
- `POST /api/auth/users`
- `GET /api/agenda/doctors`
- `POST /api/agenda/doctors`
- `POST /api/agenda/availability`
- `GET /api/agenda/doctors/{doctorId}/availability`
- `POST /api/agenda/appointments`
- `GET /api/agenda/appointments/me`
- `PATCH /api/agenda/appointments/{id}`
- `DELETE /api/agenda/appointments/{id}`
- `GET /api/notifications/me`
- `POST /api/records/results`
- `GET /api/records/me`

La documentacion tecnica para el PDF esta en [`docs/informe-tecnico.md`](docs/informe-tecnico.md) y el contrato de API esta en [`docs/openapi.yml`](docs/openapi.yml).

## Pruebas

Con los contenedores levantados, ejecuta:

```powershell
.\scripts\smoke-test.ps1
```

La prueba valida registro/listado de pacientes, agendamiento, modificacion, reprogramacion, cancelacion logica por API, notificaciones y resultados medicos. La guia completa esta en [`docs/guia-pruebas.md`](docs/guia-pruebas.md).
