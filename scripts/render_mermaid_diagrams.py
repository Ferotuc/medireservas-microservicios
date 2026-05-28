from pathlib import Path
import textwrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "diagrams"


def font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


TITLE = font(34, True)
H = font(22, True)
BODY = font(18)
SMALL = font(15)

INK = "#16202A"
MUTED = "#596B7A"
BLUE = "#0E7C86"
BLUE_DARK = "#075D66"
ORANGE = "#D5523F"
FILL = "#F8FBFC"
FILL_ALT = "#E8F4F5"
LINE = "#B9C7D4"


def wrap(text, width):
    lines = []
    for part in text.split("\n"):
        lines.extend(textwrap.wrap(part, width=width) or [""])
    return lines


def box(draw, xy, text, fill=FILL, outline=BLUE, title=False):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=16, fill=fill, outline=outline, width=3)
    f = H if title else BODY
    lines = wrap(text, 18)
    total_h = len(lines) * (f.size + 3)
    y = y1 + ((y2 - y1) - total_h) / 2
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=f)
        draw.text((x1 + (x2 - x1 - (bbox[2] - bbox[0])) / 2, y), line, font=f, fill=INK)
        y += f.size + 5


def arrow(draw, start, end, color=BLUE_DARK, width=4):
    draw.line([start, end], fill=color, width=width)
    sx, sy = start
    ex, ey = end
    if abs(ex - sx) >= abs(ey - sy):
        direction = 1 if ex > sx else -1
        points = [(ex, ey), (ex - 14 * direction, ey - 8), (ex - 14 * direction, ey + 8)]
    else:
        direction = 1 if ey > sy else -1
        points = [(ex, ey), (ex - 8, ey - 14 * direction), (ex + 8, ey - 14 * direction)]
    draw.polygon(points, fill=color)


def title(draw, text):
    draw.text((50, 35), text, font=TITLE, fill=INK)
    draw.line((50, 85, 1150, 85), fill=LINE, width=2)


def architecture():
    img = Image.new("RGB", (1200, 720), "white")
    d = ImageDraw.Draw(img)
    title(d, "Diagrama Mermaid: arquitectura general")

    boxes = {
        "client": (55, 315, 215, 415, "Paciente /\nMedico"),
        "gateway": (300, 300, 490, 430, "API Gateway\nNGINX"),
        "frontend": (610, 110, 800, 200, "Frontend\nestatico"),
        "auth": (610, 230, 800, 320, "Auth\nService"),
        "agenda": (610, 350, 800, 440, "Agenda\nService"),
        "notifications": (610, 470, 800, 560, "Notifications\nService"),
        "records": (610, 590, 800, 680, "Records\nService"),
        "db": (920, 250, 1105, 650, "PostgreSQL\nTablas por\ndominio"),
    }
    for key, (x1, y1, x2, y2, label) in boxes.items():
        box(d, (x1, y1, x2, y2), label, fill="#FFF4ED" if key == "db" else FILL_ALT)

    d.text((75, 250), "Clientes", font=H, fill=MUTED)
    d.text((322, 250), "Entrada unificada", font=H, fill=MUTED)
    d.text((625, 75), "Aplicacion y servicios", font=H, fill=MUTED)
    d.text((942, 215), "Persistencia", font=H, fill=MUTED)

    arrow(d, (215, 365), (300, 365))
    arrow(d, (490, 365), (610, 155))
    arrow(d, (490, 365), (610, 275))
    arrow(d, (490, 365), (610, 395))
    arrow(d, (490, 365), (610, 515))
    arrow(d, (490, 365), (610, 635))
    arrow(d, (800, 275), (920, 275))
    arrow(d, (800, 395), (920, 395))
    arrow(d, (800, 515), (920, 515))
    arrow(d, (800, 635), (920, 635))
    arrow(d, (705, 440), (705, 470), color=ORANGE, width=3)
    d.text((720, 445), "notifica cita", font=SMALL, fill=MUTED)
    img.save(OUT / "arquitectura-general.png")


def use_cases():
    img = Image.new("RGB", (1200, 820), "white")
    d = ImageDraw.Draw(img)
    title(d, "Diagrama Mermaid: casos de uso")

    box(d, (60, 210, 230, 290), "Paciente", fill="#FFF4ED", outline=ORANGE, title=True)
    box(d, (60, 560, 230, 640), "Medico", fill="#FFF4ED", outline=ORANGE, title=True)

    patient_cases = [
        ("Registrarse /\niniciar sesion", 360, 125),
        ("Consultar\nmedicos", 640, 125),
        ("Agendar\ncita", 920, 125),
        ("Modificar /\nreprogramar", 360, 315),
        ("Cancelar\ncita", 640, 315),
        ("Ver resultados /\nnotificaciones", 920, 315),
    ]
    doctor_cases = [
        ("Registrar perfil\nmedico", 360, 505),
        ("Publicar\ndisponibilidad", 640, 505),
        ("Consultar\nagenda", 920, 505),
        ("Gestionar\npacientes", 500, 680),
        ("Registrar\nresultado", 780, 680),
    ]
    for text, x, y in patient_cases + doctor_cases:
        box(d, (x, y, x + 210, y + 90), text, fill=FILL_ALT)

    d.text((260, 220), "puede realizar", font=SMALL, fill=MUTED)
    arrow(d, (230, 250), (340, 250), color=ORANGE, width=3)
    d.rounded_rectangle((330, 105, 1145, 430), radius=18, outline="#F2B5AA", width=2)

    d.text((260, 570), "puede realizar", font=SMALL, fill=MUTED)
    arrow(d, (230, 600), (340, 600), color=ORANGE, width=3)
    d.rounded_rectangle((330, 485, 1145, 785), radius=18, outline="#F2B5AA", width=2)
    img.save(OUT / "casos-uso.png")


def sequence():
    img = Image.new("RGB", (1300, 900), "white")
    d = ImageDraw.Draw(img)
    title(d, "Diagrama Mermaid: secuencia para agendar cita")

    actors = [
        ("Paciente", 90),
        ("API Gateway", 300),
        ("Agenda Service", 540),
        ("Auth Service", 780),
        ("PostgreSQL", 1000),
        ("Notifications", 1190),
    ]
    for label, x in actors:
        box(d, (x - 80, 130, x + 80, 195), label, fill=FILL_ALT)
        d.line((x, 195, x, 830), fill=LINE, width=2)

    steps = [
        (90, 300, "POST /api/agenda/appointments"),
        (300, 540, "Reenvia solicitud"),
        (540, 780, "GET /internal/verify"),
        (780, 540, "Usuario valido"),
        (540, 1000, "Bloquea slot disponible"),
        (540, 1000, "Crea cita y marca booked"),
        (540, 1190, "POST /internal/notifications"),
        (1190, 1000, "Guarda notificacion"),
        (540, 300, "201 cita creada"),
        (300, 90, "Confirmacion"),
    ]
    y = 245
    for sx, ex, label in steps:
        arrow(d, (sx, y), (ex, y), color=BLUE_DARK if sx < ex else ORANGE, width=3)
        tx = min(sx, ex) + abs(ex - sx) / 2 - 95
        d.rectangle((tx - 4, y - 28, tx + 220, y - 4), fill="white")
        d.text((tx, y - 27), label, font=SMALL, fill=INK)
        y += 60
    img.save(OUT / "secuencia-agendar-cita.png")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    architecture()
    use_cases()
    sequence()
    print("Diagramas generados en", OUT)
