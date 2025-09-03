// js/ui-form.js
import { state } from './state.js';
import { startTitleJob, pollTitleJob } from './api.js';
import { showLoader, updateLoader, hideLoader, showToast } from './ui-loader.js';
import { renderExpoList } from './ui/renderExpoList.js';
import { PRESETS } from '../assets/presets.js';
import { primeAudioOnUserGesture, notify } from './ui/notifier.js';

/* Helpers */
const byId = (id) => document.getElementById(id);

const AUTO_GROW_MAX = { regionen: 8, zielgruppen: 8, produkte: 10, keywords: 8 };

function autoGrow(el, maxRows){
  if (!el) return;
  el.style.height = 'auto';
  const max = (maxRows || 6);
  const scrollH = el.scrollHeight;
  const line = parseInt(getComputedStyle(el).lineHeight || '20', 10);
  const rows = Math.min(max, Math.ceil(scrollH / line));
  el.style.height = `${rows * line + 8}px`;
}

/* kleiner, CSS-freier Klick-Effekt */
function clickFlash(btn) {
  if (!btn) return;
  const prev = btn.style.transform;
  const prevSh = btn.style.boxShadow;
  btn.style.transform = 'scale(0.98)';
  btn.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.08) inset';
  setTimeout(() => { btn.style.transform = prev || ''; btn.style.boxShadow = prevSh || ''; }, 130);
}

/* ---------- Presets ---------- */
function initPresets(){
  const sel = byId('modelPreset');
  if (!sel) return;

  sel.addEventListener('change', () => {
    const v = sel.value;
    state.selectedPreset = v || '';
    const p = PRESETS?.[v];
    if (p){
      state.agentModels = { ...state.agentModels, ...p };
      // reflect to selects
      byId('modelTitleGenerator').value  = p.titleGenerator;
      byId('modelTitleController').value = p.titleController;
      byId('modelSeoStrategist').value   = p.seoStrategist;
      byId('modelMicroTexter').value     = p.microTexter;
      byId('modelSeoVeredler').value     = p.seoVeredler;
      byId('modelSeoAuditor').value      = p.seoAuditor;
      showToast('Preset übernommen');
    }
  });
}

/* ---------- Form <-> State ---------- */
function readFormIntoState() {
  const cd = state.companyData = state.companyData || {};
  cd.firma            = byId('firma')?.value?.trim() || '';
  cd.domain           = byId('domain')?.value?.trim() || '';
  cd.webshop          = byId('webshop')?.value?.trim() || '';
  cd.kurzbeschreibung = byId('kurzbeschreibung')?.value?.trim() || '';

  cd.expoCount        = Number(byId('exposCount')?.value || 0) || 0;

  cd.regionen    = byId('regionen')?.value || '';
  cd.zielgruppen = byId('zielgruppen')?.value || '';
  cd.produkte    = byId('produkte')?.value || '';
  cd.keywords    = byId('keywords')?.value || '';

  const ort = document.querySelector('input[name="ortsbezug"]:checked')?.value || 'ohne';
  cd.ortsbezug = ort;
  cd.mitOrtsbezug = (ort !== 'ohne');

  const ansprache = document.querySelector('input[name="ansprache"]:checked')?.value || 'neutral';
  cd.ansprache = ansprache;

  cd.diversity_level = Number(byId('diversity_level')?.value || 3);
  cd.detail_level    = Number(byId('detail_level')?.value || 3);
  cd.style_bias      = Number(byId('style_bias')?.value || 3);

  // Modelle aus den Selects lesen
  state.agentModels.titleGenerator  = byId('modelTitleGenerator')?.value || state.agentModels.titleGenerator;
  state.agentModels.titleController = byId('modelTitleController')?.value || state.agentModels.titleController;
  state.agentModels.seoStrategist   = byId('modelSeoStrategist')?.value || state.agentModels.seoStrategist;
  state.agentModels.microTexter     = byId('modelMicroTexter')?.value || state.agentModels.microTexter;
  state.agentModels.seoVeredler     = byId('modelSeoVeredler')?.value || state.agentModels.seoVeredler;
  state.agentModels.seoAuditor      = byId('modelSeoAuditor')?.value || state.agentModels.seoAuditor;
}

function applyFormFromState() {
  const cd = state.companyData || {};

  if (byId('firma'))            byId('firma').value = cd.firma || '';
  if (byId('domain'))           byId('domain').value = cd.domain || '';
  if (byId('webshop'))          byId('webshop').value = cd.webshop || '';
  if (byId('kurzbeschreibung')) byId('kurzbeschreibung').value = cd.kurzbeschreibung || '';

  if (byId('exposCount')) byId('exposCount').value = String(cd.expoCount || 0);

  if (byId('regionen'))    byId('regionen').value = cd.regionen || '';
  if (byId('zielgruppen')) byId('zielgruppen').value = cd.zielgruppen || '';
  if (byId('produkte'))    byId('produkte').value = cd.produkte || '';
  if (byId('keywords'))    byId('keywords').value = cd.keywords || '';

  // Radio buttons
  if (cd.ortsbezug){
    const el = byId(`ort-${cd.ortsbezug}`);
    if (el) el.checked = true;
  }
  if (cd.ansprache){
    const target = (cd.ansprache === 'sie') ? 'ans-sie' : (cd.ansprache === 'du' ? 'ans-du' : 'ans-neutral');
    const el = byId(target);
    if (el) el.checked = true;
  }

  // sliders
  const s = { diversity_level: cd.diversity_level || 3, detail_level: cd.detail_level || 3, style_bias: cd.style_bias || 3 };
  for (const k of Object.keys(s)){
    if (byId(k)) byId(k).value = String(s[k]);
    if (byId(`${k}-value`)) byId(`${k}-value`).textContent = mapSliderLabel(k, s[k]);
  }
}

/* ---------- Slider mapping ---------- */
const LABELS = {
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
  ['diversity_level','detail_level','style_bias'].forEach((id) => {
    const el = byId(id), out = byId(`${id}-value`);
    if (!el || !out) return;
    out.textContent = mapSliderLabel(id, el.value);
    el.addEventListener('input', () => out.textContent = mapSliderLabel(id, el.value));
  });
}

/* ---------- Flow: Titles ---------- */
async function startTitlesFlow(btnRef) {
  readFormIntoState();
  showLoader('Titel werden generiert …');

  if (btnRef) clickFlash(btnRef);

  let stopped = false; // will be fixed to boolean below
}

  try {
    const payload = { ...state.companyData, agentModels: state.agentModels };
    const startRes = await startTitleJob(payload);
    const jobId = startRes?.jobId || startRes?.id || null;
    if (!jobId) throw new Error('Kein jobId vom Webhook erhalten.');
    state.runningJobId = jobId;

    const startedAt = Date.now();
    const MAX_MS    = 15 * 60 * 1000;
    let delay       = 3000;
    const MAX_DELAY = 15000;

    while (true) {
      const elapsed = Date.now() - startedAt;
      if (elapsed > MAX_MS) throw new Error('Zeitüberschreitung beim Titel‑Polling.');

      updateLoader(`Pollen … (${Math.ceil(elapsed/1000)}s)`);
      const res = await pollTitleJob(jobId);

      const status = (res && (res.status || res[0]?.status)) || 'running';
      const titles = (res && (res.titles || res[0]?.titles)) || [];
      const msg    = (res && (res.message || res[0]?.message)) || '';

      if (status === 'done' || (Array.isArray(titles) && titles.length)) {
        state.titles = Array.from(new Set(titles.map(t => String(t).trim()).filter(Boolean)));
        state.texts  = new Array(state.titles.length).fill('');
        localStorage.setItem('expoya_ce_state_v1', JSON.stringify(state));
        renderExpoList();
        hideLoader();
        notify('Titel fertig', `Es wurden ${state.titles.length} Titel generiert.`);
        return;
      }
      if (status === 'failed') throw new Error(msg || 'Titel‑Job fehlgeschlagen.');

      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(MAX_DELAY, Math.round(delay * 1.15));
    }
  } catch (err) {
    console.error(err);
    showToast(err?.message || 'Fehler beim Generieren der Titel');
  } finally {
    hideLoader();
    state.runningJobId = null;
  }
}

/* ---------- Public init ---------- */
export function initForm(){
  primeAudioOnUserGesture();

  ['regionen','zielgruppen','produkte','keywords'].forEach(id => {
    const el = byId(id);
    if (!el) return;
    el.addEventListener('input', () => autoGrow(el, AUTO_GROW_MAX[id] || 6));
    autoGrow(el, AUTO_GROW_MAX[id] || 6);
  });

  wireSliders();

  // generate
  const btn = byId('generateBtn');
  if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); clickFlash(btn); startTitlesFlow(btn); });

  // clear
  const clear = byId('clearBtn');
  if (clear) clear.addEventListener('click', () => {
    document.getElementById('mainForm').reset();
    // reset radios default
    byId('ort-ohne').checked = true;
    byId('ans-neutral').checked = true;
    // reset sliders
    ['diversity_level','detail_level','style_bias'].forEach(id => {
      if(byId(id)) byId(id).value = '3';
      if(byId(`${id}-value`)) byId(`${id}-value`).textContent = mapSliderLabel(id, 3);
    });
  });

  // restore previous
  try {
    const raw = localStorage.getItem('expoya_ce_state_v1');
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        Object.assign(state, saved);
        applyFormFromState();
        if (Array.isArray(state.titles) && state.titles.length) {
          renderExpoList();
        }
      }
    }
  } catch {}
}

export function initAgentUI(){
  initPresets();
}
