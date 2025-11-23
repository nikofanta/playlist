const audio = document.getElementById("audioPlayer");
const listContainer = document.getElementById("trackList");
const currentTitle = document.getElementById("currentTitle");
const currentCover = document.getElementById("currentCover");
const downloadBtn = document.getElementById("downloadBtn");

// Status UI
const statusBar = document.getElementById("statusBar");
const statusText = document.getElementById("statusText");
const spinner = document.getElementById("spinner");

// Draft toggle
const showDraftsChk = document.getElementById("showDraftsChk");

let allTracks = [];       // tutte le track dal JSON
let visibleTracks = [];   // quelle visibili in base al toggle
let currentIndex = 0;

function setStatus(msg, mode = "ok", spinning = false) {
  statusText.textContent = msg;
  statusBar.className = `status-bar ${mode}`;
  spinner.classList.toggle("show", spinning);
}

async function loadTracks() {
  setStatus("Caricamento playlist...", "loading", true);

  const response = await fetch("tracks.json");
  allTracks = await response.json();

  applyFilterAndRender();

  setStatus("Pronto", "ok", false);
}

function applyFilterAndRender() {
  const showDrafts = showDraftsChk.checked;

  // default isDraft = false se manca
  visibleTracks = allTracks.filter(t => showDrafts || !(t.isDraft === true));

  renderList();

  if (visibleTracks.length > 0) {
    loadTrack(0, false);
  } else {
    // nessuna canzone visibile
    audio.src = "";
    currentTitle.textContent = "";
    currentCover.src = "";
    setStatus("Nessun brano disponibile", "ok", false);
  }
}

function renderList() {
  listContainer.innerHTML = ""; // reset

  visibleTracks.forEach((track, index) => {
    const li = document.createElement("li");

    const isDraft = track.isDraft === true;
    if (isDraft) li.classList.add("draft");

    li.innerHTML = `
      <div class="thumb ${isDraft ? "draft-thumb" : ""}">
        <img src="${track.cover}" alt="cover">
        ${isDraft ? '<div class="draft-mask"></div>' : ""}
      </div>
      <span>${track.title}</span>
    `;

    li.addEventListener("click", () => loadTrack(index, true));
    listContainer.appendChild(li);
  });
}

function loadTrack(index, autoplay = true) {
  currentIndex = index;
  const track = visibleTracks[index];

  // UI brano corrente
  audio.src = track.audio;
  currentTitle.textContent = track.title;
  currentCover.src = track.cover;

  // Download
  downloadBtn.onclick = () => window.open(track.audio, "_blank");

  // evidenziazione lista
  [...listContainer.children].forEach((li, i) => {
    li.classList.toggle("active", i === index);
  });

  // stato iniziale
  setStatus("Caricamento brano...", "loading", true);

  if (autoplay) audio.play().catch(() => {});
}

// autoplay next (solo tra i visibili)
audio.addEventListener("ended", () => {
  let next = currentIndex + 1;
  if (next >= visibleTracks.length) next = 0;
  loadTrack(next, true);
});

/* --- EVENTI DI CARICAMENTO / BUFFER --- */
audio.addEventListener("loadstart", () => {
  setStatus("Caricamento brano...", "loading", true);
});

audio.addEventListener("loadedmetadata", () => {
  setStatus("Quasi pronto...", "loading", true);
});

audio.addEventListener("canplay", () => {
  setStatus("Pronto per riprodurre", "ok", false);
});

audio.addEventListener("playing", () => {
  setStatus("In riproduzione", "ok", false);
});

audio.addEventListener("waiting", () => {
  setStatus("Buffering... connessione lenta", "buffering", true);
});

audio.addEventListener("stalled", () => {
  setStatus("Download rallentato... attendo rete", "buffering", true);
});

audio.addEventListener("error", () => {
  setStatus("Errore nel caricamento del brano", "error", false);
});

// quando cambi toggle rifai lista
showDraftsChk.addEventListener("change", () => {
  applyFilterAndRender();
});

// avvio
loadTracks();


