// js/ui/renderExpoList.js
import { state } from '../state.js';
import { startTextJob, pollTextJob } from '../api.js';
import { renderMarkdownToHtml } from '../render.js';
import { showToast } from '../ui-loader.js';
import { buildCommonPayload } from '../ui-form.js';

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

  state.titles.forEach((title, idx) => {
    const li     = document.createElement('li');  li.className = 'expo-akkordeon';
    const header = document.createElement('div'); header.className = 'expo-akk-header';
    const index  = document.createElement('div'); index.className  = 'expo-akk-index';  index.textContent = String(idx + 1).padStart(2,'0');
    const t      = document.createElement('div'); t.className      = 'expo-akk-titel';   t.textContent = title;
    const expand = document.createElement('button'); expand.className = 'btn-icon btn-expand'; expand.textContent = '▼';

    header.append(index, t, expand);

    const body   = document.createElement('div'); body.className   = 'expo-akk-body';

    // Feld für Zusatzhinweise
    const noteLabel = document.createElement('label');
    noteLabel.setAttribute('for', `note-${idx}`);
    noteLabel.textContent = 'Vorgaben & Ausschlüsse';

    const note = document.createElement('textarea');
    note.id = `note-${idx}`;
    note.placeholder = 'Markdown erlaubt (optional)';
    note.rows = 3;
    note.style.width = '100%';

    // Button "Text generieren"
    const gen = document.createElement('button');
    gen.className = 'btn btn-primary';
    gen.textContent = 'Text generieren';

    // Vorschau
    const prev = document.createElement('div');
    prev.className = 'preview-box';
    prev.innerHTML = state.texts?.[idx] || '';

    // Helper: robust aus verschiedenen Antwortformen Markdown/Text extrahieren
    const extractMarkdown = (res) => {
      if (!res) return '';
      const tryGet = (...paths) => {
        for (const p of paths) {
          const segs = p.split('.');
          let cur = res, ok = true;
          for (const s of segs) {
            if (cur && Object.prototype.hasOwnProperty.call(cur, s)) cur = cur[s];
            else { ok = false; break; }
          }
          if (ok && (typeof cur === 'string' || typeof cur === 'object')) return cur;
        }
        return undefined;
      };

      // Häufige Felder zuerst
      let out = tryGet('markdown','text','result','data.markdown','data.text','payload.text','payload.markdown','0.markdown','0.text');
      if (!out) return '';

      // Falls es ein JSON-String ist -> parsen
      if (typeof out === 'string') {
        const s = out.trim();
        if (!s) return '';
        try {
          const j = JSON.parse(s);
          // häufige Keys im JSON
          if (typeof j === 'string') return j;
          if (j && typeof j === 'object') {
            return j.markdown || j.text || j.content || '';
          }
        } catch (_) {
          return s; // war reiner Markdown/Text
        }
      }

      if (out && typeof out === 'object') {
        return out.markdown || out.text || out.content || '';
      }

      return '';
    };

    // Klick-Handler
    gen.onclick = async () => {
      try{
        gen.disabled = true;
        gen.textContent = 'Generiere …';

        // Gemeinsame Payload wie beim Title-Job
        const base = buildCommonPayload();

        // Zusatzfelder für den Text-Job gemäß Anforderung
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

        let delay = 2500;
        const MAX = 20 * 60 * 1000;  // 20 Minuten
        const started = Date.now();

        while (true) {
          if (Date.now() - started > MAX) throw new Error('Zeitüberschreitung beim Text-Polling.');

          const res = await pollTextJob(jobId);
          const status = String(res?.status || '').toLowerCase();
          const md = extractMarkdown(res);

          if (isDone(status) || md) {
            const html = renderMarkdownToHtml(md || '');
            state.texts = state.texts || [];
            state.texts[idx] = html;
            prev.innerHTML = html;
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

    body.append(noteLabel, note, gen, prev);
    li.append(header, body);
    expand.onclick = () => li.classList.toggle('open');
    ul.appendChild(li);
  });
}
