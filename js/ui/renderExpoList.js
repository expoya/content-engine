// js/ui/renderExpoList.js
import { state } from '../state.js';
import { startTextJob, pollTextJob } from '../api.js';
import { renderMarkdownToHtml } from '../render.js';
import { showToast } from '../ui-loader.js';

export function renderExpoList(){
  const ul = document.getElementById('expoList');
  if (!ul) return;
  ul.innerHTML = '';
  if (!Array.isArray(state.titles) || state.titles.length===0){
    const li = document.createElement('li'); li.className='expo-placeholder'; li.textContent='Hier erscheinen deine generierten Expo-Titel …'; ul.appendChild(li); return;
  }
  state.titles.forEach((title, idx)=>{
    const li = document.createElement('li'); li.className='expo-akkordeon';
    const header = document.createElement('div'); header.className='expo-akk-header';
    const index = document.createElement('div'); index.className='expo-akk-index'; index.textContent=String(idx+1).padStart(2,'0');
    const t = document.createElement('div'); t.className='expo-akk-titel'; t.textContent=title;
    const expand = document.createElement('button'); expand.className='btn-icon btn-expand'; expand.textContent='▼';
    header.append(index,t,expand);
    const body = document.createElement('div'); body.className='expo-akk-body';
    const prompt = document.createElement('textarea'); prompt.placeholder='Optional: Zusatzhinweise (Markdown)'; prompt.rows=3; prompt.style.width='100%';
    const gen = document.createElement('button'); gen.className='btn btn-primary'; gen.textContent='Text generieren';
    const prev = document.createElement('div'); prev.className='preview-box'; prev.innerHTML = state.texts[idx] || '';
    gen.onclick = async ()=>{
      try{
        gen.disabled=true; gen.textContent='Generiere …';
        const start = await startTextJob({ index: idx, title, prompt: prompt.value, companyData: state.companyData });
        const jobId = start?.jobId || start?.id;
        if(!jobId) throw new Error('Kein jobId vom Text-Webhook.');
        let tries=0;
        while(true){
          const res = await pollTextJob(jobId);
          const status = res?.status || res?.[0]?.status || 'running';
          const md = res?.markdown || res?.[0]?.markdown || '';
          if (status==='done' || md){
            const html = renderMarkdownToHtml(md);
            state.texts[idx] = html;
            prev.innerHTML = html;
            showToast('Text fertig');
            break;
          }
          if (status==='failed') throw new Error(res?.message || 'Text fehlgeschlagen.');
          if (tries++ > 180) throw new Error('Text-Polling Timeout.');
          await new Promise(r=>setTimeout(r,3000));
        }
      }catch(e){ console.error(e); showToast(e.message||'Fehler bei Text-Job'); }
      finally{ gen.disabled=false; gen.textContent='Text generieren'; }
    };
    body.append(prompt, gen, prev);
    li.append(header, body);
    expand.onclick = ()=> li.classList.toggle('open');
    ul.appendChild(li);
  });
}
