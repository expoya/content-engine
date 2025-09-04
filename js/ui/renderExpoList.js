// js/ui/renderExpoList.js.
import { state } from '../state.js';
import { startTextJob, pollTextJob } from '../api.js';
import { renderMarkdownToHtml } from '../render.js';
import { showToast } from '../ui-loader.js';
import { buildCommonPayload } from '../ui-form.js';

function autogrow(el){
  if (!el) return;
  el.style.height = 'auto';
  const max = 800;
  el.style.height = Math.min(max, el.scrollHeight) + 'px';
}

function parseMaybeJsonText(v){
  if (!v) return '';
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return '';
    if (s.startsWith('{') || s.startsWith('[')) {
      try {
        const j = JSON.parse(s);
        if (typeof j === 'string') return j;
        if (j && typeof j === 'object') {
          return j.text || j.markdown || j.content || s;
        }
      } catch { /* plain string */ }
    }
    return s; // plain markdown/text
  }
  if (v && typeof v === 'object') {
    return v.text || v.markdown || v.content || '';
  }
  return '';
}

export function renderExpoList(){
  const ul = document.getElementById('expoList');
  if (!ul) return;

  ul.innerHTML = '';

  if (!Array.isArray(state.titles) || state.titles.length === 0){
    const li = document.createElement('li');
    li.className = 'expo-placeholder';
    li.textContent = 'Hier erscheinen deine generierten Expo-Titel …';
    ul.appendChild(li);
    return;
  }

  state.textsMd   = state.textsMd   || [];
  state.texts     = state.texts     || [];
  state.expoNotes = state.expoNotes || [];

  state.titles.forEach((title, idx) => {
    const li     = document.createElement('li');  li.className = 'expo-akkordeon';
    const header = document.createElement('div'); header.className = 'expo-akk-header';
    const index  = document.createElement('div'); index.className  = 'expo-akk-index';  index.textContent = String(idx + 1).padStart(2,'0');
    const t      = document.createElement('div'); t.className      = 'expo-akk-titel';   t.textContent = title;

    // Quick Action rechts: Badge | Quick-Button | Spinner | Pfeil
    const rightWrap = document.createElement('div'); rightWrap.className = 'akk-right';

    const badge = document.createElement('span');
    badge.className = 'badge badge-success';
    badge.textContent = '✓ Text da';
    badge.style.display = (state.textsMd[idx]?.trim()) ? 'inline-flex' : 'none';

    const quick = document.createElement('button');
    quick.className = 'btn-chip';
    quick.title = 'Text generieren';
    quick.innerHTML = '✨';

    const spinner = document.createElement('div');
    spinner.className = 'spinner sm';
    spinner.style.display = 'none';

    const expand = document.createElement('button');
    expand.className = 'btn-icon btn-expand';
    expand.setAttribute('aria-label','Aufklappen');
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = '▾';
    expand.appendChild(arrow);

    rightWrap.append(badge, quick, spinner, expand);
    header.append(index, t, rightWrap);

    // Body
    const body = document.createElement('div');
    body.className = 'expo-akk-body';

    // Vorgaben & Ausschlüsse
    const noteWrap = document.createElement('div');
    noteWrap.className = 'form-group';
    const noteLabel = document.createElement('label');
    noteLabel.setAttribute('for', `note-${idx}`);
    noteLabel.textContent = 'Vorgaben & Ausschlüsse';
    const note = document.createElement('textarea');
    note.id = `note-${idx}`;
    note.className = 'autogrow';
    note.placeholder = 'spezielle Anweisungen hier eingeben';
    note.rows = 1;
    note.style.width = '100%';
    note.value = state.expoNotes[idx] || '';
    note.addEventListener('input', ()=>{
      state.expoNotes[idx] = note.value;
      autogrow(note);
    });
    setTimeout(()=>autogrow(note), 0);
    noteWrap.append(noteLabel, note);

    // Markdown-Editor (bearbeitbar)
    const editorWrap = document.createElement('div');
    editorWrap.className = 'form-group';
    const mdLabel = document.createElement('label');
    mdLabel.setAttribute('for', `md-${idx}`);
    mdLabel.textContent = 'Text (Markdown, bearbeitbar)';
    const mdEditor = document.createElement('textarea');
    mdEditor.id = `md-${idx}`;
    mdEditor.className = 'autogrow';
    mdEditor.rows = 8;
    mdEditor.style.width = '100%';
    mdEditor.placeholder = 'Der generierte Text erscheint hier und kann bearbeitet werden …';
    mdEditor.value = state.textsMd[idx] || '';
    mdEditor.addEventListener('input', ()=>{
      state.textsMd[idx] = mdEditor.value;
      const html = renderMarkdownToHtml(mdEditor.value || '');
      state.texts[idx] = html;
      try { localStorage.setItem('expoya_ce_state_v2', JSON.stringify(state)); } catch {}
      autogrow(mdEditor);
      badge.style.display = mdEditor.value.trim() ? 'inline-flex' : 'none';
    });
    setTimeout(()=>autogrow(mdEditor), 0);
    editorWrap.append(mdLabel, mdEditor);

    // Vorschau (sauber gerendert)
    const prev = document.createElement('div');
    prev.className = 'preview-box';
    prev.innerHTML = state.texts[idx] || '';

    // Primary-Button im Body (optional)
    const gen = document.createElement('button');
    gen.className = 'btn btn-primary';
    gen.textContent = 'Text generieren';

    // Gemeinsame Start-Funktion (Quick + Body-Button nutzen dieselbe Logik)
    const startGeneration = async () => {
      try{
        // UI-States
        gen.disabled = true;
        gen.textContent = 'Generiere …';
        quick.style.display = 'none';
        spinner.style.display = 'inline-block';
        badge.style.display = 'none';

        const base = buildCommonPayload();
        const payload = {
          ...base,
          'Titel': title,
          'Vorgaben & Ausschlüsse': note.value || ''
        };

        const start = await startTextJob(payload);
        const jobId = start?.jobId || start?.id;
        if (!jobId) throw new Error('Kein jobId vom Text-Webhook erhalten.');

        // Poll
        const isDone = (s) => ['done','success','completed','finished','ready'].includes(String(s||'').toLowerCase());
        const isFailed = (s) => ['failed','error'].includes(String(s||'').toLowerCase());

        let delay = 2500 + (idx % 5) * 200;
        const MAX = 20 * 60 * 1000;
        const started = Date.now();

        while (true) {
          if (Date.now() - started > MAX) throw new Error('Zeitüberschreitung beim Text-Polling.');
          const res = await pollTextJob(jobId);
          const status = String(res?.status || '').toLowerCase();

          let md = res?.text || res?.markdown || res?.result || '';
          md = parseMaybeJsonText(md);

          if (isDone(status) || md) {
            mdEditor.value = md || '';
            state.textsMd[idx] = md || '';
            const html = renderMarkdownToHtml(md || '');
            state.texts[idx] = html;
            prev.innerHTML = html;
            try { localStorage.setItem('expoya_ce_state_v2', JSON.stringify(state)); } catch {}
            showToast(md ? 'Text fertig' : 'Job fertig, aber kein Text erkannt');
            badge.style.display = md && md.trim() ? 'inline-flex' : 'none';
            break;
          }

          if (isFailed(status)) {
            const msg = (res && (res.message || res.error)) || 'Text-Job fehlgeschlagen.';
            throw new Error(msg);
          }

          await new Promise(r => setTimeout(r, delay));
          delay = Math.min(20000, Math.round(delay * 1.2));
        }

      } catch (e) {
        console.error(e);
        showToast(e?.message || 'Fehler bei Text-Job');
      } finally {
        gen.disabled = false;
        gen.textContent = 'Text generieren';
        spinner.style.display = 'none';
        // Wenn noch kein Text vorhanden ist, Quick wieder zeigen
        if (!mdEditor.value.trim()) quick.style.display = 'inline-flex';
      }
    };

    quick.onclick = startGeneration;
    gen.onclick = startGeneration;

    // Body-Reihenfolge – kein altes Ausgabefeld mehr
    body.append(noteWrap, gen, editorWrap, prev);

    // Akkordeon-Verhalten
    expand.onclick = () => {
      li.classList.toggle('open');
      // Pfeil drehen per CSS (siehe .expo-akkordeon.open .arrow)
    };

    li.append(header, body);
    ul.appendChild(li);
  });
}
