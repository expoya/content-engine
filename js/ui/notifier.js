// js/ui/notifier.js
import { showToast } from '../ui-loader.js';

let audioCtx = null;
let muted = (localStorage.getItem('expoya_sound_muted') === '1');

// sorgt dafür, dass AudioContext nach einer User-Geste erlaubt ist
export function primeAudioOnUserGesture() {
  const kick = () => {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch { /* ignore */ }
    }
    document.removeEventListener('click', kick);
    document.removeEventListener('touchstart', kick);
    document.removeEventListener('keydown', kick);
  };
  document.addEventListener('click', kick, { once: true });
  document.addEventListener('touchstart', kick, { once: true });
  document.addEventListener('keydown', kick, { once: true });
}

// kleiner „bing“ ohne Audiodatei – WebAudio Oscillator
function playBeep() {
  if (muted) return;
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(880, audioCtx.currentTime);  // A5
  g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.18);
  o.connect(g).connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.2);
}

// Allgemeine Benachrichtigung (Toast + Sound)
export function notify(title, body='') {
  showToast(body ? `${title}: ${body}` : title);
  playBeep();
}

// Toggle-UI oben rechts an der Topbar
export function attachSoundToggle() {
  const top = document.querySelector('.topbar');
  if (!top) return;
  let ctrls = top.querySelector('.topbar-ctrls');
  if (!ctrls) {
    ctrls = document.createElement('div');
    ctrls.className = 'topbar-ctrls';
    top.appendChild(ctrls);
  }

  // Knopf erzeugen/erneuern
  let btn = ctrls.querySelector('.sound-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'sound-btn';
    ctrls.appendChild(btn);
  }
  const render = () => {
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    btn.title = muted ? 'Ton einschalten' : 'Ton ausschalten';
    btn.textContent = muted ? '🔇 Ton aus' : '🔊 Ton an';
  };
  btn.onclick = () => {
    muted = !muted;
    localStorage.setItem('expoya_sound_muted', muted ? '1' : '0');
    render();
    showToast(muted ? 'Ton aus' : 'Ton an');
  };
  render();
}

// Status für andere Module bei Bedarf
export function isMuted(){ return muted; }
export function setMuted(v){ muted = !!v; localStorage.setItem('expoya_sound_muted', muted ? '1' : '0'); }
