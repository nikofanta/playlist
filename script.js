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

  [...listContainer.children].forEach((li, i) => {
    li.classList.toggle("active", i === index);
  });

  if (autoplay) audio.play().catch(() => {});
}

audio.addEventListener("ended", () => {
  let next = currentIndex + 1;
  if (next >= tracks.length) next = 0;
  loadTrack(next, true);
});

// Carica i brani
loadTracks();

/* --- AUDIO REACTIVE WAVES (SAFE VERSION) --- */
let audioContext, analyzer, sourceNode;
let waveElement = document.querySelector(".waves path");

function initAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
    analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 64; // leggerissimo
    analyzer.smoothingTimeConstant = 0.7;
  }
}

function connectAudio() {
  // Disconnetti il vecchio nodo se esiste
  try {
    if (sourceNode) sourceNode.disconnect();
  } catch {}

  // Crea un nuovo MediaElementSource per ogni traccia
  sourceNode = audioContext.createMediaElementSource(audio);
  sourceNode.connect(analyzer);
  analyzer.connect(audioContext.destination);
}

function startReactiveAnimation() {
  const data = new Uint8Array(analyzer.frequencyBinCount);

  function update() {
    analyzer.getByteFrequencyData(data);

    let avg = 0;
    for (let i = 0; i < data.length; i++) avg += data[i];
    avg /= data.length;

    const intensity = avg / 255;

    const scale = 1 + intensity * 0.08;
    const opacity = 0.4 + intensity * 0.4;

    if (waveElement) {
      waveElement.style.transform = `scale(${scale})`;
      waveElement.style.opacity = opacity;
    }

    requestAnimationFrame(update);
  }

  update();
}

// Avvia l'analizzatore al primo play
audio.addEventListener("play", async () => {
  initAudioContext();
  await audioContext.resume();
  connectAudio();
  startReactiveAnimation();
});
