/**
 * Application Orchestrator: UI Events, Animation Loop, and View Sync
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Physics Engine
  const sim = new DeepDrawingSimulation({
    s0: 1.0,
    dp: 50.0,
    rp: 5.0,
    rd: 6.0,
    beta: 2.0,
    materialKey: 'dc01'
  });

  // 2. Initialize Views
  const view2d = new View2D('canvas2d', sim);
  let view3d = null;
  try {
    view3d = new View3D('canvas3d-container', sim);
  } catch (err) {
    console.error("Three.js 3D View init error:", err);
  }
  const chart = new ThicknessChart('chart-canvas', sim);

  // 3. UI Element References
  const strokeSlider = document.getElementById('stroke-slider');
  const strokeValueText = document.getElementById('stroke-val');
  const btnPlay = document.getElementById('btn-play');
  const btnReset = document.getElementById('btn-reset');
  const btnStepFwd = document.getElementById('btn-step-fwd');
  
  const selectMaterial = document.getElementById('select-material');
  const sliderS0 = document.getElementById('slider-s0');
  const valS0 = document.getElementById('val-s0');
  const sliderBeta = document.getElementById('slider-beta');
  const valBeta = document.getElementById('val-beta');
  const sliderDp = document.getElementById('slider-dp');
  const valDp = document.getElementById('val-dp');
  const sliderRp = document.getElementById('slider-rp');
  const valRp = document.getElementById('val-rp');
  const sliderRd = document.getElementById('slider-rd');
  const valRd = document.getElementById('val-rd');

  // Metrics
  const metricSmin = document.getElementById('metric-smin');
  const metricSminDelta = document.getElementById('metric-smin-delta');
  const metricSminLoc = document.getElementById('metric-smin-loc');
  
  const metricSmax = document.getElementById('metric-smax');
  const metricSmaxDelta = document.getElementById('metric-smax-delta');
  const metricSmaxLoc = document.getElementById('metric-smax-loc');

  const metricFdraw = document.getElementById('metric-fdraw');
  const metricStroke = document.getElementById('metric-stroke');
  const metricStrokeSub = document.getElementById('metric-stroke-sub');

  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');

  // Inspection overlay
  const inspectOverlay = document.getElementById('inspect-overlay');
  const inspectX = document.getElementById('insp-x');
  const inspectS = document.getElementById('insp-s');
  const inspectDelta = document.getElementById('insp-delta');
  const inspectZone = document.getElementById('insp-zone');

  let isPlaying = false;
  let playAnimId = null;

  // 4. Update Function
  function updateAll(hoverPt = null) {
    sim.calculate(sim.strokeProgress);

    // Update 2D View
    view2d.render();

    // Update 3D View
    if (view3d) {
      view3d.updateMesh();
    }

    // Update Chart
    chart.render(hoverPt);

    // Update Telemetry Metrics
    const sum = sim.summary;
    metricSmin.textContent = sum.sMin.toFixed(2) + " mm";
    metricSminDelta.textContent = `-${sum.thinningPct.toFixed(1)}%`;
    metricSminLoc.textContent = sum.sMinLocation;

    metricSmax.textContent = sum.sMax.toFixed(2) + " mm";
    metricSmaxDelta.textContent = `+${sum.thickeningPct.toFixed(1)}%`;
    metricSmaxLoc.textContent = sum.sMaxLocation;

    metricFdraw.textContent = sum.drawingForce.toFixed(1) + " kN";
    metricStroke.textContent = sum.stroke_mm.toFixed(1) + " mm";
    metricStrokeSub.textContent = `von max. ${sum.hMax.toFixed(1)} mm · Napfhöhe ${sum.cupHeight.toFixed(1)} mm`;

    // Status Pill
    statusPill.className = `status-pill ${sum.status}`;
    statusText.textContent = sum.statusText;

    // Stroke slider & label
    strokeSlider.value = Math.round(sim.strokeProgress * 100);
    strokeValueText.textContent = `${Math.round(sim.strokeProgress * 100)}% (${sum.stroke_mm.toFixed(1)} mm)`;
  }

  // 5. Connect Hover between 2D View, Chart, and Tooltip
  view2d.onHoverCallback = (point, mouseX, mouseY) => {
    chart.render(point);
    if (point) {
      inspectOverlay.style.display = 'flex';
      inspectX.textContent = point.x.toFixed(1) + " mm";
      inspectS.textContent = point.s.toFixed(2) + " mm";
      inspectDelta.textContent = (point.deltaPct >= 0 ? "+" : "") + point.deltaPct.toFixed(1) + "%";
      inspectDelta.style.color = point.deltaPct < -15 ? "var(--crit)" : (point.deltaPct > 5 ? "var(--info)" : "var(--good)");
      
      const zoneNames = {
        flat_blank: 'Ebene Ronde',
        bottom: 'Boden (Biaxial)',
        punch_corner: 'Stempelkante (Einschnürung)',
        wall: 'Zylinderwand (Zug)',
        die_corner: 'Ziehringkante',
        flange: 'Flansch (Tangentialstauchung)'
      };
      inspectZone.textContent = zoneNames[point.zone] || point.zone;
    } else {
      inspectOverlay.style.display = 'none';
    }
  };

  // 6. Interactive Event Listeners
  strokeSlider.addEventListener('input', (e) => {
    stopPlayback();
    sim.setStrokeProgress(parseFloat(e.target.value) / 100.0);
    updateAll();
  });

  selectMaterial.addEventListener('change', (e) => {
    sim.setMaterial(e.target.value);
    updateAll();
  });

  sliderS0.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    valS0.textContent = val.toFixed(1) + " mm";
    sim.s0 = val;
    sim.updateGeometry();
    updateAll();
  });

  sliderBeta.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    valBeta.textContent = val.toFixed(2);
    sim.beta = val;
    sim.updateGeometry();
    updateAll();
  });

  sliderDp.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    valDp.textContent = val.toFixed(0) + " mm";
    sim.dp = val;
    sim.updateGeometry();
    updateAll();
  });

  sliderRp.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    valRp.textContent = val.toFixed(1) + " mm";
    sim.rp = val;
    sim.updateGeometry();
    updateAll();
  });

  sliderRd.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    valRd.textContent = val.toFixed(1) + " mm";
    sim.rd = val;
    sim.updateGeometry();
    updateAll();
  });

  // Animation Playback
  function startPlayback() {
    isPlaying = true;
    btnPlay.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
      </svg>
      Pause
    `;

    if (sim.strokeProgress >= 0.999) {
      sim.setStrokeProgress(0.0);
    }

    let lastTime = performance.now();
    function step(now) {
      if (!isPlaying) return;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const speed = 0.22; // 22% stroke per second (~4.5s full stroke)
      let newProgress = sim.strokeProgress + dt * speed;
      if (newProgress >= 1.0) {
        newProgress = 1.0;
        sim.setStrokeProgress(newProgress);
        updateAll();
        stopPlayback();
        return;
      }

      sim.setStrokeProgress(newProgress);
      updateAll();
      playAnimId = requestAnimationFrame(step);
    }

    playAnimId = requestAnimationFrame(step);
  }

  function stopPlayback() {
    isPlaying = false;
    if (playAnimId) cancelAnimationFrame(playAnimId);
    btnPlay.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
      Animation starten
    `;
  }

  btnPlay.addEventListener('click', () => {
    if (isPlaying) stopPlayback();
    else startPlayback();
  });

  btnReset.addEventListener('click', () => {
    stopPlayback();
    sim.setStrokeProgress(0.0);
    updateAll();
  });

  if (btnStepFwd) {
    btnStepFwd.addEventListener('click', () => {
      stopPlayback();
      sim.setStrokeProgress(Math.min(1.0, sim.strokeProgress + 0.1));
      updateAll();
    });
  }

  // Initial state: Start at 0% stroke with a flat plate (Blechronde)
  sim.setStrokeProgress(0.0);
  updateAll();

  // Auto-start simulation playback shortly after initial display
  setTimeout(() => {
    startPlayback();
  }, 750);
});
