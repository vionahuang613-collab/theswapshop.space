const dom = {
  body: document.body,
  scene: document.getElementById("scene"),
  installation: document.getElementById("installation"),
  coinSlot: document.getElementById("coinSlot"),
  beginDeposit: document.getElementById("beginDeposit"),
  drawNow: document.getElementById("drawNow"),
  uploadModal: document.getElementById("uploadModal"),
  closeUpload: document.getElementById("closeUpload"),
  uploadForm: document.getElementById("uploadForm"),
  glassChamber: document.getElementById("glassChamber"),
  screenText: document.getElementById("screenText"),
  screenSub: document.getElementById("screenSub"),
  drawActions: document.getElementById("drawActions"),
  btnA: document.getElementById("btnA"),
  btnB: document.getElementById("btnB"),
  gachaBall: document.getElementById("gachaBall"),
  unboxModal: document.getElementById("unboxModal"),
  closeUnbox: document.getElementById("closeUnbox"),
  fragmentCard: document.getElementById("fragmentCard"),
  saveFragment: document.getElementById("saveFragment"),
  useFragment: document.getElementById("useFragment"),
  toast: document.getElementById("toast"),
  coinCursor: document.getElementById("coinCursor"),
  particleLayer: document.getElementById("particleLayer"),
  soundToggle: document.getElementById("soundToggle"),
  chip1: document.getElementById("chip1"),
  chip2: document.getElementById("chip2"),
  chip3: document.getElementById("chip3"),
};

const fragments = {
  visual: [
    {
      title: "Anonymous Visual Scrap #V014",
      body: "A chrome fish skeleton hanging in front of a pink thunderstorm.",
      colors: ["#ff7ddd", "#ffc8f2", "#cb7fff"],
    },
    {
      title: "Anonymous Visual Scrap #V029",
      body: "A broken cinema seat covered with gel ink and stardust noise.",
      colors: ["#ff63d6", "#ff9de9", "#9ef3ff"],
    },
  ],
  mixed: [
    {
      title: "Anonymous Hybrid Scrap #M051",
      body: "'I glued my failed drafts into a kite and finally let it rise.'",
      colors: ["#ff8be2", "#ffd0f5", "#c97dff"],
    },
    {
      title: "Anonymous Hybrid Scrap #M072",
      body: "Write a character who can only remember in soft static and pink glare.",
      colors: ["#ff57cf", "#ffc3ef", "#7ae9ff"],
    },
  ],
};

const state = {
  selectedMode: null,
  ambientCtx: null,
  ambientNodes: null,
  soundOn: false,
};

function setStage(step) {
  dom.body.dataset.stage = String(step);
  [dom.chip1, dom.chip2, dom.chip3].forEach((chip) => chip.classList.remove("active"));
  if (step === 1) dom.chip1.classList.add("active");
  if (step === 2) dom.chip2.classList.add("active");
  if (step === 3) dom.chip3.classList.add("active");
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.remove("hidden");
  setTimeout(() => dom.toast.classList.add("hidden"), 1850);
}

function vibrate(ms = 35) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function oneShot({ freq = 280, duration = 0.1, gain = 0.08, type = "triangle" } = {}) {
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

function setScreen(text, subText = "") {
  dom.screenText.textContent = text;
  dom.screenSub.textContent = subText;
}

function focusMachine() {
  document.getElementById("machine").scrollIntoView({ behavior: "smooth", block: "center" });
}

function openUpload() {
  dom.uploadModal.classList.remove("hidden");
  setScreen("Deposit window open.", "Upload a sketch, a line, or a color scrap to feed the exchange.");
  oneShot({ freq: 560, duration: 0.07, gain: 0.07, type: "square" });
}

function closeUpload() {
  dom.uploadModal.classList.add("hidden");
}

function startAnalysis() {
  dom.glassChamber.classList.add("glitch");
  dom.drawActions.classList.add("hidden");
  setScreen("Analyzing your creative leftovers...", "Looking for anonymous fragments with matching energy.");
  oneShot({ freq: 140, duration: 0.12, gain: 0.1 });

  setTimeout(() => setScreen("Reading sketch / text / palette.", "Preparing two capsule routes: visual or hybrid."), 900);
  setTimeout(() => setScreen("Matching anonymous fragment pool.", "Almost done."), 1700);
  setTimeout(() => {
    dom.glassChamber.classList.remove("glitch");
    setScreen("Step 2 ready: choose A or B.", "A = visual spark, B = text/hybrid spark.");
    dom.drawActions.classList.remove("hidden");
    setStage(2);
    showToast("Analysis complete. Choose A or B.");
  }, 2600);
}

function pulseCables() {
  document.querySelectorAll(".neon-cable").forEach((cable) => {
    cable.classList.add("pulse");
    setTimeout(() => cable.classList.remove("pulse"), 780);
  });
}

function dropCapsule(mode) {
  state.selectedMode = mode;
  const visual = mode === "visual";
  setScreen(
    visual ? "Visual capsule dispensed." : "Hybrid capsule dispensed.",
    "Tap the capsule in the bay to unbox your fragment."
  );
  oneShot({ freq: visual ? 430 : 360, duration: 0.08, gain: 0.1, type: "square" });
  vibrate(48);
  pulseCables();

  dom.gachaBall.classList.remove("hidden", "drop");
  void dom.gachaBall.offsetWidth;
  dom.gachaBall.classList.add("drop");
  setStage(2);
  showToast("Capsule dropped. Tap to unbox.");
}

function renderFragment(mode) {
  const pool = fragments[mode] || fragments.mixed;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  dom.fragmentCard.innerHTML = `
    <h4>${picked.title}</h4>
    <div class="fragment-preview"><p>${picked.body}</p></div>
    <div class="chip-row">
      ${picked.colors.map((color) => `<span class="chip" style="background:${color}"></span>`).join("")}
    </div>
  `;
}

function openUnbox() {
  if (!state.selectedMode) {
    showToast("Choose A or B first.");
    return;
  }
  dom.unboxModal.classList.remove("hidden");
  renderFragment(state.selectedMode);
  setScreen("Step 3: save it or mark it as used.", "When reused in 30 days, the donor gets an anonymous success ping.");
  setStage(3);
  oneShot({ freq: 620, duration: 0.08, gain: 0.11 });
}

function closeUnbox() {
  dom.unboxModal.classList.add("hidden");
}

function setupPointerDepth() {
  dom.scene.addEventListener("pointermove", (event) => {
    const rx = (event.clientX / window.innerWidth - 0.5) * 14;
    const ry = (event.clientY / window.innerHeight - 0.5) * -10;
    dom.installation.style.transform = `rotateY(${rx}deg) rotateX(${ry}deg) translateZ(6px)`;
    dom.coinCursor.style.left = `${event.clientX}px`;
    dom.coinCursor.style.top = `${event.clientY}px`;
  });
}

function spawnParticle() {
  const node = document.createElement("span");
  const isStar = Math.random() > 0.55;
  node.className = `particle ${isStar ? "star" : "bubble"}`;
  const size = 6 + Math.random() * 16;
  node.style.width = `${size}px`;
  node.style.height = `${size}px`;
  node.style.left = `${Math.random() * 100}%`;
  node.style.animationDuration = `${7 + Math.random() * 8}s`;
  node.style.opacity = `${0.3 + Math.random() * 0.6}`;
  node.style.background = isStar
    ? `rgba(255, ${170 + Math.floor(Math.random() * 60)}, 240, 0.9)`
    : "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(255,126,220,0.35), rgba(168,82,255,0.18))";

  dom.particleLayer.appendChild(node);
  node.addEventListener("animationend", () => node.remove());
}

function runParticles() {
  for (let i = 0; i < 16; i += 1) spawnParticle();
  setInterval(spawnParticle, 430);
}

function buildAmbientAudio() {
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
  const master = ctx.createGain();

  drone.type = "sine";
  drone.frequency.value = 144;
  shimmer.type = "triangle";
  shimmer.frequency.value = 288;
  lfo.type = "sine";
  lfo.frequency.value = 0.11;
  lfoGain.gain.value = 28;

  droneGain.gain.value = 0.02;
  shimmerGain.gain.value = 0.012;
  master.gain.value = 0.1;

  lfo.connect(lfoGain);
  lfoGain.connect(shimmer.frequency);
  drone.connect(droneGain).connect(master);
  shimmer.connect(shimmerGain).connect(master);
  master.connect(ctx.destination);

  drone.start();
  shimmer.start();
  lfo.start();
  state.ambientNodes = { drone, shimmer, lfo };
}

function stopAmbientAudio() {
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
  dom.soundToggle.textContent = state.soundOn ? "SOUND ON" : "SOUND OFF";
  dom.soundToggle.setAttribute("aria-pressed", state.soundOn ? "true" : "false");

  if (state.soundOn) {
    buildAmbientAudio();
    showToast("Ethereal ambience enabled.");
  } else {
    stopAmbientAudio();
    showToast("Sound muted.");
  }
}

function skipToDraw() {
  dom.drawActions.classList.remove("hidden");
  setScreen("Step 2 unlocked.", "You skipped deposit. Pick A or B to draw from the pool.");
  setStage(2);
  focusMachine();
  showToast("Draw mode unlocked.");
}

function attachEvents() {
  dom.beginDeposit.addEventListener("click", () => {
    focusMachine();
    openUpload();
  });

  dom.drawNow.addEventListener("click", skipToDraw);
  dom.coinSlot.addEventListener("click", openUpload);
  dom.closeUpload.addEventListener("click", closeUpload);
  dom.closeUnbox.addEventListener("click", closeUnbox);

  dom.uploadForm.addEventListener("submit", (event) => {
    event.preventDefault();
    closeUpload();
    startAnalysis();
  });

  dom.btnA.addEventListener("click", () => dropCapsule("visual"));
  dom.btnB.addEventListener("click", () => dropCapsule("mixed"));
  document.querySelectorAll(".draw-btn").forEach((btn) => {
    btn.addEventListener("click", () => dropCapsule(btn.dataset.mode));
  });

  dom.gachaBall.addEventListener("click", openUnbox);
  dom.saveFragment.addEventListener("click", () => {
    setStage(3);
    showToast("Fragment saved to your vault.");
  });

  dom.useFragment.addEventListener("click", () => {
    setStage(3);
    showToast("Marked as used. 30-day ping armed.");
    closeUnbox();
  });

  dom.soundToggle.addEventListener("click", toggleSound);
}

setStage(1);
setupPointerDepth();
runParticles();
attachEvents();
