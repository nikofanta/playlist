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

  // pulsante download
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

/* --- AUDIO REACTIVE WAVES (LIGHT VERSION) --- */
let audioContext, analyzer, source;
let waveElement = document.querySelector(".waves path");

function initAudioAnalyzer() {
  if (!audioContext) {
    audioContext = new AudioContext();
    analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 64;
    analyzer.smoothingTimeConstant = 0.7;
  }

  source = audioContext.createMediaElementSource(audio);
  source.connect(analyzer);
  analyzer.connect(audioContext.destination);

  startReactiveAnimation();
}

function startReactiveAnimation() {
  const data = new Uint8Array(analyzer.frequencyBinCount);

  function update() {
    analyzer.getByteFrequencyData(data);

    let avg = 0;
    for (let i = 0; i < data.length; i++) avg += data[i];
    avg = avg / data.length;

    let intensity = avg / 255;

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
audio.addEventListener("play", () => {
  if (audioContext && audioContext.state === "running") return;
  initAudioAnalyzer();
});
