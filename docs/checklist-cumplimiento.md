# Checklist de cumplimiento del proyecto

## Criterio 1: No es solo maqueta o documentación

**Cumple.**

El proyecto incluye implementación funcional en código:

- `services/auth`: autenticación, usuarios, roles y validación de tokens.
- `services/agenda`: médicos, disponibilidad y citas.
- `services/notifications`: notificaciones internas.
- `services/records`: resultados médicos.
- `frontend`: portales web para paciente y médico.
- `infra/nginx`: API Gateway.
- `infra/postgres`: modelo de datos inicial.

## Criterio 2: Existe implementación funcional

**Cumple.**

La prueba automática `scripts/smoke-test.ps1` se ejecutó correctamente y validó:

- login de médico;
- login de paciente;
- listado de médicos;
- creación/listado de pacientes desde portal médico;
- creación de disponibilidad;
- agendamiento de cita;
- modificación de cita;
- reprogramación de cita;
- notificación interna;
- registro de resultado médico;
- consulta de resultado desde paciente.

Resultado observado:

```text
Smoke test exitoso
```

## Criterio 3: Refleja la arquitectura asignada

**Cumple.**

La arquitectura asignada es microservicios. El proyecto tiene separación por servicios:

- Auth Service: usuarios, roles y tokens.
- Agenda Service: disponibilidad y citas.
- Notifications Service: mensajes internos.
- Records Service: resultados médicos.
- API Gateway: NGINX como punto de entrada.
- PostgreSQL: persistencia local del MVP.

Los servicios se ejecutan en contenedores separados mediante `docker-compose.yml`.

## Criterio 4: Puede ejecutarse o demostrarse de forma confiable

**Cumple.**

El proyecto se ejecuta con:

```powershell
docker compose up --build
```

También existe un `autorun.bat` para Windows, pensado para facilitar la ejecución en otra computadora con Docker Desktop.

Los portales responden correctamente:

- Paciente: `http://localhost:8081`
- Médico: `http://localhost:8082`

Los contenedores verificados aparecen como `healthy`:

- postgres;
- auth-service;
- agenda-service;
- notifications-service;
- records-service;
- gateway.

## Criterio 5: Coherencia entre análisis, diseño e implementación

**Cumple.**

El problema definido es la gestión de citas médicas. El diseño separa el dominio en servicios coherentes y la implementación refleja esa división:

- los pacientes agendan, modifican y cancelan citas;
- los médicos administran disponibilidad y consultan agenda;
- las notificaciones se generan desde eventos de agenda;
- los resultados se manejan en un servicio separado;
- el gateway centraliza la entrada.

Además, el proyecto incluye documentación técnica, diagramas, contrato OpenAPI, modelo de datos, capturas del sistema, guion de exposición y presentación.

## Observación final

El proyecto cumple los criterios principales de evaluación porque combina análisis, diseño, arquitectura, implementación ejecutable, pruebas y evidencia documental.
