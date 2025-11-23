/* =========================================================
   [1] RIFERIMENTI DOM
   ========================================================= */
const audio = document.getElementById("audioPlayer");
const listContainer = document.getElementById("trackList");
const currentTitle = document.getElementById("currentTitle");
const currentCover = document.getElementById("currentCover");
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

/* =========================================================
   [2] STATO APPLICAZIONE
   ========================================================= */
let allTracks = [];
let visibleTracks = [];
let currentIndex = 0;

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
   [7] LOAD BRANO + UI + MEDIA SESSION
   ========================================================= */
function loadTrack(index, autoplay = true) {
  currentIndex = index;
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
   [8] NAVIGAZIONE PREV/NEXT (riusabile da UI e MediaSession)
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

/* =========================================================
   [8.1] CLICK BOTTONI UI
   ========================================================= */
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
   [11] TOGGLE DRAFTS CHANGE
   ========================================================= */
showDraftsChk.addEventListener("change", () => {
  applyFilterAndRender();
});

/* =========================================================
   [12] AVVIO
   ========================================================= */
loadTracks();
