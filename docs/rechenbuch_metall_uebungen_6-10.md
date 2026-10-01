# Tiefziehen – Berechnungen & Übungen 6 bis 10

Formelsammlung und ausführliche Musterlösungen für die Übungsaufgaben aus dem **Rechenbuch Metall (Europa-Lehrmittel)**, Kapitel *Umformen / Tiefziehen*, Seite 248.

---

## 1. Zentrale Grundlagen & Formeln (DIN 8584)

### 1.1 Zuschnittdurchmesser $D$ (Flächengleichheit)
Da das Blechvolumen bei der plastischen Umformung konstant bleibt ($V = \text{konst.}$) und die Wanddickenänderung über das gesamte Bauteil gemittelt näherungsweise $s \approx s_0$ beträgt, wird der Durchmesser der kreisrunden Ausgangsplatte (Blechronde) über das Gleichsetzen der Oberflächen ermittelt:

$$A_{\text{Zuschnitt}} = \sum A_{\text{Teilflächen}} \implies \frac{\pi \cdot D^2}{4} = A_{\text{ges}} \implies D = \sqrt{\frac{4 \cdot A_{\text{ges}}}{\pi}}$$

* **Einfacher Zylinder (ohne Rand):**
  $$D = \sqrt{d^2 + 4 \cdot d \cdot h}$$
* **Zylinder mit Rand (Napf mit Flansch $b$):**
  $$D = \sqrt{d_2^2 + 4 \cdot d_1 \cdot h} \quad \text{mit } d_2 = d_1 + 2 \cdot b$$
* **Gestufter Zylinder (z.B. Filtereinsatz):**
  $$D = \sqrt{d_2^2 + 4 \cdot (d_1 \cdot h_1 + d_2 \cdot h_2)}$$
* **Kugelhalbschale:**
  $$D = d \cdot \sqrt{2} \approx 1{,}414 \cdot d$$

---

### 1.2 Ziehverhältnis $\beta$ und Stufenzug
Das Ziehverhältnis beschreibt den Umformgrad je Zugstufe:
* **1. Zug (Erstzug aus der ebenen Ronde):**
  $$\beta_1 = \frac{D}{d_1} \quad \implies \quad d_1 = \frac{D}{\beta_1}$$
* **Folgezüge ($n$-ter Zug):**
  $$\beta_n = \frac{d_{n-1}}{d_n} \quad \implies \quad d_n = \frac{d_{n-1}}{\beta_n}$$
* **Gesamtziehverhältnis:**
  $$\beta_{\text{ges}} = \frac{D}{d_{\text{fertig}}}$$
  *Wenn $\beta_{\text{ges}} > \beta_{1,\max}$, sind Zwischenzüge (mehrstufiges Tiefziehen) zwingend erforderlich.*

---

## 2. Detaillierte Lösungen der Übungsaufgaben (S. 248)

### Aufgabe 6: Ziehteildurchmesser
> **Gesucht:** kleinster Durchmesser, auf den eine DC01-Ronde mit D = 117 mm in einem einzigen Zug zu einem Zylinder gezogen werden kann.

* **Gegeben:**
  * Zuschnittdurchmesser $D = 117\text{ mm}$
  * Werkstoff: DC01 (kaltgewalzter Tiefziehstahl)
  * Anzahl Züge: $n = 1$
  * Max. zulässiges Ziehverhältnis für DC01 im Erstzug (Tabellenbuch Metall): $\beta_{1,\max} \approx 2{,}00 \dots 2{,}10$
* **Formel & Rechnung:**
  $$d_{1,\min} = \frac{D}{\beta_{1,\max}}$$
  * Bei Standard-Tabellenwert $\beta_1 = 2{,}10$:
    $$d_{1,\min} = \frac{117\text{ mm}}{2{,}10} = \mathbf{55{,}71\text{ mm}}$$
  * Bei konservativem Richtwert $\beta_1 = 2{,}00$:
    $$d_{1,\min} = \frac{117\text{ mm}}{2{,}00} = \mathbf{58{,}50\text{ mm}}$$
* **Antwort:** Der kleinste ziehbare Zylinderdurchmesser beträgt **$55{,}7\text{ mm}$** (bzw. $58{,}5\text{ mm}$).

---

### Aufgabe 7: Zylinder ohne Rand
> **Gesucht:** für einen randlosen DC04-Zylinder (d = 20 mm, h = 30 mm) a) der Zuschnittdurchmesser, b) die Anzahl der Züge.

* **Gegeben:**
  * Zylinderdurchmesser $d = 20\text{ mm}$
  * Zylinderhöhe $h = 30\text{ mm}$
  * Werkstoff: DC04 (Sonder-Tiefziehgüte, $\beta_{1,\max} \approx 2{,}10 \dots 2{,}20$, $\beta_{2,\max} \approx 1{,}40$)
* **Rechnung Teil a) Zuschnittdurchmesser:**
  $$D = \sqrt{d^2 + 4 \cdot d \cdot h} = \sqrt{20^2 + 4 \cdot 20 \cdot 30} = \sqrt{400 + 2400} = \sqrt{2800} \approx \mathbf{52{,}92\text{ mm}}$$
* **Rechnung Teil b) Anzahl der Züge:**
  * Gesamtziehverhältnis:
    $$\beta_{\text{ges}} = \frac{D}{d} = \frac{52{,}92}{20} = 2{,}65$$
  * Da $\beta_{\text{ges}} = 2{,}65 > \beta_{1,\max} = 2{,}10$, reicht **1 Zug nicht aus**.
  * Stempeldurchmesser 1. Zug:
    $$d_1 = \frac{D}{\beta_{1,\max}} = \frac{52{,}92}{2{,}10} = 25{,}20\text{ mm}$$
  * Erforderliches Ziehverhältnis im 2. Zug auf Endmaß $d = 20\text{ mm}$:
    $$\beta_2 = \frac{d_1}{d} = \frac{25{,}20}{20} = 1{,}26$$
  * Da $\beta_2 = 1{,}26 \le 1{,}40$, ist der 2. Zug zulässig.
* **Antwort:**
  * a) Der Zuschnittdurchmesser beträgt **$52{,}9\text{ mm}$**.
  * b) Es sind **2 Züge erforderlich**.

---

### Aufgabe 8: Relaisgehäuse
> **Gesucht:** für ein randloses Gehäuse aus EN AW-Al 99,5 (d = 15 mm, h = 60 mm) a) der Zuschnittdurchmesser, b) die Stempeldurchmesser der Zwischenzüge und die Zahl der Züge, c) das Ziehverhältnis im Fertigzug. Zulässig sind $\beta_1 = 2{,}1$, $\beta_2 = 1{,}6$, $\beta_3 = 1{,}4$.

* **Gegeben:**
  * Fertigteildurchmesser $d = 15\text{ mm}$
  * Fertigteilhöhe $h = 60\text{ mm}$
  * $\beta_1 = 2{,}10$, $\beta_2 = 1{,}60$, $\beta_3 = 1{,}40$
* **Rechnung Teil a) Zuschnittdurchmesser:**
  $$D = \sqrt{d^2 + 4 \cdot d \cdot h} = \sqrt{15^2 + 4 \cdot 15 \cdot 60} = \sqrt{225 + 3600} = \sqrt{3825} \approx \mathbf{61{,}85\text{ mm}}$$
* **Rechnung Teil b) Stempeldurchmesser der Stufen:**
  * 1. Zug: $d_1 = \frac{D}{\beta_1} = \frac{61{,}85}{2{,}10} = \mathbf{29{,}45\text{ mm}}$
  * 2. Zug: $d_2 = \frac{d_1}{\beta_2} = \frac{29{,}45}{1{,}60} = \mathbf{18{,}41\text{ mm}}$
  * Da $d_2 = 18{,}41\text{ mm} > 15\text{ mm}$, ist noch ein 3. Zug nötig.
  * 3. Zug (Fertigzug): $d_3 = d = \mathbf{15{,}00\text{ mm}}$.
  * Gesamtzahl Züge: **3 Züge**.
* **Rechnung Teil c) Ziehverhältnis Fertigzug:**
  $$\beta_{\text{fertig}} = \beta_3 = \frac{d_2}{d_3} = \frac{18{,}41}{15{,}00} = \mathbf{1{,}227 \approx 1{,}23}$$

---

### Aufgabe 9: Kegeleinsatz (Bild 4)
> **Gesucht:** Zuschnittdurchmesser des Kegeleinsatzes (Geometrie nach Bild 4 der Aufgabe).

* **Geometrie nach Bild 4:**
  * Flansch/Rand-Außendurchmesser: $d_3 = 80\text{ mm}$
  * Oberer Zylinderdurchmesser: $d_2 = 60\text{ mm}$, Höhe $h_z = 20\text{ mm}$
  * Gesamthöhe: $h_{\text{ges}} = 70\text{ mm}$
  * Unterer Kegelabschnitt: Höhe $h_k = 70 - 20 = 50\text{ mm}$, Bodendurchmesser $d_1 = 40\text{ mm}$
* **Berechnung der 4 Teilflächen:**
  1. **Bodenfläche:**
     $$A_1 = \frac{\pi \cdot d_1^2}{4} = \frac{\pi \cdot 40^2}{4} = 1256{,}64\text{ mm}^2$$
  2. **Kegelstumpfmantel:**
     $$m = \sqrt{h_k^2 + \left(\frac{d_2 - d_1}{2}\right)^2} = \sqrt{50^2 + 10^2} = \sqrt{2600} \approx 50{,}99\text{ mm}$$
     $$A_2 = \pi \cdot \frac{d_1 + d_2}{2} \cdot m = \pi \cdot 50 \cdot 50{,}99 = 8009{,}53\text{ mm}^2$$
  3. **Zylindermantel:**
     $$A_3 = \pi \cdot d_2 \cdot h_z = \pi \cdot 60 \cdot 20 = 3769{,}91\text{ mm}^2$$
  4. **Kreisringfläche des Flansches:**
     $$A_4 = \frac{\pi}{4} \cdot (d_3^2 - d_2^2) = \frac{\pi}{4} \cdot (80^2 - 60^2) = 2199{,}11\text{ mm}^2$$
* **Gesamtfläche:**
  $$A_{\text{ges}} = 1256{,}64 + 8009{,}53 + 3769{,}91 + 2199{,}11 = 15235{,}20\text{ mm}^2$$
* **Zuschnittdurchmesser:**
  $$D = \sqrt{\frac{4 \cdot A_{\text{ges}}}{\pi}} = \sqrt{\frac{4 \cdot 15235{,}20}{\pi}} = \mathbf{139{,}28\text{ mm} \approx 139{,}3\text{ mm}}$$

---

### Aufgabe 10: Behälter
> **Gesucht:** für einen randlosen Kupferbehälter, der in einem Zug auf d = 74 mm mit größtmöglicher Höhe gezogen wird: a) Zuschnittdurchmesser, b) größte Höhe, c) Blechbedarf je Behälter, d) Materialausnutzung beim einreihigen Ausschneiden aus einem 160 mm breiten Streifen.

* **Gegeben:**
  * $d = 74\text{ mm}$, Werkstoff: Kupfer (Cu, $\beta_{1,\max} \approx 2{,}10$), Streifenbreite $B = 160\text{ mm}$
* **Teil a) Zuschnittdurchmesser:**
  $$D = d \cdot \beta_1 = 74 \cdot 2{,}10 = \mathbf{155{,}40\text{ mm}}$$
* **Teil b) Größtmögliche Höhe:**
  $$h_{\max} = \frac{D^2 - d^2}{4 \cdot d} = \frac{155{,}4^2 - 74^2}{4 \cdot 74} = \frac{24149{,}16 - 5476}{296} = \mathbf{63{,}09\text{ mm} \approx 63{,}1\text{ mm}}$$
* **Teil c) & d) Blechbedarf & Ausnutzung:**
  * Mit Stegbreite $e = 3\text{ mm} \implies \text{Vorschub } v = D + e = 158{,}4\text{ mm}$
  * Bruttobedarf: $A_{\text{Bedarf}} = B \cdot v = 160 \cdot 158{,}4 = \mathbf{25344\text{ mm}^2}$
  * Netto-Rondenfläche: $A_{\text{Ronde}} = \frac{\pi \cdot 155{,}4^2}{4} = 18966{,}7\text{ mm}^2$
  * Materialausnutzung: $\eta = \frac{18966{,}7}{25344} = \mathbf{74{,}8\%}$ (Verschnitt: $25{,}2\%$).
