import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()
# remove default sheet
wb.remove(wb.active)

# Color Palette
C_NAVY = "1E3A8A"       # Title dark blue
C_BLUE = "2563EB"       # Section header
C_LIGHT_BLUE = "DBEAFE" # Sub-header / accent
C_GRAY_HEADER = "F1F5F9"
C_INPUT = "FEF9C3"      # Soft yellow for user input cells
C_OUTPUT = "DCFCE7"     # Soft green for calculated results
C_BORDER = "CBD5E1"
C_BORDER_DARK = "64748B"
C_TEXT_DARK = "0F172A"
C_MUTED = "475569"

font_title = Font(name="Calibri", size=15, bold=True, color="FFFFFF")
font_section = Font(name="Calibri", size=12, bold=True, color="FFFFFF")
font_sub = Font(name="Calibri", size=11, bold=True, color="1E3A8A")
font_header = Font(name="Calibri", size=11, bold=True, color=C_TEXT_DARK)
font_bold = Font(name="Calibri", size=10, bold=True, color=C_TEXT_DARK)
font_regular = Font(name="Calibri", size=10, color=C_TEXT_DARK)
font_italic = Font(name="Calibri", size=9, italic=True, color=C_MUTED)
font_formula = Font(name="Consolas", size=9.5, color="1E40AF")

fill_navy = PatternFill(start_color=C_NAVY, end_color=C_NAVY, fill_type="solid")
fill_blue = PatternFill(start_color=C_BLUE, end_color=C_BLUE, fill_type="solid")
fill_light_blue = PatternFill(start_color=C_LIGHT_BLUE, end_color=C_LIGHT_BLUE, fill_type="solid")
fill_gray = PatternFill(start_color=C_GRAY_HEADER, end_color=C_GRAY_HEADER, fill_type="solid")
fill_input = PatternFill(start_color=C_INPUT, end_color=C_INPUT, fill_type="solid")
fill_output = PatternFill(start_color=C_OUTPUT, end_color=C_OUTPUT, fill_type="solid")

thin_side = Side(style='thin', color=C_BORDER)
border_all = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
border_output = Border(
    left=Side(style='thin', color="16A34A"),
    right=Side(style='thin', color="16A34A"),
    top=Side(style='thin', color="16A34A"),
    bottom=Side(style='double', color="16A34A")
)
border_input = Border(
    left=Side(style='medium', color="D97706"),
    right=Side(style='thin', color="D97706"),
    top=Side(style='thin', color="D97706"),
    bottom=Side(style='thin', color="D97706")
)

align_center = Alignment(horizontal="center", vertical="center")
align_left = Alignment(horizontal="left", vertical="center")
align_right = Alignment(horizontal="right", vertical="center")
align_wrap = Alignment(horizontal="left", vertical="center", wrap_text=True)

# -------------------------------------------------------------
# SHEET 1: Formelsammlung
# -------------------------------------------------------------
ws1 = wb.create_sheet(title="Formelsammlung")
ws1.views.sheetView[0].showGridLines = True

ws1.merge_cells("A1:G1")
cell = ws1["A1"]
cell.value = "FORMELSAMMLUNG TIEFZIEHEN – Rechenbuch & Tabellenbuch Metall"
cell.font = font_title
cell.fill = fill_navy
cell.alignment = align_center
ws1.row_dimensions[1].height = 35

headers1 = ["Form / Verfahren", "Skizze / Geometrie", "Formelzeichen", "Formel (Mathematisch)", "Excel-Formelsyntax", "Bedingung / Hinweis"]
ws1.append([])
ws1.append(headers1)
ws1.row_dimensions[3].height = 24
for col_idx, text in enumerate(headers1, 1):
    c = ws1.cell(row=3, column=col_idx)
    c.font = font_header
    c.fill = fill_light_blue
    c.alignment = align_center
    c.border = border_all

formeln_data = [
    ("1. Einfacher Zylinder (ohne Rand)", "Kreisboden + Zylindermantel", "d = Durchmesser\nh = Höhe\nD = Zuschnitt", "D = √(d² + 4·d·h)", "'=WURZEL(d^2 + 4*d*h)", "Flächengleichheit (Boden + Mantel = Ronde)"),
    ("2. Zylinder mit Rand (Napf)", "Boden + Mantel + Flansch/Rand", "d1 = Zylinder-Ø\nd2 = Rand-Ø (d1+2b)\nh = Höhe\nD = Zuschnitt", "D = √(d2² + 4·d1·h)", "'=WURZEL(d2^2 + 4*d1*h)", "Randbreite b: d2 = d1 + 2·b"),
    ("3. Gestufter Zylinder (Filtereinsatz)", "2 zylindrische Stufen", "d1, h1 (Stufe 1)\nd2, h2 (Stufe 2)\nD = Zuschnitt", "D = √(d2² + 4·(d1·h1 + d2·h2))", "'=WURZEL(d2^2 + 4*(d1*h1 + d2*h2))", "Stufenzug: Teilflächen beider Stufen"),
    ("4. Zylinder mit Bodenrundung", "Boden mit Eckenradius r", "d = Ø, h = Höhe\nr = Zieh- bzw. Bodenradius", "D = √(d² + 4·d·h - 0,56·r·d)", "'=WURZEL(d^2 + 4*d*h - 0,56*r*d)", "Näherungsformel bei r ≈ (0,1...0,3)·d"),
    ("5. Kugelhalbschale", "Halbkugel (Boden gewölbt)", "d = Innendurchmesser", "D = d · √2 ≈ 1,414 · d", "'=d * WURZEL(2)", "Oberfläche Halbkugel = 2·π·r²"),
    ("6. Kegeleinsatz mit Rand (Bild 4)", "Boden + Kegelstumpf + Zylinder + Rand", "d1 = Boden-Ø\nd2 = Zylinder-Ø\nd3 = Flansch-Ø\nm = Kegelmantellinie", "D = √(4 · Ages / π)\nAges = A1 + A2 + A3 + A4", "'=WURZEL(4 * Ages / PI())", "Ages: Boden + Kegelmantel + Zylindermantel + Rand"),
    ("7. Erstzug Ziehverhältnis β1", "Verhältnis Ronde zu 1. Zug", "D = Zuschnitt-Ø\nd1 = Stempel-Ø Zug 1", "β1 = D / d1\nd1 = D / β1", "'=D / d1", "DC01: max 2,0...2,1 | DC04: 2,1...2,2 | Al: 2,0...2,1"),
    ("8. Folgezug Ziehverhältnis βn", "Verhältnis Stufe n-1 zu Stufe n", "dn-1 = Vorzug-Ø\ndn = Folgezug-Ø", "βn = dn-1 / dn\ndn = dn-1 / βn", "'=d_prev / d_next", "Folgezüge immer kleiner als Erstzug (1,3...1,6)"),
    ("9. Gesamtziehverhältnis βges", "Verhältnis Ronde zu Fertigteil", "D = Zuschnitt-Ø\nd = Fertigteil-Ø", "βges = D / d", "'=D / d_fertig", "Ist βges > β1,max, sind mehrere Züge zwingend nötig"),
    ("10. Größtmögliche Höhe in 1 Zug", "Zylinder ohne Rand", "d = Stempel-Ø\nD = Zuschnitt-Ø (d · β1)", "h_max = (D² - d²) / (4 · d)", "'=(D^2 - d^2) / (4 * d)", "Maximale Ausnutzung des Ziehverhältnisses")
]

for row_idx, item in enumerate(formeln_data, 4):
    ws1.row_dimensions[row_idx].height = 28
    for col_idx, val in enumerate(item, 1):
        c = ws1.cell(row=row_idx, column=col_idx, value=val)
        c.font = font_formula if col_idx in [4, 5] else font_regular
        c.border = border_all
        c.alignment = align_wrap if col_idx in [1, 2, 3, 6] else align_center

# -------------------------------------------------------------
# SHEET 2: Übungen 6 bis 10
# -------------------------------------------------------------
ws2 = wb.create_sheet(title="Übungen 6-10 (Lösungen)")
ws2.views.sheetView[0].showGridLines = True

ws2.merge_cells("A1:G1")
c = ws2["A1"]
c.value = "ÜBUNGSAUFGABEN 6 BIS 10 – Tiefziehen (Rechenbuch Metall S. 248)"
c.font = font_title
c.fill = fill_navy
c.alignment = align_center
ws2.row_dimensions[1].height = 35

# Color legend in row 2
ws2.cell(row=2, column=1, value="LEGENDE:").font = font_bold
c_in_leg = ws2.cell(row=2, column=2, value="Eingabewert (veränderbar)")
c_in_leg.fill = fill_input
c_in_leg.font = font_bold
c_in_leg.border = border_input
c_in_leg.alignment = align_center

c_out_leg = ws2.cell(row=2, column=4, value="Berechnetes Ergebnis (Formel)")
c_out_leg.fill = fill_output
c_out_leg.font = font_bold
c_out_leg.border = border_output
c_out_leg.alignment = align_center

headers2 = ["Aufgabe / Parameter", "Symbol", "Wert", "Einheit", "Formel / Rechenweg", "Excel-Formel", "Erklärung & Anmerkung"]
ws2.append([])
ws2.append(headers2)
ws2.row_dimensions[4].height = 24
for col_idx, text in enumerate(headers2, 1):
    cell = ws2.cell(row=4, column=col_idx)
    cell.font = font_header
    cell.fill = fill_light_blue
    cell.alignment = align_center
    cell.border = border_all

curr_row = 5

def add_section_header(title):
    global curr_row
    ws2.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=7)
    cell = ws2.cell(row=curr_row, column=1, value=title)
    cell.font = font_section
    cell.fill = fill_blue
    cell.alignment = align_left
    ws2.row_dimensions[curr_row].height = 26
    curr_row += 1

def add_row(desc, sym, val, unit, formel_text, excel_formula=None, note="", is_input=False, is_output=False, num_format=None):
    global curr_row
    ws2.row_dimensions[curr_row].height = 22
    
    c1 = ws2.cell(row=curr_row, column=1, value=desc)
    c2 = ws2.cell(row=curr_row, column=2, value=sym)
    c3 = ws2.cell(row=curr_row, column=3)
    c4 = ws2.cell(row=curr_row, column=4, value=unit)
    c5 = ws2.cell(row=curr_row, column=5, value=formel_text)
    c6 = ws2.cell(row=curr_row, column=6, value=excel_formula if excel_formula else "-")
    c7 = ws2.cell(row=curr_row, column=7, value=note)

    if excel_formula:
        c3.value = excel_formula
    else:
        c3.value = val

    # Formatting
    c1.font = font_regular; c1.alignment = align_left; c1.border = border_all
    c2.font = font_bold; c2.alignment = align_center; c2.border = border_all
    c4.font = font_regular; c4.alignment = align_center; c4.border = border_all
    c5.font = font_regular; c5.alignment = align_left; c5.border = border_all
    c6.font = font_formula; c6.alignment = align_left; c6.border = border_all
    c7.font = font_italic; c7.alignment = align_left; c7.border = border_all

    if is_input:
        c3.fill = fill_input
        c3.font = font_bold
        c3.alignment = align_right
        c3.border = border_input
    elif is_output:
        c3.fill = fill_output
        c3.font = font_bold
        c3.alignment = align_right
        c3.border = border_output
    else:
        c3.font = font_regular
        c3.alignment = align_right
        c3.border = border_all

    if num_format:
        c3.number_format = num_format
    elif isinstance(val, float) or excel_formula:
        c3.number_format = "#,##0.00"

    this_row = curr_row
    curr_row += 1
    return this_row

# ----------------- AUFGABE 6 -----------------
add_section_header("AUFGABE 6: Ziehteildurchmesser (DC01, D = 117 mm, 1 Zug)")
r_6_D = add_row("Zuschnittdurchmesser gegeben", "D", 117.0, "mm", "Gegebener Ronden-Durchmesser", is_input=True)
r_6_mat = add_row("Werkstoff", "-", "DC01", "-", "Kaltgewalzter Tiefziehstahl (St 12)", note="Weicher unlegierter Qualitätsstahl")
r_6_b1_tab = add_row("Zulässiges Ziehverhältnis Erstzug (Tabelle)", "β1,max", 2.10, "-", "Tabellenbuch Metall (Richtwert 2,0 bis 2,1)", is_input=True)
r_6_res1 = add_row("Kleinster Ziehteildurchmesser (bei β1 = 2,10)", "d1,min", None, "mm", "d1 = D / β1", f"=C{r_6_D}/C{r_6_b1_tab}", "Ergebnis mit Standard-Tabellenwert 2,1", is_output=True)
r_6_b1_alt = add_row("Alternatives Ziehverhältnis (konservativ)", "β1,alt", 2.00, "-", "Konservativer Richtwert", is_input=True)
r_6_res2 = add_row("Kleinster Ziehteildurchmesser (bei β1 = 2,00)", "d1,alt", None, "mm", "d1 = D / β1,alt", f"=C{r_6_D}/C{r_6_b1_alt}", "Ergebnis bei konservativem Ziehverhältnis 2,0", is_output=True)

# ----------------- AUFGABE 7 -----------------
add_section_header("AUFGABE 7: Zylinder ohne Rand (d = 20 mm, h = 30 mm, DC04)")
r_7_d = add_row("Fertigteildurchmesser", "d", 20.0, "mm", "Gegebener Durchmesser des Zylinders", is_input=True)
r_7_h = add_row("Fertigteilhöhe", "h", 30.0, "mm", "Gegebene Zylinderhöhe", is_input=True)
r_7_mat = add_row("Werkstoff", "-", "DC04", "-", "Besonders tiefziehfähiger Weichstahl", note="Sonder-Tiefziehgüte")
r_7_D = add_row("a) Zuschnittdurchmesser D", "D", None, "mm", "D = √(d² + 4·d·h)", f"=SQRT(C{r_7_d}^2 + 4*C{r_7_d}*C{r_7_h})", "Flächengleichheit für Zylinder ohne Rand", is_output=True)
r_7_bges = add_row("Gesamtziehverhältnis βges", "βges", None, "-", "βges = D / d", f"=C{r_7_D}/C{r_7_d}", "Gesamtumformgrad", is_output=False)
r_7_b1 = add_row("Zulässiges Ziehverhältnis 1. Zug (DC04)", "β1,max", 2.10, "-", "Tabelle: für DC04 ca. 2,1 bis 2,2", is_input=True)
r_7_d1 = add_row("Stempeldurchmesser 1. Zug (größte Reduktion)", "d1", None, "mm", "d1 = D / β1", f"=C{r_7_D}/C{r_7_b1}", "Zwischendurchmesser nach Erstzug", is_output=False)
r_7_b2 = add_row("Erforderliches Ziehverhältnis 2. Zug (auf 20 mm)", "β2", None, "-", "β2 = d1 / d", f"=C{r_7_d1}/C{r_7_d}", "Muss ≤ β2,max (ca. 1,4) sein", is_output=False)
r_7_anz = add_row("b) Erforderliche Anzahl der Züge", "n", None, "Züge", "WENN(βges <= β1; 1; WENN(β2 <= 1,4; 2; 3))", f'=IF(C{r_7_bges}<=C{r_7_b1}, 1, IF(C{r_7_b2}<=1.4, 2, 3))', "Da βges = 2,65 > 2,10, aber β2 = 1,26 ≤ 1,4", is_output=True, num_format="0")

# ----------------- AUFGABE 8 -----------------
add_section_header("AUFGABE 8: Relaisgehäuse (EN AW-Al 99,5, d = 15 mm, h = 60 mm)")
r_8_d = add_row("Fertigteildurchmesser", "d", 15.0, "mm", "Zylinderdurchmesser", is_input=True)
r_8_h = add_row("Fertigteilhöhe", "h", 60.0, "mm", "Gehäusehöhe", is_input=True)
r_8_mat = add_row("Werkstoff", "-", "EN AW-Al 99,5", "-", "Reinaluminium, gut umformbar", note="Sehr weich")
r_8_b1 = add_row("Max. zulässiges Ziehverhältnis Zug 1", "β1", 2.10, "-", "In Aufgabenstellung vorgegeben", is_input=True)
r_8_b2 = add_row("Max. zulässiges Ziehverhältnis Zug 2", "β2", 1.60, "-", "In Aufgabenstellung vorgegeben", is_input=True)
r_8_b3 = add_row("Max. zulässiges Ziehverhältnis Zug 3", "β3", 1.40, "-", "In Aufgabenstellung vorgegeben", is_input=True)
r_8_D = add_row("a) Zuschnittdurchmesser D", "D", None, "mm", "D = √(d² + 4·d·h)", f"=SQRT(C{r_8_d}^2 + 4*C{r_8_d}*C{r_8_h})", "Zylinder ohne Rand: √(15² + 4·15·60)", is_output=True)
r_8_d1 = add_row("b) Stempeldurchmesser 1. Zug (Zwischenzug)", "d1", None, "mm", "d1 = D / β1", f"=C{r_8_D}/C{r_8_b1}", "Größtmöglicher Stempel Zug 1", is_output=True)
r_8_d2 = add_row("b) Stempeldurchmesser 2. Zug (Zwischenzug)", "d2", None, "mm", "d2 = d1 / β2", f"=C{r_8_d1}/C{r_8_b2}", "Stempel Zug 2 (> 15 mm -> Zug 3 nötig)", is_output=True)
r_8_d3 = add_row("b) Stempeldurchmesser 3. Zug (Fertigzug)", "d3", None, "mm", "d3 = d", f"=C{r_8_d}", "Fertigmaß erreicht!", is_output=True)
r_8_anz = add_row("b) Gesamtzahl erforderlicher Züge", "n", None, "Züge", "WENN(d1 <= d; 1; WENN(d2 <= d; 2; 3))", f"=IF(C{r_8_d1}<=C{r_8_d}, 1, IF(C{r_8_d2}<=C{r_8_d}, 2, 3))", "1. Zug (29,45 mm) -> 2. Zug (18,41 mm) -> 3. Zug (15 mm)", is_output=True, num_format="0")
r_8_bfertig = add_row("c) Ziehverhältnis beim Fertigzug", "β_fertig", None, "-", "β_fertig = d2 / d3", f"=C{r_8_d2}/C{r_8_d3}", "Tatsächliches Ziehverhältnis im 3. Zug", is_output=True)

# ----------------- AUFGABE 9 -----------------
add_section_header("AUFGABE 9: Kegeleinsatz (Bild 4)")
r_9_d1 = add_row("Bodendurchmesser", "d1", 40.0, "mm", "Durchmesser Boden", is_input=True)
r_9_d2 = add_row("Zylinderdurchmesser oben", "d2", 60.0, "mm", "Oberer Zylinderdurchmesser", is_input=True)
r_9_d3 = add_row("Rand-Außendurchmesser (Flansch)", "d3", 80.0, "mm", "Flansch-Außendurchmesser", is_input=True)
r_9_hges = add_row("Gesamthöhe", "h_ges", 70.0, "mm", "Gesamthöhe Kegeleinsatz", is_input=True)
r_9_hz = add_row("Höhe Zylinderabschnitt oben", "h_z", 20.0, "mm", "Zylinderhöhe", is_input=True)
r_9_hk = add_row("Höhe Kegelabschnitt", "h_k", None, "mm", "h_k = h_ges - h_z", f"=C{r_9_hges}-C{r_9_hz}", "Berechnete Höhe Kegelstumpf")
r_9_m = add_row("Mantellinie des Kegelstumpfs", "m", None, "mm", "m = √(h_k² + ((d2-d1)/2)²)", f"=SQRT(C{r_9_hk}^2 + ((C{r_9_d2}-C{r_9_d1})/2)^2)", "Schräge Kegellänge (Pythagoras)")

r_9_A1 = add_row("1. Fläche Kreisboden", "A1", None, "mm²", "A1 = π · d1² / 4", f"=PI() * C{r_9_d1}^2 / 4", "Ebener Boden")
r_9_A2 = add_row("2. Fläche Kegelstumpfmantel", "A2", None, "mm²", "A2 = π · ((d1+d2)/2) · m", f"=PI() * ((C{r_9_d1}+C{r_9_d2})/2) * C{r_9_m}", "Kegelmantel")
r_9_A3 = add_row("3. Fläche Zylindermantel", "A3", None, "mm²", "A3 = π · d2 · h_z", f"=PI() * C{r_9_d2} * C{r_9_hz}", "Zylindrischer oberer Teil")
r_9_A4 = add_row("4. Fläche Flansch/Rand", "A4", None, "mm²", "A4 = π/4 · (d3² - d2²)", f"=PI()/4 * (C{r_9_d3}^2 - C{r_9_d2}^2)", "Kreisringfläche des Flansches")
r_9_Ages = add_row("Gesamtfläche des Ziehteils", "A_ges", None, "mm²", "A_ges = A1 + A2 + A3 + A4", f"=SUM(C{r_9_A1}:C{r_9_A4})", "Summe aller 4 Teilflächen")
r_9_D = add_row("Zuschnittdurchmesser D", "D", None, "mm", "D = √(4 · A_ges / π)", f"=SQRT(4 * C{r_9_Ages} / PI())", "Ergebnis Zuschnitt Kegeleinsatz", is_output=True)

# ----------------- AUFGABE 10 -----------------
add_section_header("AUFGABE 10: Behälter (Kupfer, d = 74 mm, 1 Zug)")
r_10_d = add_row("Fertigdurchmesser", "d", 74.0, "mm", "Zylinderdurchmesser ohne Rand", is_input=True)
r_10_mat = add_row("Werkstoff", "-", "Kupfer (Cu)", "-", "Sehr duktiles NE-Metall", note="Sehr gut tiefziehbar")
r_10_b1 = add_row("Max. Ziehverhältnis 1. Zug (Kupfer)", "β1,max", 2.10, "-", "Richtwert Tabelle (2,0 bis 2,1)", is_input=True)
r_10_D = add_row("a) Erforderlicher Zuschnittdurchmesser", "D", None, "mm", "D = d · β1,max", f"=C{r_10_d}*C{r_10_b1}", "Für maximale Höhe wird β1 voll genutzt", is_output=True)
r_10_hmax = add_row("b) Größtmögliche Behälterhöhe", "h_max", None, "mm", "h_max = (D² - d²) / (4 · d)", f"=(C{r_10_D}^2 - C{r_10_d}^2) / (4 * C{r_10_d})", "Größte erreichbare Zylinderhöhe in 1 Zug", is_output=True)
r_10_Aronde = add_row("Fläche des Zuschnitts (Ronde)", "A_Ronde", None, "mm²", "A = π · D² / 4", f"=PI() * C{r_10_D}^2 / 4", "Netto-Blechfläche eines Teils")

r_10_B = add_row("Streifenbreite gegeben", "B", 160.0, "mm", "Gegebene Blechstreifenbreite", is_input=True)
r_10_e = add_row("Stegbreite / Randüberstand", "e", 3.0, "mm", "Typischer Steg beim Stanzen (ca. 2-3 mm)", is_input=True)
r_10_v = add_row("Vorschub je Stanzhub", "v", None, "mm", "v = D + e", f"=C{r_10_D}+C{r_10_e}", "Vorschubweg pro Ronde im Streifen")
r_10_Abed = add_row("c) Blechbedarf je Behälter (Brutto)", "A_Bedarf", None, "mm²", "A_Bedarf = B · v", f"=C{r_10_B}*C{r_10_v}", "Brutto-Flächenbedarf aus Streifen", is_output=True)
r_10_eta = add_row("d) Materialausnutzungsgrad", "η", None, "%", "η = A_Ronde / A_Bedarf", f"=C{r_10_Aronde}/C{r_10_Abed}", "Verhältnis Nutzfläche zu Streifenfläche", is_output=True, num_format="0.0%")
r_10_verschnitt = add_row("d) Verschnittanteil", "V", None, "%", "V = 100% - η", f"=1-C{r_10_eta}", "Stanzabfall in Prozent", is_output=True, num_format="0.0%")


# -------------------------------------------------------------
# SHEET 3: Werkstofftabelle
# -------------------------------------------------------------
ws3 = wb.create_sheet(title="Werkstoff-Richtwerte (Beta)")
ws3.views.sheetView[0].showGridLines = True

ws3.merge_cells("A1:F1")
c = ws3["A1"]
c.value = "RICHTWERTE FÜR ZIEHVERHÄLTNISSE (Tabellenbuch Metall)"
c.font = font_title
c.fill = fill_navy
c.alignment = align_center
ws3.row_dimensions[1].height = 35

headers3 = ["Werkstoff", "Kurzname / Werkstoff-Nr.", "1. Zug (Erstzug) β1", "2. Zug β2", "3. Zug β3", "Bemerkung / Tiefziehverhalten"]
ws3.append([])
ws3.append(headers3)
ws3.row_dimensions[3].height = 24
for col_idx, text in enumerate(headers3, 1):
    c = ws3.cell(row=3, column=col_idx)
    c.font = font_header
    c.fill = fill_light_blue
    c.alignment = align_center
    c.border = border_all

mat_data = [
    ("Tiefziehstahl (weich)", "DC01 (St 12, 1.0330)", "1,90 ... 2,10", "1,30 ... 1,45", "1,20 ... 1,30", "Gute Zieheigenschaften, Standard-Karosserieblech"),
    ("Sonder-Tiefziehstahl", "DC04 (St 14, 1.0338)", "2,05 ... 2,20", "1,35 ... 1,50", "1,25 ... 1,35", "Hervorragende Tiefziehfähigkeit, rißunempfindlich"),
    ("Aluminium (Reinaluminium)", "EN AW-Al 99,5 (3.0255)", "2,00 ... 2,15", "1,50 ... 1,65", "1,30 ... 1,45", "Sehr weich und duktil, hohe Querkontraktion"),
    ("Aluminium-Knetlegierung", "EN AW-AlMg3 (3.3535)", "1,80 ... 1,95", "1,30 ... 1,40", "1,15 ... 1,25", "Mittelfest, für Schweiß- und Biegeteile"),
    ("Kupfer", "Cu-ETP (CW004A, 2.0065)", "2,00 ... 2,15", "1,40 ... 1,55", "1,25 ... 1,35", "Sehr hohe Dehnung, neigt zu Kaltverfestigung"),
    ("Knetmessing", "CuZn37 (CW508L, 2.0321)", "1,95 ... 2,10", "1,35 ... 1,50", "1,20 ... 1,30", "Klassisches Tiefziehmessing (z.B. Hülsen)"),
    ("Austenitischer Edelstahl", "X5CrNi18-10 (1.4301, V2A)", "1,80 ... 2,00", "1,25 ... 1,35", "1,15 ... 1,25", "Starke Kaltverfestigung, Zwischenglühen nötig")
]

for row_idx, item in enumerate(mat_data, 4):
    ws3.row_dimensions[row_idx].height = 24
    for col_idx, val in enumerate(item, 1):
        c = ws3.cell(row=row_idx, column=col_idx, value=val)
        c.font = font_regular
        c.border = border_all
        c.alignment = align_left if col_idx in [1, 2, 6] else align_center

# Auto-adjust column widths
for sheet in [ws1, ws2, ws3]:
    for col in sheet.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            # skip row 1 merged title
            if cell.row == 1:
                continue
            val_str = str(cell.value or "")
            lines = val_str.split("\n")
            for line in lines:
                if len(line) > max_len:
                    max_len = len(line)
        sheet.column_dimensions[col_letter].width = max(max_len + 4, 12)

# Specific custom widths for best readability
ws1.column_dimensions['A'].width = 32
ws1.column_dimensions['B'].width = 30
ws1.column_dimensions['C'].width = 24
ws1.column_dimensions['D'].width = 32
ws1.column_dimensions['E'].width = 32
ws1.column_dimensions['F'].width = 40

ws2.column_dimensions['A'].width = 38
ws2.column_dimensions['B'].width = 12
ws2.column_dimensions['C'].width = 15
ws2.column_dimensions['D'].width = 12
ws2.column_dimensions['E'].width = 36
ws2.column_dimensions['F'].width = 36
ws2.column_dimensions['G'].width = 44

ws3.column_dimensions['A'].width = 26
ws3.column_dimensions['B'].width = 26
ws3.column_dimensions['C'].width = 20
ws3.column_dimensions['D'].width = 18
ws3.column_dimensions['E'].width = 18
ws3.column_dimensions['F'].width = 46

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Tiefziehen_Berechnungen_Uebungen_6-10.xlsx")
wb.save(out_path)
print(f"Workbook successfully saved to: {out_path}")
