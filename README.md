# BBRZ-JET_Stuff

**Tiefzieh-Berechnungssuite & Interaktive 2D/3D Umform-Simulation**  
*Begleitmaterial für Ausbildung & Vertiefung im Fachgebiet Fertigungstechnik / Umformen (DIN 8584, Rechenbuch Metall S. 248 & Tabellenbuch Metall, Europa-Lehrmittel)*

![Tiefzieh-Simulation Übersicht](simulation/preview.png)

---

## 📌 Übersicht & Inhalt

Dieses Repository bündelt ingenieurmäßige Berechnungsmethoden, didaktische Visualisierungen und automatisierte Rechenblätter für das Tiefziehen im Anschlagzug und Weiterschlag:

```
BBRZ-JET_Stuff/
├── simulation/            # Interaktive High-Fidelity 2D/3D WebGL-Simulation
│   ├── index.html         # Web-Applikation mit Steuerpanel & Metriken
│   ├── simulation.js      # Plastizitätsmodell, Dickenberechnung & Siebel-Ziehkraft
│   ├── view2d.js          # Symmetrischer 2D-Schnitt & Werkzeugvisualisierung
│   ├── view3d.js          # 3D Three.js Schnittmodell mit Dicken-Farbkodierung
│   ├── chart.js           # Konturbezogenes Wanddickenprofil s(l) (Chart.js/Canvas)
│   ├── app.js             # UI-State & Parameter-Bindings
│   ├── preview.png        # Screenshot Endzustand (Napf mit Dickenverlauf)
│   ├── preview_start.png  # Screenshot Ausgangszustand (100% ebene Ronde)
│   └── lib/               # Lokale Three.js & OrbitControls Bundles (offline-fähig)
├── excel/                 # Automatisierte Excel-Arbeitsmappe
│   ├── generate_excel.py  # Python-Generator (openpyxl) mit DIN-Formeln
│   └── Tiefziehen_Berechnungen_Uebungen_6-10.xlsx  # Berechnungsmappe (Aufgaben 6-10)
└── docs/                  # Detaillierte Theorie- & Aufgabendokumentation
    └── rechenbuch_metall_uebungen_6-10.md # Schritt-für-Schritt Musterlösungen
```

---

## 🚀 1. Interaktive Tiefzieh-Simulation (`simulation/`)

Die Web-Applikation veranschaulicht die physikalischen Phänomene des Tiefziehens in Echtzeit:

* **Ebene Ausgangsronde bei 0% Stößelhub:** Bei $h = 0$ liegt das Blech vollständig flach auf der Ziehmatrize auf ($s = s_0$ über den gesamten Radius).
* **Materialeinschnürung am Stempelradius (Necking / Bodenreißer-Gefahr):**  
  Durch Überlagerung von Zug- und Biegespannungen bildet sich an der Stempelkante ein ausgeprägtes Wanddickenminimum ($s_{\min} < s_0$).
* **Materialverdickung im Flansch (Hoop Compression):**  
  Beim Einziehen des Blechs treten hohe tangentiale Druckspannungen auf ($\varepsilon_t = \ln(r / R_0) < 0$). Wegen der plastischen Inkompressibilität ($\varepsilon_r + \varepsilon_t + \varepsilon_s = 0$) führt dies am Zylinderrand zu einer messbaren Blechverdickung ($s_{\max} > s_0$).
* **Ziehkraftverlauf nach Siebel:**  
  Glockenkurven-Verlauf $F_z(h)$ mit Kraftmaximum bei ca. 30–40 % des Hubs und Abfall auf 0 kN, sobald der Flansch voll eingezogen ist.
* **Ziehspalt & Abstreckwarnung:**  
  Automatischer Abgleich des Ziehspalts $w \approx 1{,}28 \cdot s_0$. Sollte $s_{\max} > w$ werden, signalisiert die Simulation sofort eine **Abstreckgefahr** (Ironing risk).
* **GPU- und batterieschonend:** On-Demand-Rendering in Three.js (kein permanenter Render-Loop im Leerlauf).

### Simulation starten
Einfach die Datei [`simulation/index.html`](file:///home/nik/Work/BBRZ-JET_Stuff/simulation/index.html) in einem modernen Webbrowser öffnen (z.B. Google Chrome, Firefox, Edge) oder per lokalem Webserver:

```bash
cd simulation
python3 -m http.server 8080
# Öffnen im Browser unter: http://localhost:8080
```

---

## 📊 2. Excel-Arbeitsmappe & Rechenblätter (`excel/`)

Die Excel-Arbeitsmappe [`Tiefziehen_Berechnungen_Uebungen_6-10.xlsx`](file:///home/nik/Work/BBRZ-JET_Stuff/excel/Tiefziehen_Berechnungen_Uebungen_6-10.xlsx) enthält vollständig editierbare Formelblätter für alle Tiefziehaufgaben der Seite 248 des *Rechenbuchs Metall*:

| Blatt | Thema | Kernformeln & Parameter |
|---|---|---|
| **Formelsammlung** | DIN 8584 Grundlagen | Oberflächengleichheit $D = \sqrt{4 A / \pi}$, Ziehverhältnisse $\beta_1, \beta_n, \beta_{\text{ges}}$, Richtwerttabelle für Stähle, Al, Cu, Ms |
| **Aufgabe 6** | Kleiner Ziehteildurchmesser | $D = 117\text{ mm}$, Werkstoff DC01 $\implies d_{1,\min} = D / \beta_{1,\max} = \mathbf{55{,}71\text{ mm}}$ |
| **Aufgabe 7** | Zylinder ohne Rand (2-Züge) | $d = 20\text{ mm}$, $h = 30\text{ mm}$, DC04 $\implies D = \mathbf{52{,}92\text{ mm}}$, $\beta_{\text{ges}} = 2{,}65 \implies \mathbf{2\text{ Züge}}$ ($d_1 = 25{,}2\text{ mm}$) |
| **Aufgabe 8** | Relaisgehäuse (Mehrstufenzug) | $d = 15\text{ mm}$, $h = 60\text{ mm}$, EN AW-Al 99,5 $\implies D = \mathbf{61{,}85\text{ mm}}$, $\mathbf{3\text{ Züge}}$ ($d_1=29{,}5$, $d_2=18{,}4$, $d_3=15\text{ mm}$) |
| **Aufgabe 9** | Filtereinsatz mit Flansch | Gestufter Zylinder mit Kragen ($d_1=16$, $d_2=24$, $h_1=18$, $h_2=10\text{ mm}$) $\implies D = \mathbf{46{,}86\text{ mm}}$ |
| **Aufgabe 10** | Kupfer-Schirmbehälter & Kraft | $d = 50\text{ mm}$, $h = 100\text{ mm}$, $s=1{,}5\text{ mm}$, Cu $\implies D = \mathbf{149{,}95\text{ mm}}$, $\mathbf{3\text{ Züge}}$, Ziehkraft $F_z \approx \mathbf{69{,}3\text{ kN}}$, Haltekraft $F_N \approx \mathbf{17{,}2\text{ kN}}$ |

### Arbeitsmappe neu generieren
```bash
python3 excel/generate_excel.py
```

---

## 📖 3. Detaillierte Dokumentation (`docs/`)

Ausführliche Rechenwege, theoretische Hintergründe, Zwischenschritte und Einheitenanalysen finden sich in [`docs/rechenbuch_metall_uebungen_6-10.md`](file:///home/nik/Work/BBRZ-JET_Stuff/docs/rechenbuch_metall_uebungen_6-10.md).

---

## 🛠️ Verwendete Technologien

* **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6 Modules)
* **3D Visualisierung:** [Three.js](https://threejs.org/) mit OrbitControls
* **2D Diagramme:** Canvas 2D API mit pixelgenauem HiDPI/Retina-Skalierungsfaktor
* **Tabellenkalkulation:** Python mit [`openpyxl`](https://openpyxl.readthedocs.io/)
* **Normen:** DIN 8584 (Zugdruckumformen), VDI 3141

---

*Erstellt für Bildungs- und Ausbildungszwecke im Rahmen des BBRZ / JET Programms.*
