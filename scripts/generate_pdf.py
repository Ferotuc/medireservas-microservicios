from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Flowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "MediReservas-Informe-Tecnico.pdf"


class BoxDiagram(Flowable):
    def __init__(self, title, boxes, links):
        super().__init__()
        self.title = title
        self.boxes = boxes
        self.links = links
        self.width = 7.0 * inch
        self.height = 3.9 * inch

    def draw(self):
        canvas = self.canv
        canvas.setFont("Helvetica-Bold", 12)
        canvas.setFillColor(colors.HexColor("#17212b"))
        canvas.drawString(0, self.height - 14, self.title)

        for src, dst in self.links:
            sx, sy, sw, sh, _ = self.boxes[src]
            dx, dy, dw, dh, _ = self.boxes[dst]
            canvas.setStrokeColor(colors.HexColor("#758290"))
            canvas.line(sx + sw / 2, sy + sh / 2, dx + dw / 2, dy + dh / 2)

        for key, (x, y, w, h, label) in self.boxes.items():
            fill = colors.HexColor("#e8f4f5") if key != "db" else colors.HexColor("#fff1e8")
            canvas.setFillColor(fill)
            canvas.setStrokeColor(colors.HexColor("#0e7c86"))
            canvas.roundRect(x, y, w, h, 7, fill=1, stroke=1)
            canvas.setFillColor(colors.HexColor("#17212b"))
            canvas.setFont("Helvetica-Bold", 8.5)
            for i, line in enumerate(label.split("\n")):
                canvas.drawCentredString(x + w / 2, y + h / 2 + 5 - (i * 10), line)


def styles():
    base = getSampleStyleSheet()
    base["Title"].alignment = TA_CENTER
    base["Title"].fontSize = 25
    base["Title"].leading = 30
    base["Heading1"].fontSize = 16
    base["Heading1"].leading = 20
    base["Heading2"].fontSize = 12
    base["Heading2"].leading = 15
    base.add(ParagraphStyle(name="CoverSub", parent=base["Normal"], alignment=TA_CENTER, fontSize=12, leading=17))
    base.add(ParagraphStyle(name="Body", parent=base["Normal"], fontSize=9.5, leading=13))
    return base


def p(text, style):
    return Paragraph(text, style)


def bullets(items, style):
    content = []
    for item in items:
        content.append(p(f"- {item}", style))
    return content


def table(data, widths=None):
    t = Table(data, colWidths=widths, hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0e7c86")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d7dee8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafb")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return t


def build():
    st = styles()
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=letter,
        rightMargin=0.7 * inch,
        leftMargin=0.7 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
        title="MediReservas - Informe Tecnico",
    )

    story = [
        Spacer(1, 1.6 * inch),
        p("MediReservas", st["Title"]),
        Spacer(1, 0.2 * inch),
        p("Plataforma de Reservas para Consultas Medicas", st["CoverSub"]),
        p("Arquitectura de Microservicios", st["CoverSub"]),
        Spacer(1, 0.55 * inch),
        table(
            [
                ["Elemento", "Detalle"],
                ["Version", "MVP 1.0"],
                ["Stack", "Node.js, Express, PostgreSQL, NGINX, Docker Compose"],
                ["Servicios", "Auth, Agenda, Notifications, Records, API Gateway"],
                ["Ejecucion", "docker compose up --build"],
            ],
            [1.5 * inch, 4.7 * inch],
        ),
        PageBreak(),
        p("Descripcion del problema", st["Heading1"]),
        p(
            "Las clinicas pequenas suelen coordinar citas por telefono o mensajeria, lo que provoca doble reserva "
            "de horarios, baja trazabilidad, dificultad para administrar disponibilidad medica y poca visibilidad "
            "para el paciente. MediReservas centraliza el proceso sin convertir todo el sistema en un monolito.",
            st["Body"],
        ),
        Spacer(1, 0.12 * inch),
        p("Alcance del MVP", st["Heading1"]),
        p(
            "El MVP permite registrar usuarios, iniciar sesion, listar medicos, publicar disponibilidad, agendar "
            "citas, cancelar citas, emitir notificaciones internas y registrar resultados basicos de consulta. "
            "No incluye pagos, videollamadas, recetas certificadas ni integraciones hospitalarias externas.",
            st["Body"],
        ),
        Spacer(1, 0.12 * inch),
        p("Requerimientos funcionales", st["Heading1"]),
        *bullets(
            [
                "Registro e inicio de sesion de usuarios.",
                "Roles de paciente, medico y administrador.",
                "Registro o actualizacion de perfil profesional del medico.",
                "Publicacion de bloques de disponibilidad.",
                "Consulta de agenda y pacientes desde portal medico.",
                "Registro de pacientes desde portal medico.",
                "Consulta de medicos disponibles, contador de horarios y proximo horario.",
                "Agendamiento, modificacion, reprogramacion y cancelacion de citas.",
                "Generacion de notificaciones internas.",
                "Registro de resultados medicos por el medico.",
                "Consulta de resultados medicos por el paciente.",
            ],
            st["Body"],
        ),
        Spacer(1, 0.12 * inch),
        p("Requerimientos no funcionales", st["Heading1"]),
        *bullets(
            [
                "Modularidad por dominio y contratos HTTP.",
                "Ejecucion local con Docker Compose.",
                "Seguridad mediante token firmado.",
                "Trazabilidad con estados y fechas de creacion.",
                "Consistencia de agenda mediante transaccion SQL y bloqueo de horario.",
                "Mantenibilidad por separacion de responsabilidades.",
            ],
            st["Body"],
        ),
        PageBreak(),
        p("Arquitectura y diagramas", st["Heading1"]),
        p(
            "NGINX funciona como API Gateway y punto de entrada unico. Los servicios internos exponen APIs HTTP. "
            "Agenda valida tokens contra Auth y emite un evento HTTP interno hacia Notifications cuando una cita "
            "se agenda o cancela.",
            st["Body"],
        ),
        Spacer(1, 0.16 * inch),
        BoxDiagram(
            "Diagrama de arquitectura general",
            {
                "client": (10, 190, 85, 34, "Paciente /\nMedico"),
                "gateway": (135, 190, 95, 34, "API Gateway\nNGINX"),
                "auth": (285, 250, 95, 34, "Auth\nService"),
                "agenda": (285, 190, 95, 34, "Agenda\nService"),
                "notifications": (285, 130, 105, 34, "Notifications\nService"),
                "records": (285, 70, 95, 34, "Records\nService"),
                "db": (435, 160, 95, 44, "PostgreSQL\nMVP"),
            },
            [
                ("client", "gateway"),
                ("gateway", "auth"),
                ("gateway", "agenda"),
                ("gateway", "notifications"),
                ("gateway", "records"),
                ("auth", "db"),
                ("agenda", "db"),
                ("notifications", "db"),
                ("records", "db"),
                ("agenda", "notifications"),
            ],
        ),
        Spacer(1, 0.18 * inch),
        table(
            [
                ["Actor", "Casos de uso"],
                ["Paciente", "Registrarse, iniciar sesion, consultar medicos, agendar cita, cancelar cita, ver notificaciones, consultar resultados."],
                ["Medico", "Iniciar sesion, registrar perfil, publicar disponibilidad, consultar agenda, registrar resultados."],
                ["Administrador", "Gestionar datos base y apoyar tareas operativas del MVP."],
            ],
            [1.2 * inch, 5.2 * inch],
        ),
        Spacer(1, 0.18 * inch),
        table(
            [
                ["Secuencia para agendar cita", "Interaccion"],
                ["1", "Paciente envia POST /api/agenda/appointments al API Gateway."],
                ["2", "Agenda Service valida el token con Auth Service."],
                ["3", "Agenda Service bloquea el horario disponible y crea la cita en PostgreSQL."],
                ["4", "Agenda Service marca el horario como booked."],
                ["5", "Agenda Service solicita a Notifications Service crear una notificacion interna."],
                ["6", "El paciente recibe confirmacion de cita creada."],
            ],
            [1.8 * inch, 4.7 * inch],
        ),
        PageBreak(),
        p("Stack tecnologico", st["Heading1"]),
        table(
            [
                ["Capa", "Tecnologia", "Justificacion"],
                ["Gateway", "NGINX", "Entrada unificada, reverse proxy y ocultamiento de servicios internos."],
                ["Servicios", "Node.js + Express", "Ligero, rapido para APIs REST y conocido para microservicios."],
                ["Persistencia", "PostgreSQL 16", "Transacciones ACID para evitar doble reserva."],
                ["Frontend", "HTML/CSS/JS", "Interfaz simple para demostrar el flujo del MVP."],
                ["Infraestructura", "Docker Compose", "Ejecucion local reproducible multi-contenedor."],
            ],
            [1.2 * inch, 1.5 * inch, 3.8 * inch],
        ),
        Spacer(1, 0.16 * inch),
        p("Modelo de datos", st["Heading1"]),
        table(
            [
                ["Entidad", "Responsabilidad"],
                ["auth_users", "Usuarios, credenciales y roles."],
                ["agenda_doctors", "Perfil profesional del medico."],
                ["agenda_availability_slots", "Bloques de disponibilidad."],
                ["agenda_appointments", "Citas entre paciente y medico."],
                ["notification_messages", "Notificaciones internas."],
                ["record_results", "Resultados o notas de consulta."],
            ],
            [2.1 * inch, 4.3 * inch],
        ),
        Spacer(1, 0.16 * inch),
        p("Contratos de API", st["Heading1"]),
        p("El contrato OpenAPI completo esta en docs/openapi.yml.", st["Body"]),
        Spacer(1, 0.1 * inch),
        table(
            [
                ["Dominio", "Endpoints principales"],
                ["Auth", "POST /api/auth/register, POST /api/auth/login, GET /api/auth/me"],
                ["Agenda", "GET /api/agenda/doctors, POST /api/agenda/availability, POST /api/agenda/appointments"],
                ["Notifications", "GET /api/notifications/me, PATCH /api/notifications/{id}/read"],
                ["Records", "POST /api/records/results, GET /api/records/me"],
            ],
            [1.3 * inch, 5.2 * inch],
        ),
        PageBreak(),
        p("Decisiones tecnicas y trade-offs", st["Heading1"]),
        *bullets(
            [
                "Se usa NGINX como gateway para mantener un punto de entrada claro y desacoplar clientes de servicios internos.",
                "La comunicacion entre servicios es HTTP sincrona por simplicidad del MVP; en produccion podria usarse RabbitMQ o Kafka para eventos.",
                "Se usa una sola instancia PostgreSQL local con tablas por dominio para simplificar la demostracion; en produccion cada servicio tendria almacenamiento aislado.",
                "Auth Service centraliza validacion de tokens para no duplicar logica de seguridad.",
                "Agenda Service usa transacciones y bloqueo de fila para evitar doble reserva del mismo horario.",
            ],
            st["Body"],
        ),
        Spacer(1, 0.16 * inch),
        p("Evidencia del sistema", st["Heading1"]),
        *bullets(
            [
                "Portal paciente disponible en http://localhost:8081.",
                "Portal medico disponible en http://localhost:8082.",
                "Login probado con luis.paciente@demo.com y ana.doctor@demo.com.",
                "Prueba realizada: medico configura perfil, publica disponibilidad, paciente agenda cita y se genera notificacion.",
                "Prueba adicional: medico lista y registra pacientes.",
                "Prueba adicional: paciente modifica y reprograma cita.",
                "Prueba adicional: medico registra resultado y paciente consulta historial.",
                "Smoke test automatizado disponible en scripts/smoke-test.ps1.",
                "Contenedores verificados: postgres, auth, agenda, notifications, records y gateway.",
            ],
            st["Body"],
        ),
        Spacer(1, 0.16 * inch),
        p("Instrucciones de ejecucion", st["Heading1"]),
        table(
            [
                ["Paso", "Comando o accion"],
                ["1", "cd \"fernando proyecto analisis\""],
                ["2", "cp .env.example .env"],
                ["3", "docker compose up --build"],
                ["4", "Abrir portal paciente en http://localhost:8081 o portal medico en http://localhost:8082"],
            ],
            [0.8 * inch, 5.5 * inch],
        ),
        Spacer(1, 0.16 * inch),
        p("Conclusiones", st["Heading1"]),
        p(
            "MediReservas evidencia separacion de responsabilidades, contratos de API, comunicacion entre servicios, "
            "despliegue local con contenedores y una solucion ejecutable coherente con microservicios.",
            st["Body"],
        ),
    ]

    doc.build(story)


if __name__ == "__main__":
    build()
    print(OUTPUT)
