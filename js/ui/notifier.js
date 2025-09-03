// js/ui/notifier.js
let primed=false, audio=null;
export function primeAudioOnUserGesture(){
  if (primed) return;
  const prepare=()=>{
    primed=true;
    audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAaW50ZXJuYWw='); // tiny noop
    window.removeEventListener('pointerdown',prepare);
    window.removeEventListener('keydown',prepare);
  };
  window.addEventListener('pointerdown',prepare);
  window.addEventListener('keydown',prepare);
}
export function notify(title, body){
  try{ if(audio){ audio.currentTime=0; audio.play().catch(()=>{}); } }catch{}
  try{ if('Notification' in window){ if(Notification.permission==='granted') new Notification(title||'Fertig',{body:body||''}); else if(Notification.permission!=='denied') Notification.requestPermission(); } }catch{}
}
