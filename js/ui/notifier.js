// js/ui/notifier.js
// Robuster Notifier ohne Auto-Start von AudioContext.
// Audio wird erst nach echter User-Geste initialisiert.

let audioCtx = null;
let primed = false;

function initAudioCtxSafely() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx?.state === 'suspended') {
      // nur auf explizite Usergeste resume versuchen
      audioCtx.resume().catch(() => {});
    }
  } catch { /* ignore */ }
}

/** Einmalig auf echte User-Geste warten (Klick/Taste), dann Audio vorbereiten. */
export function primeAudioOnUserGesture() {
  if (primed) return;
  const handler = () => {
    primed = true;
    initAudioCtxSafely();

    // kurzer, nahezu unhörbarer „unlock“-Ping
    try {
      if (!audioCtx) return;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = 1000;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.02);
    } catch { /* ignore */ }

    window.removeEventListener('pointerdown', handler, { capture: true });
    window.removeEventListener('keydown', handler, { capture: true });
  };

  // echte Gesten: Pointer + Tastatur
  window.addEventListener('pointerdown', handler, { once: true, passive: true, capture: true });
  window.addEventListener('keydown', handler, { once: true, capture: true });
}

/** Leichtes akustisches Feedback + (optional) Browser-Notification */
export function notify(title = 'Hinweis', body = '') {
  // Beep (nur wenn freigeschaltet)
  try {
    if (audioCtx && audioCtx.state !== 'suspended') {
      const now = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.06, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      o.connect(g).connect(audioCtx.destination);
      o.start(now);
      o.stop(now + 0.15);
    }
  } catch { /* ignore */ }

  // Optionale Web Notifications (stören nie, nur wenn erlaubt)
  try {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission === 'default') {
        // Anfrage stellen, aber Ergebnis nicht erzwingen
        Notification.requestPermission().catch(() => {});
      }
    }
  } catch { /* ignore */ }

  // Debug-Fallback
  try { console.debug('[notify]', title, body); } catch {}
}
