// Niepokojąca muzyka w tle (Web Audio API)
let audioCtx = null;
let musicNodes = [];
let musicPlaying = false;

function startMusic() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 3);
  masterGain.connect(audioCtx.destination);

  // Niski dron basowy
  function createDrone(freq, gainVal, detune = 0) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.value = gainVal;
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    musicNodes.push(osc);
  }

  // Powolne, dysharmoniczne pulsowanie
  function createPulse(freq, rate) {
    const osc = audioCtx.createOscillator();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;
    lfo.type = 'sine';
    lfo.frequency.value = rate;
    lfoGain.gain.value = 0.04;
    gain.gain.value = 0.12;

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    lfo.start();
    musicNodes.push(osc, lfo);
  }

  // Szum jako tło
  const bufferSize = audioCtx.sampleRate * 4;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 180;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.value = 0.04;
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noiseSource.start();
  musicNodes.push(noiseSource);

  createDrone(55, 0.3);       // A1 — głęboki bas
  createDrone(58.3, 0.15, 8); // Bb1 lekko rozstrojony — dysonans
  createDrone(82.4, 0.1);     // E2
  createPulse(110, 0.07);     // A2 pulsujące
  createPulse(146.8, 0.04);   // D3 powolne pulsowanie

  musicPlaying = true;
  musicBtn.textContent = '🔇 Wyłącz dźwięk';
}

function stopMusic() {
  if (audioCtx) {
    musicNodes.forEach(n => { try { n.stop(); } catch(e) {} });
    musicNodes = [];
    audioCtx.close();
    audioCtx = null;
  }
  musicPlaying = false;
  musicBtn.textContent = '🔊 Włącz dźwięk';
}

const musicBtn = document.createElement('button');
musicBtn.textContent = '🔊 Włącz dźwięk';
musicBtn.id = 'music-btn';
document.body.appendChild(musicBtn);

musicBtn.addEventListener('click', () => {
  if (musicPlaying) {
    stopMusic();
  } else {
    startMusic();
  }
});

// Obsługa zakładek
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// Przycisk "powrót na górę"
const backToTopBtn = document.createElement('button');
backToTopBtn.textContent = '↑ Na górę';
backToTopBtn.id = 'back-to-top';
document.body.appendChild(backToTopBtn);

window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    backToTopBtn.classList.add('visible');
  } else {
    backToTopBtn.classList.remove('visible');
  }
});

backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Animacja pojawiania się sekcji przy przewijaniu
const sections = document.querySelectorAll('section');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

sections.forEach(section => {
  section.classList.add('fade-in');
  observer.observe(section);
});
