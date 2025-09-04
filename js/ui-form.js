// js/ui-form.js
import { state } from './state.js';
import { startTitleJob, pollTitleJob } from './api.js';
import { showLoader, updateLoader, hideLoader, showToast } from './ui-loader.js';
import { renderExpoList } from './ui/renderExpoList.js';
import { PRESETS } from '../assets/presets.js';
import { primeAudioOnUserGesture, notify } from './ui/notifier.js';

const byId = (id) => document.getElementById(id);
const TEXTAREAS = ['regionen','zielgruppen','produkte','keywords','attribute','zielsetzung'];

function autogrow(el){
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function readFormIntoState() {
  const cd = (state.companyData = state.companyData || {});
  cd.firma           = byId('firma')?.value || '';
  cd.expoCount       = Number(byId('exposCount')?.value || 0);
  cd.contentSourceId = byId('contentSourceId')?.value || '';

  cd.attribute       = byId('attribute')?.value || '';
  cd.zielsetzung     = byId('zielsetzung')?.value || '';
  cd.regionen        = byId('regionen')?.value || '';
  cd.zielgruppen     = byId('zielgruppen')?.value || '';
  cd.produkte        = byId('produkte')?.value || '';
  cd.keywords        = byId('keywords')?.value || '';

  cd.ortsbezug       = document.querySelector('input[name="ortsbezug"]:checked')?.value || 'ohne';
  cd.ansprache       = document.querySelector('input[name="ansprache"]:checked')?.value || 'du';
  cd.branding        = document.querySelector('input[name="branding"]:checked')?.value || 'kein';

  cd.diversity_level = Number(byId('diversity_level')?.value || 3);
  cd.detail_level    = Number(byId('detail_level')?.value || 3);
  cd.style_bias      = Number(byId('style_bias')?.value || 3);

  // Modelle aus der UI lesen
  state.agentModels = {
    ...(state.agentModels || {}),
    titleGenerator  : byId('modelTitleGenerator')?.value,
    titleController : byId('modelTitleController')?.value,
    seoStrategist   : byId('modelSeoStrategist')?.value,
    microTexter     : byId('modelMicroTexter')?.value,
    seoVeredler     : byId('modelSeoVeredler')?.value,
    seoAuditor      : byId('modelSeoAuditor')?.value,
  };
}

function applyFormFromState() {
  const cd = state.companyData || {};
  if (byId('firma')) byId('firma').value = cd.firma || '';
  if (byId('exposCount')) byId('exposCount').value = cd.expoCount || 15;
  if (byId('contentSourceId')) byId('contentSourceId').value = cd.contentSourceId || '';
  if (byId('attribute')) byId('attribute').value = cd.attribute || '';
  if (byId('zielsetzung')) byId('zielsetzung').value = cd.zielsetzung || '';
  if (byId('regionen')) byId('regionen').value = cd.regionen || '';
  if (byId('zielgruppen')) byId('zielgruppen').value = cd.zielgruppen || '';
  if (byId('produkte')) byId('produkte').value = cd.produkte || '';
  if (byId('keywords')) byId('keywords').value = cd.keywords || '';

  // Modelle zurückspielen (mit Defaults)
  if (byId('modelTitleGenerator'))  byId('modelTitleGenerator').value  = state.agentModels?.titleGenerator  || 'ChatGPT 5 mini';
  if (byId('modelTitleController')) byId('modelTitleController').value = state.agentModels?.titleController || 'ChatGPT 4.1 mini';
  if (byId('modelSeoStrategist'))   byId('modelSeoStrategist').value   = state.agentModels?.seoStrategist   || 'Gemini 2.5 Pro';
  if (byId('modelMicroTexter'))     byId('modelMicroTexter').value     = state.agentModels?.microTexter     || 'Gemini 2.5 Flash';
  if (byId('modelSeoVeredler'))     byId('modelSeoVeredler').value     = state.agentModels?.seoVeredler     || 'Claude Sonnet 4';
  if (byId('modelSeoAuditor'))      byId('modelSeoAuditor').value      = state.agentModels?.seoAuditor      || 'ChatGPT o4 mini';

  // Radios
  const ort = cd.ortsbezug || 'ohne';
  const ans = cd.ansprache || 'du';
  const br  = cd.branding  || 'kein';
  const ortId = `ort-${ort}`;
  const ansId = ans === 'sie' ? 'ans-sie' : 'ans-du';
  const brId  = br === 'dezent' ? 'brand-dezent' : (br === 'moderat' ? 'brand-moderat' : 'brand-kein');
  if (byId(ortId)) byId(ortId).checked = true;
  if (byId(ansId)) byId(ansId).checked = true;
  if (byId(brId))  byId(brId).checked  = true;

  // Slider + Textareas autogrow initial
  const sliders = { diversity_level: cd.diversity_level || 3, detail_level: cd.detail_level || 3, style_bias: cd.style_bias || 3 };
  for (const [k, v] of Object.entries(sliders)) {
    if (byId(k)) byId(k).value = String(v);
    if (byId(`${k}-value`)) byId(`${k}-value`).textContent = mapSliderLabel(k, v);
  }
  TEXTAREAS.forEach(id=>{ const el = byId(id); if (el) autogrow(el); });
}

/* ---------- Slider-Labels ---------- */
const LABELS = {
  diversity_level: ['Sehr nüchtern','Zurückhaltend','Neutral','Kreativ','Sehr kreativ'],
  detail_level   : ['Sehr knapp','Kurz','Neutral','Detailreich','Sehr detailreich'],
  style_bias     : ['Faktisch','Sachlich','Neutral','Emotional','Werblich']
};
function mapSliderLabel(key, val){
  const arr = LABELS[key] || ['1','2','3','4','5'];
  const i = Math.min(arr.length - 1, Math.max(0, Number(val) - 1));
  return arr[i];
}
function wireSliders(){
  ['diversity_level','detail_level','style_bias'].forEach((id)=>{
    const el = byId(id), out = byId(`${id}-value`);
    if (!el || !out) return;
    out.textContent = mapSliderLabel(id, el.value);
    el.addEventListener('input', ()=> out.textContent = mapSliderLabel(id, el.value));
  });
}

/* ---------- Presets ---------- */
function initPresets(){
  const sel = byId('modelPreset');
  if (!sel) return;
  sel.addEventListener('change', ()=>{
    const p = PRESETS?.[sel.value];
    if (!p) return;
    state.agentModels = { ...(state.agentModels || {}), ...p };
    applyFormFromState();
    showToast('Preset übernommen');
  });
}

/* ---------- Init & Flow ---------- */
export async function initForm(){
  primeAudioOnUserGesture();

  // Auto-grow für alle relevanten Textareas
  TEXTAREAS.forEach(id => {
    const el = byId(id);
    if (el){
      el.addEventListener('input', ()=>autogrow(el));
      autogrow(el);
    }
  });

  wireSliders();
  initPresets();

  // restore
  try {
    const raw = localStorage.getItem('expoya_ce_state_v2');
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch {}
  applyFormFromState();
  if (Array.isArray(state.titles) && state.titles.length) renderExpoList();

  // buttons
  const gen = byId('generateBtn');
  if (gen) gen.onclick = ()=> startTitlesFlow(gen);
  const clr = byId('clearBtn');
  if (clr) clr.onclick = ()=>{
    byId('mainForm').reset();
    byId('ort-ohne').checked    = true;
    byId('ans-du').checked      = true;  // neutral entfernt -> Default Du
    byId('brand-kein').checked  = true;
    wireSliders();
    TEXTAREAS.forEach(id=>{ const el = byId(id); if (el) autogrow(el); });
  };
}

async function startTitlesFlow(btn){
  readFormIntoState();
  showLoader('Titel werden generiert …');
  try{
    const startRes = await startTitleJob({ ...state.companyData, agentModels: state.agentModels });
    const jobId = startRes?.jobId || startRes?.id;
    if (!jobId) throw new Error('Kein jobId vom Webhook erhalten.');
    const started = Date.now();
    const MAX = 15 * 60 * 1000;
    let delay = 2500;

    while (true){
      const elapsed = Date.now() - started;
      if (elapsed > MAX) throw new Error('Zeitüberschreitung beim Titel-Polling.');
      updateLoader(`Pollen … (${Math.ceil(elapsed/1000)}s)`);

      const res = await pollTitleJob(jobId);
      const status = res?.status || res?.[0]?.status || 'running';
      const titles = res?.titles || res?.[0]?.titles || [];

      if (status === 'done' || (Array.isArray(titles) && titles.length)){
        state.titles = Array.from(new Set(titles.map(t => String(t).trim()).filter(Boolean)));
        state.texts = new Array(state.titles.length).fill('');
        localStorage.setItem('expoya_ce_state_v2', JSON.stringify(state));
        hideLoader();
        renderExpoList();
        notify('Titel fertig', `Es wurden ${state.titles.length} Titel generiert.`);
        return;
      }
      if (status === 'failed') throw new Error(res?.message || 'Titel-Job fehlgeschlagen.');
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(15000, Math.round(delay * 1.15));
    }
  } catch(e){
    console.error(e);
    showToast(e.message || 'Fehler beim Generieren der Titel');
  } finally {
    hideLoader();
  }
}
