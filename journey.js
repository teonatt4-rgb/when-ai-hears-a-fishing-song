const rounds = [
  {
    index: "R1",
    titleZh: "宽泛风格",
    titleEn: "GENERIC STYLE",
    descriptionZh: "当提示词只写“中国风”，模型得到的是一种顺滑、但没有明确出处的东方感。",
    descriptionEn: "A broad prompt produces a polished but culturally unlocated sound.",
    findingZh: "它听起来“像中国”，但还不像《丰收渔歌》。",
    findingEn: "It sounds broadly “Chinese”, but not yet like this specific fishing song.",
    tokens: ["CHINESE STYLE", "SOLO VIOLIN", "PENTATONIC"],
    video: "./assets/experiment_video/screen_r1_prompt_output.mp4",
    videoLabel: "R1 / 宽泛提示 / GENERIC PROMPT",
    audioA: "./assets/experiment_audio/r1_a_generic_style.mp3",
    audioB: "./assets/experiment_audio/r1_b_generic_style.mp3",
  },
  {
    index: "R2",
    titleZh: "地域语境",
    titleEn: "CULTURAL CONTEXT",
    descriptionZh: "加入汕尾渔歌、劳动号子和岭南海边场景后，声音开始出现地域线索。",
    descriptionEn: "Regional references begin to reshape the model's sense of place.",
    findingZh: "文化标签让结果更接近场景，却仍把地方性处理成了可替换的氛围。",
    findingEn: "The setting becomes clearer, while locality remains an interchangeable atmosphere.",
    tokens: ["SHANWEI FISHING-SONG CONTOUR", "WORK-SONG RHYTHM", "GUZHENG ARPEGGIOS"],
    video: "./assets/experiment_video/screen_r2_cultural_prompt_output.mp4",
    videoLabel: "R2 / 地域语境 / CULTURAL CONTEXT",
    audioA: "./assets/experiment_audio/r2_a_cultural_prompt.mp3",
    audioB: "./assets/experiment_audio/r2_b_cultural_prompt.mp3",
  },
  {
    index: "R3",
    titleZh: "演奏知识",
    titleEn: "PERFORMANCE KNOWLEDGE",
    descriptionZh: "把滑奏、器乐化、双音与调式色彩等演奏知识转译为提示语言。",
    descriptionEn: "Performer knowledge is translated into glissando, double stops and modal colour.",
    findingZh: "更精确的文字带来了“更接近”，但没有带来真正的文化还原。",
    findingEn: "Greater precision brings proximity, but not cultural reconstruction.",
    tokens: ["GLISSANDO", "DOUBLE STOPS", "MODAL COLOUR", "ORNAMENTATION"],
    video: "./assets/experiment_video/screen_r3_expert_prompt_output.mp4",
    videoLabel: "R3 / 演奏知识 / PERFORMANCE KNOWLEDGE",
    audioA: "./assets/experiment_audio/r3_a_expert_prompt.mp3",
    audioB: "./assets/experiment_audio/r3_b_expert_prompt.mp3",
  },
];

const contextAudio = document.getElementById("contextAudio");
const audioDock = document.getElementById("audioDock");
const audioToggle = document.getElementById("audioToggle");
const audioClose = document.getElementById("audioClose");
const audioTitle = document.getElementById("audioTitle");
const audioSubtitle = document.getElementById("audioSubtitle");
const audioProgress = document.getElementById("audioProgress");
const audioTransport = audioProgress.closest(".audio-dock__transport");
const audioCurrent = document.getElementById("audioCurrent");
const audioDuration = document.getElementById("audioDuration");
const roundVideo = document.getElementById("roundVideo");
const copyrightVideo = document.getElementById("copyrightVideo");
const readingProgress = document.getElementById("readingProgress");
const activeIndex = document.getElementById("activeIndex");
const activeLabel = document.getElementById("activeLabel");
let currentContext = "";
let activeSoundButton = null;
let activeRound = 0;
let isSeekLocked = false;

function formatTime(value) {
  if (!Number.isFinite(value)) return "00:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function clearPlayingState() {
  document.querySelectorAll(".is-playing").forEach((node) => node.classList.remove("is-playing"));
}

function setPlaybackState(isPlaying) {
  audioToggle.textContent = isPlaying ? "Ⅱ" : "▶";
  clearPlayingState();
  if (isPlaying && activeSoundButton) activeSoundButton.classList.add("is-playing");
}

function openAudio(source, title, subtitle, context, sourceButton) {
  const changed = contextAudio.getAttribute("src") !== source;
  currentContext = context;
  isSeekLocked = context === "comparison";
  activeSoundButton = sourceButton || null;
  audioTitle.textContent = title;
  audioSubtitle.textContent = subtitle;
  audioDock.classList.add("open");
  audioTransport.classList.toggle("is-locked", isSeekLocked);
  audioProgress.disabled = isSeekLocked;
  audioProgress.setAttribute(
    "aria-label",
    isSeekLocked ? "音频进度，仅供显示，不可拖动" : "音频进度",
  );
  document.body.classList.add("audio-open");

  if (changed) {
    contextAudio.setAttribute("src", source);
    contextAudio.load();
  }

  contextAudio.play().then(() => setPlaybackState(true)).catch(() => setPlaybackState(false));
}

function closeAudio() {
  contextAudio.pause();
  audioDock.classList.remove("open");
  document.body.classList.remove("audio-open");
  setPlaybackState(false);
  currentContext = "";
  isSeekLocked = false;
  audioTransport.classList.remove("is-locked");
  audioProgress.disabled = false;
  activeSoundButton = null;
}

document.querySelectorAll("[data-audio]").forEach((button) => {
  button.addEventListener("click", () => {
    const sameSource = contextAudio.getAttribute("src") === button.dataset.audio;
    if (sameSource && !contextAudio.paused) {
      contextAudio.pause();
      return;
    }
    openAudio(
      button.dataset.audio,
      button.dataset.title,
      button.dataset.subtitle,
      button.dataset.context,
      button,
    );
  });
});

audioToggle.addEventListener("click", () => {
  if (!contextAudio.getAttribute("src")) return;
  if (contextAudio.paused) contextAudio.play();
  else contextAudio.pause();
});

audioClose.addEventListener("click", closeAudio);
contextAudio.addEventListener("play", () => setPlaybackState(true));
contextAudio.addEventListener("pause", () => setPlaybackState(false));
contextAudio.addEventListener("ended", () => setPlaybackState(false));
contextAudio.addEventListener("loadedmetadata", () => {
  audioDuration.textContent = formatTime(contextAudio.duration);
});
contextAudio.addEventListener("timeupdate", () => {
  const percent = contextAudio.duration ? (contextAudio.currentTime / contextAudio.duration) * 100 : 0;
  audioProgress.value = percent;
  audioCurrent.textContent = formatTime(contextAudio.currentTime);
  audioDuration.textContent = formatTime(contextAudio.duration);
});
audioProgress.addEventListener("input", () => {
  if (isSeekLocked || !contextAudio.duration) return;
  contextAudio.currentTime = (Number(audioProgress.value) / 100) * contextAudio.duration;
});

document.querySelectorAll("[data-guess]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-guess]").forEach((node) => node.classList.toggle("active", node === button));
    const choice = button.dataset.guess;
    document.getElementById("guessTitle").textContent = choice === "UNSURE"
      ? "不确定，也是一种真实的聆听。 / Uncertainty is also a valid response."
      : `你选择了声音 ${choice} / You chose Sound ${choice}`;
    document.getElementById("guessResult").textContent =
      "真正的问题不是哪段“更像”，而是：传统音乐被技术翻译时，什么被保留，什么被消音？ / What survives technological translation, and what is silenced?";
    document.getElementById("guessPanel").classList.add("revealed");
  });
});

const roundIndex = document.getElementById("roundIndex");
const roundTitleZh = document.getElementById("roundTitleZh");
const roundTitleEn = document.getElementById("roundTitleEn");
const roundDescriptionZh = document.getElementById("roundDescriptionZh");
const roundDescriptionEn = document.getElementById("roundDescriptionEn");
const roundFindingZh = document.getElementById("roundFindingZh");
const roundFindingEn = document.getElementById("roundFindingEn");
const roundVideoLabel = document.getElementById("roundVideoLabel");
const promptTokens = document.getElementById("promptTokens");
const roundAudioA = document.getElementById("roundAudioA");
const roundAudioB = document.getElementById("roundAudioB");

function renderRound(index) {
  activeRound = index;
  const round = rounds[index];
  roundIndex.textContent = round.index;
  roundTitleZh.textContent = round.titleZh;
  roundTitleEn.textContent = round.titleEn;
  roundDescriptionZh.textContent = round.descriptionZh;
  roundDescriptionEn.textContent = round.descriptionEn;
  roundFindingZh.textContent = round.findingZh;
  roundFindingEn.textContent = round.findingEn;
  roundVideoLabel.textContent = round.videoLabel;
  promptTokens.replaceChildren(...round.tokens.map((token) => {
    const span = document.createElement("span");
    span.textContent = token;
    return span;
  }));
  if (roundVideo.getAttribute("src") !== round.video) {
    roundVideo.setAttribute("src", round.video);
    roundVideo.load();
  }
  roundVideo.play().catch(() => {});
}

document.querySelectorAll("[data-round]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-round]").forEach((node) => node.classList.toggle("active", node === button));
    renderRound(Number(button.dataset.round));
  });
});

roundAudioA.addEventListener("click", () => {
  const round = rounds[activeRound];
  openAudio(
    round.audioA,
    `${round.index} / ${round.titleZh} / ${round.titleEn} / 输出 A`,
    "生成声音 A / Generated audio sample A",
    "prompt-lab",
    roundAudioA,
  );
});

roundAudioB.addEventListener("click", () => {
  const round = rounds[activeRound];
  openAudio(
    round.audioB,
    `${round.index} / ${round.titleZh} / ${round.titleEn} / 输出 B`,
    "生成声音 B / Generated audio sample B",
    "prompt-lab",
    roundAudioB,
  );
});

document.querySelectorAll("[data-copyright-video]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-copyright-video]").forEach((node) => node.classList.toggle("active", node === button));
    copyrightVideo.setAttribute("src", button.dataset.copyrightVideo);
    document.getElementById("ownershipLabel").textContent = button.dataset.videoLabel;
    copyrightVideo.load();
    copyrightVideo.play().catch(() => {});
  });
});

const eventItems = [...document.querySelectorAll(".event-chain li")];

function setActiveEvent(index) {
  eventItems.forEach((item, itemIndex) => item.classList.toggle("active", itemIndex === index));
}

function syncEventChainToVideo() {
  if (!copyrightVideo.duration || !Number.isFinite(copyrightVideo.duration)) {
    setActiveEvent(0);
    return;
  }
  const progress = copyrightVideo.currentTime / copyrightVideo.duration;
  const eventIndex = Math.min(eventItems.length - 1, Math.floor(progress * eventItems.length));
  setActiveEvent(eventIndex);
}

copyrightVideo.addEventListener("loadedmetadata", syncEventChainToVideo);
copyrightVideo.addEventListener("timeupdate", syncEventChainToVideo);
copyrightVideo.addEventListener("seeked", syncEventChainToVideo);

document.querySelectorAll("[data-waveform]").forEach((waveform) => {
  const seed = Number(waveform.dataset.waveform || 1);
  const amount = waveform.classList.contains("waveform--large") ? 62 : 42;
  const bars = [];
  for (let index = 0; index < amount; index += 1) {
    const bar = document.createElement("i");
    const curve = Math.sin((index / (amount - 1)) * Math.PI);
    const noise = Math.abs(Math.sin(index * 1.73 + seed * 2.4) * 0.6 + Math.sin(index * 0.47 + seed) * 0.4);
    const height = 12 + curve * (18 + noise * 40);
    bar.style.setProperty("--h", `${height}px`);
    bar.style.setProperty("--o", `${0.15 + noise * 0.55}`);
    bar.style.setProperty("--d", String(index));
    bars.push(bar);
  }
  waveform.replaceChildren(...bars);
});

const guideLinks = [...document.querySelectorAll(".guide a")];
const chapters = [...document.querySelectorAll("[data-chapter]")];
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll(".reveal").forEach((node, index) => {
        window.setTimeout(() => node.classList.add("is-visible"), index * 90);
      });
    }
  });
}, { threshold: 0.2 });

const chapterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting || entry.intersectionRatio < 0.48) return;
    const link = guideLinks.find((node) => node.getAttribute("href") === `#${entry.target.id}`);
    if (!link) return;
    guideLinks.forEach((node) => node.classList.toggle("active", node === link));
    activeIndex.textContent = link.dataset.index;
    activeLabel.textContent = link.dataset.label;

    if (currentContext && currentContext !== entry.target.id) closeAudio();
    document.querySelectorAll("video").forEach((video) => {
      if (entry.target.contains(video)) video.play().catch(() => {});
      else video.pause();
    });
  });
}, { threshold: [0.48, 0.65] });

chapters.forEach((chapter) => {
  revealObserver.observe(chapter);
  chapterObserver.observe(chapter);
});

window.addEventListener("scroll", () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  readingProgress.style.width = `${percent}%`;
}, { passive: true });

renderRound(0);
