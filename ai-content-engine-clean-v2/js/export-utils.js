// js/export-utils.js
import { state } from './state.js';
export function initExportButtons(){
  const csvBtn = document.getElementById('exportCsvBtn');
  const xmlBtn = document.getElementById('exportXmlBtn');
  function toggle(){ const on = state.titles.length>0; if(csvBtn) csvBtn.style.display = on?'inline-flex':'none'; if(xmlBtn) xmlBtn.style.display = on?'inline-flex':'none'; }
  toggle();
  if (csvBtn) csvBtn.onclick = () => {
    const rows = state.titles.map((t,i)=>({index:i+1,title:t,html:state.texts[i]||''}));
    const header = 'index;title;html\n';
    const body = rows.map(r=>`${r.index};"${r.title.replaceAll('"','""')}";"${(r.html||'').replaceAll('"','""')}"`).join('\n');
    download('expos.csv', header+body, 'text/csv');
  };
  if (xmlBtn) xmlBtn.onclick = () => {
    const items = state.titles.map((t,i)=>`  <expo index="${i+1}">\n    <title>${escapeXml(t)}</title>\n    <html>${escapeXml(state.texts[i]||'')}</html>\n  </expo>`).join('\n');
    const xml = `<expos>\n${items}\n</expos>`;
    download('expos.xml', xml, 'application/xml');
  };
  function escapeXml(s){return (s||'').replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));}
  function download(name, content, type){
    const blob = new Blob([content], {type});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }
}
