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
  const url = `${TITLE_POLL_URL}${encodeURIComponent(jobId)}&ts=${Date.now()}`;

  // Utility: verschachtelte Werte holen (inkl. Array-Index 0)
  const pick = (obj, ...paths) => {
    for (const p of paths) {
      const segs = p.split('.');
      let cur = obj, ok = true;
      for (const s of segs) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, s)) cur = cur[s];
        else { ok = false; break; }
      }
      if (ok) return cur;
    }
    return undefined;
  };

  // Antwort -> { status, titles[], raw }
  const normalize = async (res) => {
    if (res.status === 204) return { status: 'running', titles: [], raw: null };
    if (!res.ok) {
      const text = await res.text().catch(()=> '');
      const err = new Error(`HTTP ${res.status} ${res.statusText} @ ${res.url}\n${text}`);
      err.status = res.status; throw err;
    }

    const ct = res.headers.get('content-type') || '';
    let data = null;
    if (ct.includes('application/json')) {
      data = await res.json().catch(()=>null);
    } else {
      const text = await res.text().catch(()=> '');
      try { data = JSON.parse(text); } catch { data = text || null; }
    }

    // Falls Top-Level ein Array ist, arbeite mit dem ersten Element weiter
    const root = Array.isArray(data) ? (data[0] ?? {}) : data;

    // Status aus mehreren möglichen Stellen
    const status = String(
      pick(root,'status','data.status','result.status','payload.status') ||
      (Array.isArray(data) ? pick(data,'0.status') : '') ||
      'running'
    ).toLowerCase();

    // Titel-Quelle suchen: result/titles in diversen Containern, inkl. Array[0]
    let source =
      pick(root,'titles','result','data.titles','data.result','payload.titles','payload.result','output.titles','output.result') ??
      (Array.isArray(data) ? (pick(data,'0.titles') ?? pick(data,'0.result')) : undefined);

    // In Strings könnte nochmal JSON stecken
    const parseMaybe = (v) => {
      if (typeof v === 'string') {
        const t = v.trim();
        if (!t) return [];
        try {
          const j = JSON.parse(t); // JSON-Array/-Objekt?
          return parseMaybe(j);
        } catch {
          // Fallback: per Zeile/Separator trennen
          return t.split(/\r?\n|;|,/).map(s=>s.trim()).filter(Boolean);
        }
      }
      if (Array.isArray(v)) {
        // Array aus Strings oder Objekten {title|name|text|headline|label}
        if (v.every(x => typeof x === 'string')) return v;
        if (v.every(x => x && typeof x === 'object')) {
          const keys = ['title','name','text','headline','label'];
          return v.map(o => keys.map(k => o[k]).find(s => typeof s === 'string'))
                  .filter(Boolean);
        }
      }
      if (v && typeof v === 'object') {
        // Manche Nodes legen "items" o.ä. an
        return parseMaybe(v.items || v.data || v.result || v.output || v.body || v.response);
      }
      return [];
    };

    const titles = parseMaybe(source);

    return { status: status || 'running', titles, raw: data };
  };

  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    return await normalize(res);
  } catch (e) {
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
