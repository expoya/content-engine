// js/api.js
// Configure your existing n8n endpoints here or via window.__N8N__
const CFG = window.__N8N__ || {};
const TITLE_START_URL = "https://expoya.app.n8n.cloud/webhook/start-job";
const TITLE_POLL_URL  = "https://expoya.app.n8n.cloud/webhook/get-job?jobId=";
const TEXT_WEBHOOK_URL = "https://expoya.app.n8n.cloud/webhook/Text-Job-Starter"; 
const TEXT_POLL_URL   = "https://expoya.app.n8n.cloud/webhook/text-get-job?jobId=";
const API_KEY         = CFG.API_KEY || "";

async function post(url, body){
  const res = await fetch(url, {
    method:'POST',
    headers:{
      'content-type':'application/json',
      ...(API_KEY ? {'x-api-key': API_KEY} : {})
    },
    body: JSON.stringify(body || {})
  });
  if (!res.ok) {
    const t = await res.text().catch(()=>'');
    throw new Error(`HTTP ${res.status} – ${t}`);
  }
  return res.json();
}
export async function startTitleJob(payload){
  return post(TITLE_START_URL, payload);
}
export async function pollTitleJob(jobId){
  return post(TITLE_POLL_URL, { jobId });
}
export async function startTextJob(payload){
  return post(TEXT_START_URL, payload);
}
export async function pollTextJob(jobId){
  return post(TEXT_POLL_URL, { jobId });
}
