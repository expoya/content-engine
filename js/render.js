// 1) Webhook-Text normalisieren ("/n", "\\n", CRLF etc.)
export function normalizeLLMText(raw) {
  if (!raw) return '';
  let s = String(raw);

  // JSON-escaped "\n\n" -> echte Zeilenumbrüche
  s = s.replace(/\\n/g, '\n');

  // Manche Quellen schicken "/n" statt "\n"
  s = s.replace(/\/n/g, '\n');

  // Windows-Zeilenenden raus
  s = s.replace(/\r/g, '');

  // 3+ Umbrüche auf 2 kürzen
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}

// 2) Markdown -> sicheres HTML
export function renderMarkdownToHtml(raw) {
  const normalized = normalizeLLMText(raw);
  const html = marked.parse(normalized, { gfm: true, breaks: true });
  return DOMPurify.sanitize(html);
}
