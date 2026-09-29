/**
 * Deep Drawing (Tiefziehen) Sheet Thinning Simulation Engine
 * Based on classical plasticity theory (Siebel, Sachs, Lange, DIN 8584)
 */

const MATERIALS = {
  dc01: {
    name: "DC01 (St 12, 1.0330)",
    Rm: 340,         // Tensile strength (MPa)
    Re: 180,         // Yield strength (MPa)
    n: 0.19,         // Strain hardening exponent
    r_val: 1.5,      // Normal anisotropy
    beta_max: 2.10,  // Max drawing ratio
    color: "#94a3b8"
  },
  dc04: {
    name: "DC04 (St 14, 1.0338)",
    Rm: 310,
    Re: 160,
    n: 0.22,
    r_val: 1.9,
    beta_max: 2.25,
    color: "#64748b"
  },
  al995: {
    name: "EN AW-Al 99,5 (3.0255)",
    Rm: 95,
    Re: 45,
    n: 0.25,
    r_val: 0.7,
    beta_max: 2.10,
    color: "#cbd5e1"
  },
  cu_etp: {
    name: "Kupfer Cu-ETP (CW004A)",
    Rm: 240,
    Re: 110,
    n: 0.32,
    r_val: 0.95,
    beta_max: 2.15,
    color: "#d97706"
  },
  inox: {
    name: "Edelstahl 1.4301 (V2A)",
    Rm: 620,
    Re: 280,
    n: 0.45,
    r_val: 1.05,
    beta_max: 1.95,
    color: "#93c5fd"
  }
};

class DeepDrawingSimulation {
  constructor(options = {}) {
    this.numPoints = 160; // Discretization nodes along sheet radius
    
    // Geometry parameters (in mm)
    this.s0 = options.s0 || 1.0;            // Initial sheet thickness (mm)
    this.dp = options.dp || 50.0;           // Punch diameter (mm)
    this.rp = options.rp || 5.0;            // Punch corner radius (mm)
    this.rd = options.rd || 6.0;            // Die shoulder radius (mm)
    this.clearanceFactor = options.clearanceFactor || 1.15; // w / s0
    this.beta = options.beta || 2.0;        // Drawing ratio D0 / dp
    
    this.materialKey = options.materialKey || 'dc01';
    this.material = MATERIALS[this.materialKey];
    
    this.strokeProgress = 0.0; // 0.0 to 1.0
    this.mu = 0.08;            // Lubrication coefficient of friction
    
    this.points = [];
    this.summary = {};
    
    this.updateGeometry();
  }

  setMaterial(key) {
    if (MATERIALS[key]) {
      this.materialKey = key;
      this.material = MATERIALS[key];
      this.calculate(this.strokeProgress);
    }
  }

  updateGeometry() {
    this.D0 = this.dp * this.beta;
    this.R0 = this.D0 / 2.0;
    this.Rp = this.dp / 2.0;
    // Dynamic clearance (default accommodates up to +28% thickening without ironing)
    this.clearanceFactor = options.clearanceFactor || 1.28;
    this.clearance = this.s0 * this.clearanceFactor;
    this.Rd = this.Rp + this.clearance;
    this.dd = this.Rd * 2.0;
    
    // Maximum cup height based on surface area conservation:
    // h_max = (D0^2 - dp^2) / (4*dp)
    this.hMax = (Math.pow(this.D0, 2) - Math.pow(this.dp, 2)) / (4.0 * this.dp);
    
    this.calculate(this.strokeProgress);
  }

  setStrokeProgress(progress) {
    this.strokeProgress = Math.max(0.0, Math.min(1.0, progress));
    this.calculate(this.strokeProgress);
  }

  calculate(progress) {
    const s0 = this.s0;
    const Rp = this.Rp;
    const rp = Math.min(this.rp, Rp * 0.45);
    const rd = this.rd;
    const Rd = this.Rd;
    const R0 = this.R0;
    const hMax = this.hMax;
    const h = progress * hMax;
    
    this.currentPunchY = -h;

    // --- CASE 1: INITIAL STATE (progress == 0) -> 100% FLAT CIRCULAR BLANK ---
    if (progress <= 0.0001) {
      this.currentFlangeR = R0;
      this.currentDrawingForce = 0.0;
      this.points = [];
      for (let i = 0; i < this.numPoints; i++) {
        const u = i / (this.numPoints - 1);
        const x = u * R0;
        this.points.push({
          index: i,
          l: x,
          x: x,
          y: 0.0,
          s: s0,
          ratio: 1.0,
          deltaPct: 0.0,
          contourPos: x,
          zone: 'flat_blank',
          color: "rgb(16, 185, 129)",
          radialStress: 0.0,
          hoopStress: 0.0
        });
      }

      this.summary = {
        s0: s0,
        sMin: s0,
        sMax: s0,
        thinningPct: 0.0,
        thickeningPct: 0.0,
        clearance_w: this.clearance,
        isIroning: false,
        sMinLocation: "Ausgangszustand (Ebene Ronde)",
        sMaxLocation: "Ausgangszustand (Ebene Ronde)",
        drawingForce: 0.0,
        status: 'good',
        statusText: 'Ausgangszustand: Ebene Blechronde (s = s₀)',
        totalContourLength: R0,
        stroke_mm: 0.0,
        hMax: hMax
      };
      return this.points;
    }

    // --- CASE 2: ACTIVE DRAWING (progress > 0) ---
    const r_flat = Rp - rp;
    const h_bend = rp + rd; // Stroke needed to reach full 90 deg bend

    // Wrap angle grows from 0 to 90 deg (pi/2)
    const wrapFrac = Math.min(1.0, h / Math.max(0.001, h_bend));
    const theta_w = Math.asin(wrapFrac); // 0 at h=0, pi/2 when h >= h_bend

    const wallH = Math.max(0, h - h_bend);

    // Segment lengths along spatial contour
    const L_flat = r_flat;
    const L_rp = rp * theta_w;
    const L_tangent = h < h_bend ?
      Math.hypot(
        ((Rd + rd) - rd * Math.cos(theta_w)) - (r_flat + rp * Math.sin(theta_w)),
        (-rd * (1.0 - Math.sin(theta_w))) - (-h + rp * (1.0 - Math.cos(theta_w)))
      ) : wallH;
    const L_rd = rd * theta_w;

    // Remaining flange area balance
    const drawnArea = Math.PI * (Math.pow(Rp, 2) + 2.0 * Rp * h);
    const remainingFlangeArea = Math.max(0, (Math.PI * Math.pow(R0, 2)) - drawnArea);
    const R_flange_calc = Math.sqrt(Math.pow(Rd + rd, 2) + remainingFlangeArea / Math.PI);
    this.currentFlangeR = Math.min(R0, Math.max(Rd + rd, R_flange_calc));
    const L_flange = Math.max(0, this.currentFlangeR - (Rd + rd));

    const totalSpatialContour = L_flat + L_rp + L_tangent + L_rd + L_flange;

    // Realistic Siebel Kraft-Weg-Kennlinie:
    // Force peaks around 30-40% stroke and drops to 0 at 100% stroke when flange is fully pulled in
    const effectiveRatio = Math.max(1.001, (2.0 * this.currentFlangeR) / this.dp);
    const logRatio = Math.log(effectiveRatio);
    // Bell curve factor shaping: 0 at u=0, peaks at u~0.35, drops to 0 at u=1.0
    const bellFactor = Math.sin(Math.PI * Math.pow(progress, 0.72));
    const F_max_kN = (Math.PI * this.dp * s0 * 1.1 * this.material.Rm * Math.log(this.beta) * Math.exp(this.mu * Math.PI / 2.0)) / 1000.0;
    const F_draw_kN = Math.max(0, F_max_kN * bellFactor * (logRatio / Math.max(0.01, Math.log(this.beta))));
    this.currentDrawingForce = F_draw_kN;

    this.points = [];
    let sMin = s0;
    let sMax = s0;
    let sMinLocation = "Boden";
    let sMaxLocation = "Ausgangszustand";
    let contourLen = 0;

    let prevX = 0;
    let prevY = -h;

    for (let i = 0; i < this.numPoints; i++) {
      const u = i / (this.numPoints - 1);
      const s_dist = u * totalSpatialContour;

      let x = 0;
      let y = 0;
      let s = s0;
      let zone = 'bottom';
      let radialStress = 0;
      let hoopStress = 0;

      // 1. Flat bottom
      if (s_dist <= L_flat) {
        zone = 'bottom';
        x = s_dist;
        y = -h;
        const thinning = 0.015 * progress * (s_dist / Math.max(1.0, r_flat));
        s = s0 * (1.0 - thinning);
        radialStress = 0.2 * this.material.Re * progress;
        hoopStress = radialStress;
      }
      // 2. Punch corner arc
      else if (s_dist <= L_flat + L_rp) {
        zone = 'punch_corner';
        const frac = (s_dist - L_flat) / Math.max(0.001, L_rp);
        const th = frac * theta_w;

        x = r_flat + rp * Math.sin(th);
        y = -h + rp * (1.0 - Math.cos(th));

        const sharpness = Math.max(0.5, 3.2 * (s0 / Math.max(1.0, rp)));
        const tensionRel = (this.currentDrawingForce * 1000.0) / (Math.PI * this.dp * s0 * this.material.Rm + 1.0);
        
        const peakFactor = (0.16 * sharpness + 0.12 * tensionRel) * Math.sin(th);
        const thinning = Math.min(0.38, peakFactor * progress * 1.65);
        s = s0 * (1.0 - thinning);

        radialStress = this.material.Rm * Math.min(0.92, tensionRel);
        hoopStress = 0.05 * radialStress;
      }
      // 3. Incline / Vertical wall
      else if (s_dist <= L_flat + L_rp + L_tangent) {
        zone = 'wall';
        const frac = (s_dist - (L_flat + L_rp)) / Math.max(0.001, L_tangent);

        if (h < h_bend) {
          // Tangent line between punch arc and die arc
          const p1x = r_flat + rp * Math.sin(theta_w);
          const p1y = -h + rp * (1.0 - Math.cos(theta_w));
          const p2x = (Rd + rd) - rd * Math.cos(theta_w);
          const p2y = -rd + rd * Math.sin(theta_w);
          x = p1x + frac * (p2x - p1x);
          y = p1y + frac * (p2y - p1y);
        } else {
          // Fully formed vertical wall
          x = Rp;
          y = -h + rp + frac * wallH;
        }

        const wallThinning = 0.08 * progress * (1.0 - 0.4 * frac);
        s = s0 * (1.0 - wallThinning);

        radialStress = 0.7 * this.material.Rm * progress;
        hoopStress = 0.0;
      }
      // 4. Die shoulder arc
      else if (s_dist <= L_flat + L_rp + L_tangent + L_rd) {
        zone = 'die_corner';
        const frac = (s_dist - (L_flat + L_rp + L_tangent)) / Math.max(0.001, L_rd);
        const angle = (Math.PI / 2.0 - theta_w) + frac * theta_w;

        x = (Rd + rd) - rd * Math.cos(angle);
        y = -rd + rd * Math.sin(angle);

        s = s0 * (0.92 + 0.18 * frac * progress);
        radialStress = 0.5 * this.material.Rm;
        hoopStress = -0.4 * this.material.Re;
      }
      // 5. Flange / Rim
      else {
        zone = 'flange';
        const frac = (s_dist - (L_flat + L_rp + L_tangent + L_rd)) / Math.max(0.001, L_flange);
        x = (Rd + rd) + frac * L_flange;
        y = 0.0;

        const hoopRatio = Math.max(0.45, x / R0);
        const thickening = (Math.pow(1.0 / hoopRatio, 0.52) - 1.0) * progress * 1.25;
        s = s0 * (1.0 + Math.min(0.36, thickening));

        radialStress = 0.3 * this.material.Re * (1.0 - frac);
        hoopStress = -0.9 * this.material.Re * progress;
      }

      if (i > 0) {
        contourLen += Math.hypot(x - prevX, y - prevY);
      }
      prevX = x;
      prevY = y;

      if (s < sMin) {
        sMin = s;
        sMinLocation = zone === 'punch_corner' ? 'Stempelkante (r_p)' : 'Zylinderwand';
      }
      if (s > sMax) {
        sMax = s;
        sMaxLocation = zone === 'flange' ? 'Oberer Rand (Flansch)' : 'Zylinderwand';
      }

      const ratio = s / s0;
      const color = this.getColorForRatio(ratio);

      this.points.push({
        index: i,
        l: s_dist,
        x: x,
        y: y,
        s: s,
        ratio: ratio,
        deltaPct: (ratio - 1.0) * 100.0,
        contourPos: contourLen,
        zone: zone,
        color: color,
        radialStress: radialStress,
        hoopStress: hoopStress
      });
    }

    const thinningPct = (1.0 - (sMin / s0)) * 100.0;
    const thickeningPct = ((sMax / s0) - 1.0) * 100.0;
    const drawingRatioExceeded = this.beta > this.material.beta_max;
    const sharpPunch = this.rp < (3.0 * s0);

    let status = 'good';
    let statusText = 'Optimaler Umformbereich';

    if (thinningPct > 26.0 || drawingRatioExceeded || (sharpPunch && thinningPct > 20.0)) {
      status = 'critical';
      statusText = drawingRatioExceeded ? 
        `Gefahr von Bodenreißer! (β=${this.beta.toFixed(2)} > βmax=${this.material.beta_max})` :
        `Kritische Ausdünnung an Stempelkante! (-${thinningPct.toFixed(1)}%)`;
    } else if (thinningPct > 15.0 || sharpPunch || this.beta > (this.material.beta_max * 0.95)) {
      status = 'warning';
      statusText = sharpPunch ? 
        `Stempelradius sehr scharf (rp < 3·s0)! Hohe Einschnürung.` : 
        `Erhöhte Reißgefahr (-${thinningPct.toFixed(1)}% Wandminderung)`;
    }

    const isIroning = sMax > this.clearance;
    if (isIroning && status === 'good') {
      status = 'warning';
      statusText = `Achtung: Flanschdicke (${sMax.toFixed(2)} mm) > Ziehspalt w (${this.clearance.toFixed(2)} mm) → Abstreckgefahr!`;
    }

    this.summary = {
      s0: s0,
      sMin: sMin,
      sMax: sMax,
      thinningPct: thinningPct,
      thickeningPct: thickeningPct,
      clearance_w: this.clearance,
      isIroning: isIroning,
      sMinLocation: sMinLocation,
      sMaxLocation: sMaxLocation,
      drawingForce: this.currentDrawingForce,
      status: status,
      statusText: statusText,
      totalContourLength: contourLen,
      stroke_mm: h,
      hMax: hMax
    };

    return this.points;
  }

  getColorForRatio(ratio) {
    if (ratio < 0.82) {
      const t = Math.max(0, (ratio - 0.65) / 0.17);
      const r = Math.round(230 + t * 25);
      const g = Math.round(30 + t * 50);
      const b = Math.round(30 + t * 20);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (ratio < 0.96) {
      const t = (ratio - 0.82) / 0.14;
      const r = Math.round(245 - t * 30);
      const g = Math.round(110 + t * 90);
      const b = Math.round(40 - t * 20);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (ratio <= 1.05) {
      return "rgb(16, 185, 129)"; // Nominal green
    } else if (ratio < 1.18) {
      const t = (ratio - 1.05) / 0.13;
      const r = Math.round(16 - t * 10);
      const g = Math.round(185 - t * 5);
      const b = Math.round(129 + t * 83);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const t = Math.min(1.0, (ratio - 1.18) / 0.17);
      const r = Math.round(6 + t * 50);
      const g = Math.round(180 - t * 50);
      const b = Math.round(212 + t * 40);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
}
