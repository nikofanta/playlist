/* =========================================================
   [1] RIFERIMENTI DOM
   ========================================================= */
const audio = document.getElementById("audioPlayer");
const listContainer = document.getElementById("trackList");
const currentTitle = document.getElementById("currentTitle");
const currentCover = document.getElementById("currentCover");

const downloadBtn = document.getElementById("downloadBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

const statusBar = document.getElementById("statusBar");
const statusText = document.getElementById("statusText");
const spinner = document.getElementById("spinner");

const showDraftsChk = document.getElementById("showDraftsChk");

const prevLyricEl = document.getElementById("prevLyric") || { textContent: "" };
const currentLyricEl = document.getElementById("currentLyric") || { textContent: "" };
const nextLyricEl = document.getElementById("nextLyric") || { textContent: "" };

/* =========================================================
   [2] STATO APPLICAZIONE
   ========================================================= */
let allTracks = [];
let visibleTracks = [];
let currentIndex = 0;

let currentLyrics = [];
let currentLyricIndex = -1;

// Tracking percentuali ascoltate
let progressMilestones = {
  p25: false,
  p50: false,
  p75: false,
  p100: false
};

/* =========================================================
   [3] STATUS HELPERS
   ========================================================= */
function setStatus(msg, mode = "ok", spinning = false) {
  statusText.textContent = msg;
  statusBar.className = `status-bar ${mode}`;
  spinner.classList.toggle("show", spinning);
}

/* =========================================================
   [4] LOAD TRACKS JSON
   ========================================================= */
async function loadTracks() {
  setStatus("Caricamento playlist...", "loading", true);

  const response = await fetch("tracks.json");
  allTracks = await response.json();

  applyFilterAndRender();

  setStatus("Pronto", "ok", false);
}

/* =========================================================
   [5] FILTRO DRAFT + RENDER
   ========================================================= */
function applyFilterAndRender() {
  const showDrafts = showDraftsChk.checked;
  visibleTracks = allTracks.filter(t => showDrafts || !(t.isDraft === true));

  renderList();

  if (visibleTracks.length > 0) {
    loadTrack(0, false);
  } else {
    audio.src = "";
    currentTitle.textContent = "";
    currentCover.src = "";
    clearLyrics("Nessun brano disponibile");
    setStatus("Nessun brano disponibile", "ok", false);
  }
}

/* =========================================================
   [6] RENDER LISTA BRANI
   ========================================================= */
function renderList() {
  listContainer.innerHTML = "";

  visibleTracks.forEach((track, index) => {
    const li = document.createElement("li");
    if (track.isDraft === true) li.classList.add("draft");

    li.innerHTML = `
      <div class="thumb">
        <img src="${track.cover}" alt="cover">
        ${track.isDraft ? '<div class="draft-mask"></div>' : ""}
      </div>
      <span>${track.title}</span>
    `;

    li.addEventListener("click", () => loadTrack(index, true));
    listContainer.appendChild(li);
  });
}

/* =========================================================
   [7] LOAD BRANO + UI + MEDIA SESSION + LRC
   ========================================================= */
function loadTrack(index, autoplay = true) {
  currentIndex = index;

  // reset tracking percentuali
  progressMilestones = { p25: false, p50: false, p75: false, p100: false };

  const track = visibleTracks[index];

  audio.src = track.audio;
  currentTitle.textContent = track.title;
  currentCover.src = track.cover;

  downloadBtn.onclick = () => window.open(track.audio, "_blank");

  [...listContainer.children].forEach((li, i) => {
    li.classList.toggle("active", i === index);
  });

  setStatus("Caricamento brano...", "loading", true);

  setupMediaSession(track);

  if (track.lrc) loadLrc(track.lrc);
  else clearLyrics("Testo non disponibile");

  if (autoplay) audio.play().catch(() => {});
}

/* =========================================================
   [7.1] MEDIA SESSION API
   ========================================================= */
function setupMediaSession(track) {
  if (!("mediaSession" in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: "Dome",
    album: "Playlist",
    artwork: [
      { src: track.cover, sizes: "512x512", type: "image/png" },
      { src: track.cover, sizes: "256x256", type: "image/png" },
      { src: track.cover, sizes: "128x128", type: "image/png" }
    ]
  });

  navigator.mediaSession.setActionHandler("play", () => audio.play());
  navigator.mediaSession.setActionHandler("pause", () => audio.pause());
  navigator.mediaSession.setActionHandler("previoustrack", playPrev);
  navigator.mediaSession.setActionHandler("nexttrack", playNext);
}

/* =========================================================
   [8] NAVIGAZIONE PREV/NEXT
   ========================================================= */
function playPrev() {
  let prev = currentIndex - 1;
  if (prev < 0) prev = visibleTracks.length - 1;
  loadTrack(prev, true);
}

function playNext() {
  let next = currentIndex + 1;
  if (next >= visibleTracks.length) next = 0;
  loadTrack(next, true);
}

prevBtn.addEventListener("click", playPrev);
nextBtn.addEventListener("click", playNext);

/* =========================================================
   [9] AUTOPLAY NEXT
   ========================================================= */
audio.addEventListener("ended", () => {
  playNext();
});

/* =========================================================
   [10] EVENTI AUDIO + TRACKING PLAY
   ========================================================= */
audio.addEventListener("playing", () => {
  setStatus("In riproduzione", "ok", false);

  // Event GA: inizio riproduzione
  try {
    const track = visibleTracks[currentIndex];
    gtag('event', 'track_play', {
      track_title: track.title,
      track_file: track.audio,
      device: navigator.userAgent
    });
  } catch (e) { console.warn("GA error", e); }

  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
});

/* =========================================================
   [11] LRC: CARICAMENTO E PARSING
   ========================================================= */
async function loadLrc(url) {
  try {
    clearLyrics("Caricamento testo...");
    const resp = await fetch(url);
    if (!resp.ok) return clearLyrics("Impossibile caricare il testo");

    const text = await resp.text();
    parseLrc(text);

    if (currentLyrics.length === 0) {
      clearLyrics("Nessun testo valido nel file LRC");
    } else {
      prevLyricEl.textContent = "";
      nextLyricEl.textContent = "";
      currentLyricEl.textContent = "Avvia la riproduzione per vedere il testo...";
    }
  } catch {
    clearLyrics("Errore nel caricamento del testo");
  }
}

function clearLyrics(msg = "Testo non disponibile") {
  currentLyrics = [];
  currentLyricIndex = -1;
  prevLyricEl.textContent = "";
  nextLyricEl.textContent = "";
  currentLyricEl.textContent = msg;
}

function parseLrc(text) {
  currentLyrics = [];
  currentLyricIndex = -1;

  const lines = text.split(/\r?\n/);
  const regex = /\[(\d+):(\d+)(?:\.(\d+))?\](.*)/;

  for (const line of lines) {
    const m = line.match(regex);
    if (!m) continue;

    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    const frac = parseInt(m[3] || "0", 10);

    const t = min * 60 + sec + (m[3] ? frac / (m[3].length === 2 ? 100 : 1000) : 0);
    const text = m[4].trim();

    if (text) currentLyrics.push({ time: t, text });
  }

  currentLyrics.sort((a, b) => a.time - b.time);
}

/* =========================================================
   [12] LRC: SYNC + TRACKING PERCENTUALI
   ========================================================= */
audio.addEventListener("timeupdate", () => {
  if (currentLyrics.length) {
    const t = audio.currentTime;
    let idx = -1;

    for (let i = 0; i < currentLyrics.length; i++) {
      if (currentLyrics[i].time <= t) idx = i;
      else break;
    }

    if (idx !== currentLyricIndex) {
      currentLyricIndex = idx;

      prevLyricEl.textContent = currentLyrics[idx - 1]?.text || "";
      currentLyricEl.textContent = currentLyrics[idx]?.text || "";
      nextLyricEl.textContent = currentLyrics[idx + 1]?.text || "";
    }
  }

  // ========== TRACKING PERCENTUALI ==========
  if (audio.duration && !isNaN(audio.duration)) {
    const pct = (audio.currentTime / audio.duration) * 100;
    const track = visibleTracks[currentIndex];

    if (pct >= 25 && !progressMilestones.p25) {
      progressMilestones.p25 = true;
      gtag('event', 'track_progress', { track_title: track.title, progress: '25%' });
    }

    if (pct >= 50 && !progressMilestones.p50) {
      progressMilestones.p50 = true;
      gtag('event', 'track_progress', { track_title: track.title, progress: '50%' });
    }

    if (pct >= 75 && !progressMilestones.p75) {
      progressMilestones.p75 = true;
      gtag('event', 'track_progress', { track_title: track.title, progress: '75%' });
    }

    if (pct >= 99 && !progressMilestones.p100) {
      progressMilestones.p100 = true;
      gtag('event', 'track_progress', { track_title: track.title, progress: '100%' });
    }
  }
});

/* =========================================================
   [13] TOGGLE DRAFTS
   ========================================================= */
showDraftsChk.addEventListener("change", applyFilterAndRender);

/* =========================================================
   [14] AVVIO
   ========================================================= */
loadTracks();



