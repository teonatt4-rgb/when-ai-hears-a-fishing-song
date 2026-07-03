const stage = document.querySelector("#stage");
const canvas = document.querySelector("#soundCanvas");
const fallback = document.querySelector("#fallback");
const audio = document.querySelector("#studyAudio");
const startStudy = document.querySelector("#startStudy");
const replayStudy = document.querySelector("#replayStudy");
const openLibrary = document.querySelector("#openLibrary");
const closeLibrary = document.querySelector("#closeLibrary");
const trackSelector = document.querySelector("#trackSelector");
const trackCards = [...document.querySelectorAll("[data-track-round]")];
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const trackWaveCanvases = [...document.querySelectorAll(".track-wave")];
const roundButtons = [...document.querySelectorAll("[data-round]")];
const variantButtons = [...document.querySelectorAll("[data-variant]")];
const roundCode = document.querySelector("#roundCode");
const roundTitle = document.querySelector("#roundTitle");
const roundNote = document.querySelector("#roundNote");
const sourceLabel = document.querySelector("#sourceLabel");
const singleTrackLabel = document.querySelector("#singleTrackLabel");
const singleTrackMode = document.querySelector("#singleTrackMode");
const timeReadout = document.querySelector("#timeReadout");
const totalReadout = document.querySelector("#totalReadout");
const timelineProgress = document.querySelector("#timelineProgress");
const thresholdCard = document.querySelector("#thresholdCard");
const thresholdStep = document.querySelector("#thresholdStep");
const thresholdTitle = document.querySelector("#thresholdTitle");
const thresholdNote = document.querySelector("#thresholdNote");

const bars = {
  low: document.querySelector("#lowBar"),
  mid: document.querySelector("#midBar"),
  high: document.querySelector("#highBar"),
};

const values = {
  low: document.querySelector("#lowValue"),
  mid: document.querySelector("#midValue"),
  high: document.querySelector("#highValue"),
};

const rounds = [
  {
    code: "第01轮 / ROUND 01",
    title: "宽泛风格 / GENERIC STYLE",
    note: "宽泛提示形成一个尚未落入具体文化位置的声音体。 / A broad prompt produces a culturally unlocated sound object.",
    a: "./assets/experiment_audio/r1_a_generic_style.mp3",
    b: "./assets/experiment_audio/r1_b_generic_style.mp3",
    aDuration: 138.5,
    bDuration: 138.7,
  },
  {
    code: "第02轮 / ROUND 02",
    title: "地域语境 / CULTURAL CONTEXT",
    note: "地域与文化语言开始改变声音体的形态。 / Place and cultural language begin to reshape the object.",
    a: "./assets/experiment_audio/r2_a_cultural_prompt.mp3",
    b: "./assets/experiment_audio/r2_b_cultural_prompt.mp3",
    aDuration: 133.1,
    bDuration: 117.7,
  },
  {
    code: "第03轮 / ROUND 03",
    title: "演奏技巧 / PERFORMANCE TECHNIQUE",
    note: "滑奏、双音与调式色彩被转译为空间动作。 / Performance knowledge becomes spatial gesture.",
    a: "./assets/experiment_audio/r3_a_expert_prompt.mp3",
    b: "./assets/experiment_audio/r3_b_expert_prompt.mp3",
    aDuration: 93.3,
    bDuration: 87.7,
  },
  {
    code: "第04轮 / ROUND 04",
    title: "识别边界 / RECOGNITION BOUNDARY",
    note: "演奏录音触碰到平台的声音识别边界。 / A performance recording meets the platform's recognition boundary.",
    a: "./assets/experiment_audio/r4_a_own_audio_upload.mp3",
    b: "./assets/experiment_audio/r4_b_own_audio_upload.mp3",
    aDuration: 112.3,
    bDuration: 129.4,
  },
];

let currentRound = 0;
let visualRound = 0;
let currentVariant = "a";
let playbackMode =
  new URLSearchParams(window.location.search).get("mode") === "full"
    ? "full"
    : "excerpt";
let manualPlaying = false;
let manualStartedAt = 0;
let manualElapsed = 0;
let manualTotal = 18;
let manualRound = 0;
let manualVariant = "a";
let playbackSession = "idle";
const excerptDuration = 18;
let demoRunning = false;
let demoStartedAt = 0;
let demoElapsed = 0;
let lastDemoRound = -1;
let audioContext = null;
let analyser = null;
let mediaSource = null;
let frequencyData = null;
let audioRequestToken = 0;
let offlineAnalysis = null;
let bands = { low: 0.12, mid: 0.1, high: 0.08 };
let targetBands = { low: 0.12, mid: 0.1, high: 0.08 };
let pointer = { x: 0, y: 0 };
let pointerTarget = { x: 0, y: 0 };
let dragging = false;
let dragOrigin = { x: 0, y: 0 };
let dragRotation = { x: 0, y: 0 };
let dragStartRotation = { x: 0, y: 0 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function averageRange(data, start, end) {
  let sum = 0;
  const safeEnd = Math.min(end, data.length);
  for (let index = start; index < safeEnd; index += 1) sum += data[index];
  return sum / Math.max(1, safeEnd - start) / 255;
}

fetch("./assets/sound_analysis.json")
  .then((response) => response.json())
  .then((data) => {
    offlineAnalysis = data;
    renderTrackWaves();
  })
  .catch(() => {
    offlineAnalysis = null;
  });

function formatStudyTime(value) {
  const safe = Math.max(0, value);
  const minutes = Math.floor(safe / 60);
  const seconds = safe - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${seconds
    .toFixed(1)
    .padStart(4, "0")}`;
}

function ensureAudioGraph() {
  if (audioContext) return true;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;
  audioContext = new AudioContextClass();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.72;
  frequencyData = new Uint8Array(analyser.frequencyBinCount);
  mediaSource = audioContext.createMediaElementSource(audio);
  mediaSource.connect(analyser);
  analyser.connect(audioContext.destination);
  return true;
}

async function playRoundAudio(roundIndex, variant = currentVariant, startAt = 14) {
  const requestToken = ++audioRequestToken;
  currentRound = roundIndex;
  currentVariant = variant;
  const nextSource = rounds[currentRound][currentVariant];
  const resolvedSource = new URL(nextSource, window.location.href).href;

  if (audio.src !== resolvedSource) {
    audio.src = nextSource;
    audio.load();
  }

  updateRoundUI();

  let hasAudioAnalysis = false;
  try {
    hasAudioAnalysis = ensureAudioGraph();
    if (hasAudioAnalysis && audioContext.state === "suspended") {
      await audioContext.resume();
    }
  } catch {
    hasAudioAnalysis = false;
  }

  if (requestToken !== audioRequestToken) return;

  const seekToExcerpt = () => {
    if (requestToken !== audioRequestToken) return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    audio.currentTime = Math.min(startAt, Math.max(0, duration - 0.2));
  };

  if (audio.readyState >= 1) seekToExcerpt();
  else audio.addEventListener("loadedmetadata", seekToExcerpt, { once: true });

  audio.play().catch(() => {
    audio.addEventListener(
      "canplay",
      () => {
        if (requestToken !== audioRequestToken) return;
        audio.play().catch(() => {});
      },
      { once: true },
    );
  });
}

function getTrackDuration(roundIndex = currentRound, variant = currentVariant) {
  return rounds[roundIndex][`${variant}Duration`];
}

function setPlaybackMode(mode) {
  playbackMode = mode === "full" ? "full" : "excerpt";
  modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === playbackMode);
  });
  manualTotal =
    playbackMode === "full" ? getTrackDuration() : excerptDuration;
  totalReadout.textContent = `/ ${formatStudyTime(manualTotal)}`;
  singleTrackMode.textContent =
    playbackMode === "full"
      ? "单曲完整播放 / SINGLE TRACK · FULL LENGTH"
      : "单曲 · 18秒 / SINGLE TRACK · 18 SEC";
  renderTrackWaves();
}

function renderTrackWaves() {
  if (!offlineAnalysis) return;

  trackCards.forEach((card, cardIndex) => {
    const roundIndex = Number(card.dataset.trackRound);
    const variant = card.dataset.trackVariant;
    const sourceName = rounds[roundIndex][variant].split("/").pop();
    const track = offlineAnalysis.tracks[sourceName];
    const waveCanvas = trackWaveCanvases[cardIndex];
    if (!track || !waveCanvas) return;

    const context = waveCanvas.getContext("2d");
    const width = waveCanvas.width;
    const height = waveCanvas.height;
    context.clearRect(0, 0, width, height);

    const startTime = playbackMode === "excerpt" ? 14 : 0;
    const endTime =
      playbackMode === "excerpt"
        ? 14 + excerptDuration
        : getTrackDuration(roundIndex, variant);
    const startFrame = Math.floor(startTime * offlineAnalysis.fps);
    const endFrame = Math.min(
      track.low.length - 1,
      Math.floor(endTime * offlineAnalysis.fps),
    );
    const samples = 58;
    const gradient = context.createLinearGradient(0, 0, width, 0);
    const colors = [
      ["#6d95ff", "#d2ddff"],
      ["#25c7db", "#99f2ff"],
      ["#795fff", "#caff38"],
      ["#ff744d", "#caff38"],
    ][roundIndex];
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    context.strokeStyle = gradient;
    context.lineWidth = 1.2;
    context.globalAlpha = 0.82;
    context.beginPath();

    for (let index = 0; index < samples; index += 1) {
      const position = index / Math.max(1, samples - 1);
      const frame = Math.floor(startFrame + (endFrame - startFrame) * position);
      const energy =
        (track.low[frame] * 0.46 +
          track.mid[frame] * 0.38 +
          track.high[frame] * 0.16) /
        255;
      const x = position * width;
      const amplitude = 2 + energy * (height * 0.42);
      context.moveTo(x, height / 2 - amplitude);
      context.lineTo(x, height / 2 + amplitude);
    }

    context.stroke();
    context.globalAlpha = 1;
  });
}

function startSelectedTrack(roundIndex, variant) {
  demoRunning = false;
  lastDemoRound = -1;
  playbackSession = "manual";
  manualPlaying = true;
  manualStartedAt = performance.now();
  manualElapsed = 0;
  manualRound = roundIndex;
  manualVariant = variant;
  currentRound = roundIndex;
  currentVariant = variant;
  stage.classList.remove("is-tour");
  stage.classList.add("is-single-track");
  const trackKind = roundIndex === 3 ? "输出 / OUTPUT" : "声音 / SAMPLE";
  singleTrackLabel.textContent =
    `R${roundIndex + 1} / ${trackKind} ${variant.toUpperCase()}`;
  manualTotal =
    playbackMode === "full"
      ? getTrackDuration(roundIndex, variant)
      : excerptDuration;
  timeReadout.textContent = formatStudyTime(0);
  totalReadout.textContent = `/ ${formatStudyTime(manualTotal)}`;
  timelineProgress.style.width = "0%";
  trackCards.forEach((card) => {
    const isSelected =
      Number(card.dataset.trackRound) === roundIndex &&
      card.dataset.trackVariant === variant;
    card.classList.toggle("is-active", isSelected);
    card.setAttribute("aria-pressed", String(isSelected));
  });
  trackSelector.classList.remove("is-open");
  audio.pause();
  playRoundAudio(
    roundIndex,
    variant,
    playbackMode === "full" ? 0 : 14,
  ).catch(() => {});
}

function updateRoundUI() {
  const round = rounds[currentRound];
  stage.dataset.round = String(currentRound);
  roundCode.textContent = round.code;
  roundTitle.textContent = round.title;
  roundNote.textContent = round.note;
  const sourceKind = currentRound === 3 ? "输出 / OUTPUT" : "声音 / SAMPLE";
  sourceLabel.textContent = `R${currentRound + 1} / ${sourceKind} ${currentVariant.toUpperCase()}`;

  roundButtons.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.round) === currentRound);
  });
  variantButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.variant === currentVariant);
  });
}

function updateSignal() {
  const sourcePath = rounds[currentRound][currentVariant];
  const sourceName = sourcePath.split("/").pop();
  const storedTrack = offlineAnalysis?.tracks?.[sourceName];

  if (storedTrack) {
    let excerptTime = 14;
    if (demoRunning) {
      excerptTime = 14 + Math.max(0, demoElapsed - currentRound * 4);
    } else if (manualPlaying) {
      excerptTime =
        (playbackMode === "full" ? 0 : 14) + Math.max(0, manualElapsed);
    } else if (Number.isFinite(audio.currentTime) && audio.currentTime > 0) {
      excerptTime = audio.currentTime;
    }
    const frame = Math.min(
      storedTrack.low.length - 1,
      Math.floor(excerptTime * offlineAnalysis.fps),
    );
    targetBands.low = storedTrack.low[frame] / 255;
    targetBands.mid = storedTrack.mid[frame] / 255;
    targetBands.high = storedTrack.high[frame] / 255;
  } else if (analyser && !audio.paused) {
    analyser.getByteFrequencyData(frequencyData);
    targetBands.low = averageRange(frequencyData, 1, 18);
    targetBands.mid = averageRange(frequencyData, 18, 92);
    targetBands.high = averageRange(frequencyData, 92, 260);
  } else {
    const idle = performance.now() * 0.001;
    targetBands.low = 0.11 + Math.sin(idle * 1.7) * 0.025;
    targetBands.mid = 0.09 + Math.sin(idle * 2.1 + 1.2) * 0.02;
    targetBands.high = 0.06 + Math.sin(idle * 2.9 + 2.4) * 0.015;
  }

  bands.low += (targetBands.low - bands.low) * 0.13;
  bands.mid += (targetBands.mid - bands.mid) * 0.13;
  bands.high += (targetBands.high - bands.high) * 0.13;

  for (const key of ["low", "mid", "high"]) {
    const percentage = clamp(bands[key] * 118, 2, 100);
    bars[key].style.width = `${percentage}%`;
    values[key].textContent = String(Math.round(bands[key] * 99)).padStart(2, "0");
  }
}

function updateThreshold(localTime, inThreshold) {
  stage.classList.toggle("is-threshold", inThreshold);

  if (!inThreshold) {
    thresholdCard.classList.remove("is-visible", "is-accepted");
    stage.classList.remove("is-accepted");
    return { scan: 0, accepted: 0 };
  }

  thresholdCard.classList.add("is-visible");
  thresholdCard.classList.remove("is-accepted");
  stage.classList.remove("is-accepted");

  if (localTime < 1.45) {
    thresholdStep.textContent = "DIRECT PERFORMANCE UPLOAD";
    thresholdTitle.textContent = "MATCH DETECTED";
    thresholdNote.textContent = "Upload rejected";
    return { scan: 1, accepted: 0 };
  }

  if (localTime < 2.85) {
    thresholdStep.textContent = "EDITED EXCERPT 01";
    thresholdTitle.textContent = "MATCH DETECTED";
    thresholdNote.textContent = "First processed version rejected";
    return { scan: 1, accepted: 0 };
  }

  thresholdStep.textContent = "EDITED EXCERPT 02";
  thresholdTitle.textContent = "GENERATION CONTINUES";
  thresholdNote.textContent = "Second processed version accepted";
  thresholdCard.classList.add("is-accepted");
  stage.classList.add("is-accepted");
  return { scan: 0.3, accepted: 1 };
}

function showGeneratedResult(variant) {
  stage.classList.remove("is-threshold");
  stage.classList.add("is-accepted");
  thresholdCard.classList.add("is-visible", "is-accepted");
  thresholdStep.textContent = `第04轮 / ROUND 04 · 输出 / OUTPUT ${variant.toUpperCase()}`;
  thresholdTitle.textContent = "生成完成 / GENERATION COMPLETED";
  thresholdNote.textContent = "加工节选二通过识别 / Accepted after edited excerpt 02";
  return { scan: 0.08, accepted: 1 };
}

function startDemo() {
  manualPlaying = false;
  playbackSession = "tour";
  demoRunning = true;
  demoStartedAt = performance.now();
  demoElapsed = 0;
  lastDemoRound = -1;
  currentVariant = "a";
  stage.classList.add("is-tour");
  stage.classList.remove("is-single-track");
  trackSelector.classList.remove("is-open");
  totalReadout.textContent = `/ ${formatStudyTime(20)}`;
  runDemoTimeline();
}

function runDemoTimeline() {
  if (!demoRunning || playbackSession !== "tour") return;
  demoElapsed = (performance.now() - demoStartedAt) / 1000;

  if (demoElapsed >= 20) {
    demoElapsed = 20;
    demoRunning = false;
    playbackSession = "idle";
    audio.pause();
  }

  const nextRound = Math.min(3, Math.floor(demoElapsed / 4));
  if (nextRound !== lastDemoRound) {
    lastDemoRound = nextRound;
    currentRound = nextRound;
    currentVariant = "a";
    updateRoundUI();
    playRoundAudio(nextRound, "a").catch(() => {});
  }

  timeReadout.textContent = formatStudyTime(demoElapsed);
  timelineProgress.style.width = `${(demoElapsed / 20) * 100}%`;
}

function runManualTimeline() {
  if (!manualPlaying || playbackSession !== "manual") return;

  if (currentRound !== manualRound || currentVariant !== manualVariant) {
    currentRound = manualRound;
    currentVariant = manualVariant;
    updateRoundUI();
  }

  manualElapsed = (performance.now() - manualStartedAt) / 1000;
  const total =
    playbackMode === "full"
      ? getTrackDuration(currentRound, currentVariant)
      : excerptDuration;
  manualTotal = total;

  if (manualElapsed >= total) {
    manualElapsed = total;
    manualPlaying = false;
    playbackSession = "idle";
    audio.pause();
  }

  timeReadout.textContent = formatStudyTime(manualElapsed);
  totalReadout.textContent = `/ ${formatStudyTime(total)}`;
  timelineProgress.style.width = `${clamp(manualElapsed / total, 0, 1) * 100}%`;
}

startStudy.addEventListener("click", startDemo);
replayStudy.addEventListener("click", startDemo);

openLibrary.addEventListener("click", () => {
  demoRunning = false;
  manualPlaying = false;
  playbackSession = "idle";
  stage.classList.remove("is-tour");
  stage.classList.remove("is-single-track");
  audioRequestToken += 1;
  audio.pause();
  trackSelector.classList.add("is-open");
});

closeLibrary.addEventListener("click", () => {
  trackSelector.classList.remove("is-open");
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setPlaybackMode(button.dataset.mode);
  });
});

trackCards.forEach((card) => {
  card.addEventListener("click", () => {
    startSelectedTrack(
      Number(card.dataset.trackRound),
      card.dataset.trackVariant,
    );
  });
});

roundButtons.forEach((button) => {
  button.addEventListener("click", () => {
    startSelectedTrack(Number(button.dataset.round), currentVariant);
  });
});

variantButtons.forEach((button) => {
  button.addEventListener("click", () => {
    startSelectedTrack(currentRound, button.dataset.variant);
  });
});

stage.addEventListener("pointerdown", (event) => {
  if (event.target !== canvas) return;
  dragging = true;
  dragOrigin = { x: event.clientX, y: event.clientY };
  dragStartRotation = { ...dragRotation };
  canvas.setPointerCapture(event.pointerId);
});

stage.addEventListener("pointermove", (event) => {
  const rect = stage.getBoundingClientRect();
  pointerTarget.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
  pointerTarget.y = ((event.clientY - rect.top) / rect.height - 0.5) * -2;

  if (dragging) {
    dragRotation.y = dragStartRotation.y + (event.clientX - dragOrigin.x) * 0.008;
    dragRotation.x = dragStartRotation.x + (event.clientY - dragOrigin.y) * 0.006;
  }
});

stage.addEventListener("pointerup", () => {
  dragging = false;
});

setPlaybackMode(playbackMode);
trackCards.forEach((card) => {
  const isSelected =
    Number(card.dataset.trackRound) === currentRound &&
    card.dataset.trackVariant === currentVariant;
  card.classList.toggle("is-active", isSelected);
  card.setAttribute("aria-pressed", String(isSelected));
});

stage.addEventListener("pointercancel", () => {
  dragging = false;
});

const gl = canvas.getContext("webgl2", {
  antialias: true,
  alpha: true,
  premultipliedAlpha: false,
});

if (!gl) {
  fallback.style.display = "grid";
  canvas.style.display = "none";
} else {
  const vertexShaderSource = `#version 300 es
    precision highp float;

    in vec3 aPosition;
    in vec3 aNormal;

    uniform float uTime;
    uniform vec3 uBands;
    uniform float uRound;
    uniform float uAspect;
    uniform vec2 uPointer;
    uniform vec2 uDrag;
    uniform float uPointPass;
    uniform float uScale;
    uniform float uAccepted;

    out vec3 vNormal;
    out vec3 vPosition;
    out vec3 vColor;
    out float vEnergy;

    mat3 rotateX(float angle) {
      float c = cos(angle);
      float s = sin(angle);
      return mat3(
        1.0, 0.0, 0.0,
        0.0, c, -s,
        0.0, s, c
      );
    }

    mat3 rotateY(float angle) {
      float c = cos(angle);
      float s = sin(angle);
      return mat3(
        c, 0.0, s,
        0.0, 1.0, 0.0,
        -s, 0.0, c
      );
    }

    void main() {
      vec3 p = aPosition;
      float low = uBands.x;
      float mid = uBands.y;
      float high = uBands.z;
      float energy = low * 0.5 + mid * 0.34 + high * 0.16;
      float angle = atan(p.z, p.x);

      float softWave =
        sin(p.y * 7.0 + uTime * 1.5) * 0.55 +
        sin(angle * 5.0 - uTime * 1.1) * 0.45;
      float coast =
        sin(angle * 9.0 + p.y * 5.0 + uTime * 0.65) *
        cos(p.y * 10.0 - uTime * 0.4);
      float gesture =
        sin(p.y * 16.0 + uTime * 2.0) * 0.55 +
        cos((p.x - p.z) * 11.0 - uTime * 1.7) * 0.45;

      float weight0 = clamp(1.0 - abs(uRound - 0.0), 0.0, 1.0);
      float weight1 = clamp(1.0 - abs(uRound - 1.0), 0.0, 1.0);
      float weight2 = clamp(1.0 - abs(uRound - 2.0), 0.0, 1.0);
      float weight3 = clamp(1.0 - abs(uRound - 3.0), 0.0, 1.0);
      float totalWeight = max(weight0 + weight1 + weight2 + weight3, 0.001);

      float displacement0 = softWave * (0.055 + energy * 0.38);
      float displacement1 =
        softWave * (0.035 + energy * 0.22) +
        coast * (0.07 + mid * 0.24);
      float displacement2 =
        softWave * 0.03 +
        gesture * (0.09 + mid * 0.28);
      float displacement3 =
        softWave * (0.022 + energy * 0.13) +
        sin(angle * 12.0 + uTime) * 0.022;

      float displacement = (
        displacement0 * weight0 +
        displacement1 * weight1 +
        displacement2 * weight2 +
        displacement3 * weight3
      ) / totalWeight;

      p.x *= 1.0 +
        weight2 * sin(p.y * 3.14159) * (0.10 + low * 0.18);
      p.y *= 1.0 +
        weight1 * 0.06 +
        weight2 * (0.12 + high * 0.18);
      p *= 1.0 + weight3 * (0.04 + low * 0.10);

      vec3 color0 = vec3(0.38, 0.60, 1.0);
      vec3 color1 = vec3(0.10, 0.72, 0.91);
      vec3 color2 = mix(
        vec3(0.40, 0.30, 1.0),
        vec3(0.77, 1.0, 0.22),
        high
      );
      vec3 color3 = mix(
        vec3(1.0, 0.45, 0.23),
        vec3(0.77, 1.0, 0.28),
        uAccepted
      );
      vec3 color = (
        color0 * weight0 +
        color1 * weight1 +
        color2 * weight2 +
        color3 * weight3
      ) / totalWeight;

      p += aNormal * displacement;
      p *= uScale;

      float autoY = uTime * 0.11;
      float autoX = sin(uTime * 0.19) * 0.12;
      p = rotateY(autoY + uPointer.x * 0.14 + uDrag.y) *
          rotateX(autoX + uPointer.y * 0.10 + uDrag.x) * p;

      vec3 viewPosition = p + vec3(0.0, 0.0, -3.55);
      float nearPlane = 0.1;
      float farPlane = 100.0;
      float focal = 1.72;

      gl_Position.x = viewPosition.x * focal / uAspect;
      gl_Position.y = viewPosition.y * focal;
      gl_Position.z =
        ((farPlane + nearPlane) / (nearPlane - farPlane)) * viewPosition.z +
        ((2.0 * farPlane * nearPlane) / (nearPlane - farPlane));
      gl_Position.w = -viewPosition.z;

      gl_PointSize = 1.35 + high * 4.8 + uPointPass * 1.2;
      vNormal = normalize(rotateY(autoY) * aNormal);
      vPosition = p;
      vColor = color;
      vEnergy = energy;
    }
  `;

  const fragmentShaderSource = `#version 300 es
    precision highp float;

    in vec3 vNormal;
    in vec3 vPosition;
    in vec3 vColor;
    in float vEnergy;

    uniform float uPointPass;
    uniform float uGlow;

    out vec4 outColor;

    void main() {
      if (uPointPass > 0.5) {
        vec2 point = gl_PointCoord - 0.5;
        float distanceToCenter = length(point);
        if (distanceToCenter > 0.5) discard;
        float alpha = smoothstep(0.5, 0.05, distanceToCenter);
        outColor = vec4(vColor * (1.25 + uGlow), alpha * 0.72);
        return;
      }

      vec3 lightDirection = normalize(vec3(-0.4, 0.75, 0.65));
      float diffuse = max(dot(normalize(vNormal), lightDirection), 0.0);
      float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.2);
      vec3 color =
        vColor * (0.19 + diffuse * 0.55) +
        vec3(0.62, 0.80, 1.0) * fresnel * (0.65 + vEnergy);
      float alpha = 0.30 + fresnel * 0.42 + diffuse * 0.12;
      outColor = vec4(color * (1.0 + uGlow * 0.4), alpha);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexShaderSource));
  gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    fallback.style.display = "grid";
    fallback.textContent = "3D着色器未能启动。";
    throw new Error(gl.getProgramInfoLog(program));
  }

  const latitudeSegments = 76;
  const longitudeSegments = 108;
  const positions = [];
  const normals = [];
  const indices = [];

  for (let latitude = 0; latitude <= latitudeSegments; latitude += 1) {
    const theta = (latitude / latitudeSegments) * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let longitude = 0; longitude <= longitudeSegments; longitude += 1) {
      const phi = (longitude / longitudeSegments) * Math.PI * 2;
      const x = Math.cos(phi) * sinTheta;
      const y = cosTheta;
      const z = Math.sin(phi) * sinTheta;
      positions.push(x, y, z);
      normals.push(x, y, z);
    }
  }

  for (let latitude = 0; latitude < latitudeSegments; latitude += 1) {
    for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
      const first = latitude * (longitudeSegments + 1) + longitude;
      const second = first + longitudeSegments + 1;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  const vertexArray = gl.createVertexArray();
  gl.bindVertexArray(vertexArray);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  const positionLocation = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  const normalLocation = gl.getAttribLocation(program, "aNormal");
  gl.enableVertexAttribArray(normalLocation);
  gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

  const uniforms = {};
  for (const name of [
    "uTime",
    "uBands",
    "uRound",
    "uAspect",
    "uPointer",
    "uDrag",
    "uPointPass",
    "uScale",
    "uAccepted",
    "uGlow",
  ]) {
    uniforms[name] = gl.getUniformLocation(program, name);
  }

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);

  function resizeCanvas() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
    const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  }

  function drawSoundObject(now) {
    resizeCanvas();
    updateSignal();
    runDemoTimeline();
    runManualTimeline();

    pointer.x += (pointerTarget.x - pointer.x) * 0.055;
    pointer.y += (pointerTarget.y - pointer.y) * 0.055;
    visualRound += (currentRound - visualRound) * 0.045;

    const demoThresholdActive = demoRunning && demoElapsed >= 16;
    const manualR4ResultActive =
      !demoRunning &&
      currentRound === 3 &&
      !trackSelector.classList.contains("is-open");
    const thresholdLocal = demoThresholdActive
      ? Math.max(0, demoElapsed - 16)
      : 0;
    const thresholdState = demoThresholdActive
      ? updateThreshold(thresholdLocal, true)
      : manualR4ResultActive
        ? showGeneratedResult(currentVariant)
        : updateThreshold(0, false);
    const time = now * 0.001;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindVertexArray(vertexArray);

    gl.uniform1f(uniforms.uTime, time);
    gl.uniform3f(uniforms.uBands, bands.low, bands.mid, bands.high);
    gl.uniform1f(uniforms.uRound, visualRound);
    gl.uniform1f(uniforms.uAspect, canvas.width / canvas.height);
    gl.uniform2f(uniforms.uPointer, pointer.x, pointer.y);
    gl.uniform2f(uniforms.uDrag, dragRotation.x, dragRotation.y);
    gl.uniform1f(uniforms.uAccepted, thresholdState.accepted);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(true);
    gl.uniform1f(uniforms.uPointPass, 0);
    gl.uniform1f(uniforms.uScale, 1.0);
    gl.uniform1f(uniforms.uGlow, 0);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);
    gl.uniform1f(uniforms.uPointPass, 1);
    gl.uniform1f(uniforms.uScale, 1.018);
    gl.uniform1f(uniforms.uGlow, 0.65);
    gl.drawArrays(gl.POINTS, 0, positions.length / 3);

    gl.uniform1f(uniforms.uScale, 0.46 + bands.low * 0.14);
    gl.uniform1f(uniforms.uGlow, 1.0);
    gl.drawArrays(gl.POINTS, 0, positions.length / 3);
    gl.depthMask(true);

    requestAnimationFrame(drawSoundObject);
  }

  requestAnimationFrame(drawSoundObject);
}

updateRoundUI();
