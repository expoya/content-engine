// js/ui-form.js
import { state } from './state.js';
import { startTitleJob, pollTitleJob } from './api.js';
import { showLoader, updateLoader, hideLoader, showToast } from './ui-loader.js';
import { renderExpoList } from './ui/renderExpoList.js';
import { PRESETS } from '../assets/presets.js';
import { primeAudioOnUserGesture, notify } from './ui/notifier.js';

const byId = (id) => document.getElementById(id);
const TEXTAREAS = ['regionen','zielgruppen','produkte','keywords','attribute','zielsetzung'];

/* ---------- helpers ---------- */
function autogrow(el){
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function ortValueToId(val){
  switch((val||'').toLowerCase()){
    case 'ohne': return 'ort-ohne';
    case 'exakt': return 'ort-exakt';
    case 'erweitert': return 'ort-erweitert';
    case 'erweitert+vertieft': return 'ort-erweitert-vertieft';
    default: return 'ort-ohne';
  }
}

/* ---------- instructions ---------- */
function buildInstructions(cd){
  const brandingMap = {
    'kein'   : 'Verwende den Unternehmensnamen überhaupt nicht. Erstelle einen rein informativen Text.',
    'dezent' : 'Verwende den Unternehmensnamen dezent in einer etwaigen Einleitung oder im Fazit.',
    'moderat': 'Verwende den Unternehmensnamen an 3–4 logischen Stellen im Text.'
  };
  const ortsMap = {
    'ohne'               : 'Verwende keinen regionalen Ortsbezug in den Titeln oder Text.',
    'exakt'              : 'Verwende, sofern sinnvoll im Kontext, genau die angegebenen Regionen/Orte/Städte in den Titeln oder Text.',
    'erweitert'          : 'Verwende, sofern sinnvoll im Kontext, neben den angegebenen Regionen/Orte/Städte auch Nachbarn der exakt gleichen administrativen Ebene (z. B. „Linz“ → Wels, Marchtrenk, Leonding; „Oberösterreich“ → Niederösterreich, Salzburg) in den Titeln oder Text.',
    'erweitert+vertieft' : 'Verwende, sofern sinnvoll im Kontext, neben den angegebenen Regionen/Orte/Städte auch Stadt-/Ortsteile auf der darunter liegenden administrativen Ebene und auch Nachbarn der exakt gleichen sowie der darunter liegenden administrativen Ebene (z. B. „Linz“ → Linz(Auwiesen, Ebelsberg, Urfahr…), Leonding(Alharting, Zaubertal…); „Oberösterreich“ → Oberösterreich(Vöcklabruck, Grieskirchen…), Niederösterreich(Amstetten, Baden…)).'
  };

  return {
    branding: brandingMap[cd.branding || 'kein'],
    ortsbezug: ortsMap[cd.ortsbezug || 'ohne']
  };
}

/* ---------- state <-> form ---------- */
function readFormIntoState() {
  const cd = (state.companyData = state.companyData || {});
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
  cd.ansprache       = document.querySelector('input[name="ansprache"]:checked')?.value || 'du';
  cd.branding        = document.querySelector('input[name="branding"]:checked')?.value || 'kein';

  cd.diversity_level = Number(byId('diversity_level')?.value || 3);
  cd.detail_level    = Number(byId('detail_level')?.value || 3);
  cd.style_bias      = Number(byId('style_bias')?.value || 3);

  // Modelle
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
  if (byId('branche')) byId('branche').value = cd.branche || '';  
  if (byId('exposCount')) byId('exposCount').value = cd.expoCount || 15;
  if (byId('contentSourceId')) byId('contentSourceId').value = cd.contentSourceId || '';
  if (byId('attribute')) byId('attribute').value = cd.attribute || '';
  if (byId('zielsetzung')) byId('zielsetzung').value = cd.zielsetzung || '';
  if (byId('regionen')) byId('regionen').value = cd.regionen || '';
  if (byId('zielgruppen')) byId('zielgruppen').value = cd.zielgruppen || '';
  if (byId('produkte')) byId('produkte').value = cd.produkte || '';
  if (byId('keywords')) byId('keywords').value = cd.keywords || '';

  // Modelle (Defaults)
  if (byId('modelTitleGenerator'))  byId('modelTitleGenerator').value  = state.agentModels?.titleGenerator  || 'ChatGPT 5 mini';
  if (byId('modelTitleController')) byId('modelTitleController').value = state.agentModels?.titleController || 'ChatGPT 4.1 mini';
  if (byId('modelSeoStrategist'))   byId('modelSeoStrategist').value   = state.agentModels?.seoStrategist   || 'Gemini 2.5 Pro';
  if (byId('modelMicroTexter'))     byId('modelMicroTexter').value     = state.agentModels?.microTexter     || 'Gemini 2.5 Flash';
  if (byId('modelSeoVeredler'))     byId('modelSeoVeredler').value     = state.agentModels?.seoVeredler     || 'Claude Sonnet 4';
  if (byId('modelSeoAuditor'))      byId('modelSeoAuditor').value      = state.agentModels?.seoAuditor      || 'ChatGPT o4 mini';

  // Radios
  const ortId = ortValueToId(cd.ortsbezug || 'ohne');
  const ansId = (cd.ansprache || 'du') === 'sie' ? 'ans-sie' : 'ans-du';
  const brId  = cd.branding === 'dezent' ? 'brand-dezent' : (cd.branding === 'moderat' ? 'brand-moderat' : 'brand-kein');
  if (byId(ortId)) byId(ortId).checked = true;
  if (byId(ansId)) byId(ansId).checked = true;
  if (byId(brId))  byId(brId).checked  = true;

  // Slider + autogrow initial
  const sliders = { diversity_level: cd.diversity_level || 3, detail_level: cd.detail_level || 3, style_bias: cd.style_bias || 3 };
  for (const [k, v] of Object.entries(sliders)) {
    if (byId(k)) byId(k).value = String(v);
    if (byId(`${k}-value`)) byId(`${k}-value`).textContent = mapSliderLabel(k, v);
  }
  TEXTAREAS.forEach(id=>{ const el = byId(id); if (el) autogrow(el); });
}

/* ---------- Slider-Labels ---------- */
const LABELS = {
  diversity_level: ['Sehr formell','Eher formell','Neutral','Eher locker','Sehr locker'],
  detail_level   : ['Sehr oberflächlich','Eher oberflächlich','Neutral','Eher detailreich','Sehr detailreich'],
  style_bias     : ['Sehr faktisch','Eher faktisch','Neutral','Eher werblich','Sehr werblich']
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

  TEXTAREAS.forEach(id => {
    const el = byId(id);
    if (el){
      el.addEventListener('input', ()=>autogrow(el));
      autogrow(el);
    }
  });

  wireSliders();
  initPresets();

  try {
    const raw = localStorage.getItem('expoya_ce_state_v2');
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch {}
  applyFormFromState();
  if (Array.isArray(state.titles) && state.titles.length) renderExpoList();

  const gen = byId('generateBtn');
  if (gen) gen.onclick = ()=> startTitlesFlow(gen);
  const clr = byId('clearBtn');
  if (clr) clr.onclick = ()=>{
    byId('mainForm').reset();
    byId('ort-ohne').checked    = true;
    byId('ans-du').checked      = true;
    byId('brand-kein').checked  = true;
    wireSliders();
    TEXTAREAS.forEach(id=>{ const el = byId(id); if (el) autogrow(el); });
  };
}

/* ---------- Flow ---------- */
async function startTitlesFlow(btn){
  readFormIntoState();
  showLoader('Titel werden generiert …');
  try{
    const payload = { ...state.companyData, agentModels: state.agentModels };

// Slider-Werte als Text-Felder mitschicken (statt diversity/detail/style)
payload['Tonalität']  = mapSliderLabel('diversity_level', state.companyData.diversity_level);
payload['Detailgrad'] = mapSliderLabel('detail_level',    state.companyData.detail_level);
payload['Schreibstil']= mapSliderLabel('style_bias',      state.companyData.style_bias);

// Alte numerischen Keys entfernen (falls vorhanden)
delete payload.diversity_level;
delete payload.detail_level;
delete payload.style_bias;

payload.instructions = buildInstructions(state.companyData);


    const startRes = await startTitleJob(payload);
    const jobId = startRes?.jobId || startRes?.id;
    if (!jobId) throw new Error('Kein jobId vom Webhook erhalten.');
   const started = Date.now();
const MAX = 20 * 60 * 1000;   // 20 Minuten
let delay = 2500;

const isDone = (s) => ['done','success','completed','finished','ready'].includes(String(s||'').toLowerCase());
const isFailed = (s) => ['failed','error'].includes(String(s||'').toLowerCase());

while (true) {
  const elapsed = Date.now() - started;
  if (elapsed > MAX) throw new Error('Zeitüberschreitung beim Titel-Polling.');

  updateLoader(`Pollen … (${Math.ceil(elapsed/1000)}s)`);

  const res = await pollTitleJob(jobId); // liefert jetzt { status, titles, raw }
  const status = res?.status || 'running';
  const titles = Array.isArray(res?.titles) ? res.titles : [];

  if (isDone(status) || titles.length) {
    state.titles = Array.from(new Set(titles.map(t => String(t).trim()).filter(Boolean)));
    state.texts  = new Array(state.titles.length).fill('');
    localStorage.setItem('expoya_ce_state_v2', JSON.stringify(state));
    hideLoader(); renderExpoList();
    notify('Titel fertig', `Es wurden ${state.titles.length} Titel generiert.`);
    break;
  }

  if (isFailed(status)) {
    const msg = (res && res.raw && (res.raw.message || res.raw.error)) || 'Titel-Job fehlgeschlagen.';
    throw new Error(msg);
  }

  // sanftes Backoff, Deckel 20s
  await new Promise(r => setTimeout(r, delay));
  delay = Math.min(20000, Math.round(delay * 1.2));
}

  } catch(e){
    console.error(e);
    showToast(e.message || 'Fehler beim Generieren der Titel');
  } finally {
    hideLoader();
  }
}
