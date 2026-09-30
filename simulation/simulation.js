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
    p_bh: 2.5,        // Blank holder pressure (N/mm²)
    color: "#94a3b8"
  },
  dc04: {
    name: "DC04 (St 14, 1.0338)",
    Rm: 310,
    Re: 160,
    n: 0.22,
    r_val: 1.9,
    beta_max: 2.25,
    p_bh: 2.5,        // Blank holder pressure (N/mm²)
    color: "#64748b"
  },
  al995: {
    name: "EN AW-Al 99,5 (3.0255)",
    Rm: 95,
    Re: 45,
    n: 0.25,
    r_val: 0.7,
    beta_max: 2.10,
    p_bh: 1.2,        // Blank holder pressure (N/mm²)
    color: "#cbd5e1"
  },
  cu_etp: {
    name: "Kupfer Cu-ETP (CW004A)",
    Rm: 240,
    Re: 110,
    n: 0.32,
    r_val: 0.95,
    beta_max: 2.15,
    p_bh: 2.0,        // Blank holder pressure (N/mm²)
    color: "#d97706"
  },
  inox: {
    name: "Edelstahl 1.4301 (V2A)",
    Rm: 620,
    Re: 280,
    n: 0.45,
    r_val: 1.05,
    beta_max: 1.95,
    p_bh: 3.0,        // Blank holder pressure (N/mm²)
    color: "#93c5fd"
  }
};

/**
 * Model overview
 *
 * The blank is tracked as material points (original radius ρ ∈ [0, R0]), not as
 * nodes spread over the current shape. That way every point keeps the strain
 * history it picked up on its way through the tool:
 *
 *  - Kinematics: surface-area constancy (Oberflächengleichheit, as in the
 *    Rechenbuch blank calculation). A point with π·ρ² of blank inside it sits
 *    where the current midsurface contour has enclosed the same area.
 *  - Contour: punch face → punch arc (r_p) → free/wall tangent → die arc (r_d)
 *    → flange. The stroke ends when the rim has left the die radius, i.e. the
 *    cup is fully drawn through.
 *  - Thickness: the hoop strain ε_t = ln(r/ρ) is imposed by the kinematics;
 *    the thickness strain follows Hill's flow rule with normal anisotropy r,
 *    using the Siebel flange stress σ_r = 1.1·σ_f·ln(R_a/r), σ_t = σ_r − σ_f.
 *    At the free rim (σ_r = 0) this gives the maximum thickening
 *    ε_s = −ε_t/(1+r); further in, radial tension reduces it.
 *  - Force: Siebel (flange forming + blank holder friction + bending at the
 *    die radius, with the capstan factor e^(μ·π/2)) using a Hollomon flow curve.
 *  - Punch corner: local necking where the wall meets the punch radius, driven
 *    by the wall stress relative to the Bodenreißkraft π·d·s₀·R_m. This part is
 *    an empirical fit, not a membrane solution.
 */
class DeepDrawingSimulation {
  constructor(options = {}) {
    this.numPoints = 201;   // Material points along the blank radius
    this.numSteps = 240;    // Incremental stroke steps for the strain history

    // Geometry parameters (in mm)
    this.s0 = options.s0 || 1.0;            // Initial sheet thickness (mm)
    this.dp = options.dp || 50.0;           // Punch diameter (mm)
    this.rp = options.rp || 5.0;            // Punch corner radius (mm)
    this.rd = options.rd || 6.0;            // Die shoulder radius (mm)
    this.clearanceFactor = options.clearanceFactor || 1.28; // w / s0
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
      this.updateGeometry();
    }
  }

  updateGeometry() {
    const s0 = this.s0;
    this.D0 = this.dp * this.beta;
    this.R0 = this.D0 / 2.0;
    this.Rp = this.dp / 2.0;
    this.rpEff = Math.min(this.rp, this.Rp * 0.45);
    // Clearance w per side (default accommodates up to +28% thickening without ironing)
    this.clearance = s0 * this.clearanceFactor;
    this.Rd = this.Rp + this.clearance;
    this.dd = this.Rd * 2.0;

    // Midsurface tool circles: punch arc centre C1 (moves with the stroke), die arc centre C2
    this.r1 = this.rpEff + s0 / 2.0;
    this.r2 = this.rd + s0 / 2.0;
    this.c1x = this.Rp - this.rpEff;
    this.c2x = this.Rd + this.rd;
    this.c2y = -s0 / 2.0 - this.rd;

    // Hollomon flow curve σf = K·(ε0 + ε)^n, fitted to Rm (uniform elongation ε = n) and Re
    const m = this.material;
    this.K = m.Rm * Math.pow(Math.E / m.n, m.n);
    this.eps0 = Math.pow(m.Re / this.K, 1.0 / m.n);

    // Textbook cup height for a sharp-cornered cup: h = (D0² − d²) / (4·d)
    this.hTextbook = (Math.pow(this.D0, 2) - Math.pow(this.dp, 2)) / (4.0 * this.dp);
    // Punch stroke until the rim has left the die radius (cup fully drawn through)
    this.hMax = this.solveFullDrawStroke();

    this.buildHistory();
    this.calculate(this.strokeProgress);
  }

  setStrokeProgress(progress) {
    this.strokeProgress = Math.max(0.0, Math.min(1.0, progress));
    this.calculate(this.strokeProgress);
  }

  flowStress(eps) {
    return this.K * Math.pow(this.eps0 + Math.max(0, eps), this.material.n);
  }

  // Wrap angle θ (0 … <90°) of the common tangent between punch arc and die arc
  tangentGeometry(h) {
    const c1y = -h + this.s0 / 2.0 + this.rpEff;
    const dx = this.c2x - this.c1x;
    const dy = this.c2y - c1y;
    const d = Math.hypot(dx, dy);
    const cosA = Math.min(1.0, (this.r1 + this.r2) / d);
    const alpha = Math.acos(cosA);
    // Unit normal n = direction C1→C2 rotated clockwise by α
    const ux = dx / d, uy = dy / d;
    const nx = ux * Math.cos(alpha) + uy * Math.sin(alpha);
    const ny = -ux * Math.sin(alpha) + uy * Math.cos(alpha);
    const theta = Math.atan2(nx, -ny);
    return {
      c1y, theta,
      t1x: this.c1x + this.r1 * nx, t1y: c1y + this.r1 * ny,
      t2x: this.c2x - this.r2 * nx, t2y: this.c2y - this.r2 * ny
    };
  }

  // Midsurface contour as a polyline from the bottom centre outwards, with
  // cumulative surface area (2π∫x dl) and arc length at every vertex.
  buildContour(h) {
    const g = this.tangentGeometry(h);
    const verts = [];
    const push = (x, y, zone, extra = 0) => verts.push({ x, y, zone, extra });

    push(0, -h, 'bottom');
    push(this.c1x, -h, 'bottom');
    const nArc = 48;
    for (let k = 1; k <= nArc; k++) {
      const phi = (k / nArc) * g.theta;
      push(this.c1x + this.r1 * Math.sin(phi), g.c1y - this.r1 * Math.cos(phi), 'punch_corner', phi);
    }
    push(g.t2x, g.t2y, 'wall');
    for (let k = 1; k <= nArc; k++) {
      const psi = g.theta * (1.0 - k / nArc); // ψ = angle still to travel over the die radius
      push(this.c2x - this.r2 * Math.sin(psi), this.c2y + this.r2 * Math.cos(psi), 'die_corner', g.theta - psi);
    }
    push(this.R0 * 1.5 + 10.0, 0, 'flange');

    let A = 0, L = 0;
    verts[0].A = 0; verts[0].L = 0;
    for (let k = 1; k < verts.length; k++) {
      const a = verts[k - 1], b = verts[k];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      A += Math.PI * len * (a.x + b.x);
      L += len;
      b.A = A; b.L = L;
    }
    // Arc length of the tangent point T1 (end of the punch arc)
    const iT1 = 2 + nArc - 1;
    return { verts, g, lT1: verts[iT1].L, aT2: verts[iT1 + 1].A };
  }

  // Place a material point with enclosed area A on the contour
  locate(contour, A) {
    const v = contour.verts;
    let lo = 0, hi = v.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (v[mid].A <= A) lo = mid; else hi = mid;
    }
    const a = v[lo], b = v[hi];
    const len = b.L - a.L;
    const dA = A - a.A;
    // Area over a straight segment: π·len·(2·x1·t + (x2 − x1)·t²) = dA
    const qa = Math.PI * len * (b.x - a.x);
    const qb = 2.0 * Math.PI * len * a.x;
    let t;
    if (Math.abs(qa) < 1e-9) t = qb > 0 ? dA / qb : 0;
    else t = (-qb + Math.sqrt(Math.max(0, qb * qb + 4.0 * qa * dA))) / (2.0 * qa);
    t = Math.max(0, Math.min(1, t));
    return {
      x: a.x + t * (b.x - a.x),
      y: a.y + t * (b.y - a.y),
      l: a.L + t * len,
      zone: b.zone,
      angle: a.extra + t * (b.extra - a.extra)
    };
  }

  solveFullDrawStroke() {
    const A0 = Math.PI * this.R0 * this.R0;
    let lo = 0, hi = 4.0 * this.hTextbook + 4.0 * (this.rpEff + this.rd) + 20.0;
    for (let it = 0; it < 60; it++) {
      const mid = 0.5 * (lo + hi);
      if (this.buildContour(mid).aT2 >= A0) hi = mid; else lo = mid;
    }
    // Small overtravel so the rim is clear of the die radius in the last frame
    return hi + 2.0 * this.s0;
  }

  // Integrate the strain history of every material point over the full stroke.
  // Snapshots per step are interpolated by calculate() for smooth playback.
  buildHistory() {
    const N = this.numPoints, K = this.numSteps;
    const m = this.material, s0 = this.s0, r = m.r_val, mu = this.mu;
    const capstan = Math.exp(mu * Math.PI / 2.0);
    const rho = new Float64Array(N);
    for (let i = 0; i < N; i++) rho[i] = (i / (N - 1)) * this.R0;

    const xPrev = Float64Array.from(rho);
    const epsHill = new Float64Array(N);   // thickness strain from the flow rule
    const epsBend = new Float64Array(N);   // bending/unbending over the die radius
    const epsEq = new Float64Array(N);     // equivalent strain for work hardening
    const neck = new Float64Array(N);      // local thinning fraction (punch corner / bottom)
    const ironed = new Uint8Array(N);      // squeezed to the die gap w (Abstrecken)
    const zonePrev = new Array(N).fill('flange');
    for (let i = 0; i < N; i++) if (rho[i] <= this.c2x) zonePrev[i] = rho[i] <= this.c1x ? 'bottom' : 'wall';

    const dm = this.dp + s0;
    const F_crack = Math.PI * dm * s0 * m.Rm;     // Bodenreißkraft (N)
    const fRp = Math.min(1.8, 0.8 + s0 / Math.max(0.5, this.rpEff));
    const fMat = Math.pow(1.5 / r, 0.25);
    const hRamp = 0.5 * (this.rpEff + this.rd);

    this.history = [];
    let qMax = 0;

    for (let j = 0; j <= K; j++) {
      const h = (j / K) * this.hMax;
      const contour = this.buildContour(h);
      const loc = new Array(N);
      for (let i = 0; i < N; i++) loc[i] = this.locate(contour, Math.PI * rho[i] * rho[i]);

      const rim = loc[N - 1];
      const Ra = rim.x;
      const inFlangeStage = rim.zone === 'flange';
      const xEntry = this.c2x;              // flange / die radius transition
      const aEntry = inFlangeStage ? Math.min(1.0, 1.1 * Math.log(Ra / xEntry)) : 0;

      // --- Siebel drawing force with the current flange state ---
      let F = 0;
      if (h > 0) {
        // Mean flow stress of the material still being drawn in (flange + die radius)
        let sfSum = 0, sfCnt = 0;
        for (let i = 0; i < N; i++) {
          if (loc[i].zone === 'flange' || loc[i].zone === 'die_corner') { sfSum += this.flowStress(epsEq[i]); sfCnt++; }
        }
        const sfm = sfCnt ? sfSum / sfCnt : 0;
        // Siebel: ideal forming work between rim and die opening (R_a / R_d)
        const flangeForming = 1.1 * sfm * Math.log(Math.max(1.0, Ra / this.Rd));
        const F_N = inFlangeStage ? m.p_bh * Math.PI * (Ra * Ra - xEntry * xEntry) : 0;
        const friction = (2.0 * mu * F_N) / (Math.PI * dm * s0);
        // Bending + unbending at the die radius, only while the rim is still on it
        const onDie = inFlangeStage ? 1.0 : (rim.zone === 'die_corner' ? 1.0 - rim.angle / Math.max(1e-6, contour.g.theta) : 0);
        const bending = sfm * s0 / (2.0 * this.rd + s0) * onDie;
        const ramp = Math.sqrt(Math.min(1.0, h / hRamp));
        F = Math.PI * dm * s0 * ((flangeForming + friction) * capstan + bending) * ramp;
      }
      const q = F / F_crack;
      qMax = Math.max(qMax, q);

      // --- Thickness update per material point ---
      if (j > 0) {
        for (let i = 1; i < N; i++) {
          const p = loc[i];
          const dEt = Math.log(p.x / xPrev[i]);
          let k = 0;
          if (p.zone === 'flange') {
            const a = Math.min(1.0, 1.1 * Math.log(Math.max(1.0, Ra / p.x)));
            k = (2.0 * a - 1.0) / (1.0 + r - a);
          } else if (p.zone === 'die_corner') {
            const a = Math.min(1.0, aEntry * Math.exp(mu * p.angle) + s0 / (2.0 * this.rd + s0));
            k = (2.0 * a - 1.0) / (1.0 + r - a);
          }
          // Wall, punch corner, bottom: held by the punch / plane strain → no flow-rule change
          epsHill[i] += k * dEt;
          epsEq[i] += Math.abs(dEt) * Math.sqrt(1.0 + k * k);

          // Bending + unbending when leaving the die radius; thins only under wall tension
          if (zonePrev[i] === 'die_corner' && p.zone === 'wall' && epsBend[i] === 0) {
            epsBend[i] = -0.5 * s0 / (2.0 * this.rd + s0) * Math.min(1.0, q / 0.8);
          }

          // Local necking around the punch-radius / wall transition
          if (p.zone === 'punch_corner' || p.zone === 'wall') {
            const dl = p.l - contour.lT1;
            const width = dl < 0 ? 0.5 * this.r1 + s0 : 0.8 * this.r1 + 2.0 * s0;
            const w = Math.exp(-Math.pow(dl / width, 2));
            neck[i] = Math.max(neck[i], 0.20 * Math.pow(q, 4) * fRp * fMat * w);
          } else if (p.zone === 'bottom') {
            neck[i] = Math.max(neck[i], 0.02 * q * Math.pow(p.x / Math.max(1.0, this.c1x), 2));
          }

          // The die gap cannot pass more than w: thicker material leaving the die radius is ironed
          if (p.zone === 'wall' && zonePrev[i] === 'die_corner') {
            const sNow = s0 * Math.exp(epsHill[i] + epsBend[i]);
            if (sNow > this.clearance) {
              epsHill[i] -= Math.log(sNow / this.clearance);
              ironed[i] = 1;
            }
          }

          xPrev[i] = p.x;
          zonePrev[i] = p.zone;
        }
      }

      const s = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        s[i] = s0 * Math.exp(epsHill[i] + epsBend[i]) * (1.0 - Math.min(0.6, neck[i]));
      }
      this.history.push({ h, F: F / 1000.0, q, qMax, s, ironed: ironed.some(v => v) });
    }
    this.rho = rho;
  }

  calculate(progress) {
    const s0 = this.s0;
    const K = this.numSteps;
    const N = this.numPoints;
    const hMax = this.hMax;
    const h = progress * hMax;

    this.currentPunchY = -h;

    // Interpolate the strain-history snapshots, geometry is evaluated exactly at h
    const fj = progress * K;
    const j0 = Math.min(K, Math.floor(fj));
    const j1 = Math.min(K, j0 + 1);
    const t = fj - j0;
    const H0 = this.history[j0], H1 = this.history[j1];
    const F_kN = H0.F + t * (H1.F - H0.F);
    const qMax = H0.qMax + t * (H1.qMax - H0.qMax);
    this.currentDrawingForce = F_kN;

    const contour = this.buildContour(h);
    const flat = progress <= 0.0001;

    const rim = flat ?
      { x: this.R0, y: 0, l: this.R0, zone: 'flat_blank' } :
      this.locate(contour, Math.PI * this.R0 * this.R0);
    const sf = this.flowStress(0);

    this.points = [];
    let sMin = Infinity, sMax = -Infinity, iMin = 0, iMax = 0;

    for (let i = 0; i < N; i++) {
      const rho = this.rho[i];
      const p = flat ?
        { x: rho, y: 0, l: rho, zone: 'flat_blank', angle: 0 } :
        this.locate(contour, Math.PI * rho * rho);
      const s = H0.s[i] + t * (H1.s[i] - H0.s[i]);

      let radialStress = 0, hoopStress = 0;
      if (!flat) {
        if (p.zone === 'flange') {
          const a = Math.min(1.0, 1.1 * Math.log(Math.max(1.0, rim.x / p.x)));
          radialStress = a * sf;
          hoopStress = (a - 1.0) * sf;
        } else if (p.zone === 'wall' || p.zone === 'punch_corner') {
          radialStress = (F_kN * 1000.0) / (Math.PI * (this.dp + s0) * s);
        }
      }

      if (s < sMin) { sMin = s; iMin = i; }
      if (s > sMax) { sMax = s; iMax = i; }

      const ratio = s / s0;
      this.points.push({
        index: i,
        rho: rho,
        l: p.l,
        x: p.x,
        y: p.y,
        s: s,
        ratio: ratio,
        deltaPct: (ratio - 1.0) * 100.0,
        contourPos: p.l,
        zone: p.zone,
        color: this.getColorForRatio(ratio),
        radialStress: radialStress,
        hoopStress: hoopStress
      });
    }
    this.currentFlangeR = rim.zone === 'flange' ? rim.x : this.c2x;

    const zoneLabel = {
      flat_blank: 'Ausgangszustand (Ebene Ronde)',
      bottom: 'Boden',
      punch_corner: 'Stempelkante (r_p)',
      wall: 'Zylinderwand',
      die_corner: 'Ziehringrundung (r_d)',
      flange: 'Flansch'
    };
    const minPt = this.points[iMin];
    const maxPt = this.points[iMax];
    let sMinLocation = zoneLabel[minPt.zone];
    if (minPt.zone === 'wall' && minPt.l - contour.lT1 < 2.0 * this.r1) sMinLocation = 'Übergang Stempelkante/Wand';
    let sMaxLocation = zoneLabel[maxPt.zone];
    if (iMax === N - 1 && !flat) sMaxLocation = maxPt.zone === 'flange' ? 'Flanschrand' : 'Oberer Napfrand';

    if (flat) {
      sMinLocation = sMaxLocation = zoneLabel.flat_blank;
    }

    const thinningPct = (1.0 - (sMin / s0)) * 100.0;
    const thickeningPct = ((sMax / s0) - 1.0) * 100.0;
    const drawingRatioExceeded = this.beta > this.material.beta_max;
    const forceExceeded = qMax >= 1.0;
    const sharpPunch = this.rp < (3.0 * s0);

    let status = 'good';
    let statusText = 'Optimaler Umformbereich';

    if (flat) {
      statusText = 'Ausgangszustand: Ebene Blechronde (s = s₀)';
    } else if (thinningPct > 25.0 || drawingRatioExceeded || forceExceeded) {
      status = 'critical';
      if (drawingRatioExceeded) {
        statusText = `Gefahr von Bodenreißer! (β=${this.beta.toFixed(2)} > βmax=${this.material.beta_max})`;
      } else if (forceExceeded) {
        statusText = `Bodenreißer! Ziehkraft > Reißkraft (${(qMax * 100).toFixed(0)}% von π·d·s₀·Rm)`;
      } else {
        statusText = `Kritische Ausdünnung an Stempelkante! (-${thinningPct.toFixed(1)}%)`;
      }
    } else if (thinningPct > 15.0 || sharpPunch || this.beta > (this.material.beta_max * 0.95)) {
      status = 'warning';
      if (sharpPunch) {
        statusText = `Stempelradius sehr scharf (rp < 3·s0)! Hohe Einschnürung.`;
      } else if (thinningPct > 15.0) {
        statusText = `Erhöhte Reißgefahr (-${thinningPct.toFixed(1)}% Wandminderung)`;
      } else {
        statusText = `β nahe Grenzziehverhältnis (β=${this.beta.toFixed(2)}, βmax=${this.material.beta_max})`;
      }
    }

    // Blank narrower than the die shoulder: it never lies flat, the blank holder has nothing to clamp
    const blankTooSmall = this.R0 < this.c2x + s0;
    if (blankTooSmall && status !== 'critical') {
      status = 'warning';
      statusText = `Ronde zu klein: D₀ = ${this.D0.toFixed(1)} mm < Ziehring-Ø + 2·r_d (${(2 * this.c2x).toFixed(1)} mm) – kein Flansch unter dem Niederhalter`;
    }

    // Ironing: thickened material had to be squeezed through the die gap w
    const isIroning = !flat && (H0.ironed || sMax > this.clearance);
    if (isIroning && status === 'good') {
      status = 'warning';
      statusText = `Achtung: Wandverdickung > Ziehspalt w (${this.clearance.toFixed(2)} mm) → Abstrecken!`;
    }

    this.summary = {
      s0: s0,
      sMin: sMin,
      sMax: sMax,
      iMin: iMin,
      iMax: iMax,
      thinningPct: thinningPct,
      thickeningPct: thickeningPct,
      clearance_w: this.clearance,
      isIroning: isIroning,
      blankTooSmall: blankTooSmall,
      sMinLocation: sMinLocation,
      sMaxLocation: sMaxLocation,
      drawingForce: F_kN,
      forceRatio: qMax,
      status: status,
      statusText: statusText,
      totalContourLength: flat ? this.R0 : rim.l,
      stroke_mm: h,
      hMax: hMax,
      cupHeight: flat ? 0 : rim.y + h
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
