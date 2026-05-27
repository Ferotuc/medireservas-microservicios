# Guia de pruebas - MediReservas

Esta guia sirve para validar el MVP antes de la entrega y para mostrar evidencia durante la defensa.

## 1. Levantar servicios

```powershell
cd "C:\Users\USUARIO\Documents\fernando\fernando proyecto analisis"
docker compose up --build
```

Abrir:

```text
Portal paciente: http://localhost:8081
Portal medico: http://localhost:8082
```

## 2. Verificar contenedores

```powershell
docker compose ps
```

Resultado esperado:

- `med-analisis-postgres` en estado healthy.
- `med-analisis-auth-service` activo.
- `med-analisis-agenda-service` activo.
- `med-analisis-notifications-service` activo.
- `med-analisis-records-service` activo.
- `med-analisis-api-gateway` activo.

## 3. Flujo funcional desde la interfaz

### Medico

1. Iniciar sesion con `ana.doctor@demo.com` y `Demo123!`.
2. Si es un medico nuevo, completar y guardar la seccion Perfil medico.
3. Crear un horario en la seccion Disponibilidad.
4. Revisar la agenda en Mis citas cuando el paciente agende.
5. Ver pacientes registrados en la seccion Pacientes.
6. Agregar un nuevo paciente desde la seccion Pacientes.
7. Registrar un resultado medico en la seccion Resultados medicos.

### Paciente

1. Iniciar sesion con `luis.paciente@demo.com` y `Demo123!`.
2. Seleccionar un medico.
3. Ver horarios disponibles.
4. Agendar una cita con un motivo.
5. Revisar Mis citas.
6. Modificar el motivo de la cita.
7. Reprogramar la cita a otro horario disponible.
8. Cancelar una cita si se necesita.
9. Revisar Notificaciones.
10. Consultar Resultados medicos cuando el medico registre el resultado.

## 4. Smoke test automatizado

Con los contenedores levantados:

```powershell
.\scripts\smoke-test.ps1
```

El script valida:

- login de medico y paciente;
- creacion y listado de pacientes desde portal medico;
- listado de medicos;
- creacion de disponibilidad;
- agendamiento de cita;
- modificacion y reprogramacion de cita;
- creacion de notificacion;
- registro de resultado medico;
- consulta de resultados por paciente.

## 5. Capturas recomendadas para el PDF o exposicion

1. Pantalla de login.
2. `docker compose ps`.
3. Medico creando disponibilidad.
4. Paciente agendando cita.
5. Notificacion generada.
6. Medico registrando resultado.
7. Paciente consultando resultado.
8. Repositorio publico en GitHub.
