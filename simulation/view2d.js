/**
 * 2D Full Symmetric Cross-Section View of Deep Drawing Tool & Deforming Sheet
 */

class View2D {
  constructor(canvasId, simulation) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.sim = simulation;
    
    this.hoverPoint = null;
    this.showDimensions = true;
    
    this.scale = 3.3; // Pixels per mm
    this.initEvents();
    this.resize();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
    
    // Symmetrical center
    this.originX = this.width * 0.5;
    this.originY = this.height * 0.38;
    
    this.render();
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      let closest = null;
      let minDist = 25.0;
      
      const scale = this.drawScale || this.scale;
      for (const pt of this.sim.points) {
        const ptScreenX_r = this.originX + pt.x * scale;
        const ptScreenX_l = this.originX - pt.x * scale;
        const ptScreenY = this.originY - pt.y * scale;
        
        const dist_r = Math.hypot(mouseX - ptScreenX_r, mouseY - ptScreenY);
        const dist_l = Math.hypot(mouseX - ptScreenX_l, mouseY - ptScreenY);

        if (dist_r < minDist) {
          minDist = dist_r;
          closest = pt;
        } else if (dist_l < minDist) {
          minDist = dist_l;
          closest = pt;
        }
      }
      
      this.hoverPoint = closest;
      this.render();
      
      if (this.onHoverCallback) {
        this.onHoverCallback(closest, mouseX, mouseY);
      }
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      this.hoverPoint = null;
      this.render();
      if (this.onHoverCallback) {
        this.onHoverCallback(null);
      }
    });
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const sim = this.sim;
    // Fit the full stroke: blank width horizontally, cup depth above the legend overlay
    const legendH = 105;
    const fitW = (w * 0.5 - 12) / (sim.R0 + 4);
    const fitH = (h * 0.62 - legendH) / (sim.hMax + sim.s0 * 2);
    const scale = Math.max(0.8, Math.min(this.scale, fitW, fitH));
    this.drawScale = scale;
    const ox = this.originX;
    const oy = this.originY;

    ctx.clearRect(0, 0, w, h);

    // Subtle background grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    const gridSize = 20 * scale;
    for (let x = ox % gridSize; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = oy % gridSize; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Symmetry centerline
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.setLineDash([8, 4, 2, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ox, 16);
    ctx.lineTo(ox, h - 16);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tools are drawn around the sheet midsurface of the simulation. The sheet is
    // shown 2.2× thicker than scale, so the tool surfaces move out by the same
    // extra half-thickness `ex` to keep sheet and tools touching, not overlapping.
    const visualThicknessFactor = 2.2;
    const visualThickness = sim.s0 * visualThicknessFactor;
    const ex = (visualThicknessFactor - 1.0) * sim.s0 * 0.5;
    const X = (x) => ox + x * scale;
    const Y = (y) => oy - y * scale;

    // ------------------------------------------------
    // 1. Draw Die (Ziehring / Matrize) - Left & Right
    // ------------------------------------------------
    const dieArcR = Math.max(0.3, sim.rd - ex);
    const dieFaceY = sim.c2y + dieArcR;                  // sim units
    const dieY = Y(dieFaceY);
    // Tool blocks run to the canvas edges so they read as tools at any zoom level
    const dieDepth = h - dieY + 10;
    const dieOuterW = w;

    const drawDieBlock = (side) => {
      const sign = side === 'right' ? 1 : -1;
      const cx = ox + sign * sim.c2x * scale;
      const cy = Y(sim.c2y);
      const dieInnerX = cx - sign * dieArcR * scale;
      const dieOuterX = ox + sign * (sim.c2x * scale + dieOuterW);

      const dieGrad = ctx.createLinearGradient(dieInnerX, dieY, dieOuterX, dieY + dieDepth);
      dieGrad.addColorStop(0, "#1e293b");
      dieGrad.addColorStop(1, "#0f172a");
      ctx.fillStyle = dieGrad;
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(dieInnerX, dieY + dieDepth);
      ctx.lineTo(dieInnerX, cy);
      if (side === 'right') {
        ctx.arc(cx, cy, dieArcR * scale, Math.PI, 1.5 * Math.PI, false);
      } else {
        ctx.arc(cx, cy, dieArcR * scale, 0, 1.5 * Math.PI, true);
      }
      ctx.lineTo(dieOuterX, dieY);
      ctx.lineTo(dieOuterX, dieY + dieDepth);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    drawDieBlock('right');
    drawDieBlock('left');

    // ------------------------------------------------
    // 2. Draw Blankholder (Niederhalter) - Left & Right
    // ------------------------------------------------
    // Rests on the thickest part of the flange (or on the rim once the flange is gone)
    let sHold = sim.s0;
    for (const p of sim.points) {
      if (p.zone === 'flange' || p.zone === 'flat_blank') sHold = Math.max(sHold, p.s);
    }
    const bhY = Y(sHold * visualThicknessFactor * 0.5);
    const bhHeight = Math.max(20, bhY - 6);
    const bhOuterW = w;

    const drawBlankholderBlock = (side) => {
      const sign = side === 'right' ? 1 : -1;
      const innerX = ox + sign * (sim.c2x + 1.2) * scale;
      const outerX = innerX + sign * bhOuterW;

      const bhGrad = ctx.createLinearGradient(innerX, bhY - bhHeight, outerX, bhY);
      bhGrad.addColorStop(0, "#243248");
      bhGrad.addColorStop(1, "#182232");
      ctx.fillStyle = bhGrad;
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.rect(Math.min(innerX, outerX), bhY - bhHeight, Math.abs(outerX - innerX), bhHeight);
      ctx.fill();
      ctx.stroke();

      // Force arrows (FN)
      ctx.fillStyle = "#f59e0b";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      const visInner = innerX;
      const visOuter = sign > 0 ? w : 0;
      for (let a = 0; a < 2; a++) {
        const ax = visInner + (a + 0.5) * ((visOuter - visInner) / 2);
        const ay1 = Math.max(8, bhY - 70);
        const ay2 = bhY - 8;
        ctx.beginPath(); ctx.moveTo(ax, ay1); ctx.lineTo(ax, ay2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax - 4, ay2 - 6);
        ctx.lineTo(ax, ay2);
        ctx.lineTo(ax + 4, ay2 - 6);
        ctx.fill();
      }
    };

    drawBlankholderBlock('right');
    drawBlankholderBlock('left');

    // ------------------------------------------------
    // 3. Draw Punch (Stempel)
    // ------------------------------------------------
    const punchArcR = Math.max(0.3, sim.r1 - sim.s0 * 0.5 - ex);
    const c1y = sim.currentPunchY + sim.s0 * 0.5 + sim.rpEff;
    const punchSideX = sim.c1x + punchArcR;
    const punchY = Y(c1y - punchArcR);
    const punchHeight = punchY + 10;
    const pcx = sim.c1x * scale;
    const pcy = Y(c1y);

    const punchGrad = ctx.createLinearGradient(ox - punchSideX * scale, punchY - punchHeight, ox + punchSideX * scale, punchY);
    punchGrad.addColorStop(0, "#334155");
    punchGrad.addColorStop(0.5, "#475569");
    punchGrad.addColorStop(1, "#334155");
    ctx.fillStyle = punchGrad;
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(ox - punchSideX * scale, punchY - punchHeight);
    ctx.lineTo(ox - punchSideX * scale, pcy);
    ctx.arc(ox - pcx, pcy, punchArcR * scale, Math.PI, 0.5 * Math.PI, true);
    ctx.lineTo(ox + pcx, punchY);
    ctx.arc(ox + pcx, pcy, punchArcR * scale, 0.5 * Math.PI, 0, true);
    ctx.lineTo(ox + punchSideX * scale, punchY - punchHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Punch velocity arrow
    if (sim.strokeProgress < 0.99 && sim.strokeProgress > 0.001) {
      ctx.strokeStyle = "#38bdf8";
      ctx.fillStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      const pvy1 = Math.max(8, punchY - 110);
      const pvy2 = punchY - 40;
      ctx.beginPath(); ctx.moveTo(ox, pvy1); ctx.lineTo(ox, pvy2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox - 5, pvy2 - 8);
      ctx.lineTo(ox, pvy2);
      ctx.lineTo(ox + 5, pvy2 - 8);
      ctx.fill();
    }

    // ------------------------------------------------
    // 4. Draw Deformed Sheet Metal Blank (Blechronde)
    // ------------------------------------------------
    const pts = sim.points;
    if (pts.length >= 2) {
      // Special Case: Flat initial plate
      if (sim.strokeProgress <= 0.0001) {
        const r_outer = sim.R0 * scale;
        const sheetH = visualThickness * scale;
        const sheetY = dieY - sheetH;

        ctx.fillStyle = "rgb(16, 185, 129)"; // Pure uniform nominal green
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 1;
        ctx.fillRect(ox - r_outer, sheetY, 2 * r_outer, sheetH);
        ctx.strokeRect(ox - r_outer, sheetY, 2 * r_outer, sheetH);
      } else {
        const drawSheetHalf = (side) => {
          const sign = side === 'right' ? 1 : -1;
          for (let i = 0; i < pts.length - 1; i++) {
            const p1 = pts[i];
            const p2 = pts[i + 1];

            const x1 = ox + sign * p1.x * scale;
            const y1 = oy - p1.y * scale;
            const x2 = ox + sign * p2.x * scale;
            const y2 = oy - p2.y * scale;

            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.hypot(dx, dy) || 1;
            
            const nx = side === 'right' ? -dy / len : dy / len;
            const ny = side === 'right' ? dx / len : -dx / len;

            const t1 = p1.s * scale * visualThicknessFactor;
            const t2 = p2.s * scale * visualThicknessFactor;

            ctx.fillStyle = p1.color;
            ctx.beginPath();
            ctx.moveTo(x1 - nx * (t1 * 0.5), y1 - ny * (t1 * 0.5));
            ctx.lineTo(x2 - nx * (t2 * 0.5), y2 - ny * (t2 * 0.5));
            ctx.lineTo(x2 + nx * (t2 * 0.5), y2 + ny * (t2 * 0.5));
            ctx.lineTo(x1 + nx * (t1 * 0.5), y1 + ny * (t1 * 0.5));
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        };

        drawSheetHalf('right');
        drawSheetHalf('left');
      }
    }

    // ------------------------------------------------
    // 5. Annotations & Callouts
    // ------------------------------------------------
    if (this.showDimensions) {
      ctx.font = "11px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#94a3b8";
      const stempelY = Math.max(14, punchY - 130);
      ctx.fillText(`STEMPEL (d = ${sim.dp.toFixed(0)} mm)`, ox, stempelY);

      // Tool labels sit inside the left-hand blocks; the right half carries the rim callout
      ctx.textAlign = "left";
      ctx.fillStyle = "#f59e0b";
      ctx.fillText("NIEDERHALTER", 12, Math.max(14, bhY - 82));
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`ZIEHRING (r_d = ${sim.rd.toFixed(1)} mm)`, 12, dieY + 20);

      const sum = sim.summary;
      if (sim.strokeProgress <= 0.0001) {
        ctx.fillStyle = "rgba(16, 185, 129, 0.95)";
        ctx.textAlign = "center";
        ctx.fillText(`EBENE BLECHRONDE: D₀ = ${sim.D0.toFixed(0)} mm | s₀ = ${sim.s0.toFixed(2)} mm (100% konstant)`, ox, dieY + 52);
      } else {
        ctx.font = "10px JetBrains Mono, monospace";

        // Thinning callout on the LEFT half (mirror side) so it never meets the rim callout
        const minPt = pts[sum.iMin];
        if (minPt && sum.thinningPct > 3.0) {
          const px = ox - minPt.x * scale;
          const py = oy - minPt.y * scale;
          const ly = Math.min(h - 118, py + 34);
          const lx = Math.max(8, px - 150);

          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - 30, ly);
          ctx.lineTo(lx, ly);
          ctx.stroke();

          ctx.fillStyle = "#ef4444";
          ctx.beginPath(); ctx.arc(px, py, 4, 0, 2 * Math.PI); ctx.fill();

          ctx.textAlign = "left";
          ctx.fillText(`AUSDÜNNUNG: -${sum.thinningPct.toFixed(1)}%`, lx, ly - 6);
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.fillText(`s_min = ${minPt.s.toFixed(2)} mm`, lx, ly + 13);
        }

        // Thickening callout on the RIGHT half at the actual maximum
        const maxPt = pts[sum.iMax];
        if (maxPt && sum.thickeningPct > 3.0) {
          const rx = ox + maxPt.x * scale;
          const ry = oy - maxPt.y * scale;
          const ly = Math.max(28, ry - 30);
          const lx = Math.min(w - 150, rx + 30);

          ctx.strokeStyle = "#06b6d4";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(lx, ly);
          ctx.lineTo(lx + 120, ly);
          ctx.stroke();

          ctx.fillStyle = "#06b6d4";
          ctx.beginPath(); ctx.arc(rx, ry, 4, 0, 2 * Math.PI); ctx.fill();

          ctx.textAlign = "left";
          ctx.fillText(`VERDICKUNG: +${sum.thickeningPct.toFixed(1)}%`, lx, ly - 6);
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.fillText(`s_max = ${maxPt.s.toFixed(2)} mm`, lx, ly + 13);
        }
      }
    }

    // ------------------------------------------------
    // 6. Hover Highlight
    // ------------------------------------------------
    if (this.hoverPoint) {
      // Points are rebuilt on every calculate(); follow the same material point
      const hp = sim.points[this.hoverPoint.index] || this.hoverPoint;
      const hx_r = ox + hp.x * scale;
      const hx_l = ox - hp.x * scale;
      const hy = oy - hp.y * scale;

      [hx_r, hx_l].forEach(hx => {
        ctx.strokeStyle = "#ffffff";
        ctx.fillStyle = hp.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(hx, hy, 7, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(hx, hy, 13, 0, 2 * Math.PI); ctx.stroke();
      });
    }
  }
}
