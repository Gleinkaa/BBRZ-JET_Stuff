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
      
      for (const pt of this.sim.points) {
        const ptScreenX_r = this.originX + pt.x * this.scale;
        const ptScreenX_l = this.originX - pt.x * this.scale;
        const ptScreenY = this.originY - pt.y * this.scale;
        
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
    const scale = this.scale;
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

    // ------------------------------------------------
    // 1. Draw Die (Ziehring / Matrize) - Left & Right
    // ------------------------------------------------
    const Rd = sim.Rd;
    const rd = sim.rd;
    // Die top surface supports bottom of sheet
    const visualThickness = sim.s0 * 2.2;
    const dieY = oy + (visualThickness * 0.5) * scale;
    const dieDepth = 145 * scale;
    const dieOuterW = 75 * scale;

    const drawDieBlock = (side) => {
      const sign = side === 'right' ? 1 : -1;
      const dieInnerX = ox + sign * Rd * scale;
      const dieOuterX = ox + sign * (Rd * scale + dieOuterW);

      const dieGrad = ctx.createLinearGradient(dieInnerX, dieY, dieOuterX, dieY + dieDepth);
      dieGrad.addColorStop(0, "#1e293b");
      dieGrad.addColorStop(1, "#0f172a");
      ctx.fillStyle = dieGrad;
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(dieInnerX, dieY + dieDepth);
      ctx.lineTo(dieInnerX, dieY + rd * scale);
      if (side === 'right') {
        ctx.arc(dieInnerX + rd * scale, dieY + rd * scale, rd * scale, Math.PI, 1.5 * Math.PI, false);
      } else {
        ctx.arc(dieInnerX - rd * scale, dieY + rd * scale, rd * scale, 0, 1.5 * Math.PI, true);
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
    const currentMaxThicknessVisual = (sim.summary.sMax || sim.s0) * 2.2;
    const bhY = dieY - currentMaxThicknessVisual * scale;
    const bhHeight = 45 * scale;
    const bhOuterW = 70 * scale;

    const drawBlankholderBlock = (side) => {
      const sign = side === 'right' ? 1 : -1;
      const innerX = ox + sign * (Rd + rd + 1.2) * scale;
      const outerX = ox + sign * (Rd + rd + 1.2) * scale + sign * bhOuterW;

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
      for (let a = 0; a < 2; a++) {
        const ax = Math.min(innerX, outerX) + (a + 0.5) * (Math.abs(outerX - innerX) / 2);
        const ay1 = bhY - bhHeight + 6 * scale;
        const ay2 = bhY - 6 * scale;
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
    const Rp = sim.Rp;
    const rp = sim.rp;
    // Punch bottom rests on top of sheet when stroke is 0
    const punchY = (oy - (visualThickness * 0.5) * scale) - sim.currentPunchY * scale;
    const punchHeight = 160 * scale;

    const punchGrad = ctx.createLinearGradient(ox - Rp * scale, punchY - punchHeight, ox + Rp * scale, punchY);
    punchGrad.addColorStop(0, "#334155");
    punchGrad.addColorStop(0.5, "#475569");
    punchGrad.addColorStop(1, "#334155");
    ctx.fillStyle = punchGrad;
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(ox - Rp * scale, punchY - punchHeight);
    ctx.lineTo(ox - Rp * scale, punchY - rp * scale);
    ctx.arc(ox - (Rp - rp) * scale, punchY - rp * scale, rp * scale, Math.PI, 0.5 * Math.PI, true);
    ctx.lineTo(ox + (Rp - rp) * scale, punchY);
    ctx.arc(ox + (Rp - rp) * scale, punchY - rp * scale, rp * scale, 0.5 * Math.PI, 0, true);
    ctx.lineTo(ox + Rp * scale, punchY - punchHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Punch velocity arrow
    if (sim.strokeProgress < 0.99 && sim.strokeProgress > 0.001) {
      ctx.strokeStyle = "#38bdf8";
      ctx.fillStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      const pvy1 = punchY - 55 * scale;
      const pvy2 = punchY - 18 * scale;
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
      const visualThicknessFactor = 2.2;

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
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`STEMPEL (d = ${sim.dp.toFixed(0)} mm)`, ox, punchY - 75 * scale);

      ctx.fillStyle = "#f59e0b";
      ctx.fillText("NIEDERHALTER", ox + Rd * scale + 35 * scale, bhY - bhHeight - 8);

      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`ZIEHRING (rd = ${sim.rd.toFixed(1)} mm)`, ox + Rd * scale + 35 * scale, dieY + 45 * scale);

      // Status indicator on sheet
      if (sim.strokeProgress <= 0.0001) {
        ctx.fillStyle = "rgba(16, 185, 129, 0.95)";
        ctx.font = "11px JetBrains Mono, monospace";
        ctx.textAlign = "center";
        ctx.fillText(`EBENE BLECHRONDE: D₀ = ${sim.D0.toFixed(0)} mm | s₀ = ${sim.s0.toFixed(2)} mm (100% konstant)`, ox, dieY + 28);
      } else {
        // CRITICAL CALLOUT: Punch corner thinning
        if (sim.strokeProgress > 0.12) {
          let minPt = pts[0];
          for (const p of pts) if (p.s < minPt.s) minPt = p;

          const px = ox + minPt.x * scale;
          const py = oy - minPt.y * scale;

          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + 40, py + 38);
          ctx.lineTo(px + 130, py + 38);
          ctx.stroke();

          ctx.fillStyle = "#ef4444";
          ctx.beginPath(); ctx.arc(px, py, 4, 0, 2 * Math.PI); ctx.fill();

          ctx.font = "10px JetBrains Mono, monospace";
          ctx.textAlign = "left";
          ctx.fillText(`AUSDUeNNUNG: -${sim.summary.thinningPct.toFixed(1)}%`, px + 44, py + 28);
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.fillText(`s_min = ${minPt.s.toFixed(2)} mm (Reißgefahr!)`, px + 44, py + 50);
        }

        // THICKENING CALLOUT: Rim
        if (sim.strokeProgress > 0.18) {
          const rimPt = pts[pts.length - 1];
          const rx = ox + rimPt.x * scale;
          const ry = oy - rimPt.y * scale;

          ctx.strokeStyle = "#06b6d4";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx + 25, ry - 32);
          ctx.lineTo(rx + 110, ry - 32);
          ctx.stroke();

          ctx.fillStyle = "#06b6d4";
          ctx.beginPath(); ctx.arc(rx, ry, 4, 0, 2 * Math.PI); ctx.fill();

          ctx.font = "10px JetBrains Mono, monospace";
          ctx.textAlign = "left";
          ctx.fillText(`VERDICKUNG: +${sim.summary.thickeningPct.toFixed(1)}%`, rx + 30, ry - 40);
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.fillText(`s_max = ${rimPt.s.toFixed(2)} mm`, rx + 30, ry - 20);
        }
      }
    }

    // ------------------------------------------------
    // 6. Hover Highlight
    // ------------------------------------------------
    if (this.hoverPoint) {
      const hp = this.hoverPoint;
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
