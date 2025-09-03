// js/ui-loader.js
let toastEl=null, loaderEl=null;
export function showToast(msg){
  if (toastEl) toastEl.remove();
  toastEl = document.createElement('div');
  toastEl.className='toast';
  toastEl.textContent = msg || '';
  document.body.appendChild(toastEl);
  setTimeout(()=>toastEl && toastEl.remove(), 2800);
}
export function showLoader(msg){
  if (!loaderEl){
    loaderEl = document.createElement('div');
    loaderEl.style.position='fixed'; loaderEl.style.inset='0'; loaderEl.style.background='rgba(255,255,255,.6)'; loaderEl.style.backdropFilter='blur(2px)';
    loaderEl.style.display='flex'; loaderEl.style.alignItems='center'; loaderEl.style.justifyContent='center';
    const box = document.createElement('div'); box.className='preview-box'; box.textContent = msg || 'Lädt …'; box.style.minWidth='260px'; box.style.textAlign='center';
    loaderEl.appendChild(box);
    document.body.appendChild(loaderEl);
  } else loaderEl.firstChild.textContent = msg || 'Lädt …';
}
export function updateLoader(msg){ if(loaderEl) loaderEl.firstChild.textContent = msg || 'Lädt …'; }
export function hideLoader(){ if(loaderEl){ loaderEl.remove(); loaderEl=null; } }
