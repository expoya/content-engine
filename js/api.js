// js/api.js
// Configure your existing n8n endpoints here or via window.__N8N__
const CFG = window.__N8N__ || {};
const TITLE_START_URL = CFG.TITLE_START_URL || "https://YOUR_N8N/start-titles";
const TITLE_POLL_URL  = CFG.TITLE_POLL_URL  || "https://YOUR_N8N/poll-titles";
const TEXT_START_URL  = CFG.TEXT_START_URL  || "https://YOUR_N8N/start-text";
const TEXT_POLL_URL   = CFG.TEXT_POLL_URL   || "https://YOUR_N8N/poll-text";
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
