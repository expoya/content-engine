// js/ui/renderExpoList.js
import { state } from '../state.js';
import { startTextJob, pollTextJob } from '../api.js';
import { renderMarkdownToHtml } from '../render.js';
import { ladeFloskelnTexte } from './constants.js';
import { startLoading, stopLoading } from './loading.js';
import { ensureEditButton } from './edit.js';
import { notify } from './notifier.js';

if (!window.textJobs) window.textJobs = {}; // {[idx]: {running:boolean, abort?:AbortController}}

/** CSS-freier Klickeffekt */
function clickFlash(btn) {
  if (!btn) return;
  const prev = btn.style.transform;
  const prevSh = btn.style.boxShadow;
  btn.style.transform = 'scale(0.98)';
  btn.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.08) inset';
  setTimeout(() => {
    btn.style.transform = prev || '';
    btn.style.boxShadow = prevSh || '';
  }, 130);
}

/** Copy-Helper (mit Fallback) */
async function copyToClipboard(str) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(str);
    } else {
      // Fallback (HTTP / unsichere Kontexte)
      const ta = document.createElement('textarea');
      ta.value = str;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    notify('Kopiert', 'In die Zwischenablage übernommen.');
  } catch (e) {
    console.error('Clipboard', e);
    alert('Kopieren fehlgeschlagen. Bitte manuell kopieren.');
  }
}

/** extrahiert reinen Text aus HTML */
function htmlToPlain(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || tmp.innerText || '';
}

export function renderExpoList () {
  const list = document.getElementById('expoList');
  if (!list) {
    console.warn('[renderExpoList] #expoList nicht gefunden.');
    return;
  }

  list.innerHTML = '';

  (state.titles || []).forEach((titel, idx) => {
    const li = document.createElement('li');
    li.className = 'expo-akkordeon';
    li.innerHTML = `
      <div class="expo-akk-header" data-idx="${idx}">
        <span class="expo-akk-index">${idx + 1}.</span>
        <span class="expo-akk-titel"><span class="expo-titel-text"></span></span>
        <button class="btn-icon btn-copy-title" data-idx="${idx}" title="Titel kopieren">📋</button>
        <button class="btn-icon btn-edit-title" data-idx="${idx}" title="Bearbeiten">✏️</button>
        <button class="btn-icon btn-delete"      data-idx="${idx}" title="Entfernen">🗑️</button>
        <button class="btn-expand"               data-idx="${idx}" title="Details">▼</button>
      </div>
      <div class="expo-akk-body">
        <div class="generate-row">
          <textarea class="prompt-input" placeholder="Hinweise, Varianten, Tonalität … (optional)" rows="2"></textarea>
          <button class="generate-text-btn" data-idx="${idx}">Text generieren</button>
          <button class="cancel-text-btn"   data-idx="${idx}" style="display:none">Abbrechen</button>
          <div class="copy-row" style="display:none;gap:.5rem;">
            <button class="btn-copy-html"  data-idx="${idx}" title="HTML kopieren">HTML kopieren</button>
            <button class="btn-copy-plain" data-idx="${idx}" title="Plaintext kopieren">Text kopieren</button>
          </div>
        </div>
        <div class="expo-html" id="expo-html-${idx}">${state.texts?.[idx] || ''}</div>
      </div>
    `;

    // Titeltext setzen
    li.querySelector('.expo-titel-text').textContent = titel;

    // Copy Titel
    li.querySelector('.btn-copy-title').addEventListener('click', () => {
      clickFlash(li.querySelector('.btn-copy-title'));
      copyToClipboard(state.titles[idx] || '');
    });

    // Edit-Button (Titel bearbeiten)
    ensureEditButton(li.querySelector('.btn-edit-title'), idx, (newTitle) => {
      state.titles[idx] = newTitle;
      renderExpoList();
    });

    // Entfernen
    li.querySelector('.btn-delete').addEventListener('click', () => {
      if (window.textJobs[idx]?.running) return; // nicht während Job löschen
      state.titles.splice(idx, 1);
      state.texts.splice(idx, 1);
      renderExpoList();
    });

    // Akkordeon
    li.querySelector('.btn-expand').addEventListener('click', () => {
      li.classList.toggle('open');
    });

    // Generate
    const genBtn = li.querySelector('.generate-text-btn');
    const cancelBtn = li.querySelector('.cancel-text-btn');
    const promptEl = li.querySelector('.prompt-input');
    const htmlContainer = li.querySelector(`#expo-html-${idx}`);
    const copyRow = li.querySelector('.copy-row');

    // Falls bereits Text vorhanden ist, Copy-Buttons zeigen
    if (state.texts?.[idx]) copyRow.style.display = 'flex';

    genBtn.addEventListener('click', async () => {
      if (window.textJobs[idx]?.running) return;
      clickFlash(genBtn);

      const userHint = promptEl.value.trim();

      htmlContainer.innerHTML = '';
      const abort = new AbortController();
      window.textJobs[idx] = { running: true, abort };

      genBtn.disabled = true;
      genBtn.textContent = 'Läuft…';
      cancelBtn.style.display = 'inline-block';
      cancelBtn.disabled = false;

      const floskel = ladeFloskelnTexte[Math.floor(Math.random()*ladeFloskelnTexte.length)] || 'Die Agents legen los …';
      startLoading(htmlContainer, floskel);

      try {
        // Start
        const payload = {
          titel: state.titles[idx],
          hint : userHint,
          companyData: state.companyData,
          agentModels: state.agentModels
        };
        const res = await startTextJob(payload, { signal: abort.signal });
        const jobId = res?.jobId || res?.id;
        if (!jobId) throw new Error('Kein text jobId erhalten.');

        // Poll
        const MAX_MS = 10 * 60 * 1000;
        const start = Date.now();
        let delay   = 2000;
        const MAX_DELAY = 12000;

        while (true) {
          if (Date.now() - start > MAX_MS) throw new Error('Timeout beim Text-Polling.');
          const poll = await pollTextJob(jobId, { signal: abort.signal });
          const status = (poll && (poll.status || poll[0]?.status)) || 'running';
          const html   = (poll && (poll.html   || poll[0]?.html))   || null;
          const md     = (poll && (poll.markdown || poll[0]?.markdown)) || null;
          const msg    = (poll && (poll.message  || poll[0]?.message))  || '';

          if (status === 'failed') throw new Error(msg || 'Text-Job fehlgeschlagen.');

          if (html || md) {
            const htmlOut = html ? String(html) : renderMarkdownToHtml(md);
            state.texts[idx] = htmlOut;
            htmlContainer.innerHTML = htmlOut;
            copyRow.style.display = 'flex'; // Copy-Buttons zeigen
            notify('Text fertig', `„${state.titles[idx]}“ wurde erstellt.`);
            break;
          }

          await new Promise(r => setTimeout(r, delay));
          delay = Math.min(MAX_DELAY, Math.round(delay * 1.5));
        }
      } catch (err) {
        if (err?.name === 'AbortError') {
          // Nutzer hat abgebrochen – UI-Reset unten
        } else {
          console.error('[Text-Generation]', err);
          htmlContainer.innerHTML = `<div class="error">⚠️ ${(err?.message || String(err))}</div>`;
        }
      } finally {
        stopLoading(htmlContainer);
        genBtn.disabled = false;
        genBtn.textContent = 'Text generieren';
        cancelBtn.style.display = 'none';
        window.textJobs[idx] = { running: false };
      }
    });

    // Cancel
    cancelBtn.addEventListener('click', () => {
      clickFlash(cancelBtn);
      const job = window.textJobs[idx];
      if (job?.running && job.abort) {
        try { job.abort.abort(); } catch {}
      }
      cancelBtn.disabled = true;
      cancelBtn.textContent = 'Abgebrochen';
    });

    // Copy HTML
    li.querySelector('.btn-copy-html').addEventListener('click', () => {
      clickFlash(li.querySelector('.btn-copy-html'));
      const html = state.texts?.[idx] || '';
      copyToClipboard(html);
    });

    // Copy Plain
    li.querySelector('.btn-copy-plain').addEventListener('click', () => {
      clickFlash(li.querySelector('.btn-copy-plain'));
      const html = state.texts?.[idx] || '';
      copyToClipboard(htmlToPlain(html));
    });

    list.appendChild(li);
  });
}
