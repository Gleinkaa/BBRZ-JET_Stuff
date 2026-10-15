# AGENTS.md — BBRZ-JET_Stuff

## Worum es geht

Begleitmaterial für Ausbildung und Vertiefung im Fachgebiet Fertigungstechnik / Umformen
(DIN 8584, Aufgaben nach Rechenbuch Metall, S. 248): eine interaktive 2D/3D-Simulation des
Tiefziehens (Erstzug eines zylindrischen Napfes), eine Excel-Arbeitsmappe mit Formeln zu den
Aufgaben 6–10, ausführliche Musterlösungen und eine eigenständige Seite zum
Pyramidenvolumen. Alles läuft ohne Build-Schritt im Browser bzw. in Excel/LibreOffice.

## Layout (echte Pfade)

```
index.html                     Landing Page (Hero, Kennzahlen, Links)
pyramid-volume.html            Warum ist eine Pyramide genau 1/3? (eigenständige Seite, EN/DE, offline)
simulation/index.html          Oberfläche: Steuerpanel, Kennwerte, Ansichten
simulation/simulation.js       Physikmodell (Materialpunkte, Hill, Siebel, Bodenreißer)
simulation/view2d.js           2D-Werkzeugschnitt mit Blechverformung
simulation/view3d.js           3D-Schnittmodell mit Dicken-Farbkodierung (Three.js)
simulation/chart.js            Wanddickenverlauf s(l) über der Konturlänge (Canvas 2D)
simulation/app.js              UI-Zustand, Parameter-Bindings, Animation
simulation/style.css           Layout inkl. Handy-Breakpoint
simulation/serve.py            optionaler Webserver mit HTTP-Basic-Auth
simulation/lib/three.min.js, simulation/lib/OrbitControls.js   lokal eingebundene Fremdbibliotheken
simulation/preview.png, simulation/preview_start.png           Screenshots (Ende/Anfang des Hubs)
excel/generate_excel.py        erzeugt die Arbeitsmappe (openpyxl)
excel/Tiefziehen_Berechnungen_Uebungen_6-10.xlsx   Arbeitsmappe mit Formelblättern
docs/rechenbuch_metall_uebungen_6-10.md            Formeln + Musterlösungen mit Rechenweg
README.md, LICENSE (MIT), .gitignore
```

## Bauen, starten, testen

```bash
# Simulation: einfach öffnen, keine Installation
#   simulation/index.html im Browser (Three.js liegt lokal in simulation/lib/)
cd simulation && python3 -m http.server 8080     # alternativ über einen lokalen Server

# Basic-Auth-Variante (startet ohne Zugangsdaten nicht - verifiziert)
BBRZ_USER=… BBRZ_PASS=… BBRZ_PORT=8079 python3 simulation/serve.py

# Arbeitsmappe neu erzeugen (braucht openpyxl)
pip install openpyxl && python3 excel/generate_excel.py
```

`serve.py` bindet `127.0.0.1` und verlangt bei jeder Anfrage Basic-Auth; ohne
`BBRZ_USER`/`BBRZ_PASS` bricht es mit Exit 1 ab (hier verifiziert). Die Zugangsdaten kommen
aus der Umgebung (z. B. `~/.config/bbrz-sim.env`), nie aus dem Repo.

Es gibt **keine Tests und keine CI**. Verifikation heißt hier: im Browser prüfen (beide
Ansichten, Diagramm, Regler) und die Kennwerte gegen die Plausibilitätstabelle im README
halten. **In diesem Audit nicht ausgeführt:** kein Browser-Render, kein Physik-Nachrechnen,
kein Excel-Lauf (openpyxl nicht installiert) – nur das Verhalten von `serve.py` wurde geprüft.

## Im Code beobachtete Konventionen

- Frontend ohne Build-Tools: klassische `<script>`-Dateien, kein Bundler, kein Framework;
  3D wird nur bei Änderungen neu gerendert.
- Deutsche Fachsprache und DIN-Begriffe (Zuschnitt, Ziehverhältnis β, Zarge, Flansch,
  Niederhalter, Abstrecken, Bodenreißer). Variablennamen und UI-Texte bleiben deutsch.
- Die Physik ist ein halbanalytisches, volumenerhaltendes Membranmodell – ausdrücklich
  **keine FEM**. Modellannahmen (Reibwerte, Biegeüberhöhung) und Modellgrenzen (Falten,
  Zipfelbildung, Rückfederung) stehen im README; sie gehören zur Aussage des Materials.
- Die Excel-Datei enthält **Formeln ohne vorberechnete Werte** (Eingaben gelb, Ergebnisse
  grün). Excel und LibreOffice rechnen beim Öffnen; reine Vorschau-Tools zeigen leere
  Ergebnisspalten – das ist erwartet, kein Fehler.
- Die Musterlösungen sind eigene Zusammenfassungen und Rechenwege, nicht der Buchtext
  (Aufgaben stammen aus dem *Rechenbuch Metall*, Europa-Lehrmittel). Kein Buchtext, keine
  Scans einfügen.
- Alles bleibt offline nutzbar: Bibliotheken liegen lokal vor.

## Gotchas / nicht anfassen

- **Lehrmaterial heißt: Zahlen müssen belegt bleiben.** Die Plausibilitätstabelle im README
  (Volumen 1,000; Ziehkraft ≈ 54 kN gegen Siebel ≈ 59 kN; Napfhöhe ≈ 37 mm gegen 37,5 mm)
  ist Teil der didaktischen Aussage. Wer das Modell ändert, aktualisiert die Tabelle – oder
  schreibt ausdrücklich dazu, warum die Abweichung bleibt. Die Werte sind für den Unterricht,
  nicht als Auslegungsgrundlage; diese Einschränkung nicht wegkürzen.
- `simulation/lib/three.min.js` und `simulation/lib/OrbitControls.js` sind Fremdbibliotheken
  (MIT, Three.js Authors) – nicht bearbeiten, nicht „aufräumen", nicht ersetzen.
- Die `.xlsx` ist ein **generiertes Artefakt**: inhaltliche Änderungen über
  `excel/generate_excel.py`, sonst gehen sie beim nächsten Lauf verloren. Formelblätter
  nicht durch feste Werte ersetzen.
- Zugangsdaten (`BBRZ_USER`, `BBRZ_PASS`) und Key-Dateien gehören nie ins Repo; `serve.py`
  ist die Absicherung für `tailscale serve` / Reverse-Proxy. Keine Portfreigabe am Router,
  keine öffentliche URL ohne Passwort davor.
- Externe Abhängigkeit: `index.html` und `simulation/index.html` laden Google Fonts per CDN
  (Fallback-Schriften greifen offline). `pyramid-volume.html` hat keine externen Referenzen.
  Neue CDN-Verweise nur bewusst und im README erwähnen.
- `pyramid-volume.html` wird über GitHub Pages veröffentlicht
  (`gleinkaa.github.io/BBRZ-JET_Stuff/pyramid-volume.html`) – Änderungen sind sofort live.
- `.gitignore` deckt `__pycache__/`, venvs, `.pytest_cache/` ab. Keine Screenshots oder
  Preview-PNGs als „Testartefakte" hinzufügen, ohne sie bewusst zu aktualisieren.

## Definition of done

- Simulation im Browser ohne Konsolenfehler: 2D- und 3D-Ansicht, Diagramm und Regler
  verhalten sich wie vorher (oder die Änderung ist begründet).
- Plausibilitätstabelle und Modellgrenzen im README stimmen noch – oder sind mit
  nachvollziehbaren Zahlen aktualisiert.
- Excel neu erzeugt über `generate_excel.py`, Formeln statt eingefrorener Werte.
- Keine Zugangsdaten, keine Fremdbibliothek-Änderung, keine öffentliche URL ohne Schutz.
- Klar berichten, was geprüft wurde – Browser- und Excel-Prüfungen, die nicht stattfanden,
  ausdrücklich als ungeprüft nennen.
