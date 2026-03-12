const dom = {
  body: document.body,
  plasmaCanvas: document.getElementById("plasmaCanvas"),
  floatingLayer: document.getElementById("floatingLayer"),
  lightFollow: document.getElementById("lightFollow"),
  machine: document.getElementById("machine"),
  installation: document.getElementById("installation"),
  vault: document.getElementById("vault"),
  robotArm: document.getElementById("robotArm"),
  statusMain: document.getElementById("statusMain"),
  statusSub: document.getElementById("statusSub"),
  drawGrid: document.getElementById("drawGrid"),
  btnA: document.getElementById("btnA"),
  btnB: document.getElementById("btnB"),
  depositKey: document.getElementById("depositKey"),
  startDeposit: document.getElementById("startDeposit"),
  skipDeposit: document.getElementById("skipDeposit"),
  capsuleDrop: document.getElementById("capsuleDrop"),
  uploadModal: document.getElementById("uploadModal"),
  closeUpload: document.getElementById("closeUpload"),
  uploadForm: document.getElementById("uploadForm"),
  unboxModal: document.getElementById("unboxModal"),
  closeUnbox: document.getElementById("closeUnbox"),
  fragmentBox: document.getElementById("fragmentBox"),
  saveFragment: document.getElementById("saveFragment"),
  markUsed: document.getElementById("markUsed"),
  soundToggle: document.getElementById("soundToggle"),
  randomPrompt: document.getElementById("randomPrompt"),
  promptText: document.getElementById("promptText"),
  toast: document.getElementById("toast"),
  coinCursor: document.getElementById("coinCursor"),
  chip1: document.getElementById("chip1"),
  chip2: document.getElementById("chip2"),
  chip3: document.getElementById("chip3"),
};

const prompts = [
  "Question: Which unfinished piece still haunts your notebook?",
  "Question: What color did you abandon too early?",
  "Question: Which line felt too weird to keep?",
  "Question: If failure was material, what would you sculpt?",
  "Question: What idea deserves a second owner?",
];

const fragments = {
  visual: [
    {
      title: "Anonymous Visual Scrap · V041",
      body: "A chrome moth pinned to a soft pink thundercloud.",
      colors: ["#ff79d9", "#ffb6ec", "#c48bff"],
    },
    {
      title: "Anonymous Visual Scrap · V063",
      body: "A translucent staircase dissolving into glossy static grains.",
      colors: ["#ff4fc8", "#ffa9e8", "#8fe8ff"],
    },
  ],
  hybrid: [
    {
      title: "Anonymous Hybrid Scrap · H022",
      body: "'I stitched my failed drafts into a flag and called it weather.'",
      colors: ["#ff89e1", "#ffd2f6", "#b27cff"],
    },
    {
      title: "Anonymous Hybrid Scrap · H087",
      body: "Design a character who only remembers life in overexposed flashes.",
      colors: ["#ff68d2", "#ffc6f1", "#9deaff"],
    },
  ],
};

const state = {
  stage: 1,
  mode: null,
  soundOn: false,
  ambientCtx: null,
  ambientNodes: null,
  pointerX: window.innerWidth * 0.5,
  pointerY: window.innerHeight * 0.5,
  smoothX: window.innerWidth * 0.5,
  smoothY: window.innerHeight * 0.5,
};

function setStage(stage) {
  state.stage = stage;
  dom.body.dataset.stage = String(stage);
  [dom.chip1, dom.chip2, dom.chip3].forEach((chip) => chip.classList.remove("active"));
  if (stage === 1) dom.chip1.classList.add("active");
  if (stage === 2) dom.chip2.classList.add("active");
  if (stage === 3) dom.chip3.classList.add("active");
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.remove("hidden");
  setTimeout(() => dom.toast.classList.add("hidden"), 1800);
}

function setStatus(main, sub) {
  dom.statusMain.textContent = main;
  dom.statusSub.textContent = sub;
}

function oneShot({ freq = 320, type = "triangle", gain = 0.07, duration = 0.09 } = {}) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.value = gain;
  osc.connect(amp).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function vibrate(ms = 35) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function focusMachine() {
  dom.machine.scrollIntoView({ behavior: "smooth", block: "center" });
}

function openUpload() {
  dom.uploadModal.classList.remove("hidden");
  setStatus("Deposit active.", "Upload sketch, text, or palette. The machine will remix energy signatures.");
  oneShot({ freq: 540, type: "square", gain: 0.06 });
}

function closeUpload() {
  dom.uploadModal.classList.add("hidden");
}

function startAnalysis() {
  setStatus("Analyzing your leftovers...", "Parsing visual rhythm, text tone, and palette mood.");
  dom.drawGrid.classList.add("hidden");
  dom.vault.classList.add("fast");
  oneShot({ freq: 140, gain: 0.09, duration: 0.12 });

  setTimeout(() => setStatus("Syncing fragment pool...", "Matching with anonymous donors."), 850);
  setTimeout(() => setStatus("Step 2 ready.", "Choose A for visual. Choose B for hybrid."), 1850);
  setTimeout(() => {
    dom.vault.classList.remove("fast");
    dom.drawGrid.classList.remove("hidden");
    setStage(2);
    showToast("Draw mode unlocked.");
  }, 2600);
}

function dropCapsule(mode) {
  state.mode = mode;
  const label = mode === "visual" ? "visual" : "hybrid";
  setStatus(`Capsule generated: ${label}.`, "Tap the capsule in the lane to unbox.");
  dom.capsuleDrop.classList.remove("hidden", "drop");
  void dom.capsuleDrop.offsetWidth;
  dom.capsuleDrop.classList.add("drop");
  oneShot({ freq: mode === "visual" ? 420 : 360, type: "square", gain: 0.09 });
  vibrate(46);
  setStage(2);
}

function renderFragment(mode) {
  const pool = fragments[mode] || fragments.hybrid;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  dom.fragmentBox.innerHTML = `
    <h3>${pick.title}</h3>
    <div class="fragment-preview"><p>${pick.body}</p></div>
    <div class="chips">${pick.colors.map((c) => `<span class="chip" style="background:${c}"></span>`).join("")}</div>
  `;
}

function openUnbox() {
  if (!state.mode) {
    showToast("Pick A or B first.");
    return;
  }
  dom.unboxModal.classList.remove("hidden");
  renderFragment(state.mode);
  setStatus("Step 3: Save or Mark Used.", "If reused within 30 days, donor gets an anonymous ping.");
  setStage(3);
  oneShot({ freq: 620, gain: 0.1 });
}

function closeUnbox() {
  dom.unboxModal.classList.add("hidden");
}

function runPointerEngine() {
  function frame() {
    state.smoothX += (state.pointerX - state.smoothX) * 0.08;
    state.smoothY += (state.pointerY - state.smoothY) * 0.08;

    const nx = state.smoothX / window.innerWidth - 0.5;
    const ny = state.smoothY / window.innerHeight - 0.5;

    dom.installation.style.transform = `rotateY(${nx * 18}deg) rotateX(${ny * -11}deg)`;
    dom.machine.style.transform = `translateZ(8px) rotateY(${nx * 8}deg) rotateX(${ny * -6}deg)`;
    dom.robotArm.style.transform = `rotate(${nx * 30}deg) translateY(${ny * 12}px)`;

    dom.lightFollow.style.left = `${state.smoothX}px`;
    dom.lightFollow.style.top = `${state.smoothY}px`;

    dom.coinCursor.style.left = `${state.smoothX}px`;
    dom.coinCursor.style.top = `${state.smoothY}px`;

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function runPlasmaBackground() {
  const canvas = dom.plasmaCanvas;
  const ctx = canvas.getContext("2d");
  let time = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    time += 0.0035;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < 6; i += 1) {
      const x = w * (0.5 + Math.sin(time * (0.8 + i * 0.17) + i) * 0.35);
      const y = h * (0.45 + Math.cos(time * (0.7 + i * 0.16) + i * 1.3) * 0.32);
      const r = 220 + Math.sin(time * 2 + i) * 90;

      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, i % 2 === 0 ? "rgba(255, 100, 210, 0.24)" : "rgba(189, 125, 255, 0.2)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);
}

function spawnParticle() {
  const node = document.createElement("span");
  const isStar = Math.random() > 0.52;
  node.className = `float-particle ${isStar ? "star" : "bubble"}`;
  const size = 6 + Math.random() * 18;
  node.style.width = `${size}px`;
  node.style.height = `${size}px`;
  node.style.left = `${Math.random() * 100}%`;
  node.style.animationDuration = `${8 + Math.random() * 10}s`;
  node.style.opacity = `${0.25 + Math.random() * 0.65}`;
  node.style.background = isStar
    ? `rgba(255, ${160 + Math.floor(Math.random() * 80)}, 242, 0.95)`
    : "radial-gradient(circle at 32% 30%, rgba(255,255,255,0.95), rgba(255,128,222,0.32), rgba(155,87,255,0.2))";
  dom.floatingLayer.appendChild(node);
  node.addEventListener("animationend", () => node.remove());
}

function runParticles() {
  for (let i = 0; i < 18; i += 1) spawnParticle();
  setInterval(spawnParticle, 440);
}

function buildAmbientSound() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  if (!state.ambientCtx) state.ambientCtx = new AudioCtx();
  const ctx = state.ambientCtx;

  const drone = ctx.createOscillator();
  const shimmer = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  const droneGain = ctx.createGain();
  const shimmerGain = ctx.createGain();
  const lowpass = ctx.createBiquadFilter();
  const master = ctx.createGain();

  drone.type = "sine";
  drone.frequency.value = 144;
  shimmer.type = "triangle";
  shimmer.frequency.value = 288;
  lfo.type = "sine";
  lfo.frequency.value = 0.09;

  lfoGain.gain.value = 30;
  droneGain.gain.value = 0.02;
  shimmerGain.gain.value = 0.012;

  lowpass.type = "lowpass";
  lowpass.frequency.value = 1200;
  master.gain.value = 0.12;

  lfo.connect(lfoGain);
  lfoGain.connect(shimmer.frequency);

  drone.connect(droneGain).connect(lowpass);
  shimmer.connect(shimmerGain).connect(lowpass);
  lowpass.connect(master).connect(ctx.destination);

  drone.start();
  shimmer.start();
  lfo.start();

  state.ambientNodes = { drone, shimmer, lfo };
}

function stopAmbientSound() {
  if (!state.ambientNodes) return;
  const { drone, shimmer, lfo } = state.ambientNodes;
  const t = state.ambientCtx.currentTime;
  drone.stop(t + 0.02);
  shimmer.stop(t + 0.02);
  lfo.stop(t + 0.02);
  state.ambientNodes = null;
}

function toggleSound() {
  state.soundOn = !state.soundOn;
  dom.soundToggle.textContent = state.soundOn ? "Sound On" : "Sound Off";
  if (state.soundOn) {
    buildAmbientSound();
    showToast("Ambient sound enabled.");
  } else {
    stopAmbientSound();
    showToast("Sound muted.");
  }
}

function randomizePrompt() {
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  dom.promptText.textContent = prompt;
  oneShot({ freq: 490, gain: 0.06, duration: 0.06 });
}

function attachEvents() {
  window.addEventListener("pointermove", (event) => {
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
  });

  dom.startDeposit.addEventListener("click", () => {
    focusMachine();
    openUpload();
  });

  dom.skipDeposit.addEventListener("click", () => {
    dom.drawGrid.classList.remove("hidden");
    setStatus("Step 2 enabled.", "Pick A or B to draw without deposit.");
    setStage(2);
    focusMachine();
  });

  dom.depositKey.addEventListener("click", openUpload);
  dom.closeUpload.addEventListener("click", closeUpload);
  dom.uploadForm.addEventListener("submit", (event) => {
    event.preventDefault();
    closeUpload();
    startAnalysis();
  });

  dom.btnA.addEventListener("click", () => dropCapsule("visual"));
  dom.btnB.addEventListener("click", () => dropCapsule("hybrid"));
  document.querySelectorAll(".draw-option").forEach((btn) => {
    btn.addEventListener("click", () => dropCapsule(btn.dataset.mode));
  });

  dom.capsuleDrop.addEventListener("click", openUnbox);
  dom.closeUnbox.addEventListener("click", closeUnbox);

  dom.saveFragment.addEventListener("click", () => {
    setStage(3);
    showToast("Fragment saved.");
  });

  dom.markUsed.addEventListener("click", () => {
    setStage(3);
    showToast("Marked as used.");
    closeUnbox();
  });

  dom.soundToggle.addEventListener("click", toggleSound);
  dom.randomPrompt.addEventListener("click", randomizePrompt);
}

setStage(1);
runPointerEngine();
runPlasmaBackground();
runParticles();
attachEvents();
