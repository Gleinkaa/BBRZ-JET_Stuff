/**
 * 3D Cutaway View of the Deep Drawn Cup with Thickness Colormap (Three.js)
 */

class View3D {
  constructor(containerId, simulation) {
    this.container = document.getElementById(containerId);
    this.sim = simulation;
    
    this.showWireframe = false;
    this.cutawayAngle = 1.5 * Math.PI; // 270 degree revolution (90 deg cutaway)
    
    this.initThree();
    this.updateMesh();
  }

  initThree() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x131316);

    // 2. Camera - positioned for an elevated perspective into the cutaway cup
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    this.camera.position.set(75, 55, 90);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls with on-demand rendering
    if (window.THREE && THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.target.set(0, -12, 0);
      this.controls.maxPolarAngle = Math.PI * 0.48; // Don't flip below ground
      this.controls.addEventListener('change', () => this.requestRender());
    }

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.95);
    dirLight1.position.set(60, 100, 80);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.4);
    dirLight2.position.set(-60, -20, -50);
    this.scene.add(dirLight2);

    // Subtle floor grid
    this.gridHelper = new THREE.GridHelper(160, 16, 0x334155, 0x1e293b);
    this.gridHelper.position.y = -45;
    this.scene.add(this.gridHelper);

    // Cup mesh group
    this.cupGroup = new THREE.Group();
    this.scene.add(this.cupGroup);

    // Transparent punch preview group
    this.punchGroup = new THREE.Group();
    this.scene.add(this.punchGroup);

    window.addEventListener('resize', () => this.onResize());

    // On-demand rendering system
    this.renderRequested = false;
    this.requestRender();
  }

  requestRender() {
    if (!this.renderRequested) {
      this.renderRequested = true;
      requestAnimationFrame(() => {
        this.renderRequested = false;
        if (this.controls) this.controls.update();
        this.renderer.render(this.scene, this.camera);
      });
    }
  }

  // Reframe only when the tool geometry changes, so user orbiting is kept during playback
  fitCamera() {
    const key = `${this.sim.R0.toFixed(2)}|${this.sim.hMax.toFixed(2)}`;
    if (key === this.cameraKey || !this.controls) return;
    this.cameraKey = key;
    const size = Math.max(this.sim.R0, this.sim.hMax, 30) / 50.0;
    const target = new THREE.Vector3(0, -Math.min(12, this.sim.hMax * 0.25) - (size - 1) * 25, 0);
    const offset = new THREE.Vector3(75, 67, 90).multiplyScalar(size);
    this.controls.target.copy(target);
    this.camera.position.copy(target).add(offset);
    this.gridHelper.scale.setScalar(Math.max(1, size));
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.requestRender();
  }

  updateMesh() {
    // Clear previous meshes
    while (this.cupGroup.children.length > 0) {
      const obj = this.cupGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
      this.cupGroup.remove(obj);
    }
    while (this.punchGroup.children.length > 0) {
      const obj = this.punchGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
      this.punchGroup.remove(obj);
    }

    const pts = this.sim.points;
    if (!pts || pts.length < 2) return;

    // Keep the floor below the deepest cup this geometry can produce
    this.gridHelper.position.y = -Math.max(45, this.sim.hMax + 5);
    this.fitCamera();

    const numTheta = 54; // Circumferential segments
    const maxTheta = this.cutawayAngle; // 270 deg cutaway
    const numRad = pts.length;

    const vertices = [];
    const colors = [];
    const indices = [];

    const parseColor = (colorStr) => {
      const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return new THREE.Color(
          parseInt(match[1]) / 255,
          parseInt(match[2]) / 255,
          parseInt(match[3]) / 255
        );
      }
      return new THREE.Color(0.2, 0.8, 0.5);
    };

    const ringVerticesCount = (numTheta + 1);

    // --- 1. OUTER SURFACE ---
    // Surface normal of the midsurface contour (pointing to the outside / die side)
    const normals = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(numRad - 1, i + 1)];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      return { nx: dy / len, ny: -dx / len };
    });

    for (let i = 0; i < numRad; i++) {
      const p = pts[i];
      const n = normals[i];
      const r_out = Math.max(0, p.x + n.nx * p.s * 0.5);
      const y = p.y + n.ny * p.s * 0.5;
      const col = parseColor(p.color);

      for (let j = 0; j <= numTheta; j++) {
        const theta = (j / numTheta) * maxTheta;
        const vx = r_out * Math.cos(theta);
        const vz = r_out * Math.sin(theta);
        const vy = y;

        vertices.push(vx, vy, vz);
        colors.push(col.r, col.g, col.b);
      }
    }

    for (let i = 0; i < numRad - 1; i++) {
      for (let j = 0; j < numTheta; j++) {
        const a = i * ringVerticesCount + j;
        const b = (i + 1) * ringVerticesCount + j;
        const c = (i + 1) * ringVerticesCount + (j + 1);
        const d = i * ringVerticesCount + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // --- 2. INNER SURFACE ---
    const innerVertexOffset = vertices.length / 3;
    for (let i = 0; i < numRad; i++) {
      const p = pts[i];
      const n = normals[i];
      const r_in = Math.max(0, p.x - n.nx * p.s * 0.5);
      const y = p.y - n.ny * p.s * 0.5;
      const col = parseColor(p.color);

      for (let j = 0; j <= numTheta; j++) {
        const theta = (j / numTheta) * maxTheta;
        const vx = r_in * Math.cos(theta);
        const vz = r_in * Math.sin(theta);
        const vy = y;

        vertices.push(vx, vy, vz);
        colors.push(col.r * 0.88, col.g * 0.88, col.b * 0.88);
      }
    }

    for (let i = 0; i < numRad - 1; i++) {
      for (let j = 0; j < numTheta; j++) {
        const a = innerVertexOffset + i * ringVerticesCount + j;
        const b = innerVertexOffset + (i + 1) * ringVerticesCount + j;
        const c = innerVertexOffset + (i + 1) * ringVerticesCount + (j + 1);
        const d = innerVertexOffset + i * ringVerticesCount + (j + 1);

        indices.push(a, d, b);
        indices.push(b, d, c);
      }
    }

    // --- 3. CUTAWAY CROSS SECTION CAPS (THICKNESS SECTION) ---
    // Cap at theta = 0
    for (let i = 0; i < numRad - 1; i++) {
      const out_a = i * ringVerticesCount;
      const out_b = (i + 1) * ringVerticesCount;
      const in_a = innerVertexOffset + i * ringVerticesCount;
      const in_b = innerVertexOffset + (i + 1) * ringVerticesCount;

      indices.push(out_a, in_a, out_b);
      indices.push(in_a, in_b, out_b);
    }

    // Cap at theta = maxTheta
    for (let i = 0; i < numRad - 1; i++) {
      const out_a = i * ringVerticesCount + numTheta;
      const out_b = (i + 1) * ringVerticesCount + numTheta;
      const in_a = innerVertexOffset + i * ringVerticesCount + numTheta;
      const in_b = innerVertexOffset + (i + 1) * ringVerticesCount + numTheta;

      indices.push(out_a, out_b, in_a);
      indices.push(in_a, out_b, in_b);
    }

    // --- 4. RIM CAP (UPPER EDGE) ---
    const last_i = numRad - 1;
    for (let j = 0; j < numTheta; j++) {
      const out_j1 = last_i * ringVerticesCount + j;
      const out_j2 = last_i * ringVerticesCount + (j + 1);
      const in_j1 = innerVertexOffset + last_i * ringVerticesCount + j;
      const in_j2 = innerVertexOffset + last_i * ringVerticesCount + (j + 1);

      indices.push(out_j1, out_j2, in_j1);
      indices.push(out_j2, in_j2, in_j1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.28,
      metalness: 0.52,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.cupGroup.add(mesh);

    // Transparent ghost cylinder of punch
    const punchR = this.sim.Rp;
    const punchH = 40;
    const punchGeom = new THREE.CylinderGeometry(punchR, punchR, punchH, 32);
    const punchMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.22,
      roughness: 0.3,
      metalness: 0.7
    });
    const punchMesh = new THREE.Mesh(punchGeom, punchMat);
    punchMesh.position.y = this.sim.currentPunchY + punchH * 0.5;
    this.punchGroup.add(punchMesh);

    // Request on-demand render
    this.requestRender();
  }
}
