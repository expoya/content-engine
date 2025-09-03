// js/app.js
import { initForm, initAgentUI } from './ui-form.js';
import { primeAudioOnUserGesture } from './ui/notifier.js';
import { renderExpoList } from './ui-expos.js';
import { initExportButtons } from './export-utils.js';

document.addEventListener('DOMContentLoaded', () => {
  // Audio primen (einmalig auf erste User-Geste)
  const _primeOnce = () => {
    try { primeAudioOnUserGesture(); } catch {}
    window.removeEventListener('pointerdown', _primeOnce);
    window.removeEventListener('keydown', _primeOnce);
    window.removeEventListener('touchstart', _primeOnce);
  };
  window.addEventListener('pointerdown', _primeOnce);
  window.addEventListener('keydown', _primeOnce);
  window.addEventListener('touchstart', _primeOnce);

  // App initialisieren
  initForm();
  initAgentUI();
  renderExpoList();

  // Export-Buttons einmalig verdrahten
  initExportButtons();
});
