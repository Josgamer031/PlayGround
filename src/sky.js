import * as THREE from 'three'

export const SUN_DIR = new THREE.Vector3(-0.52, 0.34, -0.78).normalize()

const skyVert = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`

const skyFrag = /* glsl */`
  precision highp float;
  varying vec3 vDir;
  uniform vec3 sunDir;
  uniform float time;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.04; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);
    float up = clamp(d.y, 0.0, 1.0);

    vec3 zenith = vec3(0.17, 0.40, 0.68);
    vec3 mid = vec3(0.42, 0.66, 0.86);
    vec3 horizon = vec3(0.98, 0.78, 0.56);
    vec3 low = vec3(0.92, 0.68, 0.48);

    vec3 col = mix(mid, zenith, pow(up, 0.62));
    col = mix(horizon, col, smoothstep(0.0, 0.30, d.y));
    col = mix(low, col, smoothstep(-0.12, 0.06, d.y));

    float sd = max(dot(d, sunDir), 0.0);
    col += vec3(1.0, 0.60, 0.26) * pow(sd, 6.0) * 0.42;
    col += vec3(1.0, 0.80, 0.48) * pow(sd, 42.0) * 0.65;
    col += vec3(1.0, 0.94, 0.82) * pow(sd, 1400.0) * 9.0;

    // Soft billowing clouds projected on the sky dome.
    if (d.y > 0.015) {
      vec2 p = d.xz / (d.y + 0.22) * 1.15;
      p += vec2(time * 0.004, time * 0.0016);
      float c = fbm(p * 1.25);
      c = smoothstep(0.50, 0.82, c);
      float fade = smoothstep(0.015, 0.22, d.y) * (1.0 - smoothstep(0.55, 0.95, d.y) * 0.45);
      vec3 cloudLight = mix(vec3(1.0, 0.86, 0.72), vec3(1.0, 0.98, 0.94), smoothstep(0.0, 0.35, d.y));
      vec3 cloudShade = vec3(0.72, 0.66, 0.70);
      vec3 cloudCol = mix(cloudShade, cloudLight, smoothstep(0.5, 0.9, fbm(p * 1.25 + 0.35)));
      col = mix(col, cloudCol, c * fade * 0.88);
    }

    // Warm haze where the sky meets the mountains.
    float haze = pow(1.0 - abs(d.y), 9.0);
    col = mix(col, vec3(0.99, 0.82, 0.64), haze * 0.55);

    gl_FragColor = vec4(col, 1.0);
  }
`

export function createSky() {
  const geo = new THREE.SphereGeometry(880, 40, 24)
  const mat = new THREE.ShaderMaterial({
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    uniforms: {
      sunDir: { value: SUN_DIR.clone() },
      time: { value: 0 }
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  mesh.renderOrder = -100
  mesh.userData.update = t => { mat.uniforms.time.value = t }
  return mesh
}

export function createSunLight() {
  const sun = new THREE.DirectionalLight('#ffe2b8', 2.15)
  sun.position.copy(SUN_DIR).multiplyScalar(120)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 300
  const s = 52
  sun.shadow.camera.left = -s
  sun.shadow.camera.right = s
  sun.shadow.camera.top = s
  sun.shadow.camera.bottom = -s
  sun.shadow.bias = -0.0009
  sun.shadow.normalBias = 0.035
  return sun
}

export function createFillLight() {
  const fill = new THREE.DirectionalLight('#b7d6ff', 0.55)
  fill.position.set(60, 42, 90)
  return fill
}

function rockMat(color = '#5e5a63') {
  return new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, flatShading: true, fog: false })
}

export function createAincrad() {
  const root = new THREE.Group()
  root.position.set(-96, 104, -392)
  root.rotation.y = 0.35
  root.scale.setScalar(2.15)

  const stone = rockMat('#6b6470')
  const stoneDark = rockMat('#4a4552')
  const grass = new THREE.MeshStandardMaterial({ color: '#4f7a46', roughness: 1, flatShading: true, fog: false })
  const roof = new THREE.MeshStandardMaterial({ color: '#33465e', roughness: 0.9, flatShading: true, fog: false })
  const glow = new THREE.MeshBasicMaterial({ color: '#8fe3ff', fog: false })

  // Main floating island
  const island = new THREE.Mesh(new THREE.CylinderGeometry(30, 3, 34, 9, 1), stoneDark)
  island.position.y = -17
  root.add(island)

  const top = new THREE.Mesh(new THREE.CylinderGeometry(30, 27, 5, 9), grass)
  top.position.y = 2
  root.add(top)

  const rim = new THREE.Mesh(new THREE.TorusGeometry(29.2, 1.1, 4, 9), stone)
  rim.rotation.x = Math.PI / 2
  rim.position.y = 4.6
  root.add(rim)

  // Central spire + disk floors
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 5.2, 62, 8), stone)
  spire.position.y = 36
  root.add(spire)
  const spireTop = new THREE.Mesh(new THREE.ConeGeometry(4.6, 12, 8), roof)
  spireTop.position.y = 73
  root.add(spireTop)

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 5.6, 2.4, 12), stone)
    ring.position.set(Math.cos(a) * 15, 10 + i * 7.2, Math.sin(a) * 15)
    root.add(ring)

    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.8, 16, 6), stone)
    tower.position.set(Math.cos(a) * 15, 19 + i * 7.2, Math.sin(a) * 15)
    root.add(tower)

    const cap = new THREE.Mesh(new THREE.ConeGeometry(3.1, 7, 6), roof)
    cap.position.set(Math.cos(a) * 15, 30 + i * 7.2, Math.sin(a) * 15)
    root.add(cap)

    const light = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.1, 0.65), glow)
    light.position.set(Math.cos(a) * 15, 16 + i * 7.2, Math.sin(a) * 15)
    root.add(light)
  }

  // Outer curtain walls
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 7.5, 2.4), stone)
    pillar.position.set(Math.cos(a) * 26, 8.2, Math.sin(a) * 26)
    pillar.rotation.y = -a
    root.add(pillar)
  }

  // Hanging gardens / floating satellites
  const satellites = [
    { p: [44, 30, 8], s: 5.2 },
    { p: [-38, 52, -14], s: 3.8 },
    { p: [20, 68, -24], s: 2.8 },
    { p: [-52, 12, 20], s: 4.4 }
  ]
  for (const sat of satellites) {
    const g = new THREE.Group()
    g.position.set(...sat.p)
    const base = new THREE.Mesh(new THREE.ConeGeometry(sat.s, sat.s * 2.1, 7), stoneDark)
    base.rotation.x = Math.PI
    base.position.y = -sat.s
    g.add(base)
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(sat.s, sat.s * 0.92, 1.2, 8), grass)
    g.add(disc)
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), glow)
    shard.position.y = sat.s + 1.6
    shard.scale.y = 2.4
    g.add(shard)
    root.add(g)
  }

  // Distant glow behind the castle
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(160,220,255,0.55)')
  grad.addColorStop(0.4, 'rgba(120,190,255,0.18)')
  grad.addColorStop(1, 'rgba(120,190,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(canvas)
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.8
  }))
  glowSprite.scale.set(130, 130, 1)
  glowSprite.position.y = 34
  root.add(glowSprite)

  return root
}
