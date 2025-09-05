// js/ui/renderExpoList.js
import { state } from '../state.js';
import { startTextJob, pollTextJob } from '../api.js';
import { showToast } from '../ui-loader.js';
import { buildCommonPayload, readFormIntoState } from '../ui-form.js';
import { renderMarkdownToHtml } from '../render.js';

function autogrow(el){
  if (!el) return;
  el.style.height = 'auto';
  const max = 800;
  el.style.height = Math.min(max, el.scrollHeight) + 'px';
}

/** Entfernt ```json fences, parst JSON-Wrapper { "text": "..." } und unescaped \n, \" usw. */
function cleanToMarkdown(input){
  if (input == null) return '';
  let s = typeof input === 'string' ? input : (() => {
    try { return JSON.stringify(input); } catch { return String(input); }
  })();

  s = s.trim();

  // ```json ... ``` → Fences entfernen
  if (s.startsWith('```')) {
    // erste Zeile (``` oder ```json) entfernen
    const nl = s.indexOf('\n');
    if (nl !== -1) s = s.slice(nl + 1);
    if (s.endsWith('```')) s = s.slice(0, -3);
    s = s.trim();
  }

  // Wenn wie JSON aussieht: versuchen zu parsen
  if (s.startsWith('{') || s.startsWith('[')) {
    try {
      const j = JSON.parse(s);
      if (typeof j === 'string') s = j;
      else if (Array.isArray(j)) {
        // häufigster Fall: [{ text: "..." }]
        const first = j[0];
        if (first && typeof first === 'object') {
          s = first.text || first.markdown || first.content || s;
        }
      } else if (j && typeof j === 'object') {
        s = j.text || j.markdown || j.content || s;
      }
    } catch { /* plain string belassen */ }
  }

  // Unescapes
  s = s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');

  // Eventuelle äußere Anführungszeichen entfernen
  s = s.replace(/^"(.*)"$/s, '$1');

  return s.trim();
}

/** Versucht aus einer beliebigen n8n-Antwort Markdown zu extrahieren */
function extractMarkdownFromResponse(res){
  // häufig: Objekt mit .text / .markdown
  if (res && typeof res === 'object') {
    if (typeof res.text === 'string') return cleanToMarkdown(res.text);
    if (typeof res.markdown === 'string') return cleanToMarkdown(res.markdown);
    if (typeof res.result === 'string') return cleanToMarkdown(res.result);

    // Array-Fälle
    if (Array.isArray(res) && res.length) {
      const r0 = res[0];
      if (r0 && typeof r0 === 'object') {
        if (typeof r0.text === 'string') return cleanToMarkdown(r0.text);
        if (typeof r0.markdown === 'string') return cleanToMarkdown(r0.markdown);
        if (typeof r0.result === 'string') return cleanToMarkdown(r0.result);
      }
    }
    // Fallback: gesamtes Objekt als JSON-String säubern
    try { return cleanToMarkdown(JSON.stringify(res)); } catch { return cleanToMarkdown(String(res)); }
  }

  // String-Fall
  if (typeof res === 'string') return cleanToMarkdown(res);

  // Fallback
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

  state.textsMd   = state.textsMd   || [];   // einziges Textspeicherfeld (Markdown)
  state.expoNotes = state.expoNotes || [];

  state.titles.forEach((title, idx) => {
    const li     = document.createElement('li');  li.className = 'expo-akkordeon';
    const header = document.createElement('div'); header.className = 'expo-akk-header';

    const index  = document.createElement('div'); index.className  = 'expo-akk-index';  index.textContent = String(idx + 1).padStart(2,'0');

    // ---- Titel (inline editierbar) ----
    const tWrap  = document.createElement('div'); tWrap.className = 'akk-title-wrap';
    const tText  = document.createElement('div'); tText.className  = 'expo-akk-titel';   tText.textContent = title;

    const tEdit  = document.createElement('input'); tEdit.className = 'title-edit';
    tEdit.type = 'text'; tEdit.value = title; tEdit.style.display = 'none';

    const okBtn  = document.createElement('button'); okBtn.className = 'btn-icon btn-check'; okBtn.title='Speichern'; okBtn.textContent='✓'; okBtn.style.display='none';
    const cancelBtn = document.createElement('button'); cancelBtn.className='btn-icon btn-cancel'; cancelBtn.title='Abbrechen'; cancelBtn.textContent='×'; cancelBtn.style.display='none';

    const enterEdit = ()=>{
      tText.style.display='none';
      tEdit.style.display='inline-block';
      okBtn.style.display='inline-flex';
      cancelBtn.style.display='inline-flex';
      tEdit.value = state.titles[idx] || '';
      tEdit.focus(); tEdit.select();
    };
    const saveEdit = ()=>{
      const v = (tEdit.value || '').trim();
      if (!v) return;
      state.titles[idx] = v;
      tText.textContent = v;
      exitEdit();
      try { localStorage.setItem('expoya_ce_state_v2', JSON.stringify(state)); } catch {}
    };
    const exitEdit = ()=>{
      tText.style.display='inline-block';
      tEdit.style.display='none';
      okBtn.style.display='none';
      cancelBtn.style.display='none';
    };
    tText.onclick = enterEdit;
    okBtn.onclick = saveEdit;
    cancelBtn.onclick = exitEdit;
    tEdit.addEventListener('keydown',(e)=>{ if(e.key==='Enter') saveEdit(); if(e.key==='Escape') exitEdit(); });

    tWrap.append(tText, tEdit, okBtn, cancelBtn);

    // ---- Header rechts: Badge | Quick | Spinner | Delete | Arrow ----
    const rightWrap = document.createElement('div'); rightWrap.className = 'akk-right';

    const badge = document.createElement('span');
    badge.className = 'badge badge-success';
    badge.textContent = '✓ Text da';
    // vorhandene Inhalte beim Laden normalisieren → schon hier anzeigen
    if (state.textsMd[idx]) state.textsMd[idx] = cleanToMarkdown(state.textsMd[idx]);
    badge.style.display = (state.textsMd[idx]?.trim()) ? 'inline-flex' : 'none';

    const quick = document.createElement('button');
    quick.className = 'btn-chip';
    quick.title = 'Text generieren';
    quick.innerHTML = '✨';

    const spinner = document.createElement('div');
    spinner.className = 'spinner sm';
    spinner.style.display = 'none';

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-icon btn-trash';
    delBtn.title = 'Titel/Expo löschen';
    delBtn.innerHTML = '🗑';

    const expand = document.createElement('button');
    expand.className = 'btn-icon btn-expand';
    expand.setAttribute('aria-label','Aufklappen');
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = '▾';
    expand.appendChild(arrow);

    rightWrap.append(badge, quick, spinner, delBtn, expand);
    header.append(index, tWrap, rightWrap);

    // ---- Body ----
    const body = document.createElement('div');
    body.className = 'expo-akk-body';

    // Vorgaben & Ausschlüsse (1-zeilig, autogrow)
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

    // --- EIN Feld, mit Toggle: Ansicht (rendered) / Bearbeiten (markdown) ---
    const editorWrap = document.createElement('div');
    editorWrap.className = 'form-group';

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';

    const mdLabel = document.createElement('label');
    mdLabel.setAttribute('for', `md-${idx}`);
    mdLabel.textContent = 'Text';

    const toggle = document.createElement('div');
    toggle.style.display = 'inline-flex';
    toggle.style.gap = '6px';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn-secondary';
    viewBtn.textContent = 'Ansicht';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn';
    editBtn.textContent = 'Bearbeiten';

    toggle.append(viewBtn, editBtn);
    row.append(mdLabel, toggle);

    // Markdown-Editor (nur bei "Bearbeiten")
    const mdEditor = document.createElement('textarea');
    mdEditor.id = `md-${idx}`;
    mdEditor.className = 'autogrow';
    mdEditor.rows = 14;
    mdEditor.style.width = '100%';
    mdEditor.placeholder = 'Der Text erscheint hier und kann bearbeitet werden …';
    mdEditor.value = state.textsMd[idx] || '';

    // Gerenderte Ansicht
    const viewBox = document.createElement('div');
    viewBox.className = 'preview-box';
    viewBox.innerHTML = renderMarkdownToHtml(mdEditor.value || '');

    const setMode = (mode)=>{ // 'view' | 'edit'
      if (mode === 'view'){
        viewBtn.className = 'btn btn-secondary';
        editBtn.className = 'btn';
        mdEditor.style.display = 'none';
        viewBox.style.display = 'block';
        viewBox.innerHTML = renderMarkdownToHtml(mdEditor.value || '');
      } else {
        viewBtn.className = 'btn';
        editBtn.className = 'btn btn-secondary';
        mdEditor.style.display = 'block';
        viewBox.style.display = 'none';
        autogrow(mdEditor);
      }
    };
    // Default: Ansicht
    setMode('view');

    mdEditor.addEventListener('input', ()=>{
      state.textsMd[idx] = mdEditor.value;
      try { localStorage.setItem('expoya_ce_state_v2', JSON.stringify(state)); } catch {}
      autogrow(mdEditor);
      badge.style.display = mdEditor.value.trim() ? 'inline-flex' : 'none';
    });

    viewBtn.onclick = ()=> setMode('view');
    editBtn.onclick = ()=> setMode('edit');

    editorWrap.append(row, mdEditor, viewBox);

    // Buttons im Body: Generieren + Abbrechen
    const btnRow = document.createElement('div');
    btnRow.className = 'actions';
    const gen = document.createElement('button');
    gen.className = 'btn btn-primary';
    gen.textContent = 'Text generieren';
    const cancel = document.createElement('button');
    cancel.className = 'btn btn-secondary';
    cancel.textContent = 'Abbrechen';
    cancel.style.display = 'none';
    btnRow.append(gen, cancel);

    // ---- Start-Logik inkl. Cancel ----
    let cancelRequested = false;

    const startGeneration = async () => {
      try{
        gen.disabled = true;
        gen.textContent = 'Generiere …';
        cancel.style.display = 'inline-block';
        quick.style.display = 'none';
        spinner.style.display = 'inline-block';
        badge.style.display = 'none';
        cancelRequested = false;

        readFormIntoState();
        
        const base = buildCommonPayload();
        const payload = {
          ...base,
          'Titel': state.titles[idx],
          'Vorgaben & Ausschlüsse': note.value || ''
        };

        const start = await startTextJob(payload);
        const jobId = start?.jobId || start?.id;
        if (!jobId) throw new Error('Kein jobId vom Text-Webhook erhalten.');

        const isDone   = (s) => ['done','success','completed','finished','ready'].includes(String(s||'').toLowerCase());
        const isFailed = (s) => ['failed','error'].includes(String(s||'').toLowerCase());

        let delay = 2500 + (idx % 5) * 200;
        const MAX = 20 * 60 * 1000;
        const started = Date.now();

        while (true) {
          if (cancelRequested) throw new Error('Abgebrochen.');
          if (Date.now() - started > MAX) throw new Error('Zeitüberschreitung beim Text-Polling.');

          const res = await pollTextJob(jobId);
          const status = String(res?.status || '').toLowerCase();

          // --- WICHTIG: Markdown robust extrahieren & säubern ---
          const md = extractMarkdownFromResponse(res);

          if (isDone(status) || md) {
            mdEditor.value = md || '';
            state.textsMd[idx] = md || '';
            try { localStorage.setItem('expoya_ce_state_v2', JSON.stringify(state)); } catch {}
            autogrow(mdEditor);
            viewBox.innerHTML = renderMarkdownToHtml(mdEditor.value || '');
            showToast(md ? 'Text fertig' : 'Job fertig, aber kein Text erkannt');
            badge.style.display = md && md.trim() ? 'inline-flex' : 'none';
            setMode('view'); // nach Generierung direkt Ansicht
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
        if (e?.message === 'Abgebrochen.') {
          showToast('Generierung abgebrochen');
        } else {
          console.error(e);
          showToast(e?.message || 'Fehler bei Text-Job');
        }
      } finally {
        gen.disabled = false;
        gen.textContent = 'Text generieren';
        spinner.style.display = 'none';
        cancel.style.display = 'none';
        if (!mdEditor.value.trim()) quick.style.display = 'inline-flex';
      }
    };

    quick.onclick = startGeneration;
    gen.onclick   = startGeneration;
    cancel.onclick = () => { cancelRequested = true; };

    // ---- Löschen eines Titels/Expos ----
    delBtn.onclick = ()=>{
      if (!confirm('Diesen Titel/Expo löschen?')) return;
      state.titles.splice(idx,1);
      state.textsMd.splice(idx,1);
      state.expoNotes.splice(idx,1);
      try { localStorage.setItem('expoya_ce_state_v2', JSON.stringify(state)); } catch {}
      renderExpoList();
    };

    // Body zusammenbauen
    body.append(noteWrap, btnRow, editorWrap);

    // Akkordeon Toggle (Pfeil dreht per CSS)
    expand.onclick = () => li.classList.toggle('open');

    li.append(header, body);
    ul.appendChild(li);
  });
}
