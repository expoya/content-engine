// js/ui-form.js
import { state } from './state.js';
import { startTitleJob, pollTitleJob } from './api.js';
import { showLoader, updateLoader, hideLoader, showToast } from './ui-loader.js';
import { renderExpoList } from './ui/renderExpoList.js';
import { PRESETS } from '../assets/presets.js';
import { primeAudioOnUserGesture, notify, attachSoundToggle } from './ui/notifier.js';

const byId = (id) => document.getElementById(id);

// Diese Textareas wachsen automatisch mit
const TEXTAREAS = ['regionen','zielgruppen','produkte','keywords','attribute','zielsetzung'];

/* -------------------- Slider-Labeling -------------------- */
const LABELS = {
  // „Kreativität“ --> „Tonalität“, Bezeichnungen aus Ursprungsentwurf
  diversity_level: ['Sehr nüchtern','Zurückhaltend','Neutral','Kreativ','Sehr kreativ'],
  detail_level   : ['Übersichtlich','Kurz','Neutral','Detailreich','Sehr detailreich'],
  style_bias     : ['Faktisch','Sachlich','Neutral','Emotional','Werblich']
};
function mapSliderLabel(key, val){
  const arr = LABELS[key] || ['1','2','3','4','5'];
  const i = Math.min(arr.length-1, Math.max(0, Number(val)-1));
  return arr[i];
}
function wireSliders(){
  ['diversity_level','detail_level','style_bias'].forEach((id)=>{
    const el = byId(id), out = byId(`${id}-value`);
    if(!el || !out) return;
    out.textContent = mapSliderLabel(id, el.value);
    el.addEventListener('input', ()=> out.textContent = mapSliderLabel(id, el.value));
  });
}

/* -------------------- Autogrow -------------------- */
function autogrow(el){
  if(!el) return;
  el.style.height='auto';
  const max = 800;
  el.style.height = Math.min(max, el.scrollHeight)+'px';
}

/* -------------------- Presets -------------------- */
function initPresets(){
  const sel = byId('modelPreset'); if(!sel) return;
  sel.addEventListener('change', ()=>{
    const p = PRESETS?.[sel.value];
    if(!p) return;
    state.agentModels = { ...(state.agentModels||{}), ...p };
    applyFormFromState();
    try { localStorage.setItem('expoya_ce_state_v2', JSON.stringify(state)); } catch {}
    showToast('Preset übernommen');
  });
}

/* -------------------- STATE lesen/schreiben -------------------- */
export function readFormIntoState() {
  const cd = state.companyData = state.companyData || {};

  cd.firma           = byId('firma')?.value || '';
  cd.branche         = byId('branche')?.value || '';
  cd.expoCount       = Number(byId('exposCount')?.value || 0);
  cd.contentSourceId = byId('contentSourceId')?.value || '';
  cd.attribute       = byId('attribute')?.value || '';
  cd.zielsetzung     = byId('zielsetzung')?.value || '';
  cd.regionen        = byId('regionen')?.value || '';
  cd.zielgruppen     = byId('zielgruppen')?.value || '';
  cd.produkte        = byId('produkte')?.value || '';
  cd.keywords        = byId('keywords')?.value || '';

  cd.ortsbezug       = document.querySelector('input[name="ortsbezug"]:checked')?.value || 'ohne';
  cd.ansprache       = document.querySelector('input[name="ansprache"]:checked')?.value || 'sie';
  cd.branding        = document.querySelector('input[name="branding"]:checked')?.value || 'kein';

  cd.diversity_level = Number(byId('diversity_level')?.value || 3);
  cd.detail_level    = Number(byId('detail_level')?.value || 3);
  cd.style_bias      = Number(byId('style_bias')?.value || 3);

  state.agentModels = state.agentModels || {};
  state.agentModels.titleGenerator  = byId('modelTitleGenerator')?.value || state.agentModels.titleGenerator;
  state.agentModels.titleController = byId('modelTitleController')?.value || state.agentModels.titleController;
  state.agentModels.seoStrategist   = byId('modelSeoStrategist')?.value || state.agentModels.seoStrategist;
  state.agentModels.microTexter     = byId('modelMicroTexter')?.value || state.agentModels.microTexter;
  state.agentModels.seoVeredler     = byId('modelSeoVeredler')?.value || state.agentModels.seoVeredler;
  state.agentModels.seoAuditor      = byId('modelSeoAuditor')?.value || state.agentModels.seoAuditor;
}

function setIf(elId, val){ const el = byId(elId); if (el) el.value = val; }
function setChecked(id){ const el = byId(id); if (el) el.checked = true; }

function applyFormFromState() {
  const cd = state.companyData || {};

  setIf('firma', cd.firma || '');
  setIf('branche', cd.branche || '');
  setIf('exposCount', cd.expoCount || 15);
  setIf('contentSourceId', cd.contentSourceId || '');
  setIf('attribute', cd.attribute || '');
  setIf('zielsetzung', cd.zielsetzung || '');
  setIf('regionen', cd.regionen || '');
  setIf('zielgruppen', cd.zielgruppen || '');
  setIf('produkte', cd.produkte || '');
  setIf('keywords', cd.keywords || '');

  const ort = cd.ortsbezug || 'ohne';
  const ans = cd.ansprache || 'sie';
  const brd = cd.branding  || 'kein';
  setChecked(`ort-${ort}`);
  setChecked(ans === 'du' ? 'ans-du' : 'ans-sie');
  setChecked(`branding-${brd}`);

  const sliders = {
    diversity_level: cd.diversity_level || 3,
    detail_level   : cd.detail_level    || 3,
    style_bias     : cd.style_bias      || 3
  };
  for (const [k,v] of Object.entries(sliders)){
    if(byId(k)) byId(k).value=String(v);
    if(byId(`${k}-value`)) byId(`${k}-value`).textContent=mapSliderLabel(k,v);
  }

  byId('modelTitleGenerator')  && (byId('modelTitleGenerator').value  = state.agentModels.titleGenerator  || 'ChatGPT 5 mini');
  byId('modelTitleController') && (byId('modelTitleController').value = state.agentModels.titleController || 'ChatGPT 5 mini');
  byId('modelSeoStrategist')   && (byId('modelSeoStrategist').value   = state.agentModels.seoStrategist   || 'Gemini 2.5 Pro');
  byId('modelMicroTexter')     && (byId('modelMicroTexter').value     = state.agentModels.microTexter     || 'Gemini 2.5 Flash');
  byId('modelSeoVeredler')     && (byId('modelSeoVeredler').value     = state.agentModels.seoVeredler     || 'Claude Sonnet 4');
  byId('modelSeoAuditor')      && (byId('modelSeoAuditor').value      = state.agentModels.seoAuditor      || 'ChatGPT o4 mini');
}

/* -------------------- Gemeinsame Payload -------------------- */
export function buildCommonPayload(){
  const cd = state.companyData || {};

  return {
    firma           : cd.firma || '',
    branche         : cd.branche || '',
    expoCount       : cd.expoCount || 0,
    contentSourceId : cd.contentSourceId || '',
    attribute       : cd.attribute || '',
    zielsetzung     : cd.zielsetzung || '',
    regionen        : cd.regionen || '',
    zielgruppen     : cd.zielgruppen || '',
    produkte        : cd.produkte || '',
    keywords        : cd.keywords || '',
    ortsbezug       : cd.ortsbezug || 'ohne',
    ansprache       : cd.ansprache || 'sie',
    branding        : cd.branding  || 'kein',
    agentModels     : { ...(state.agentModels||{}) },

    // Umbenannte Slider-Felder
    'Tonalität'  : mapSliderLabel('diversity_level', cd.diversity_level || 3),
    'Detailgrad' : mapSliderLabel('detail_level',    cd.detail_level    || 3),
    'Schreibstil': mapSliderLabel('style_bias',      cd.style_bias      || 3),

    // Instruktionen
    instructions: {
      branding: (()=>{
        switch(cd.branding){
          case 'kein'    : return 'Verwende den Unternehmensnamen überhaupt nicht. Erstelle einen rein informativen Text.';
          case 'dezent'  : return 'Verwende den Unternehmensnamen dezent in einer etwaigen Einleitung oder im Fazit.';
          case 'moderat' : return 'Verwende den Unternehmensnamen an 3-4 logischen Stellen im Text.';
          default        : return '';
        }
      })(),
      ortsbezug: (()=>{
        switch(cd.ortsbezug){
          case 'ohne': return 'Verwende keinen regionalen Ortsbezug in den Titeln oder Text.';
          case 'exakt': return 'Verwende, sofern sinnvoll im Kontext, genau die angegebenen Regionen/Orte/Städte in den Titeln oder Text.';
          case 'erweitert': return 'Verwende, sofern sinnvoll im Kontext, neben den angegebenen Regionen/Orte/Städte auch Nachbarn der exakt gleichen administrativen Ebene (z. B. „Linz“ → Wels, Marchtrenk, Leonding; „Oberösterreich“ → Niederösterreich, Salzburg) in den Titeln oder Text.';
          case 'erweitert+vertieft': return 'Verwende, sofern sinnvoll im Kontext, neben den angegebenen Regionen/Orte/Städte auch Stadt-/Ortsteile der darunter liegenden Ebene und Nachbarn der gleichen sowie darunterliegenden Ebene (z. B. „Linz“ → Linz(Auwiesen, Ebelsberg, Urfahr…), Leonding(Alharting, Zaubertal…)).';
          default: return '';
        }
      })()
    }
  };
}

/* -------------------- INIT & FLOW -------------------- */
export async function initForm(){
  // Audio + Toggle
  primeAudioOnUserGesture();
  attachSoundToggle();

  // Textareas autogrow
  TEXTAREAS.forEach(id=>{
    const el=byId(id);
    if(el){ el.addEventListener('input',()=>autogrow(el)); autogrow(el); }
  });

  // Slider
  wireSliders();

  // Presets
  initPresets();

  // Restore
  try{
    const raw = localStorage.getItem('expoya_ce_state_v2');
    if(raw){
      const saved = JSON.parse(raw);
      Object.assign(state, saved);
      applyFormFromState();
      state.textsMd   = state.textsMd   || [];
      state.expoNotes = state.expoNotes || [];
      if(Array.isArray(state.titles) && state.titles.length) renderExpoList();
    }
  }catch{}

  // Buttons
  const gen = byId('generateBtn');
  if(gen) gen.onclick = ()=> startTitlesFlow(gen);

  const clr = byId('clearBtn');
  if(clr) clr.onclick = ()=>{
    byId('mainForm')?.reset();
    byId('ort-ohne') && (byId('ort-ohne').checked=true);
    byId('ans-sie') && (byId('ans-sie').checked=true);
    byId('branding-kein') && (byId('branding-kein').checked=true);
    wireSliders();
    state.titles = [];
    state.textsMd = [];
    state.expoNotes = [];
    try { localStorage.setItem('expoya_ce_state_v2', JSON.stringify(state)); } catch {}
    renderExpoList();
  };

  // Live-Update Modelle
  [
    'modelTitleGenerator','modelTitleController',
    'modelSeoStrategist','modelMicroTexter','modelSeoVeredler','modelSeoAuditor'
  ].forEach(id=>{
    const el = byId(id);
    if(el) el.addEventListener('change', ()=>{
      readFormIntoState();
      try { localStorage.setItem('expoya_ce_state_v2', JSON.stringify(state)); } catch {}
    });
  });
}

async function startTitlesFlow(btn){
  readFormIntoState();
  showLoader('Titel werden generiert …');
  try{
    const basePayload = buildCommonPayload();
    const startRes = await startTitleJob(basePayload);
    const jobId = startRes?.jobId || startRes?.id;
    if(!jobId) throw new Error('Kein jobId vom Webhook erhalten.');

    const started = Date.now();
    const MAX = 15*60*1000;
    let delay=2500;

    while(true){
      const elapsed = Date.now()-started;
      if(elapsed>MAX) throw new Error('Zeitüberschreitung beim Titel-Polling.');
      updateLoader(`Pollen … (${Math.ceil(elapsed/1000)}s)`);

      const res = await pollTitleJob(jobId);
      const status = String(res?.status || res?.[0]?.status || 'running').toLowerCase();

      let titles = res?.titles || res?.[0]?.titles || res?.data?.titles || [];
      if (typeof titles === 'string') {
        try { titles = JSON.parse(titles); } catch { titles = [titles]; }
      }
      if (!Array.isArray(titles)) titles = [];

      if (status==='done' || titles.length){
        state.titles = Array.from(new Set(titles.map(t=>String(t||'').trim()).filter(Boolean)));
        const n = state.titles.length;
        state.textsMd   = new Array(n).fill('');
        state.expoNotes = new Array(n).fill('');
        delete state.texts;
        try { localStorage.setItem('expoya_ce_state_v2', JSON.stringify(state)); } catch {}
        hideLoader();
        renderExpoList();
        notify('Titel fertig', `Es wurden ${n} Titel generiert.`);
        return;
      }

      if (status==='failed') throw new Error(res?.message || 'Titel-Job fehlgeschlagen.');
      await new Promise(r=>setTimeout(r, delay));
      delay = Math.min(15000, Math.round(delay*1.15));
    }
  }catch(e){
    console.error(e);
    showToast(e.message||'Fehler beim Generieren der Titel');
  }finally{
    hideLoader();
  }
}
