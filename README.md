# MediReservas

Plataforma de reservas para consultas medicas implementada con arquitectura de microservicios. El sistema permite registrar pacientes y medicos, publicar disponibilidad, agendar/cancelar citas, emitir notificaciones internas y consultar resultados medicos.

## Arquitectura

- API Gateway: NGINX en `http://localhost:8081`.
- Auth Service: usuarios, roles y tokens.
- Agenda Service: perfiles medicos, disponibilidad y citas.
- Notifications Service: mensajes internos generados por eventos de agenda.
- Records Service: resultados o historial basico de consulta.
- PostgreSQL: persistencia local del MVP.
- Frontend: HTML, CSS y JavaScript servido desde el gateway.

## Ejecucion local

```bash
cp .env.example .env
docker compose up --build
```

Luego abre `http://localhost:8081`.

Usuarios demo:

| Rol | Correo | Contrasena |
|---|---|---|
| Medico | `ana.doctor@demo.com` | `Demo123!` |
| Paciente | `luis.paciente@demo.com` | `Demo123!` |

## Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/agenda/doctors`
- `POST /api/agenda/doctors`
- `POST /api/agenda/availability`
- `GET /api/agenda/doctors/{doctorId}/availability`
- `POST /api/agenda/appointments`
- `GET /api/agenda/appointments/me`
- `DELETE /api/agenda/appointments/{id}`
- `GET /api/notifications/me`
- `POST /api/records/results`
- `GET /api/records/me`

La documentacion tecnica para el PDF esta en [`docs/informe-tecnico.md`](docs/informe-tecnico.md) y el contrato de API esta en [`docs/openapi.yml`](docs/openapi.yml).
