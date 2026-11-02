"""Arbeitsmappe Strömungsgeschwindigkeit / Bewegungslehre, Aufgaben 4 bis 7.

Erzeugt excel/Stroemung_Bewegungslehre_Aufgaben_4-7.xlsx. Wie bei generate_excel.py stehen
in den Ergebniszellen Formeln, keine vorberechneten Werte: Excel und LibreOffice rechnen beim
Öffnen. Eingaben gelb, Ergebnisse grün.

    uv run --with openpyxl python3 excel/generate_stroemung_excel.py
"""
import os

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Stroemung_Bewegungslehre_Aufgaben_4-7.xlsx")

# Palette wie generate_excel.py
C_NAVY, C_BLUE, C_LIGHT_BLUE = "1E3A8A", "2563EB", "DBEAFE"
C_INPUT, C_OUTPUT, C_BORDER, C_TEXT, C_MUTED = "FEF9C3", "DCFCE7", "CBD5E1", "0F172A", "475569"

font_title = Font(name="Calibri", size=15, bold=True, color="FFFFFF")
font_section = Font(name="Calibri", size=12, bold=True, color="FFFFFF")
font_header = Font(name="Calibri", size=11, bold=True, color=C_TEXT)
font_bold = Font(name="Calibri", size=10, bold=True, color=C_TEXT)
font_regular = Font(name="Calibri", size=10, color=C_TEXT)
font_italic = Font(name="Calibri", size=9, italic=True, color=C_MUTED)
font_formula = Font(name="Consolas", size=9.5, color="1E40AF")


def solid(color):
    return PatternFill(start_color=color, end_color=color, fill_type="solid")


fill_navy, fill_blue, fill_light_blue = solid(C_NAVY), solid(C_BLUE), solid(C_LIGHT_BLUE)
fill_input, fill_output = solid(C_INPUT), solid(C_OUTPUT)

thin = Side(style="thin", color=C_BORDER)
border_all = Border(left=thin, right=thin, top=thin, bottom=thin)
border_input = Border(left=Side(style="medium", color="D97706"), right=Side(style="thin", color="D97706"),
                      top=Side(style="thin", color="D97706"), bottom=Side(style="thin", color="D97706"))
border_output = Border(left=Side(style="thin", color="16A34A"), right=Side(style="thin", color="16A34A"),
                       top=Side(style="thin", color="16A34A"), bottom=Side(style="double", color="16A34A"))

align_center = Alignment(horizontal="center", vertical="center")
align_left = Alignment(horizontal="left", vertical="center")
align_wrap = Alignment(horizontal="left", vertical="center", wrap_text=True)

wb = openpyxl.Workbook()
wb.remove(wb.active)


def title(ws, text, last_col):
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=last_col)
    c = ws.cell(row=1, column=1, value=text)
    c.font, c.fill, c.alignment = font_title, fill_navy, align_center
    ws.row_dimensions[1].height = 35
    # Druck: quer, auf Seitenbreite skaliert
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True


def header_row(ws, row, headers):
    ws.row_dimensions[row].height = 24
    for i, text in enumerate(headers, 1):
        c = ws.cell(row=row, column=i, value=text)
        c.font, c.fill, c.alignment, c.border = font_header, fill_light_blue, align_center, border_all


# -------------------------------------------------------------
# Blatt 1: Formeln
# -------------------------------------------------------------
ws1 = wb.create_sheet(title="Formeln")
title(ws1, "STRÖMUNGSGESCHWINDIGKEIT – Formeln und Einheiten", 4)
header_row(ws1, 3, ["Größe", "Formel", "Einheiten", "Hinweis"])
formeln = [
    ("Strömungsvolumen (Volumenstrom)", "Q = V̇ = V / t", "m³/s, l/min, m³/h", "Volumen, das je Zeiteinheit durch einen Querschnitt fließt"),
    ("Volumenstrom aus Fläche und Weg", "Q = A · s / t = A · v", "m² · m/s = m³/s", "s / t ist die Strömungsgeschwindigkeit"),
    ("Strömungsgeschwindigkeit", "v = Q / A = V̇ / A", "m/s", "Strömungsvolumen durch Querschnittsfläche"),
    ("Kreisquerschnitt", "A = π · d² / 4", "d in m → A in m²", "Bei Rohren zählt der Innendurchmesser (Nennweite NW)"),
    ("Kontinuität / Volumenkonstanz", "A₁ · v₁ = A₂ · v₂", "", "Gilt für Flüssigkeiten in Rohren und für Werkstoff beim Ziehen und Strangpressen"),
    ("Geschwindigkeit nach Querschnittsänderung", "v₂ = v₁ · (d₁ / d₂)²", "", "Halber Durchmesser → vierfache Geschwindigkeit"),
    ("Gleichförmige Bewegung", "s = v · t", "m, m/s, s", "Echo oder Radar: Hin- und Rückweg, Entfernung e = v · t / 2"),
    ("Umrechnungen", "1 m³ = 1000 l;  1 h = 3600 s;  1 min = 60 s", "", "1 cm² = 100 mm²;  1 m² = 10⁶ mm²;  1 µs = 10⁻⁶ s;  1 dm³ = 10⁶ mm³"),
]
for r, item in enumerate(formeln, 4):
    ws1.row_dimensions[r].height = 30
    for col, val in enumerate(item, 1):
        c = ws1.cell(row=r, column=col, value=val)
        c.font = font_formula if col == 2 else font_regular
        c.alignment, c.border = align_wrap, border_all
for col, width in zip("ABCD", (34, 40, 22, 62)):
    ws1.column_dimensions[col].width = width

# -------------------------------------------------------------
# Blatt 2: Aufgaben 4 bis 7
# -------------------------------------------------------------
ws = wb.create_sheet(title="Aufgaben 4-7")
title(ws, "BEWEGUNGSLEHRE – Aufgaben 4 bis 7 (Strömung, Radar, Strangpressen, Drahtziehen)", 6)

ws.cell(row=2, column=1, value="LEGENDE:").font = font_bold
ws.merge_cells("B2:D2")
for col, text, fill, border in ((2, "Eingabewert (veränderbar)", fill_input, border_input),
                                (5, "Berechnetes Ergebnis (Formel)", fill_output, border_output)):
    c = ws.cell(row=2, column=col, value=text)
    c.fill, c.font, c.border, c.alignment = fill, font_bold, border, align_center

header_row(ws, 4, ["Aufgabe / Größe", "Symbol", "Wert", "Einheit", "Rechenweg", "Erklärung"])
row = 5
ref = {}


def section(text):
    global row
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=6)
    c = ws.cell(row=row, column=1, value=text)
    c.font, c.fill, c.alignment = font_section, fill_blue, align_left
    ws.row_dimensions[row].height = 26
    row += 1


def note(text):
    global row
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=6)
    c = ws.cell(row=row, column=1, value=text)
    c.font, c.alignment = font_italic, align_wrap
    ws.row_dimensions[row].height = 30
    row += 1


def line(key, label, symbol, value, unit, way="", why="", fmt="0.000"):
    """value: Zahl = Eingabe; str mit '=' = Formel, {key} wird durch die Zelladresse ersetzt."""
    global row
    is_formula = isinstance(value, str) and value.startswith("=")
    if is_formula:
        value = value.format(**ref)
    cells = [label, symbol, value, unit, way, why]
    for col, val in enumerate(cells, 1):
        c = ws.cell(row=row, column=col, value=val)
        c.border = border_all
        c.alignment = align_wrap if col in (1, 5, 6) else align_center
        c.font = font_formula if col == 5 else font_regular
    v = ws.cell(row=row, column=3)
    v.number_format = fmt
    if is_formula:
        v.fill, v.border, v.font = fill_output, border_output, font_bold
    else:
        v.fill, v.border = fill_input, border_input
    ws.row_dimensions[row].height = 30
    ref[key] = f"C{row}"
    row += 1


section("Aufgabe 4 – Öl durch eine Rohrleitung NW 400, 480 000 l je Stunde. Strömungsgeschwindigkeit in m/s?")
line("a4_d", "Nennweite (Innendurchmesser)", "d", 400, "mm", fmt="0")
line("a4_V", "Volumen", "V", 480000, "l", fmt="#,##0")
line("a4_t", "Zeit", "t", 1, "h", fmt="0")
line("a4_Qlh", "Volumenstrom", "Q", "={a4_V}/{a4_t}", "l/h", "Q = V / t", fmt="#,##0")
line("a4_Q", "Volumenstrom in SI", "Q", "={a4_Qlh}/1000/3600", "m³/s", "l → m³: / 1000;  h → s: / 3600", fmt="0.0000")
line("a4_A", "Querschnittsfläche", "A", "=PI()*({a4_d}/1000)^2/4", "m²", "A = π · d² / 4, d in m", fmt="0.0000")
line("a4_v", "Strömungsgeschwindigkeit", "v", "={a4_Q}/{a4_A}", "m/s", "v = Q / A", "Ergebnis Aufgabe 4", fmt="0.00")
row += 1

section("Aufgabe 5 – Radarimpulse mit 300 000 km/s, Echo nach 200 µs. Entfernung des Ziels?")
line("a5_c", "Ausbreitungsgeschwindigkeit", "c", 300000, "km/s", fmt="#,##0")
line("a5_t", "Laufzeit hin und zurück", "t", 200, "µs", fmt="0")
line("a5_s", "Laufweg des Impulses", "s", "={a5_c}*1000*{a5_t}/1000000", "m", "s = c · t, c in m/s, t in s",
     "Der Impuls läuft zum Ziel und wieder zurück", fmt="#,##0")
line("a5_e", "Entfernung des Ziels", "e", "={a5_s}/2", "m", "e = s / 2", fmt="#,##0")
line("a5_ekm", "Entfernung in km", "e", "={a5_e}/1000", "km", "/ 1000", "Ergebnis Aufgabe 5", fmt="0.0")
row += 1

section("Aufgabe 6 – Strangpressen: 1,3 m/min, Profil 25 cm², Rohblock Ø 300 mm × 600 mm")
line("a6_v", "Strangpressgeschwindigkeit", "v_S", 1.3, "m/min", fmt="0.0")
line("a6_AP", "Profilquerschnitt", "A_P", 25, "cm²", fmt="0")
line("a6_D", "Rohblock-Durchmesser", "D", 300, "mm", fmt="0")
line("a6_L", "Rohblock-Länge", "L", 600, "mm", fmt="0")
line("a6_AB", "Querschnitt Rohblock", "A_B", "=PI()*{a6_D}^2/4", "mm²", "A_B = π · D² / 4", fmt="#,##0.0")
line("a6_V", "Volumen Rohblock", "V", "={a6_AB}*{a6_L}", "mm³", "V = A_B · L",
     "Das Volumen bleibt beim Pressen gleich", fmt="#,##0")
line("a6_Vdm", "Volumen in dm³", "V", "={a6_V}/1000000", "dm³", "1 dm³ = 10⁶ mm³", fmt="0.00")
line("a6_l", "a) Länge des Profilstranges", "l", "={a6_V}/({a6_AP}*100)/1000", "m",
     "l = V / A_P, A_P in mm² (· 100), Ergebnis mm → m", "Ergebnis 6a", fmt="0.00")
line("a6_t", "b) Presszeit", "t", "={a6_l}/{a6_v}", "min", "t = l / v_S", "Ergebnis 6b", fmt="0.00")
line("a6_ts", "Presszeit in Sekunden", "t", "={a6_t}*60", "s", "· 60", fmt="0")
line("a6_vSt", "c) Geschwindigkeit des Pressstempels", "v_St", "={a6_L}/{a6_t}", "mm/min",
     "v_St = L / t", "Ergebnis 6c: der Stempel schiebt den ganzen Block in derselben Zeit", fmt="0.0")
line("a6_probe", "Probe Volumenkonstanz", "v_St", "={a6_v}*1000*({a6_AP}*100)/{a6_AB}", "mm/min",
     "v_St = v_S · A_P / A_B", "Muss gleich dem Wert darüber sein", fmt="0.0")
row += 1

section("Aufgabe 7 – Draht kalt gezogen: 2,5 mm → 2 mm → 1,6 mm, Einlauf 2 m/s. Geschwindigkeiten der Folgezüge?")
line("a7_d1", "Ausgangsdurchmesser", "d₁", 2.5, "mm", fmt="0.0")
line("a7_d2", "nach Zug 1", "d₂", 2, "mm", fmt="0.0")
line("a7_d3", "nach Zug 2", "d₃", 1.6, "mm", fmt="0.0")
line("a7_v1", "Einlaufgeschwindigkeit", "v₁", 2, "m/s", fmt="0.0")
line("a7_v2", "Geschwindigkeit nach Zug 1", "v₂", "={a7_v1}*({a7_d1}/{a7_d2})^2", "m/s",
     "A₁ · v₁ = A₂ · v₂  →  v₂ = v₁ · (d₁ / d₂)²", "Ergebnis 7, erster Folgezug", fmt="0.000")
line("a7_v3", "Geschwindigkeit nach Zug 2", "v₃", "={a7_v2}*({a7_d2}/{a7_d3})^2", "m/s",
     "v₃ = v₂ · (d₂ / d₃)²", "Ergebnis 7, zweiter Folgezug", fmt="0.000")
line("a7_A1v1", "Probe: A₁ · v₁", "Q", "=PI()*{a7_d1}^2/4*{a7_v1}", "mm²·m/s", "Volumen je Sekunde am Einlauf", fmt="0.000")
line("a7_A3v3", "Probe: A₃ · v₃", "Q", "=PI()*{a7_d3}^2/4*{a7_v3}", "mm²·m/s",
     "muss gleich A₁ · v₁ sein", "Werkstoffvolumen bleibt konstant", fmt="0.000")
row += 1
note("Gelbe Zellen ändern, die grünen rechnen in Excel und LibreOffice sofort nach. "
     "Aufgabe 4 und 7 lassen sich zusätzlich im Formel-Labor nachrechnen: "
     "weg-zeit-diagramm-streckenzug.html#stroemung, Beispiele „Aufg. 4“, „Aufg. 7/1“ und „Aufg. 7/2“.")

for col, width in zip("ABCDEF", (36, 9, 15, 10, 46, 44)):
    ws.column_dimensions[col].width = width
ws.freeze_panes = "A5"

wb.active = wb.index(ws)
wb.save(OUT)
print("geschrieben:", OUT)
