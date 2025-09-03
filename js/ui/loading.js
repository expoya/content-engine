// js/ui/loading.js
export function startLoading(preview, lines) {
  if (!preview) return;

  preview.innerHTML = `
    <div class="text-loading">
      <div class="loader"></div>
      <div>
        <div><strong>Text wird generiert …</strong></div>
        <div class="loading-sub">Dieser Vorgang dauert, je nach gewählten Experten, 4–8 Minuten.</div>
        <div class="loading-fun"></div>
      </div>
    </div>
  `;

  const funEl = preview.querySelector('.loading-fun');
  let i = 0;

  funEl.textContent = lines[i % lines.length];

  // Wechsel alle 5s, mit kurzem Fade
  const intId = setInterval(() => {
    funEl.classList.add('fade-out');
    setTimeout(() => {
      i++;
      funEl.textContent = lines[i % lines.length];
      funEl.classList.remove('fade-out');
    }, 300);
  }, 5000);

  preview.dataset.loadingTimer = String(intId);
}

export function stopLoading(preview) {
  if (!preview) return;
  const id = Number(preview.dataset.loadingTimer || 0);
  if (id) clearInterval(id);
  delete preview.dataset.loadingTimer;
}
