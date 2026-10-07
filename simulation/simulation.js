/**
 * Deep Drawing (Tiefziehen) Sheet Thickness Simulation Engine
 *
 * Semi-analytical, volume-conserving membrane model of the first draw of a
 * cylindrical cup (Erstzug). It is a teaching model, not FEM — but every
 * effect it shows follows from a physical law rather than a hand-drawn curve:
 *
 *  - Material points are tracked by their initial radius R. Each one carries
 *    the volume π·R²·s0 of the blank inside it, and is placed along the
 *    current sheet midline so that ∫ 2π·x·s dl matches that volume.
 *    Volume is therefore conserved by construction.
 *  - Flange & die radius: radial stress from the Siebel equilibrium, hoop
 *    stress from the Hill-48 yield locus (normal anisotropy r), thickness
 *    strain from the associated flow rule. The rim (σr = 0) thickens with
 *    s/s0 = (R0/r)^(1/(1+r)).
 *  - Bending + unbending over the die radius costs ~ (σr/σf)·s/(4·ρ) each.
 *  - Bottom, punch radius and wall carry the line tension coming out of the
 *    die. A point only thins when that tension exceeds its load capacity
 *    s·σf(ε) (plane strain, resp. equi-biaxial in the bottom). Strain
 *    hardening (Hollomon, n) makes pre-strained material stronger, so the
 *    neck forms at the virgin material around the punch radius. If the
 *    tension exceeds the maximum capacity (instability at ε ≈ n) the cup
 *    tears: Bodenreißer.
 *  - Punch force = vertical component of the wall tension, 2π·x·t·sin(θ).
 */

const MATERIALS = {
  dc01: {
    name: "DC01 (St 12, 1.0330)",
    Rm: 340,         // Tensile strength (MPa)
    Re: 180,         // Yield strength (MPa)
    n: 0.19,         // Strain hardening exponent
    r_val: 1.5,      // Normal anisotropy
    beta_max: 2.10,  // Max drawing ratio (Tabellenbuch)
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

const ZONE_LABELS = {
  flat_blank: 'Ausgangszustand (Ebene Ronde)',
  bottom: 'Boden',
  punch_corner: 'Stempelkante (r_p)',
  wall: 'Zylinderwand',
  die_corner: 'Ziehringkante (r_d)',
  flange: 'Oberer Rand (Flansch)'
};

class DeepDrawingSimulation {
  constructor(options = {}) {
    this.numPoints = 180; // Material points along the blank radius

    // Geometry parameters (in mm)
    this.s0 = options.s0 ?? 1.0;                          // Initial sheet thickness
    this.dp = options.dp ?? 50.0;                         // Punch diameter
    this.rp = options.rp ?? 5.0;                          // Punch corner radius
    this.rd = options.rd ?? 6.0;                          // Die shoulder radius
    this.clearanceFactor = options.clearanceFactor ?? 1.28; // w / s0
    this.beta = options.beta ?? 2.0;                      // Drawing ratio D0 / dp

    this.materialKey = options.materialKey || 'dc01';
    this.material = MATERIALS[this.materialKey];

    this.mu = 0.08;        // Friction die / blank holder (lubricated)
    this.muPunch = 0.15;   // Friction punch (holds the bottom, less lubricated)
    this.bendFactor = 0.9; // Tension concentration at the punch radius ~ 1 + k·s/(2·rp)

    this.strokeProgress = 0.0;
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
    this.D0 = this.dp * this.beta;
    this.R0 = this.D0 / 2.0;
    this.Rp = this.dp / 2.0;
    this.rpEff = Math.min(this.rp, this.Rp * 0.45);
    this.clearance = this.s0 * this.clearanceFactor;
    this.Rd = this.Rp + this.clearance;
    this.dd = this.Rd * 2.0;

    // Midsurface tool circles (used by the views): punch arc centre C1 moves
    // with the stroke (c1y = s0/2 - h + rp), die arc centre C2 is fixed.
    this.r1 = this.rpEff + this.s0 / 2.0;
    this.r2 = this.rd + this.s0 / 2.0;
    this.c1x = this.Rp - this.rpEff;
    this.c2x = this.Rd + this.rd;
    this.c2y = -this.s0 / 2.0 - this.rd;

    // Textbook cup height for a sharp-cornered cup: h = (D0² − d²) / (4·d)
    this.hTextbook = (this.D0 * this.D0 - this.dp * this.dp) / (4.0 * this.dp);

    // Hollomon σf = K·(ε0 + ε)^n, fitted so that σf(0) = Re and the
    // engineering tensile strength (instability at ε = n) equals Rm.
    const m = this.material;
    this.K = m.Rm * Math.pow(Math.E / m.n, m.n);
    this.eps0 = Math.pow(m.Re / this.K, 1.0 / m.n);

    this.runHistory();
    this.calculate(this.strokeProgress);
  }

  setStrokeProgress(progress) {
    this.strokeProgress = Math.max(0.0, Math.min(1.0, progress));
    this.calculate(this.strokeProgress);
  }

  flowStress(eps) {
    return this.K * Math.pow(this.eps0 + eps, this.material.n);
  }

  // ------------------------------------------------------------------
  // Sheet midline for punch stroke h: bottom → punch radius → free span /
  // wall → die radius → flange. The free span is the inner common tangent
  // of the two (thickness-offset) tool radii, so the wrap angle follows
  // from the geometry.
  // ------------------------------------------------------------------
  buildContour(h) {
    const s0 = this.s0;
    const rp = this.rpEff;
    const rd = this.rd;
    const a = rp + s0 / 2;          // Midline radius around the punch
    const b = rd + s0 / 2;          // Midline radius around the die
    const rFlat = this.Rp - rp;
    const c1x = rFlat, c1y = s0 / 2 - h + rp;
    const c2x = this.Rd + rd, c2y = -s0 / 2 - rd;

    const dx = c2x - c1x, dy = c2y - c1y;
    const L = Math.hypot(dx, dy);
    const nAng = Math.atan2(dy, dx) - Math.acos(Math.min(1.0, (a + b) / L));
    const thetaW = Math.max(0, nAng + Math.PI / 2); // Wrap angle at punch & die

    const xs = [0, rFlat], ys = [-h, -h], zones = ['bottom', 'bottom'];
    const nArc = 40;
    for (let k = 1; k <= nArc; k++) {
      const ang = -Math.PI / 2 + thetaW * k / nArc;
      xs.push(c1x + a * Math.cos(ang)); ys.push(c1y + a * Math.sin(ang)); zones.push('punch_corner');
    }
    const iT1 = xs.length - 1;
    xs.push(c2x - b * Math.cos(nAng)); ys.push(c2y - b * Math.sin(nAng)); zones.push('wall');
    const iT2 = xs.length - 1;
    for (let k = 1; k <= nArc; k++) {
      const ang = (nAng + Math.PI) - thetaW * k / nArc;
      xs.push(c2x + b * Math.cos(ang)); ys.push(c2y + b * Math.sin(ang)); zones.push('die_corner');
    }
    xs.push(c2x + 3 * this.R0 + 50); ys.push(0); zones.push('flange');

    // Cumulative length l and swept area A = ∫ 2π·x dl
    const ls = [0], As = [0];
    for (let j = 1; j < xs.length; j++) {
      const len = Math.hypot(xs[j] - xs[j - 1], ys[j] - ys[j - 1]);
      ls.push(ls[j - 1] + len);
      As.push(As[j - 1] + Math.PI * (xs[j - 1] + xs[j]) * len);
    }

    return {
      xs, ys, zones, ls, As, thetaW,
      xT1: xs[iT1], xT2: xs[iT2],
      lT1: ls[iT1], lT2: ls[iT2],
      lDieEnd: ls[iT2 + nArc],
      rIn: c2x
    };
  }

  // Position on the contour where the swept area reaches A.
  locate(c, A) {
    const As = c.As;
    let lo = 1, hi = As.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (As[mid] < A) lo = mid + 1; else hi = mid;
    }
    const j = lo;
    const x1 = c.xs[j - 1], x2 = c.xs[j];
    const len = c.ls[j] - c.ls[j - 1];
    let t = 0;
    if (len > 1e-12) {
      // A(t) = A_{j-1} + 2π·len·(x1·t + (x2 - x1)·t²/2)
      const rhs = (A - As[j - 1]) / (2 * Math.PI * len);
      const q = (x2 - x1) / 2;
      if (Math.abs(q) < 1e-12) {
        t = rhs / Math.max(1e-12, x1);
      } else {
        t = (-x1 + Math.sqrt(Math.max(0, x1 * x1 + 4 * q * rhs))) / (2 * q);
      }
      t = Math.max(0, Math.min(1, t));
    }
    return {
      x: x1 + t * (x2 - x1),
      y: c.ys[j - 1] + t * (c.ys[j] - c.ys[j - 1]),
      l: c.ls[j - 1] + t * len,
      zone: c.zones[j]
    };
  }

  place(c, s) {
    const out = [{ x: 0, y: c.ys[0], l: 0, zone: 'bottom' }];
    let A = 0;
    for (let i = 1; i < this.numPoints; i++) {
      A += (this.V[i] - this.V[i - 1]) / (0.5 * (s[i - 1] + s[i]));
      out.push(this.locate(c, A));
    }
    return out;
  }

  // Hill-48 (normal anisotropy): hoop stress in the flange for a given radial
  // stress, and the flow-rule ratio dε_s / dε_t.
  flangeFlow(q) {
    const r = this.material.r_val;
    const cH = 2 * r / (1 + r);
    const qMax = 2 / Math.sqrt(4 - cH * cH);
    q = Math.max(0, Math.min(0.995 * qMax, q));
    const qt = (cH * q - Math.sqrt(Math.max(0, cH * cH * q * q - 4 * (q * q - 1)))) / 2;
    const ratio = -(q + qt) / ((1 + r) * qt - r * q);
    return { qt, ratio };
  }

  // Thinning δ (thickness strain, positive = thinner) a membrane point needs
  // so that its load capacity s·f·σf(ε) matches the line tension t.
  // f = 1 + plane-strain or equi-biaxial yield factor (Hill-48).
  capacityThinning(t, s, epsEq, f) {
    const n = this.material.n;
    const g = (d) => s * Math.exp(-d) * f * this.flowStress(epsEq + f * d);
    if (g(0) >= t) return { delta: 0, torn: false };
    const dStar = (n * f - this.eps0 - epsEq) / f;
    if (dStar <= 0 || g(dStar) < t) {
      return { delta: Math.max(0, dStar) + 0.25, torn: true };
    }
    let lo = 0, hi = dStar;
    for (let k = 0; k < 40; k++) {
      const mid = 0.5 * (lo + hi);
      if (g(mid) < t) lo = mid; else hi = mid;
    }
    return { delta: hi, torn: false };
  }

  // ------------------------------------------------------------------
  // Incremental simulation of the whole stroke. Frames are stored so the
  // slider / animation can scrub through them.
  // ------------------------------------------------------------------
  runHistory() {
    const N = this.numPoints;
    const s0 = this.s0;
    const m = this.material;
    const r = m.r_val;

    this.Rs = [];
    this.V = [];
    for (let i = 0; i < N; i++) {
      const R = this.R0 * i / (N - 1);
      this.Rs.push(R);
      this.V.push(Math.PI * R * R * s0);
    }

    // Material state
    let s = new Array(N).fill(s0);
    let eps = new Array(N).fill(0);
    let pos = this.Rs.map((R) => ({ x: R, y: 0, l: R, zone: 'flange' }));

    const Y = 2 / Math.sqrt(2 + 2 * r / (1 + r)); // (σr - σt)/σf in the flange (Hill)
    const fPs = (1 + r) / Math.sqrt(1 + 2 * r);    // Plane-strain strength factor
    const fBi = Math.sqrt((1 + r) / 2);            // Equi-biaxial strength factor
    // Blank-holder pressure (Siebel / Tabellenbuch): p = [(β-1)² + d/(200·s0)]·Rm/400
    const pBH = (Math.pow(this.beta - 1, 2) + this.dp / (200 * s0)) * m.Rm / 400;

    const hArea = (this.D0 * this.D0 - this.dp * this.dp) / (4 * this.dp);
    const hEst = hArea + this.rpEff + this.rd + 2 * s0;
    const dh = hEst / 300;
    const hCap = 3 * hEst;

    this.frames = [this.makeFrame(0, pos, s, null, 0, false)];
    this.tearFrame = -1;

    let h = 0;
    let done = false;
    let ironedAny = false;
    while (!done && h < hCap) {
      h += dh;
      const c = this.buildContour(h);
      const rIn = c.rIn;

      // --- Drawing stress out of the flange (Siebel equilibrium) ---
      // σr(x) = ∫_x^Rf Y·σf(ε(ρ)) dρ/ρ  + blank-holder friction,
      // integrated over the actual (work-hardened) flange material.
      const Rf = pos[N - 1].x;
      let iF = N - 1;
      while (iF > 0 && pos[iF - 1].zone === 'flange') iF--;
      const fx = [], fI = [];
      let acc = 0;
      for (let i = N - 1; i >= iF; i--) {
        if (i < N - 1) {
          const sfm = 0.5 * (this.flowStress(eps[i]) + this.flowStress(eps[i + 1]));
          acc += Y * sfm * Math.log(pos[i + 1].x / Math.max(1e-9, pos[i].x));
        }
        fx.push(pos[i].x); fI.push(acc);
      }
      const sfIn = this.flowStress(eps[iF]);
      const sIn = s[iF];
      const ideal = (x) => {
        if (x >= Rf) return 0;
        for (let k = 1; k < fx.length; k++) {
          if (x >= fx[k]) {
            const u = (x - fx[k]) / Math.max(1e-9, fx[k - 1] - fx[k]);
            return fI[k] + u * (fI[k - 1] - fI[k]);
          }
        }
        // Between the innermost flange point and the die entry
        return fI[fI.length - 1] + Y * sfIn * Math.log(fx[fx.length - 1] / Math.max(1e-9, x));
      };
      const FN = Rf > rIn ? pBH * Math.PI * (Rf * Rf - rIn * rIn) : 0;
      // σr in the flange at radius x (equilibrium + share of blank-holder friction)
      const sigR = (x, si) => {
        if (Rf <= x) return 0;
        const fric = Rf > rIn ? this.mu * FN * (Rf * Rf - x * x) / (Rf * Rf - rIn * rIn) / (Math.PI * x * si) : 0;
        return ideal(x) + fric;
      };
      const sigFlangeIn = Rf > rIn ? sigR(rIn, sIn) : 0;
      const wrapFrac = Math.min(1, c.thetaW / (Math.PI / 2));
      // Material still on the die radius keeps shrinking in hoop direction
      // (r_in → wall radius), which costs another Y·σf·ln(r_in / x_wall).
      const rimOnTool = pos[N - 1].zone === 'flange' || pos[N - 1].zone === 'die_corner';
      const xRimNow = Math.min(rIn, pos[N - 1].x);
      const sigDie = rimOnTool ? Y * sfIn * Math.log(xRimNow / Math.max(1e-9, c.xT2)) : 0;
      const sigWall = rimOnTool
        ? (sigFlangeIn + sigDie) * Math.exp(this.mu * c.thetaW) + sfIn * sIn / (2 * this.rd) * wrapFrac
        : 0;
      const tWall = sigWall * sIn;                 // Line tension at die exit (N/mm)
      const tPunch = tWall * c.xT2 / Math.max(1e-6, c.xT1);
      const force = 2 * Math.PI * c.xT2 * tWall * Math.sin(c.thetaW);

      // --- Update every material point (two fixed-point passes) ---
      let sNew = s, epsNew = eps, newPos = pos, torn = false, tornIdx = -1, ironedNow = false;
      for (let pass = 0; pass < 2; pass++) {
        newPos = this.place(c, sNew);
        const sTry = s.slice();
        ironedNow = false;
        const eTry = eps.slice();
        torn = false;
        for (let i = 1; i < N; i++) {
          const p = newPos[i];
          const old = pos[i];
          const sf = this.flowStress(eps[i]);

          if (p.zone === 'flange' || p.zone === 'die_corner') {
            // Hoop compression → thickness change via Hill flow rule
            const dEt = Math.log(p.x / Math.max(1e-9, old.x));
            const sr = p.zone === 'flange' ? sigR(p.x, s[i])
              : sigFlangeIn + Y * sf * Math.log(Math.min(rIn, xRimNow) / Math.max(c.xT2, Math.min(p.x, rIn)));
            const { ratio } = this.flangeFlow(sr / sf);
            const dEs = ratio * dEt;
            const dEr = -dEt - dEs;
            sTry[i] = s[i] * Math.exp(dEs);
            eTry[i] = eps[i] + Math.sqrt(2 / 3 * (dEt * dEt + dEs * dEs + dEr * dEr));
          } else {
            // Membrane under line tension: bottom, punch radius, wall
            let t, f;
            if (p.zone === 'bottom') {
              t = tPunch * Math.exp(-this.muPunch * c.thetaW);
              f = fBi;
            } else if (p.zone === 'punch_corner') {
              const psi = Math.min(c.thetaW, Math.max(0, (p.l - c.ls[1]) / (this.rpEff + s0 / 2)));
              const kb = 1 + this.bendFactor * s[i] / (2 * this.rpEff);
              t = tPunch * Math.exp(-this.muPunch * (c.thetaW - psi)) * kb;
              f = fPs;
            } else {
              t = tWall * c.xT2 / Math.max(1e-6, p.x);
              f = fPs;
            }
            const res = this.capacityThinning(t, s[i], eps[i], f);
            if (res.torn && !torn) { torn = true; tornIdx = i; }
            sTry[i] = s[i] * Math.exp(-res.delta);
            eTry[i] = eps[i] + f * res.delta;
          }

          // Bending + unbending over the die radius under back tension
          const enteredDie = old.zone === 'flange' && (p.zone === 'die_corner' || p.zone === 'wall');
          const leftDie = (old.zone === 'die_corner' || old.zone === 'flange') && p.zone !== 'die_corner' && p.zone !== 'flange';
          const q = Math.min(1, sigFlangeIn / sf);
          const bendLoss = q * s[i] / (4 * (this.rd + s0 / 2));
          if (enteredDie) sTry[i] *= Math.exp(-bendLoss);
          if (leftDie) sTry[i] *= Math.exp(-bendLoss);

          // The die gap cannot pass more than w: thicker material is ironed
          // (Abstrecken). Volume stays exact because placement uses s.
          if (p.zone === 'wall' && p.x > this.Rp && sTry[i] > this.clearance) {
            sTry[i] = this.clearance;
            ironedNow = true;
          }
        }
        sTry[0] = sTry[1];
        eTry[0] = eTry[1];
        sNew = sTry;
        epsNew = eTry;
      }
      // Final placement with the final thicknesses → exact volume balance.
      // A point may only cross into the die gap here, so iron once more.
      newPos = this.place(c, sNew);
      let reIroned = false;
      for (let i = 1; i < N; i++) {
        if (newPos[i].zone === 'wall' && newPos[i].x > this.Rp && sNew[i] > this.clearance) {
          sNew[i] = this.clearance;
          reIroned = true;
        }
      }
      if (reIroned) {
        ironedNow = true;
        newPos = this.place(c, sNew);
      }

      s = sNew;
      eps = epsNew;
      pos = newPos;

      if (torn && this.tearFrame < 0) {
        this.tearFrame = this.frames.length;
        this.tearIndex = tornIdx;
      }
      // Cup is fully drawn once the rim has left the die radius
      if (pos[N - 1].zone !== 'flange' && pos[N - 1].zone !== 'die_corner') done = true;

      ironedAny = ironedAny || ironedNow;
      const sigInfo = { sigR, sigFlangeIn, tWall, Rf };
      const frame = this.makeFrame(h, pos, s, sigInfo, done ? 0 : force / 1000, torn);
      frame.ironed = ironedAny;
      this.frames.push(frame);
    }

    this.hMax = this.frames[this.frames.length - 1].h;
  }

  makeFrame(h, pos, s, sigInfo, forceKN, torn) {
    const N = this.numPoints;
    const xs = new Float64Array(N), ys = new Float64Array(N), ss = new Float64Array(N);
    const sr = new Float64Array(N), st = new Float64Array(N);
    const zones = new Array(N);
    for (let i = 0; i < N; i++) {
      xs[i] = pos[i].x; ys[i] = pos[i].y; ss[i] = s[i];
      zones[i] = h === 0 ? 'flat_blank' : pos[i].zone;
      if (sigInfo) {
        if (zones[i] === 'flange') {
          const sigma = sigInfo.sigR(pos[i].x, s[i]);
          sr[i] = sigma;
          st[i] = this.flangeFlow(sigma / this.flowStress(0)).qt * this.flowStress(0);
        } else if (zones[i] === 'die_corner') {
          sr[i] = sigInfo.sigFlangeIn;
        } else {
          sr[i] = sigInfo.tWall / s[i];
        }
      }
    }
    return { h, xs, ys, ss, zones, sr, st, force: forceKN, torn };
  }

  calculate(progress) {
    const s0 = this.s0;
    const frames = this.frames;
    const N = this.numPoints;

    // After a tear the cup cannot be drawn further: freeze at the tear state.
    const lastUsable = this.tearFrame >= 0 ? this.tearFrame : frames.length - 1;
    const fpos = Math.min(progress * (frames.length - 1), lastUsable);
    const i0 = Math.floor(fpos);
    const i1 = Math.min(lastUsable, i0 + 1);
    const w = fpos - i0;
    const A = frames[i0], B = frames[i1];
    const pick = w < 0.5 ? A : B;

    const h = A.h + w * (B.h - A.h);
    this.currentPunchY = -h;
    this.currentDrawingForce = A.force + w * (B.force - A.force);

    this.points = [];
    let contourLen = 0;
    let iMin = 0, iMax = 0;
    for (let i = 0; i < N; i++) {
      const x = A.xs[i] + w * (B.xs[i] - A.xs[i]);
      const y = A.ys[i] + w * (B.ys[i] - A.ys[i]);
      const s = A.ss[i] + w * (B.ss[i] - A.ss[i]);
      if (i > 0) {
        const prev = this.points[i - 1];
        contourLen += Math.hypot(x - prev.x, y - prev.y);
      }
      const ratio = s / s0;
      this.points.push({
        index: i,
        R: this.Rs[i],
        l: contourLen,
        x, y, s,
        ratio,
        deltaPct: (ratio - 1.0) * 100.0,
        contourPos: contourLen,
        zone: pick.zones[i],
        color: this.getColorForRatio(ratio),
        radialStress: pick.sr[i],
        hoopStress: pick.st[i]
      });
      if (s < this.points[iMin].s) iMin = i;
      if (s > this.points[iMax].s) iMax = i;
    }
    this.currentFlangeR = this.points[N - 1].x;
    this.minIndex = iMin;
    this.maxIndex = iMax;

    const sMin = this.points[iMin].s;
    const sMax = this.points[iMax].s;
    const thinningPct = Math.max(0, (1.0 - sMin / s0) * 100.0);
    const thickeningPct = Math.max(0, (sMax / s0 - 1.0) * 100.0);

    // Ironing: material reaching the die gap was thicker than the gap w
    let sGap = 0;
    for (const p of this.points) {
      if (p.zone === 'die_corner' || (p.zone === 'wall' && p.x > this.Rp)) sGap = Math.max(sGap, p.s);
    }
    const isIroning = pick.ironed === true || sGap > this.clearance + 1e-9;
    // Blank must reach past the die shoulder, otherwise nothing is held
    const blankTooSmall = this.R0 < this.Rd + this.rd + s0;

    const isTorn = this.tearFrame >= 0 && fpos >= this.tearFrame - 1e-9;
    const tearH = this.tearFrame >= 0 ? frames[this.tearFrame].h : null;

    let status = 'good';
    let statusText = 'Optimaler Umformbereich';
    if (h <= 1e-9) {
      statusText = 'Ausgangszustand: Ebene Blechronde (s = s₀)';
    } else if (isTorn) {
      status = 'critical';
      statusText = `Bodenreißer bei h = ${tearH.toFixed(1)} mm! Zugkraft > Tragfähigkeit an der Stempelkante`;
    } else if (thinningPct >= 20.0) {
      status = 'critical';
      statusText = `Kritische Ausdünnung: -${thinningPct.toFixed(1)}% (${ZONE_LABELS[this.points[iMin].zone]})`;
    } else if (this.tearFrame >= 0) {
      status = 'warning';
      statusText = `Achtung: Dieser Zug reißt bei h = ${tearH.toFixed(1)} mm (β = ${this.beta.toFixed(2)})`;
    } else if (thinningPct >= 15.0) {
      status = 'warning';
      statusText = `Erhöhte Reißgefahr: -${thinningPct.toFixed(1)}% Wanddickenminderung`;
    } else if (blankTooSmall) {
      status = 'warning';
      statusText = `Ronde (D₀ = ${this.D0.toFixed(0)} mm) reicht kaum über die Ziehringrundung – β zu klein`;
    } else if (isIroning) {
      status = 'warning';
      statusText = `Rand dicker als Ziehspalt w = ${this.clearance.toFixed(2)} mm → wird abgestreckt`;
    } else if (this.beta > this.material.beta_max) {
      status = 'warning';
      statusText = `β = ${this.beta.toFixed(2)} über Tabellenwert βmax = ${this.material.beta_max.toFixed(2)}`;
    } else if (this.rp < 3.0 * s0) {
      status = 'warning';
      statusText = 'Stempelradius sehr scharf (r_p < 3·s₀) → hohe Einschnürung';
    }

    this.summary = {
      s0,
      sMin,
      sMax,
      iMin,
      iMax,
      thinningPct,
      thickeningPct,
      clearance_w: this.clearance,
      isIroning,
      blankTooSmall,
      isTorn,
      tearStroke: tearH,
      sMinLocation: ZONE_LABELS[this.points[iMin].zone],
      sMaxLocation: iMax >= N - 3 ? 'Oberer Rand (Napfrand)' : ZONE_LABELS[this.points[iMax].zone],
      drawingForce: this.currentDrawingForce,
      peakForce: Math.max(...frames.slice(0, lastUsable + 1).map((f) => f.force)),
      status,
      statusText,
      totalContourLength: contourLen,
      stroke_mm: h,
      // A torn cup stops at the tear; the full-draw stroke is never reached
      hMax: tearH !== null ? tearH : this.hMax,
      cupHeight: h <= 1e-9 ? 0 : this.points[N - 1].y + h
    };

    return this.points;
  }

  getColorForRatio(ratio) {
    if (ratio < 0.80) {
      const t = Math.max(0, (ratio - 0.60) / 0.20);
      const r = Math.round(200 + t * 45);
      const g = Math.round(20 + t * 60);
      const b = Math.round(30 + t * 10);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (ratio < 0.96) {
      const t = (ratio - 0.80) / 0.16;
      const r = Math.round(245 - t * 30);
      const g = Math.round(110 + t * 90);
      const b = Math.round(40 - t * 20);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (ratio <= 1.05) {
      return "rgb(16, 185, 129)"; // Nominal green
    } else if (ratio < 1.20) {
      const t = (ratio - 1.05) / 0.15;
      const r = Math.round(16 - t * 10);
      const g = Math.round(185 - t * 5);
      const b = Math.round(129 + t * 83);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const t = Math.min(1.0, (ratio - 1.20) / 0.20);
      const r = Math.round(6 + t * 50);
      const g = Math.round(180 - t * 50);
      const b = Math.round(212 + t * 40);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
}

if (typeof module !== 'undefined') module.exports = { DeepDrawingSimulation, MATERIALS };
