const audio = document.getElementById("audioPlayer");
const listContainer = document.getElementById("trackList");
const currentTitle = document.getElementById("currentTitle");
const currentCover = document.getElementById("currentCover");
const downloadBtn = document.getElementById("downloadBtn");

// Status UI
const statusBar = document.getElementById("statusBar");
const statusText = document.getElementById("statusText");
const spinner = document.getElementById("spinner");

let tracks = [];
let currentIndex = 0;

function setStatus(msg, mode = "ok", spinning = false) {
  statusText.textContent = msg;
  statusBar.className = `status-bar ${mode}`;
  spinner.classList.toggle("show", spinning);
}

async function loadTracks() {
  setStatus("Caricamento playlist...", "loading", true);

  const response = await fetch("tracks.json");
  tracks = await response.json();
  renderList();
  loadTrack(0, false);

  setStatus("Pronto", "ok", false);
}

function renderList() {
  tracks.forEach((track, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <img src="${track.cover}">
      <span>${track.title}</span>
    `;
    li.addEventListener("click", () => loadTrack(index, true));
    listContainer.appendChild(li);
  });
}

function loadTrack(index, autoplay = true) {
  currentIndex = index;
  const track = tracks[index];

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

  if (autoplay) {
    audio.play().catch(() => {});
  }
}

// autoplay next
audio.addEventListener("ended", () => {
  let next = currentIndex + 1;
  if (next >= tracks.length) next = 0;
  loadTrack(next, true);
});

/* --- EVENTI DI CARICAMENTO / BUFFER --- */

// Inizia download del file
audio.addEventListener("loadstart", () => {
  setStatus("Caricamento brano...", "loading", true);
});

// Metadata ricevuti (durata ecc.)
audio.addEventListener("loadedmetadata", () => {
  setStatus("Quasi pronto...", "loading", true);
});

// Abbastanza dati per partire
audio.addEventListener("canplay", () => {
  setStatus("Pronto per riprodurre", "ok", false);
});

// Riproduzione partita
audio.addEventListener("playing", () => {
  setStatus("In riproduzione", "ok", false);
});

// Buffering durante play (connessione lenta)
audio.addEventListener("waiting", () => {
  setStatus("Buffering... connessione lenta", "buffering", true);
});

// Stream bloccato/fermo
audio.addEventListener("stalled", () => {
  setStatus("Download rallentato... attendo rete", "buffering", true);
});

// Errore reale di rete/file
audio.addEventListener("error", () => {
  setStatus("Errore nel caricamento del brano", "error", false);
});

// Avvio
loadTracks();
