// js/ui/renderExpoList.js
import { state } from '../state.js';
import { startTextJob, pollTextJob } from '../api.js';
import { renderMarkdownToHtml } from '../render.js';
import { showToast } from '../ui-loader.js';
import { buildCommonPayload } from '../ui-form.js';

function autogrow(el){
  if (!el) return;
  el.style.height = 'auto';
  // kleine Obergrenze, damit es nicht “unendlich” wird
  const max = 600;
  el.style.height = Math.min(max, el.scrollHeight) + 'px';
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

  // Speicher für Markdown & Notizen initialisieren
  state.textsMd  = state.textsMd  || [];
  state.expoNotes = state.expoNotes || [];

  state.titles.forEach((title, idx) => {
    const li     = document.createElement('li');  li.className = 'expo-akkordeon';
    const header = document.createElement('div'); header.className = 'expo-akk-header';
    const index  = document.createElement('div'); index.className  = 'expo-akk-index';  index.textContent = String(idx + 1).padStart(2,'0');
    const t      = document.createElement('div'); t.className      = 'expo-akk-titel';   t.textContent = title;
    const expand = document.createElement('button'); expand.className = 'btn-icon btn-expand'; expand.textContent = '▼';
    header.append(index, t, expand);

    const body   = document.createElement('div'); body.className   = 'expo-akk-body';

    // --- Vorgaben & Ausschlüsse (1-zeilig, autogrow) ---
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
    // autogrow live
    note.addEventListener('input', ()=>{ state.expoNotes[idx] = note.value; autogrow(note); });
    setTimeout(()=>autogrow(note)); // initial
    noteWrap.append(noteLabel, note);

    // --- Markdown-Editor + Vorschau ---
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
    // Live-Preview
    const prev = document.createElement('div');
    prev.className = 'preview-box';
    prev.innerHTML = state.texts[idx] || '';
    mdEditor.addEventListener('input', ()=>{
      state.textsMd[idx] = mdEditor.value;
      const html = renderMarkdownToHtml(mdEditor.value || '');
      state.texts[idx] = html;
      prev.innerHTML = html;
      try { localStorage.setItem('expoya_ce_state_v2', JSON.stringify(state)); } catch {}
      autogrow(mdEditor);
    });
    setTimeout(()=>autogrow(mdEditor));

    editorWrap.append(mdLabel, mdEditor);

    // --- Button "Text generieren" ---
    const gen = document.createElement('button');
    gen.className = 'btn btn-primary';
    gen.textContent = 'Text generieren';

    gen.onclick = async () => {
      try{
        gen.disabled = true;
        gen.textContent = 'Generiere …';

        // Gemeinsame Payload wie beim Title-Job
        const base = buildCommonPayload();

        // Final für Text-Job: Titel + Vorgaben/Ausschlüsse
        const payload = {
          ...base,
          'Titel': title,
          'Vorgaben & Ausschlüsse': note.value || ''
        };

        const start = await startTextJob(payload);
        const jobId = start?.jobId || start?.id;
        if (!jobId) throw new Error('Kein jobId vom Text-Webhook erhalten.');

        // Polling
        const isDone = (s) => ['done','success','completed','finished','ready'].includes(String(s||'').toLowerCase());
        const isFailed = (s) => ['failed','error'].includes(String(s||'').toLowerCase());

        // leicht staffeln, wenn viele gleichzeitig gestartet werden
        let delay = 2500 + (idx % 5) * 200;
        const MAX = 20 * 60 * 1000;
        const started = Date.now();

        while (true) {
          if (Date.now() - started > MAX) throw new Error('Zeitüberschreitung beim Text-Polling.');

          const res = await pollTextJob(jobId);
          const status = String(res?.status || '').toLowerCase();

          // Wir unterstützen sowohl res.text (plain/md) als auch res.markdown/res.result (falls JSON-kodiert)
          let md = res?.text || res?.markdown || res?.result || '';
          if (typeof md === 'object') {
            md = md.text || md.markdown || md.content || '';
          }
          if (typeof md === 'string') {
            // Falls ein JSON-String zurückkommt: versuchen zu parsen
            const s = md.trim();
            if (s.startsWith('{') || s.startsWith('[')) {
              try {
                const j = JSON.parse(s);
                md = (j && (j.text || j.markdown || j.content)) || md;
              } catch {}
            }
          }

          if (isDone(status) || md) {
            const html = renderMarkdownToHtml(md || '');
            state.textsMd[idx] = md || '';
            state.texts[idx]   = html;
            prev.innerHTML     = html;
            try { localStorage.setItem('expoya_ce_state_v2', JSON.stringify(state)); } catch {}
            showToast(md ? 'Text fertig' : 'Job fertig, aber kein Text erkannt');
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
      }
    };

    // Body-Reihenfolge
    body.append(noteWrap, gen, editorWrap, prev);

    li.append(header, body);
    expand.onclick = () => li.classList.toggle('open');
    ul.appendChild(li);
  });
}
