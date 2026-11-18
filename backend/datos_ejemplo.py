"""Datos de ejemplo del tablero "Analíticas de juego · ENES Juriquilla".

Son los mismos valores del diseño original. Cuando haya datos reales en data/,
sustituye estas funciones por cálculos con pandas y conserva la forma del JSON.
"""

PARTIDOS = [
    {"id": "j6", "jornada": 6, "rival": "Rival 6", "rivalCorto": "RIVAL 6", "local": None, "visita": None, "estado": "PRÓXIMO", "reloj": "25 nov · 18:00"},
    {"id": "j5", "jornada": 5, "rival": "Visitante", "rivalCorto": "VISITA", "local": 24, "visita": 17, "estado": "EN VIVO", "reloj": "4º · 02:31"},
    {"id": "j4", "jornada": 4, "rival": "Rival 4", "rivalCorto": "RIVAL 4", "local": 31, "visita": 14, "estado": "FINAL", "reloj": "11 nov"},
    {"id": "j3", "jornada": 3, "rival": "Rival 3", "rivalCorto": "RIVAL 3", "local": 17, "visita": 20, "estado": "FINAL", "reloj": "4 nov"},
]

EQUIPOS = {
    "local": {
        "nombre": "ENES Juriquilla", "rol": "Local", "unidad": "Ofensiva",
        "yardasPase": 241, "yardasCarrera": 143,
        "terceraConvertidas": 6, "terceraIntentos": 11,
        "yardasPorCuarto": [96, 74, 111, 103],
        "perdidas": 1, "castigos": 4,
    },
    "visita": {
        "nombre": "Visitante", "rol": "Visita", "unidad": "Defensiva",
        "yardasPase": 198, "yardasCarrera": 114,
        "terceraConvertidas": 4, "terceraIntentos": 12,
        "yardasPorCuarto": [70, 120, 50, 72],
        "perdidas": 2, "castigos": 7,
    },
}

POSICIONES = {
    "OL": "Liniero ofensivo", "C": "Centro", "QB": "Quarterback", "RB": "Corredor",
    "TE": "Ala cerrada", "WR": "Receptor", "DL": "Liniero defensivo", "LB": "Linebacker",
    "CB": "Esquinero", "S": "Safety",
}

# (equipo, posición, número, x, y) en coordenadas de la cancha (1200 x 533).
FORMACION = [
    ("local", "OL", 74, 720, 178), ("local", "OL", 66, 720, 222), ("local", "C", 55, 720, 266),
    ("local", "OL", 62, 720, 310), ("local", "OL", 71, 720, 354), ("local", "QB", 12, 665, 266),
    ("local", "RB", 28, 600, 266), ("local", "TE", 88, 720, 405), ("local", "WR", 11, 720, 58),
    ("local", "WR", 81, 720, 478), ("local", "WR", 17, 680, 112),
    ("visita", "DL", 90, 808, 200), ("visita", "DL", 97, 808, 244), ("visita", "DL", 93, 808, 288),
    ("visita", "DL", 99, 808, 332), ("visita", "LB", 52, 880, 170), ("visita", "LB", 54, 880, 266),
    ("visita", "LB", 45, 880, 362), ("visita", "CB", 24, 808, 58), ("visita", "CB", 21, 808, 478),
    ("visita", "S", 31, 975, 190), ("visita", "S", 33, 975, 342),
]


def _estadisticas(pos: str, n: int) -> list[dict]:
    def r(k: int, m: int) -> int:
        return (n * k) % m + 1

    if pos == "QB":
        pares = [("Yds pase", 241), ("Completos", "18/27"), ("TD", 2)]
    elif pos == "RB":
        pares = [("Yds carrera", 96), ("Acarreos", 18), ("TD", 1)]
    elif pos in ("WR", "TE"):
        pares = [("Recepciones", r(3, 7)), ("Yardas", r(13, 80)), ("TD", r(5, 2) - 1)]
    elif pos in ("OL", "C"):
        pares = [("Bloqueos", r(7, 20) + 10), ("Snaps", 60 + r(3, 8)), ("Castigos", r(11, 2) - 1)]
    elif pos in ("DL", "LB"):
        pares = [("Tackles", r(7, 9)), ("Sacks", r(3, 2) - 1), ("Presiones", r(5, 5))]
    else:
        pares = [("Tackles", r(7, 6)), ("Pases def.", r(3, 3)), ("INT", r(5, 2) - 1)]
    return [{"etiqueta": e, "valor": v} for e, v in pares]


def jugadores() -> list[dict]:
    return [
        {
            "id": f"{equipo}-{num}",
            "equipo": equipo,
            "numero": num,
            "nombre": f"Jugador #{num}",
            "pos": pos,
            "posicion": POSICIONES[pos],
            "x": x,
            "y": y,
            "rendimiento": 60 + (num * 13) % 35,
            "estadisticas": _estadisticas(pos, num),
        }
        for equipo, pos, num, x, y in FORMACION
    ]


GENERALES = {
    "kpis": [
        {"etiqueta": "Jugadas", "local": 68, "visita": 59},
        {"etiqueta": "Yds / jugada", "local": 5.6, "visita": 5.3},
        {"etiqueta": "Sacks", "local": 3, "visita": 1},
        {"etiqueta": "Intercepciones", "local": 1, "visita": 1},
    ],
    "puntosPorCuarto": [
        {"cuarto": "Q1", "local": 7, "visita": 0},
        {"cuarto": "Q2", "local": 3, "visita": 10},
        {"cuarto": "Q3", "local": 7, "visita": 0},
        {"cuarto": "Q4", "local": 7, "visita": 7},
    ],
    # Minuto de juego (0-60) y probabilidad de victoria de ENES en %.
    "probabilidadVictoria": [
        {"minuto": 0, "prob": 50}, {"minuto": 8, "prob": 62}, {"minuto": 15, "prob": 58},
        {"minuto": 20, "prob": 45}, {"minuto": 26, "prob": 35}, {"minuto": 30, "prob": 40},
        {"minuto": 36, "prob": 55}, {"minuto": 42, "prob": 64}, {"minuto": 48, "prob": 60},
        {"minuto": 53, "prob": 72}, {"minuto": 57, "prob": 80}, {"minuto": 60, "prob": 92},
    ],
    # valor* son numéricos para dibujar las barras; texto* es lo que se muestra.
    "comparativa": [
        {"etiqueta": "Primeros downs", "local": 21, "visita": 17, "textoLocal": "21", "textoVisita": "17"},
        {"etiqueta": "Posesión", "local": 1930, "visita": 1670, "textoLocal": "32:10", "textoVisita": "27:50"},
        {"etiqueta": "Zona roja", "local": 75, "visita": 50, "textoLocal": "75%", "textoVisita": "50%"},
        {"etiqueta": "Pérdidas", "local": 1, "visita": 2, "textoLocal": "1", "textoVisita": "2"},
        {"etiqueta": "Castigos", "local": 4, "visita": 7, "textoLocal": "4", "textoVisita": "7"},
    ],
    # % de pases completos por profundidad (filas) y dirección (izq., centro, der.).
    "mapaPases": [
        {"profundidad": "Prof.", "valores": [33, 50, 40]},
        {"profundidad": "Medio", "valores": [62, 71, 58]},
        {"profundidad": "Corto", "valores": [78, 85, 74]},
    ],
}


def tablero() -> dict:
    return {
        "partidos": PARTIDOS,
        "partidoActual": "j5",
        "equipos": EQUIPOS,
        "jugadores": jugadores(),
        "generales": GENERALES,
        "fuente": "Datos de ejemplo",
    }
