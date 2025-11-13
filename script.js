const audio = document.getElementById("audioPlayer");
const listContainer = document.getElementById("trackList");
const currentTitle = document.getElementById("currentTitle");
const currentCover = document.getElementById("currentCover");
const downloadBtn = document.getElementById("downloadBtn");

let tracks = [];
let currentIndex = 0;

async function loadTracks() {
  const response = await fetch("tracks.json");
  tracks = await response.json();
  renderList();
  loadTrack(0, false);
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
  audio.src = track.audio;
  currentTitle.textContent = track.title;
  currentCover.src = track.cover;

  // Pulsante download
  downloadBtn.onclick = () => {
    window.open(track.audio, "_blank");
  };

  // aggiorna evidenziazione della playlist
  [...listContainer.children].forEach((li, i) => {
    li.classList.toggle("active", i === index);
  });

  if (autoplay) {
    audio.play().catch(() => {});
  }
}

audio.addEventListener("ended", () => {
  let next = currentIndex + 1;
  if (next >= tracks.length) next = 0;
  loadTrack(next, true);
});

// Avvia caricamento iniziale
loadTracks();
