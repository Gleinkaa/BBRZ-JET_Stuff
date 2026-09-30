/**
 * Real-time Chart for Sheet Thickness Distribution s(l) along contour
 */

class ThicknessChart {
  constructor(canvasId, simulation) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.sim = simulation;
    
    this.hoverIndex = null;
    this.padding = { top: 25, right: 35, bottom: 50, left: 105 }; // Generous left padding
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
    
    this.render();
  }

  render(hoverPt = null) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const sim = this.sim;
    const pad = this.padding;
    const pts = sim.points;

    if (!pts || pts.length < 2) return;

    ctx.clearRect(0, 0, w, h);

    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    // Y-axis range: 60% to 140% of s0
    const s0 = sim.s0;
    const yMinVal = s0 * 0.60;
    const yMaxVal = s0 * 1.40;

    const maxContour = sim.summary.totalContourLength || 100;
    const mapX = (l) => pad.left + (l / maxContour) * plotW;
    const mapY = (s) => pad.top + plotH - ((s - yMinVal) / (yMaxVal - yMinVal)) * plotH;

    // ------------------------------------------------
    // 1. Zone Background Tints
    // ------------------------------------------------
    // Necking zone (below 85%)
    const y85 = mapY(s0 * 0.85);
    ctx.fillStyle = "rgba(239, 68, 68, 0.08)";
    ctx.fillRect(pad.left, y85, plotW, (pad.top + plotH) - y85);

    // Thickening zone (above 105%)
    const y105 = mapY(s0 * 1.05);
    ctx.fillStyle = "rgba(6, 182, 212, 0.08)";
    ctx.fillRect(pad.left, pad.top, plotW, y105 - pad.top);

    // ------------------------------------------------
    // 2. Grid & Reference Lines
    // ------------------------------------------------
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.font = "11px JetBrains Mono, monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";

    const pctTicks = [0.70, 0.80, 0.90, 1.00, 1.10, 1.20, 1.30];
    for (const pct of pctTicks) {
      const val = s0 * pct;
      const y = mapY(val);

      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();

      // Tick label with clean alignment
      ctx.textAlign = "right";
      const deltaSign = pct >= 1.0 ? "+" : "";
      const deltaText = pct === 1.0 ? "±0%" : `${deltaSign}${Math.round((pct - 1.0) * 100)}%`;
      ctx.fillText(`${val.toFixed(2)} mm (${deltaText})`, pad.left - 10, y + 4);
    }

    // Nominal thickness line (100% s0) - bold dashed emerald
    const yNominal = mapY(s0);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, yNominal);
    ctx.lineTo(pad.left + plotW, yNominal);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(16, 185, 129, 0.95)";
    ctx.textAlign = "left";
    ctx.fillText("Ausgangsdicke s₀ = " + s0.toFixed(2) + " mm (100%)", pad.left + 12, yNominal - 6);

    // Critical necking limit line (80% s0) - dashed red
    const yCrit = mapY(s0 * 0.80);
    ctx.strokeStyle = "rgba(239, 68, 68, 0.75)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, yCrit);
    ctx.lineTo(pad.left + plotW, yCrit);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
    ctx.fillText("Kritische Reißgrenze (80% · s₀)", pad.left + 12, yCrit - 6);

    // X-axis ticks (Contour distance in mm)
    const numXTicks = 5;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    for (let i = 0; i <= numXTicks; i++) {
      const lVal = (i / numXTicks) * maxContour;
      const x = mapX(lVal);

      ctx.beginPath();
      ctx.moveTo(x, pad.top + plotH);
      ctx.lineTo(x, pad.top + plotH + 5);
      ctx.stroke();

      ctx.fillText(`${lVal.toFixed(0)} mm`, x, pad.top + plotH + 18);
    }

    ctx.textAlign = "center";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillText("Abgewickelte Konturlänge von Bodenmitte (l = 0) bis Zylinderrand (mm)", pad.left + plotW * 0.5, h - 8);

    // ------------------------------------------------
    // 3. Plot Thickness Curve s(l)
    // ------------------------------------------------
    // Gradient fill under the curve
    ctx.beginPath();
    ctx.moveTo(mapX(pts[0].contourPos), mapY(pts[0].s));
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(mapX(pts[i].contourPos), mapY(pts[i].s));
    }
    ctx.lineTo(mapX(pts[pts.length - 1].contourPos), pad.top + plotH);
    ctx.lineTo(mapX(pts[0].contourPos), pad.top + plotH);
    ctx.closePath();

    const areaGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
    areaGrad.addColorStop(0, "rgba(6, 182, 212, 0.3)");
    areaGrad.addColorStop(0.5, "rgba(16, 185, 129, 0.18)");
    areaGrad.addColorStop(1, "rgba(239, 68, 68, 0.3)");
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Colored curve segments
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];

      ctx.strokeStyle = p1.color;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(mapX(p1.contourPos), mapY(p1.s));
      ctx.lineTo(mapX(p2.contourPos), mapY(p2.s));
      ctx.stroke();
    }

    // ------------------------------------------------
    // 4. Highlight Minima (Thinning Peak) & Maxima
    // ------------------------------------------------
    let minPt = pts[0];
    for (const p of pts) {
      if (p.s < minPt.s) minPt = p;
    }
    if (minPt.s < s0 * 0.96) {
      const mx = mapX(minPt.contourPos);
      const my = mapY(minPt.s);

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(mx, my, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Tooltip box on minimum point
      ctx.fillStyle = "rgba(20, 20, 20, 0.9)";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1;
      const boxW = 150;
      const boxH = 34;
      const boxX = Math.min(pad.left + plotW - boxW, Math.max(pad.left, mx - boxW * 0.5));
      const boxY = Math.min(pad.top + plotH - boxH - 4, my + 14);

      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.font = "10px JetBrains Mono, monospace";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(`AUSDÜNNUNG (rp):`, boxX + boxW * 0.5, boxY + 14);
      ctx.fillStyle = "#ef4444";
      ctx.fillText(`s_min = ${minPt.s.toFixed(2)}mm (${minPt.deltaPct.toFixed(1)}%)`, boxX + boxW * 0.5, boxY + 27);
    }

    // Maximum (normally the rim, unless it was ironed down to the die gap)
    const maxPt = pts[sim.summary.iMax] || pts[pts.length - 1];
    if (maxPt.s > s0 * 1.04) {
      const rx = mapX(maxPt.contourPos);
      const ry = mapY(maxPt.s);

      ctx.fillStyle = "#06b6d4";
      ctx.beginPath();
      ctx.arc(rx, ry, 6, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "rgba(20, 20, 20, 0.9)";
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 1;
      const boxW = 145;
      const boxH = 34;
      const boxX = Math.max(pad.left + 4, rx - boxW - 8);
      const boxY = Math.max(pad.top + 4, ry - boxH * 0.5);

      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.font = "10px JetBrains Mono, monospace";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(maxPt.index === pts.length - 1 ? `VERDICKUNG (Rand):` : `VERDICKUNG (max):`, boxX + boxW * 0.5, boxY + 14);
      ctx.fillStyle = "#06b6d4";
      ctx.fillText(`s_max = ${maxPt.s.toFixed(2)}mm (+${maxPt.deltaPct.toFixed(1)}%)`, boxX + boxW * 0.5, boxY + 27);
    }

    // ------------------------------------------------
    // 5. Crosshair on Hover
    // ------------------------------------------------
    if (hoverPt) {
      const hx = mapX(hoverPt.contourPos);
      const hy = mapY(hoverPt.s);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(hx, pad.top);
      ctx.lineTo(hx, pad.top + plotH);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pad.left, hy);
      ctx.lineTo(pad.left + plotW, hy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(hx, hy, 6, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}
