import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const dom = {
  body: document.body,
  intro: document.getElementById("intro"),
  enterBtn: document.getElementById("enterBtn"),
  canvas: document.getElementById("sceneCanvas"),
  depositBtn: document.getElementById("depositBtn"),
  pullBtn: document.getElementById("pullBtn"),
  capsuleCard: document.getElementById("capsuleCard"),
  cardTitle: document.getElementById("cardTitle"),
  cardSketch: document.getElementById("cardSketch"),
  cardText: document.getElementById("cardText"),
  cardPalette: document.getElementById("cardPalette"),
  useBtn: document.getElementById("useBtn"),
  keepBtn: document.getElementById("keepBtn"),
  remixBtn: document.getElementById("remixBtn"),
  closeCardBtn: document.getElementById("closeCardBtn"),
  depositModal: document.getElementById("depositModal"),
  closeDepositBtn: document.getElementById("closeDepositBtn"),
  depositForm: document.getElementById("depositForm"),
  historyBtn: document.getElementById("historyBtn"),
  historyShelf: document.getElementById("historyShelf"),
  depositedList: document.getElementById("depositedList"),
  collectedList: document.getElementById("collectedList"),
  idleLine: document.getElementById("idleLine"),
  soundToggle: document.getElementById("soundToggle"),
  remixTools: document.getElementById("remixTools"),
  toolDraw: document.getElementById("toolDraw"),
  toolRecolor: document.getElementById("toolRecolor"),
  toolText: document.getElementById("toolText"),
  toast: document.getElementById("toast"),
};

const capsuleDataPool = [
  { title: "capsule · visual", sketch: "folded storyboard fragment", text: "unfinished visuals still carry energy", palette: ["#ffd98b", "#ff4ec7", "#7f57ff"] },
  { title: "capsule · text", sketch: "ripped note ribbon", text: "a draft is a map, not a mistake", palette: ["#f3bc77", "#ff8b8c", "#6368ff"] },
  { title: "capsule · mixed", sketch: "color swatch + paper clipping", text: "let strange ideas find a second owner", palette: ["#ffbe7a", "#f53abf", "#6f50ff"] },
];

const state = {
  entered: false,
  entering: false,
  enterStart: 0,
  capsules: [],
  scraps: [],
  selectedCapsule: null,
  deposited: [],
  collected: [],
  pullInProgress: false,
  soundOn: false,
  ambientCtx: null,
  ambientNodes: null,
  lastActionTs: Date.now(),
};

let scene;
let camera;
let renderer;
let controls;
let rootGroup;
let innerGroup;
let bodyGroup;
let glassSphere;
let raycaster;
let pointer;
let hoveredCapsule = null;
let clock;

function showToast(msg) {
  dom.toast.textContent = msg;
  dom.toast.classList.remove("hidden");
  setTimeout(() => dom.toast.classList.add("hidden"), 1700);
}

function touchActivity() {
  state.lastActionTs = Date.now();
  dom.idleLine.classList.add("hidden");
}

function oneShot(freq = 300, duration = 0.08, type = "sine", gainValue = 0.07) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gainValue;
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + duration);
}

function playEnterFx() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();

  const shua = ctx.createOscillator();
  const shuaGain = ctx.createGain();
  shua.type = "triangle";
  shua.frequency.setValueAtTime(220, ctx.currentTime);
  shua.frequency.exponentialRampToValueAtTime(65, ctx.currentTime + 0.45);
  shuaGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  shuaGain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.03);
  shuaGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
  shua.connect(shuaGain).connect(ctx.destination);
  shua.start();
  shua.stop(ctx.currentTime + 0.48);

  const bell = ctx.createOscillator();
  const bellGain = ctx.createGain();
  bell.type = "sine";
  bell.frequency.setValueAtTime(980, ctx.currentTime + 0.48);
  bell.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 1.08);
  bellGain.gain.setValueAtTime(0.0001, ctx.currentTime + 0.48);
  bellGain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.5);
  bellGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
  bell.connect(bellGain).connect(ctx.destination);
  bell.start(ctx.currentTime + 0.48);
  bell.stop(ctx.currentTime + 1.12);
}

function createCapsuleMesh(colorA = 0xf53abf, colorB = 0x6f50ff) {
  const group = new THREE.Group();
  const g = new THREE.SphereGeometry(0.24, 28, 28);

  const top = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: colorA, transmission: 0.7, thickness: 0.3, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.92, emissive: colorA, emissiveIntensity: 0.08 }));
  const bottom = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: colorB, transmission: 0.65, thickness: 0.28, roughness: 0.14, clearcoat: 0.8, transparent: true, opacity: 0.9, emissive: colorB, emissiveIntensity: 0.06 }));
  top.scale.y = 0.5;
  top.position.y = 0.12;
  bottom.scale.y = 0.5;
  bottom.position.y = -0.12;

  const seam = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.012, 10, 36), new THREE.MeshStandardMaterial({ color: 0xffe6c0, emissive: 0xffd48b, emissiveIntensity: 0.3 }));
  seam.rotation.x = Math.PI / 2;

  group.add(top, bottom, seam);
  return group;
}

function canvasTextTexture(lines, color = "#131626") {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = "#f8ecd4";
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = color;
  x.font = "bold 18px Manrope";
  x.fillText(lines[0] || "fragment", 16, 40);
  x.font = "15px Manrope";
  x.fillText(lines[1] || "draft", 16, 72);
  x.strokeStyle = "rgba(0,0,0,0.15)";
  x.strokeRect(5, 5, c.width - 10, c.height - 10);
  return new THREE.CanvasTexture(c);
}

function createPaperFragment(text, pos) {
  const t = canvasTextTexture(["note", text.slice(0, 22)]);
  const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.18), mat);
  mesh.position.copy(pos);
  mesh.rotation.set(Math.random() * 0.6, Math.random() * 0.8, Math.random() * 0.4);
  mesh.userData = { base: pos.clone(), offset: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.2 };
  state.scraps.push(mesh);
  innerGroup.add(mesh);
}

function createImageFragment(pos) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 128, 128);
  g.addColorStop(0, "#ffd98b");
  g.addColorStop(0.5, "#ff4ec7");
  g.addColorStop(1, "#6f50ff");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = "rgba(255,255,255,0.75)";
  x.fillRect(22, 28, 84, 12);
  x.fillRect(22, 48, 64, 10);
  x.fillRect(22, 66, 48, 9);
  const t = new THREE.CanvasTexture(c);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.84, side: THREE.DoubleSide }));
  mesh.position.copy(pos);
  mesh.rotation.set(Math.random() * 0.6, Math.random() * 0.8, Math.random() * 0.5);
  mesh.userData = { base: pos.clone(), offset: Math.random() * Math.PI * 2, speed: 0.28 + Math.random() * 0.2 };
  state.scraps.push(mesh);
  innerGroup.add(mesh);
}

function createColorChip(pos, color = 0xffbe7a) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.14), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.22, roughness: 0.35 }));
  mesh.position.copy(pos);
  mesh.rotation.set(Math.random() * 0.6, Math.random() * 0.5, Math.random() * 0.5);
  mesh.userData = { base: pos.clone(), offset: Math.random() * Math.PI * 2, speed: 0.33 + Math.random() * 0.2 };
  state.scraps.push(mesh);
  innerGroup.add(mesh);
}

function makeCapsule(record, position, colors) {
  const mesh = createCapsuleMesh(colors[0], colors[1]);
  mesh.position.copy(position);
  mesh.userData = { record, base: position.clone(), speed: 0.32 + Math.random() * 0.26, offset: Math.random() * Math.PI * 2, hover: 0 };
  const glow = new THREE.PointLight(0xff98de, 0.2, 1.2, 2);
  mesh.add(glow);
  mesh.userData.glow = glow;

  state.capsules.push(mesh);
  innerGroup.add(mesh);
}

function seedInterior() {
  state.capsules.length = 0;
  state.scraps.length = 0;

  for (let i = 0; i < 16; i += 1) {
    const r = 0.9 + Math.random() * 1.2;
    const t = Math.random() * Math.PI * 2;
    const p = Math.random() * Math.PI;
    const pos = new THREE.Vector3(r * Math.sin(p) * Math.cos(t), r * Math.cos(p) * 0.75, r * Math.sin(p) * Math.sin(t));
    const rec = capsuleDataPool[i % capsuleDataPool.length];
    const colors = [new THREE.Color().setHSL(0.86 + Math.random() * 0.08, 0.78, 0.58).getHex(), new THREE.Color().setHSL(0.72 + Math.random() * 0.1, 0.8, 0.58).getHex()];
    makeCapsule(rec, pos, colors);
  }

  for (let i = 0; i < 11; i += 1) {
    const pos = new THREE.Vector3((Math.random() - 0.5) * 3.2, (Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 3.2);
    createPaperFragment(capsuleDataPool[i % capsuleDataPool.length].text, pos);
  }

  for (let i = 0; i < 8; i += 1) {
    createImageFragment(new THREE.Vector3((Math.random() - 0.5) * 2.8, (Math.random() - 0.5) * 2.1, (Math.random() - 0.5) * 2.8));
  }

  const paletteColors = [0xffd98b, 0xff4ec7, 0x6f50ff, 0xff9f7c, 0xf53abf];
  for (let i = 0; i < 12; i += 1) {
    createColorChip(new THREE.Vector3((Math.random() - 0.5) * 2.7, (Math.random() - 0.5) * 2.3, (Math.random() - 0.5) * 2.7), paletteColors[i % paletteColors.length]);
  }
}

function initThree() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070912, 0.12);

  camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.45, 10.4);

  renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  controls = new OrbitControls(camera, dom.canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 4.2;
  controls.maxDistance = 9.5;
  controls.enableRotate = true;
  controls.enabled = true;

  rootGroup = new THREE.Group();
  scene.add(rootGroup);

  bodyGroup = new THREE.Group();
  rootGroup.add(bodyGroup);

  const hemi = new THREE.HemisphereLight(0xfff3dd, 0x0a0d1e, 0.95);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffd7a1, 1.1);
  key.position.set(4, 3, 5);
  scene.add(key);

  const rim = new THREE.PointLight(0xf53abf, 1.7, 15);
  rim.position.set(-3.2, 1.5, -2.8);
  scene.add(rim);

  const cool = new THREE.PointLight(0x6f50ff, 1.4, 12);
  cool.position.set(3, -0.5, 2);
  scene.add(cool);

  glassSphere = new THREE.Mesh(new THREE.SphereGeometry(2.2, 64, 64), new THREE.MeshPhysicalMaterial({ color: 0xf8edd9, transmission: 1, thickness: 0.7, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.5 }));

  const sphereRim = new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.045, 18, 140), new THREE.MeshStandardMaterial({ color: 0xffd99e, emissive: 0xffb77c, emissiveIntensity: 0.22 }));
  sphereRim.rotation.x = Math.PI / 2;

  innerGroup = new THREE.Group();

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.82, 0.42, 42), new THREE.MeshStandardMaterial({ color: 0x241c36, metalness: 0.25, roughness: 0.5, emissive: 0x3d2a50, emissiveIntensity: 0.2 }));
  neck.position.y = -2.05;

  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.24, 1.82, 50, 1, false), new THREE.MeshPhysicalMaterial({ color: 0x1a1f34, roughness: 0.34, metalness: 0.15, clearcoat: 0.6, clearcoatRoughness: 0.35, emissive: 0x2d2845, emissiveIntensity: 0.28 }));
  body.position.y = -3.05;

  const bodyGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.95, 1.15, 40), new THREE.MeshPhysicalMaterial({ color: 0xf8e7c3, transmission: 0.95, thickness: 0.4, roughness: 0.1, transparent: true, opacity: 0.5 }));
  bodyGlass.position.y = -2.95;

  const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.48, 0.42, 52), new THREE.MeshStandardMaterial({ color: 0x111425, roughness: 0.65, emissive: 0x2a2038, emissiveIntensity: 0.2 }));
  foot.position.y = -4.15;

  const stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xe2d9bf, size: 0.035, transparent: true, opacity: 0.8 }));
  const pts = [];
  for (let i = 0; i < 900; i += 1) {
    pts.push((Math.random() - 0.5) * 52, (Math.random() - 0.5) * 34, -8 - Math.random() * 30);
  }
  stars.geometry.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  scene.add(stars);

  bodyGroup.add(glassSphere, sphereRim, neck, body, bodyGlass, foot, innerGroup);

  seedInterior();

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2(999, 999);
  clock = new THREE.Clock();

  dom.canvas.addEventListener("pointermove", onPointerMove);
  dom.canvas.addEventListener("click", onCanvasClick);
  window.addEventListener("resize", onResize);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event) {
  const rect = dom.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  touchActivity();
}

function onCanvasClick() {
  touchActivity();
  if (hoveredCapsule) openCapsuleCard(hoveredCapsule.userData.record);
}

function updateHover() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(state.capsules, true);
  let target = null;

  for (const hit of hits) {
    let p = hit.object;
    while (p && !p.userData.record) p = p.parent;
    if (p && p.userData.record) {
      target = p;
      break;
    }
  }

  hoveredCapsule = target;

  for (const capsule of state.capsules) {
    capsule.userData.hover += ((capsule === hoveredCapsule ? 1 : 0) - capsule.userData.hover) * 0.12;
    capsule.scale.setScalar(1 + capsule.userData.hover * 0.16);
    capsule.userData.glow.intensity = 0.2 + capsule.userData.hover * 1.1;
  }
}

function animateInterior(t) {
  const e = t * 0.001;

  for (const capsule of state.capsules) {
    const d = capsule.userData;
    capsule.position.x = d.base.x + Math.sin(e * d.speed + d.offset) * 0.06;
    capsule.position.y = d.base.y + Math.cos(e * (d.speed + 0.12) + d.offset) * 0.08;
    capsule.position.z = d.base.z + Math.sin(e * (d.speed + 0.19) + d.offset) * 0.06;

    const dist = capsule.getWorldPosition(new THREE.Vector3()).distanceTo(camera.position);
    const fade = THREE.MathUtils.clamp(1.35 - dist * 0.13, 0.35, 1);
    capsule.traverse((child) => {
      if (child.material && "opacity" in child.material) {
        child.material.opacity = 0.6 + fade * 0.35;
      }
    });
  }

  for (const scrap of state.scraps) {
    const d = scrap.userData;
    scrap.position.x = d.base.x + Math.sin(e * d.speed + d.offset) * 0.04;
    scrap.position.y = d.base.y + Math.cos(e * (d.speed + 0.08) + d.offset) * 0.05;
    scrap.position.z = d.base.z + Math.sin(e * (d.speed + 0.12) + d.offset) * 0.04;
    scrap.rotation.y += 0.002;

    const dist = scrap.getWorldPosition(new THREE.Vector3()).distanceTo(camera.position);
    const alpha = THREE.MathUtils.clamp(1.2 - dist * 0.11, 0.22, 0.9);
    if (scrap.material && "opacity" in scrap.material) scrap.material.opacity = alpha;
  }
}

function openCapsuleCard(record) {
  dom.cardTitle.textContent = record.title;
  dom.cardSketch.textContent = record.sketch;
  dom.cardText.textContent = record.text;
  dom.cardPalette.innerHTML = record.palette.map((c) => `<span class="palette-swatch" style="background:${c}"></span>`).join("");
  dom.capsuleCard.classList.remove("hidden");
  state.selectedCapsule = record;
}

function closeCapsuleCard() {
  dom.capsuleCard.classList.add("hidden");
  dom.remixTools.classList.add("hidden");
}

function closeDepositModal() {
  dom.depositModal.classList.add("hidden");
}

function depositIntoMachine(payload) {
  const record = {
    title: "capsule · deposited",
    sketch: payload.image ? "uploaded sketch fragment" : "new sketch fragment",
    text: payload.text || "deposited text fragment",
    palette: payload.palette,
  };

  state.deposited.push(record.text);
  refreshHistory();

  const start = new THREE.Vector3(0, -4.6, 3.5);
  const target = new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.3, (Math.random() - 0.5) * 1.5);
  const capsule = createCapsuleMesh(0xff9f7c, 0xf53abf);
  capsule.position.copy(start);
  capsule.userData = { record, base: target.clone(), speed: 0.36, offset: Math.random() * Math.PI * 2, hover: 0, glow: new THREE.PointLight(0xff84d8, 0.22, 1.2, 2) };
  capsule.add(capsule.userData.glow);
  state.capsules.push(capsule);
  innerGroup.add(capsule);

  let p = 0;
  function step() {
    p += 0.018;
    const eased = 1 - Math.pow(1 - Math.min(p, 1), 3);
    capsule.position.lerpVectors(start, target, eased);
    if (p < 1) requestAnimationFrame(step);
  }
  step();

  showToast("your idea drifted into the machine");
}

function pullCapsule() {
  if (state.pullInProgress || state.capsules.length === 0) return;
  state.pullInProgress = true;
  touchActivity();
  oneShot(180, 0.1, "triangle", 0.08);

  const target = state.capsules[Math.floor(Math.random() * state.capsules.length)];
  const from = target.position.clone();
  const to = new THREE.Vector3(0, -0.35, 2.9);
  let p = 0;

  function step() {
    p += 0.023;
    target.position.lerpVectors(from, to, Math.min(p, 1));
    if (p < 1) {
      requestAnimationFrame(step);
    } else {
      state.pullInProgress = false;
      state.collected.push(target.userData.record.text);
      refreshHistory();
      openCapsuleCard(target.userData.record);
      target.userData.base.copy(from);
    }
  }
  step();
}

function refreshHistory() {
  dom.depositedList.innerHTML = state.deposited.slice(-8).map((d) => `<li>${d}</li>`).join("");
  dom.collectedList.innerHTML = state.collected.slice(-8).map((d) => `<li>${d}</li>`).join("");
}

function startAmbient() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  if (!state.ambientCtx) state.ambientCtx = new AudioCtx();

  const ctx = state.ambientCtx;
  const drone = ctx.createOscillator();
  const shimmer = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const g1 = ctx.createGain();
  const g2 = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  const master = ctx.createGain();

  drone.type = "sine";
  drone.frequency.value = 132;
  shimmer.type = "triangle";
  shimmer.frequency.value = 265;
  lfo.type = "sine";
  lfo.frequency.value = 0.09;

  lfoGain.gain.value = 24;
  g1.gain.value = 0.018;
  g2.gain.value = 0.011;
  lp.type = "lowpass";
  lp.frequency.value = 900;
  master.gain.value = 0.14;

  lfo.connect(lfoGain);
  lfoGain.connect(shimmer.frequency);
  drone.connect(g1).connect(lp);
  shimmer.connect(g2).connect(lp);
  lp.connect(master).connect(ctx.destination);

  drone.start();
  shimmer.start();
  lfo.start();

  state.ambientNodes = { drone, shimmer, lfo };
}

function stopAmbient() {
  if (!state.ambientNodes || !state.ambientCtx) return;
  const t = state.ambientCtx.currentTime;
  state.ambientNodes.drone.stop(t + 0.02);
  state.ambientNodes.shimmer.stop(t + 0.02);
  state.ambientNodes.lfo.stop(t + 0.02);
  state.ambientNodes = null;
}

function animate() {
  const elapsed = clock.getElapsedTime();
  controls.update();

  bodyGroup.rotation.y += 0.001;
  bodyGroup.rotation.x = Math.sin(elapsed * 0.22) * 0.02;
  innerGroup.rotation.y -= 0.0013;

  if (state.entering) {
    const p = Math.min((performance.now() - state.enterStart) / 1350, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    camera.position.z = 10.4 - (10.4 - 5.2) * ease;
    camera.position.y = 0.45 - 0.12 * ease;
    if (p >= 1) {
      state.entering = false;
      state.entered = true;
      dom.body.classList.add("entered");
      dom.intro.classList.add("hidden");
    }
  }

  if (state.entered && Date.now() - state.lastActionTs > 12000) dom.idleLine.classList.remove("hidden");

  animateInterior(performance.now());
  updateHover();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function bindUi() {
  dom.enterBtn.addEventListener("click", () => {
    if (state.entering || state.entered) return;
    touchActivity();
    state.entering = true;
    state.enterStart = performance.now();
    playEnterFx();
    dom.body.classList.add("entered");
    dom.intro.classList.add("entering");
  });

  dom.depositBtn.addEventListener("click", () => {
    if (!state.entered) return;
    dom.depositModal.classList.remove("hidden");
    touchActivity();
  });

  dom.closeDepositBtn.addEventListener("click", closeDepositModal);

  dom.depositModal.addEventListener("click", (e) => {
    if (e.target === dom.depositModal) closeDepositModal();
  });

  dom.depositForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const image = document.getElementById("ideaImage").files[0] || null;
    const text = document.getElementById("ideaText").value.trim();
    const palette = Array.from(dom.depositForm.querySelectorAll('input[type="color"]')).map((el) => el.value);
    depositIntoMachine({ image, text, palette });
    closeDepositModal();
    dom.depositForm.reset();
    touchActivity();
  });

  dom.pullBtn.addEventListener("click", () => {
    if (!state.entered) return;
    pullCapsule();
  });

  dom.closeCardBtn.addEventListener("click", closeCapsuleCard);
  dom.capsuleCard.addEventListener("click", (e) => {
    if (e.target === dom.capsuleCard) closeCapsuleCard();
  });

  dom.keepBtn.addEventListener("click", () => {
    showToast("capsule kept");
    closeCapsuleCard();
  });

  dom.useBtn.addEventListener("click", () => {
    showToast("marked as used");
    closeCapsuleCard();
  });

  dom.remixBtn.addEventListener("click", () => {
    dom.remixTools.classList.toggle("hidden");
  });

  dom.toolDraw.addEventListener("click", () => showToast("draw mode on"));
  dom.toolRecolor.addEventListener("click", () => showToast("recolor mode on"));
  dom.toolText.addEventListener("click", () => showToast("text rearrange on"));

  dom.historyBtn.addEventListener("click", () => {
    if (!state.entered) return;
    dom.historyShelf.classList.toggle("hidden");
  });

  dom.soundToggle.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    dom.soundToggle.textContent = state.soundOn ? "sound on" : "sound off";
    if (state.soundOn) startAmbient();
    else stopAmbient();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCapsuleCard();
      closeDepositModal();
      dom.historyShelf.classList.add("hidden");
      dom.remixTools.classList.add("hidden");
    }
  });

  ["pointerdown", "wheel", "keydown"].forEach((evt) => {
    window.addEventListener(evt, touchActivity, { passive: true });
  });
}

initThree();
bindUi();
animate();
