// js/render.js
export function renderMarkdownToHtml(md){
  const raw = marked.parse(md || '');
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true }});
}
