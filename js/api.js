// js/api.js
// Deine fixen Endpoints (aus dem alten Frontend)
const TITLE_START_URL = "https://expoya.app.n8n.cloud/webhook/start-job";
const TITLE_POLL_URL  = "https://expoya.app.n8n.cloud/webhook/get-job?jobId=";
const TEXT_WEBHOOK_URL = "https://expoya.app.n8n.cloud/webhook/Text-Job-Starter";
const TEXT_POLL_URL   = "https://expoya.app.n8n.cloud/webhook/text-get-job?jobId=";

// --- Helpers ---
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} ${res.statusText} @ ${url}\n${text}`);
    err.status = res.status;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

// --- Public API used by ui-form.js ---
export async function startTitleJob(payload) {
  // POST: nur Content-Type -> kein Preflight-Drama
  return await fetchJSON(TITLE_START_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function pollTitleJob(jobId) {
  // Cache-Busting gegen CDN/Proxy
  const url = `${TITLE_POLL_URL}${encodeURIComponent(jobId)}&ts=${Date.now()}`;

  // Helper: Antwort in { status, titles, raw } normalisieren
  const normalize = async (res) => {
    if (res.status === 204) return { status: 'running', titles: [], raw: null };
    const ct = res.headers.get('content-type') || '';
    if (!res.ok) {
      const text = await res.text().catch(()=> '');
      const err  = new Error(`HTTP ${res.status} ${res.statusText} @ ${res.url}\n${text}`);
      err.status = res.status;
      throw err;
    }
    let data;
    if (ct.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      try { data = JSON.parse(text); } catch { data = null; }
    }
    if (!data) return { status: 'running', titles: [], raw: null };

    // Mögliche Felder extrahieren
    const pick = (...paths) => {
      for (const p of paths) {
        const segs = p.split('.');
        let cur = data;
        let ok = true;
        for (const s of segs) {
          if (cur && Object.prototype.hasOwnProperty.call(cur, s)) cur = cur[s];
          else { ok = false; break; }
        }
        if (ok) return cur;
      }
      return undefined;
    };

    const status =
      (pick('status') || pick('data.status') || pick('result.status') || '').toString().toLowerCase() || 'running';

    const titles =
      pick('titles') || pick('data.titles') || pick('result.titles') || pick('0.titles') || [];

    return { status, titles: Array.isArray(titles) ? titles : [], raw: data };
  };

  try {
    // GET ohne Header → keine Preflight, kein Credentials
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    return await normalize(res);
  } catch (e) {
    // Fallback: Manche Workflows erwarten POST fürs Polling
    if (e.status === 404 || e.status === 405) {
      const postUrl = TITLE_POLL_URL.replace(/\?.*$/, '');
      const res = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      return await normalize(res);
    }
    throw e;
  }
}


// (optional – falls du den Text-Flow nutzt)
export async function startTextJob(payload) {
  return await fetchJSON(TEXT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function pollTextJob(jobId) {
  const url = `${TEXT_POLL_URL}${encodeURIComponent(jobId)}`;
  try {
    return await fetchJSON(url, { method: "GET" });
  } catch (e) {
    if (e.status === 404 || e.status === 405) {
      return await fetchJSON(TEXT_POLL_URL.replace(/\?.*$/, ""), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
    }
    throw e;
  }
}
