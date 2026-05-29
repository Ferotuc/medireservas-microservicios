# Guion de exposición - MediReservas

## 1. Presentación del proyecto

Buenos días. Nuestro proyecto se llama MediReservas. Es una plataforma de reservas para consultas médicas desarrollada con arquitectura de microservicios.

El sistema permite que los pacientes puedan agendar, modificar o cancelar citas, mientras que los médicos pueden administrar su disponibilidad, consultar su agenda, gestionar pacientes y registrar resultados de consulta.

## 2. Problema que resolvemos

El problema principal es que muchas clínicas pequeñas coordinan citas por teléfono o mensajes. Esto puede provocar horarios duplicados, pérdida de información, poca trazabilidad y dificultad para saber qué médico está disponible.

MediReservas centraliza ese proceso y lo organiza por roles: paciente y médico.

## 3. Alcance del MVP

El MVP incluye las funciones principales que demuestran el ciclo básico de una cita médica:

- registro e inicio de sesión;
- consulta de médicos disponibles;
- publicación de disponibilidad;
- agendamiento, modificación, reprogramación y cancelación de citas;
- notificaciones internas;
- gestión de pacientes;
- registro y consulta de resultados médicos.

No incluimos pagos, videollamadas ni integraciones externas porque el objetivo del proyecto era demostrar arquitectura, separación de responsabilidades y una solución ejecutable.

## 4. Por qué usamos microservicios

Elegimos microservicios porque el dominio se puede dividir claramente:

- Auth Service maneja usuarios, roles y tokens.
- Agenda Service maneja médicos, disponibilidad y citas.
- Notifications Service maneja mensajes internos.
- Records Service maneja resultados médicos.
- NGINX funciona como API Gateway.

Esta estructura permite que cada servicio tenga una responsabilidad específica y que el sistema no dependa de un único bloque monolítico.

## 5. Cómo funciona el sistema

Cuando un paciente agenda una cita, el navegador envía la solicitud al API Gateway. El gateway la redirige al Agenda Service.

Agenda valida el usuario contra Auth Service, revisa que el horario esté disponible, reserva el horario en PostgreSQL y luego solicita a Notifications Service que genere una notificación.

Así se demuestra comunicación entre servicios y persistencia de datos.

## 6. Decisiones técnicas importantes

Usamos NGINX como gateway porque permite tener un punto de entrada unificado.

Usamos HTTP entre servicios porque para el MVP es simple, claro y fácil de probar.

Usamos PostgreSQL porque la agenda necesita consistencia y transacciones para evitar doble reserva de horarios.

Usamos Docker Compose porque permite levantar todos los servicios localmente de forma reproducible.

Como trade-off, usamos una sola instancia de PostgreSQL con tablas por dominio. Para producción se podría separar la base de datos por servicio, pero para el MVP era más práctico y suficiente.

## 7. Demo sugerida

Para demostrar el sistema:

1. Abrir el portal del paciente: `http://localhost:8081`.
2. Abrir el portal del médico: `http://localhost:8082`.
3. Iniciar sesión con el médico: `ana.doctor@demo.com / Demo123!`.
4. Publicar un horario disponible.
5. Iniciar sesión con el paciente: `luis.paciente@demo.com / Demo123!`.
6. Ver el médico disponible y agendar una cita.
7. Mostrar que aparece la cita en el portal del paciente.
8. Mostrar que el médico puede ver su agenda.
9. Registrar un resultado médico.
10. Mostrar notificación o resultado desde el paciente.

También se puede mencionar que existe una prueba automática con:

```powershell
.\scripts\smoke-test.ps1
```

## 8. Partes más relevantes

Las partes más importantes del proyecto son:

- la separación por dominios;
- el API Gateway;
- el flujo de agendamiento;
- la comunicación entre servicios;
- el despliegue con Docker Compose;
- el autorun para ejecutar el sistema en otra computadora;
- la documentación técnica con diagramas, API, modelo de datos y evidencia visual.

## 9. Cierre

Como conclusión, MediReservas demuestra cómo un problema cotidiano puede resolverse con una arquitectura modular, ejecutable y justificable.

No solo se hizo que el sistema funcionara, sino que se analizó el dominio, se definieron responsabilidades, se diseñaron contratos de API y se construyó una solución coherente con microservicios.
