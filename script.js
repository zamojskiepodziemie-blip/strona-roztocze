// ── Horror Ambient (Web Audio API) ──────────────────────────────────────────
let audioCtx = null;
let masterGain = null;
let musicNodes = [];
let accentTimer = null;
let musicPlaying = false;

// Proceduralny pogłos (impulse response)
function buildReverb(ctx, duration = 2.5, decay = 3.0) {
  const len = ctx.sampleRate * duration;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

function startMusic() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const ctx = audioCtx;

  masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 4); // fade in 4s
  masterGain.connect(ctx.destination);

  const reverb = buildReverb(ctx);
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.45;
  reverb.connect(reverbGain);
  reverbGain.connect(masterGain);

  // Łańcuch: źródło → reverb + direct
  function connect(node) {
    node.connect(masterGain);
    node.connect(reverb);
  }

  // 1. Głęboki dron ~60 Hz z powolną modulacją
  const drone = ctx.createOscillator();
  const droneGain = ctx.createGain();
  drone.type = 'sawtooth';
  drone.frequency.value = 60;
  droneGain.gain.value = 0.28;
  drone.connect(droneGain);
  connect(droneGain);
  drone.start();
  musicNodes.push(drone);

  // 2. Lekko rozstrojony dron — dysonans tritonu
  const drone2 = ctx.createOscillator();
  const drone2Gain = ctx.createGain();
  drone2.type = 'sawtooth';
  drone2.frequency.value = 84.5; // ~trytonowe +25 centów
  drone2.detune.value = 18;
  drone2Gain.gain.value = 0.14;
  drone2.connect(drone2Gain);
  connect(drone2Gain);
  drone2.start();
  musicNodes.push(drone2);

  // 3. Powolne pulsowanie LFO na głośności drona
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08; // ~1 puls / 12s
  lfoGain.gain.value = 0.12;
  lfo.connect(lfoGain);
  lfoGain.connect(droneGain.gain);
  lfo.start();
  musicNodes.push(lfo);

  // 4. Filtrowany szum (oddech)
  const noiseLen = ctx.sampleRate * 6;
  const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) nd[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 220;
  noiseFilter.Q.value = 0.6;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.035;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  connect(noiseGain);
  noise.start();
  musicNodes.push(noise);

  // 5. Losowe "creepy" akcenty co 4–9 sekund
  function scheduleAccent() {
    if (!musicPlaying) return;
    const delay = 4000 + Math.random() * 5000;
    accentTimer = setTimeout(() => {
      if (!musicPlaying || !audioCtx) return;
      triggerAccent();
      scheduleAccent();
    }, delay);
  }

  function triggerAccent() {
    const ctx2 = audioCtx;
    if (!ctx2) return;
    const type = Math.random();

    if (type < 0.5) {
      // Wysoki dysonansowy ton z opadającą obwiednią
      const acc = ctx2.createOscillator();
      const accGain = ctx2.createGain();
      acc.type = 'sine';
      acc.frequency.value = 900 + Math.random() * 600;
      accGain.gain.setValueAtTime(0, ctx2.currentTime);
      accGain.gain.linearRampToValueAtTime(0.08, ctx2.currentTime + 0.05);
      accGain.gain.exponentialRampToValueAtTime(0.0001, ctx2.currentTime + 2.5);
      acc.connect(accGain);
      accGain.connect(reverb);
      acc.start();
      acc.stop(ctx2.currentTime + 2.6);
    } else {
      // Krótki niski "uderzenie"
      const acc = ctx2.createOscillator();
      const accGain = ctx2.createGain();
      acc.type = 'sine';
      acc.frequency.setValueAtTime(120, ctx2.currentTime);
      acc.frequency.exponentialRampToValueAtTime(30, ctx2.currentTime + 0.8);
      accGain.gain.setValueAtTime(0.18, ctx2.currentTime);
      accGain.gain.exponentialRampToValueAtTime(0.0001, ctx2.currentTime + 0.9);
      acc.connect(accGain);
      accGain.connect(reverb);
      acc.start();
      acc.stop(ctx2.currentTime + 1);
    }
  }

  scheduleAccent();
  musicPlaying = true;
  musicBtn.innerHTML = '⏸ Pauza';
}

function stopMusic() {
  if (accentTimer) { clearTimeout(accentTimer); accentTimer = null; }

  if (masterGain && audioCtx) {
    const t = audioCtx.currentTime;
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(0, t + 2); // fade out 2s
    setTimeout(() => {
      musicNodes.forEach(n => { try { n.stop(); } catch(e) {} });
      musicNodes = [];
      if (audioCtx) { audioCtx.close(); audioCtx = null; }
      masterGain = null;
    }, 2100);
  }

  musicPlaying = false;
  musicBtn.innerHTML = '🔊 Play';
}

const musicBtn = document.createElement('button');
musicBtn.innerHTML = '🔊 Play';
musicBtn.id = 'music-btn';
document.body.appendChild(musicBtn);

musicBtn.addEventListener('click', () => {
  if (musicPlaying) { stopMusic(); } else { startMusic(); }
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
