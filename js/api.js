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
  const url = `${TITLE_POLL_URL}${encodeURIComponent(jobId)}`;

  try {
    // GET: KEINE HEADERS setzen -> keine Preflight
    return await fetchJSON(url, { method: "GET" });
  } catch (e) {
    // Falls dein Poll-Webhook POST erwartet (oder GET 404/405 liefert), probieren wir POST.
    if (e.status === 404 || e.status === 405) {
      return await fetchJSON(TITLE_POLL_URL.replace(/\?.*$/, ""), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
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
