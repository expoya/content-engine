// js/ui/edit.js
import { state } from '../state.js';
import { renderMarkdownToHtml } from '../render.js';

export function startEditMode(preview, idx) {
  // aktueller HTML-Stand (aus State oder DOM)
  const currentHtml = (state.texts && state.texts[idx]) || preview.innerHTML || '';

  // HTML -> Markdown (Format so gut wie möglich beibehalten)
  let markdown = '';
  try {
    markdown = window.turndownService ? window.turndownService.turndown(currentHtml) : currentHtml;
  } catch {
    markdown = currentHtml;
  }

  // existierenden Edit-Button verstecken (falls vorhanden)
  const container = preview.parentNode;
  const editBtn   = container.querySelector(`.edit-btn[data-idx="${idx}"]`);
  if (editBtn) editBtn.style.display = 'none';

  // Vorschau ausblenden
  preview.style.display = 'none';

  // Textarea einfügen
  const textarea = document.createElement('textarea');
  textarea.className = 'text-editarea';
  textarea.value = markdown;
  textarea.rows = Math.max(12, markdown.split('\n').length + 2);
  container.insertBefore(textarea, preview.nextSibling);

  // Aktionsleiste einfügen (Speichern/Abbrechen)
  const actions = document.createElement('div');
  actions.className = 'edit-actions';
  actions.style.display = 'flex';
  actions.style.gap = '8px';
  actions.style.marginTop = '8px';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Speichern';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Abbrechen';

  actions.append(saveBtn, cancelBtn);
  textarea.after(actions);

  // Helper: aufräumen
  function cleanup() {
    textarea.remove();
    actions.remove();
    preview.style.display = '';
    if (editBtn) editBtn.style.display = '';
  }

  // Speichern → Markdown -> HTML, State + Preview aktualisieren
  async function commit() {
    const md = textarea.value || '';
    const html = renderMarkdownToHtml(md);
    // im State persistieren
    if (!state.texts) state.texts = [];
    state.texts[idx] = html;
    // Vorschau aktualisieren
    preview.innerHTML = html || '<em>(leer)</em>';
    cleanup();
  }

  // Events
  saveBtn.addEventListener('click', commit);
  cancelBtn.addEventListener('click', cleanup);

  // Shortcuts: Ctrl/Cmd+Enter = speichern, Esc = abbrechen
  textarea.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
      ev.preventDefault();
      commit();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      cleanup();
    }
  });

  // Cursor rein
  textarea.focus();
  // Cursor ans Ende
  textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
}

export function ensureEditButton(preview, idx) {
  if (!preview) return;
  const container = preview.parentNode;
  if (container.querySelector(`.edit-btn[data-idx="${idx}"]`)) return;

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.textContent = 'Bearbeiten';
  editBtn.className = 'btn btn-ghost edit-btn';
  editBtn.dataset.idx = idx;

  container.insertBefore(editBtn, preview.nextSibling);
  editBtn.addEventListener('click', () => startEditMode(preview, idx));
}
