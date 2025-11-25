/* =========================================================
   [1] RIFERIMENTI DOM
   ========================================================= */
const audio = document.getElementById("audioPlayer");
const listContainer = document.getElementById("trackList");
const currentTitle = document.getElementById("currentTitle");
const currentCover = document.getElementById("currentCover");

// Download vicino a Prev/Next
const downloadBtn = document.getElementById("downloadBtn");

// Bottoni UI Prev/Next
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

// Status UI
const statusBar = document.getElementById("statusBar");
const statusText = document.getElementById("statusText");
const spinner = document.getElementById("spinner");

// Draft toggle
const showDraftsChk = document.getElementById("showDraftsChk");

// Lyrics UI
const currentLyricEl = document.getElementById("currentLyric");

/* =========================================================
   [2] STATO APPLICAZIONE
   ========================================================= */
let allTracks = [];
let visibleTracks = [];
let currentIndex = 0;

// stato lyrics
let currentLyrics = [];        // [{ time: sec, text: string }]
let currentLyricIndex = -1;

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
    const isDraft = track.isDraft === true;
    if (isDraft) li.classList.add("draft");

    li.innerHTML = `
      <div class="thumb">
        <img src="${track.cover}" alt="cover">
        ${isDraft ? '<div class="draft-mask"></div>' : ""}
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
  const track = visibleTracks[index];

  audio.src = track.audio;
  currentTitle.textContent = track.title;
  currentCover.src = track.cover;

  // Download MP3
  downloadBtn.onclick = () => window.open(track.audio, "_blank");

  // Evidenziazione lista
  [...listContainer.children].forEach((li, i) => {
    li.classList.toggle("active", i === index);
  });

  setStatus("Caricamento brano...", "loading", true);

  // Media Session (titolo + cover)
  setupMediaSession(track);

  // Lyrics: se c'è track.lrc → carica; altrimenti pulisci
  if (track.lrc) {
    loadLrc(track.lrc);
  } else {
    clearLyrics("Testo non disponibile");
  }

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
  navigator.mediaSession.setActionHandler("previoustrack", () => playPrev());
  navigator.mediaSession.setActionHandler("nexttrack", () => playNext());
}

/* =========================================================
   [8] NAVIGAZIONE PREV/NEXT (UI + MediaSession)
   ========================================================= */
function playPrev() {
  if (visibleTracks.length === 0) return;

  let prev = currentIndex - 1;
  if (prev < 0) prev = visibleTracks.length - 1;
  loadTrack(prev, true);
}

function playNext() {
  if (visibleTracks.length === 0) return;

  let next = currentIndex + 1;
  if (next >= visibleTracks.length) next = 0;
  loadTrack(next, true);
}

// Click bottoni UI
prevBtn.addEventListener("click", playPrev);
nextBtn.addEventListener("click", playNext);

/* =========================================================
   [9] AUTOPLAY NEXT
   ========================================================= */
audio.addEventListener("ended", () => {
  playNext();
});

/* =========================================================
   [10] EVENTI LOADING / BUFFERING / ERROR
   ========================================================= */
audio.addEventListener("loadstart", () => {
  setStatus("Caricamento brano...", "loading", true);
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
});

audio.addEventListener("loadedmetadata", () => {
  setStatus("Quasi pronto...", "loading", true);
});

audio.addEventListener("canplay", () => {
  setStatus("Pronto per riprodurre", "ok", false);
});

audio.addEventListener("playing", () => {
  setStatus("In riproduzione", "ok", false);
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
});

audio.addEventListener("pause", () => {
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
});

audio.addEventListener("waiting", () => {
  setStatus("Buffering... connessione lenta", "buffering", true);
});

audio.addEventListener("stalled", () => {
  setStatus("Download rallentato... attendo rete", "buffering", true);
});

audio.addEventListener("error", () => {
  setStatus("Errore nel caricamento del brano", "error", false);
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
});

/* =========================================================
   [11] LRC: CARICAMENTO E PARSING
   ========================================================= */
async function loadLrc(url) {
  try {
    clearLyrics("Caricamento testo...");
    const resp = await fetch(url);
    if (!resp.ok) {
      clearLyrics("Impossibile caricare il testo");
      return;
    }
    const text = await resp.text();
    parseLrc(text);
    if (currentLyrics.length === 0) {
      clearLyrics("Nessun testo valido nel file LRC");
    } else {
      currentLyricEl.textContent = "Avvia la riproduzione per vedere il testo...";
    }
  } catch (e) {
    clearLyrics("Errore nel caricamento del testo");
  }
}

function clearLyrics(message = "Testo non disponibile") {
  currentLyrics = [];
  currentLyricIndex = -1;
  if (currentLyricEl) currentLyricEl.textContent = message;
}

function parseLrc(text) {
  currentLyrics = [];
  currentLyricIndex = -1;

  const lines = text.split(/\r?\n/);

  const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\](.*)/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const m = trimmed.match(timeRegex);
    if (!m) continue;

    const min = parseInt(m[1], 10) || 0;
    const sec = parseInt(m[2], 10) || 0;
    const fracStr = m[3] || "0";
    let frac = parseInt(fracStr, 10) || 0;

    // LRC tipicamente mm:ss.xx (centesimi)
    let fracSec = fracStr.length === 2 ? frac / 100 : frac / 1000;

    const total = min * 60 + sec + fracSec;
    const lyricText = m[4].trim();

    if (lyricText.length > 0) {
      currentLyrics.push({ time: total, text: lyricText });
    }
  }

  // ordina per tempo
  currentLyrics.sort((a, b) => a.time - b.time);
}

/* =========================================================
   [12] LRC: SYNC CON AUDIO (TIMEUPDATE)
   ========================================================= */
audio.addEventListener("timeupdate", () => {
  if (!currentLyrics.length || !currentLyricEl) return;

  const t = audio.currentTime;
  let idx = -1;

  for (let i = 0; i < currentLyrics.length; i++) {
    if (currentLyrics[i].time <= t) {
      idx = i;
    } else {
      break;
    }
  }

  if (idx !== currentLyricIndex) {
    currentLyricIndex = idx;
    if (currentLyricIndex === -1) {
      currentLyricEl.textContent = "";
    } else {
      currentLyricEl.textContent = currentLyrics[currentLyricIndex].text;
    }
  }
});

/* =========================================================
   [13] TOGGLE DRAFTS CHANGE
   ========================================================= */
showDraftsChk.addEventListener("change", () => {
  applyFilterAndRender();
});

/* =========================================================
   [14] AVVIO
   ========================================================= */
loadTracks();


