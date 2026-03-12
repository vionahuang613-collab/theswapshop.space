import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const dom = {
  intro: document.getElementById("intro"),
  enterBtn: document.getElementById("enterBtn"),
  experience: document.getElementById("experience"),
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
  {
    title: "capsule · visual",
    sketch: "floating architecture fragment",
    text: "a city that breathes in soft static",
    palette: ["#7ec7ff", "#b6a3ff", "#f9b2ff"],
  },
  {
    title: "capsule · text",
    sketch: "ink spiral concept",
    text: "unfinished stories are also maps",
    palette: ["#92e4ff", "#91a8ff", "#e7c0ff"],
  },
  {
    title: "capsule · mixed",
    sketch: "broken poster layout",
    text: "keep the mistake, remove the fear",
    palette: ["#83d5ff", "#ffb4ef", "#9da8ff"],
  },
];

const state = {
  started: false,
  capsules: [],
  selectedCapsule: null,
  deposited: [],
  collected: [],
  pullInProgress: false,
  lastActionTs: Date.now(),
  soundOn: false,
  ambientCtx: null,
  ambientNodes: null,
};

let scene;
let camera;
let renderer;
let controls;
let rootGroup;
let innerSpaceGroup;
let glassShell;
let raycaster;
let pointer;
let hoveredCapsule = null;
let clock;

function touchActivity() {
  state.lastActionTs = Date.now();
  dom.idleLine.classList.add("hidden");
}

function showToast(msg) {
  dom.toast.textContent = msg;
  dom.toast.classList.remove("hidden");
  setTimeout(() => dom.toast.classList.add("hidden"), 1800);
}

function createCapsuleMesh(colorA = 0x89c2ff, colorB = 0xbc90ff) {
  const group = new THREE.Group();
  const sphereGeo = new THREE.SphereGeometry(0.26, 32, 32);
  const topMat = new THREE.MeshPhysicalMaterial({
    color: colorA,
    transmission: 0.7,
    thickness: 0.35,
    roughness: 0.1,
    metalness: 0,
    clearcoat: 1,
    transparent: true,
    opacity: 0.92,
    emissive: colorA,
    emissiveIntensity: 0.06,
  });
  const bottomMat = new THREE.MeshPhysicalMaterial({
    color: colorB,
    transmission: 0.6,
    thickness: 0.25,
    roughness: 0.14,
    transparent: true,
    opacity: 0.9,
    emissive: colorB,
    emissiveIntensity: 0.04,
  });

  const top = new THREE.Mesh(sphereGeo, topMat);
  top.scale.y = 0.5;
  top.position.y = 0.13;

  const bottom = new THREE.Mesh(sphereGeo, bottomMat);
  bottom.scale.y = 0.5;
  bottom.position.y = -0.13;

  const seam = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.015, 12, 42),
    new THREE.MeshStandardMaterial({ color: 0xeaf2ff, emissive: 0xbcd6ff, emissiveIntensity: 0.18, roughness: 0.4 })
  );
  seam.rotation.x = Math.PI / 2;

  group.add(top, bottom, seam);
  return group;
}

function makeCapsule(record, position, opts = {}) {
  const mesh = createCapsuleMesh(opts.colorA, opts.colorB);
  mesh.position.copy(position);
  mesh.userData = {
    record,
    floatOffset: Math.random() * Math.PI * 2,
    base: position.clone(),
    speed: 0.35 + Math.random() * 0.35,
    hoverGlow: 0,
  };

  const glow = new THREE.PointLight(0xb2d4ff, 0.35, 1.6, 2);
  glow.position.set(0, 0, 0);
  mesh.add(glow);
  mesh.userData.glow = glow;

  state.capsules.push(mesh);
  innerSpaceGroup.add(mesh);
  return mesh;
}

function seedCapsules() {
  state.capsules.length = 0;
  for (let i = 0; i < 18; i += 1) {
    const radius = 1.1 + Math.random() * 1.15;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const position = new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi) * 0.75,
      radius * Math.sin(phi) * Math.sin(theta)
    );
    const rec = capsuleDataPool[i % capsuleDataPool.length];
    makeCapsule(rec, position, {
      colorA: new THREE.Color().setHSL(0.58 + Math.random() * 0.08, 0.7, 0.72).getHex(),
      colorB: new THREE.Color().setHSL(0.72 + Math.random() * 0.08, 0.65, 0.68).getHex(),
    });
  }
}

function initThree() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070f, 0.13);

  camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.35, 5.6);

  renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  controls = new OrbitControls(camera, dom.canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3.6;
  controls.maxDistance = 8.1;
  controls.rotateSpeed = 0.8;

  rootGroup = new THREE.Group();
  scene.add(rootGroup);

  const hemi = new THREE.HemisphereLight(0xdde9ff, 0x0d1222, 0.9);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xb6d8ff, 1.2);
  key.position.set(4, 3, 5);
  scene.add(key);

  const rim = new THREE.PointLight(0xc59bff, 2.1, 14, 1.8);
  rim.position.set(-3, 0.8, -2.6);
  scene.add(rim);

  glassShell = new THREE.Mesh(
    new THREE.SphereGeometry(2.3, 64, 64),
    new THREE.MeshPhysicalMaterial({
      color: 0xd8e7ff,
      transmission: 1,
      thickness: 0.65,
      roughness: 0.08,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.55,
    })
  );

  const shellRim = new THREE.Mesh(
    new THREE.TorusGeometry(2.32, 0.045, 20, 140),
    new THREE.MeshStandardMaterial({ color: 0xdbe9ff, emissive: 0xaecbff, emissiveIntensity: 0.25, roughness: 0.3 })
  );
  shellRim.rotation.x = Math.PI / 2;

  innerSpaceGroup = new THREE.Group();
  const insideStars = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ color: 0xb8d7ff, size: 0.03, transparent: true, opacity: 0.8 })
  );

  const starPositions = [];
  for (let i = 0; i < 450; i += 1) {
    const r = 0.4 + Math.random() * 1.7;
    const t = Math.random() * Math.PI * 2;
    const p = Math.random() * Math.PI;
    starPositions.push(r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t));
  }
  insideStars.geometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));

  const distantStars = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ color: 0x96b8ff, size: 0.028, transparent: true, opacity: 0.75 })
  );
  const distantPositions = [];
  for (let i = 0; i < 1000; i += 1) {
    distantPositions.push((Math.random() - 0.5) * 44, (Math.random() - 0.5) * 28, -12 - Math.random() * 28);
  }
  distantStars.geometry.setAttribute("position", new THREE.Float32BufferAttribute(distantPositions, 3));
  scene.add(distantStars);

  rootGroup.add(glassShell, shellRim, innerSpaceGroup, insideStars);

  const baseRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.58, 0.07, 16, 120),
    new THREE.MeshStandardMaterial({ color: 0x9ebcff, emissive: 0x85a8ff, emissiveIntensity: 0.22, roughness: 0.45 })
  );
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = -2.15;
  rootGroup.add(baseRing);

  seedCapsules();

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

  let capsuleHit = null;
  for (const hit of hits) {
    let parent = hit.object;
    while (parent && !parent.userData.record) parent = parent.parent;
    if (parent && parent.userData.record) {
      capsuleHit = parent;
      break;
    }
  }

  hoveredCapsule = capsuleHit;

  for (const capsule of state.capsules) {
    capsule.userData.hoverGlow += ((capsule === hoveredCapsule ? 1 : 0) - capsule.userData.hoverGlow) * 0.12;
    capsule.scale.setScalar(1 + capsule.userData.hoverGlow * 0.16);
    capsule.userData.glow.intensity = 0.35 + capsule.userData.hoverGlow * 1.15;
  }
}

function animateCapsules(t) {
  const elapsed = t * 0.001;
  for (const capsule of state.capsules) {
    const d = capsule.userData;
    capsule.position.x = d.base.x + Math.sin(elapsed * d.speed + d.floatOffset) * 0.06;
    capsule.position.y = d.base.y + Math.cos(elapsed * (d.speed + 0.12) + d.floatOffset) * 0.07;
    capsule.position.z = d.base.z + Math.sin(elapsed * (d.speed + 0.22) + d.floatOffset) * 0.05;
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
}

function depositIntoMachine(payload) {
  const record = {
    title: "capsule · deposited",
    sketch: payload.image ? "uploaded sketch" : "new sketch fragment",
    text: payload.text || "deposited text fragment",
    palette: payload.palette,
  };
  state.deposited.push(record.text);
  refreshHistory();

  const startPos = new THREE.Vector3(0, -2.6, 2.8);
  const capsule = makeCapsule(record, startPos, { colorA: 0x9fd3ff, colorB: 0xc194ff });

  let progress = 0;
  const target = new THREE.Vector3((Math.random() - 0.5) * 1.7, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.7);

  function step() {
    progress += 0.016;
    const eased = 1 - Math.pow(1 - Math.min(progress, 1), 3);
    capsule.position.lerpVectors(startPos, target, eased);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      capsule.userData.base.copy(target);
      showToast("your idea is now floating in the machine");
    }
  }

  step();
}

function pullCapsule() {
  if (state.pullInProgress || state.capsules.length === 0) return;
  state.pullInProgress = true;
  touchActivity();

  const index = Math.floor(Math.random() * state.capsules.length);
  const picked = state.capsules[index];

  const from = picked.position.clone();
  const to = new THREE.Vector3(0, -0.2, 2.5);
  let progress = 0;

  function step() {
    progress += 0.022;
    const eased = Math.min(progress, 1);
    picked.position.lerpVectors(from, to, eased);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      state.pullInProgress = false;
      state.collected.push(picked.userData.record.text);
      refreshHistory();
      openCapsuleCard(picked.userData.record);
      picked.userData.base.copy(from);
    }
  }

  step();
}

function refreshHistory() {
  dom.depositedList.innerHTML = state.deposited.slice(-8).map((item) => `<li>${item}</li>`).join("");
  dom.collectedList.innerHTML = state.collected.slice(-8).map((item) => `<li>${item}</li>`).join("");
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
  const lowpass = ctx.createBiquadFilter();
  const master = ctx.createGain();

  drone.type = "sine";
  drone.frequency.value = 136;
  shimmer.type = "triangle";
  shimmer.frequency.value = 272;
  lfo.type = "sine";
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 26;

  g1.gain.value = 0.02;
  g2.gain.value = 0.012;
  lowpass.type = "lowpass";
  lowpass.frequency.value = 900;
  master.gain.value = 0.15;

  lfo.connect(lfoGain);
  lfoGain.connect(shimmer.frequency);
  drone.connect(g1).connect(lowpass);
  shimmer.connect(g2).connect(lowpass);
  lowpass.connect(master).connect(ctx.destination);

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

function tick() {
  const elapsed = clock.getElapsedTime();
  controls.update();

  rootGroup.rotation.y += 0.00075;
  rootGroup.rotation.x = Math.sin(elapsed * 0.22) * 0.02;

  innerSpaceGroup.rotation.y -= 0.00095;
  innerSpaceGroup.rotation.x = Math.sin(elapsed * 0.3) * 0.05;

  animateCapsules(performance.now());
  updateHover();

  if (Date.now() - state.lastActionTs > 12000) {
    dom.idleLine.classList.remove("hidden");
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function bindUi() {
  dom.enterBtn.addEventListener("click", () => {
    state.started = true;
    dom.intro.classList.add("hidden");
    dom.experience.classList.remove("hidden");
    touchActivity();
    if (!scene) {
      initThree();
      tick();
    }
  });

  dom.depositBtn.addEventListener("click", () => {
    dom.depositModal.classList.remove("hidden");
    touchActivity();
  });

  dom.closeDepositBtn.addEventListener("click", () => dom.depositModal.classList.add("hidden"));

  dom.depositForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const image = document.getElementById("ideaImage").files[0] || null;
    const text = document.getElementById("ideaText").value.trim();
    const paletteInputs = Array.from(dom.depositForm.querySelectorAll('input[type="color"]'));
    const palette = paletteInputs.map((input) => input.value);

    depositIntoMachine({ image, text, palette });
    dom.depositModal.classList.add("hidden");
    dom.depositForm.reset();
    showToast("capsule sealed and drifting inside");
    touchActivity();
  });

  dom.pullBtn.addEventListener("click", () => {
    pullCapsule();
    touchActivity();
  });

  dom.closeCardBtn.addEventListener("click", closeCapsuleCard);
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
    showToast("remix tools opened");
  });

  dom.toolDraw.addEventListener("click", () => showToast("draw mode enabled"));
  dom.toolRecolor.addEventListener("click", () => showToast("recolor mode enabled"));
  dom.toolText.addEventListener("click", () => showToast("text rearrange mode enabled"));

  dom.historyBtn.addEventListener("click", () => {
    dom.historyShelf.classList.toggle("hidden");
    touchActivity();
  });

  dom.soundToggle.addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    dom.soundToggle.textContent = state.soundOn ? "Sound On" : "Sound Off";
    if (state.soundOn) {
      startAmbient();
      showToast("ambient sound on");
    } else {
      stopAmbient();
      showToast("ambient sound off");
    }
  });

  ["pointerdown", "wheel", "keydown"].forEach((evt) => {
    window.addEventListener(evt, touchActivity, { passive: true });
  });
}

bindUi();
