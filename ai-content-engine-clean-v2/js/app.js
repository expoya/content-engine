import { initForm } from './ui-form.js';
import { primeAudioOnUserGesture } from './ui/notifier.js';
import { renderExpoList } from './ui/renderExpoList.js';
import { initExportButtons } from './export-utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const prime = ()=>{try{primeAudioOnUserGesture();}catch{} window.removeEventListener('pointerdown',prime); window.removeEventListener('keydown',prime);};
  window.addEventListener('pointerdown',prime); window.addEventListener('keydown',prime);
  initForm();
  renderExpoList();
  initExportButtons();
});
