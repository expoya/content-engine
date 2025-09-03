import { state } from "./state.js";

/*
 * -----------------------------
 *  Endpoints
 * -----------------------------
 * Derzeit brauchen wir nur den Webhook, der einen Titel‑Job startet
 * und den Poll‑Endpoint, um dessen Fortschritt abzurufen.
 *
 * Der Text‑Endpoint bleibt schon vorbereitet, kommt aber erst zum
 * Einsatz, wenn später die Text‑Generierung integriert wird.
 */
const TITLE_START_URL = "https://expoya.app.n8n.cloud/webhook/start-job";
const TITLE_POLL_URL  = "https://expoya.app.n8n.cloud/webhook/get-job?jobId=";
const TEXT_WEBHOOK_URL = "https://expoya.app.n8n.cloud/webhook/Text-Job-Starter"; 
const TEXT_POLL_URL   = "https://expoya.app.n8n.cloud/webhook/text-get-job?jobId=";


/*
 * --------------------------------------
 *  Hilfsfunktion: robuste JSON‑Antworten
 * --------------------------------------
 * Wirft eine aussagekräftige Fehlermeldung, falls der Server keine
 * gültige JSON‑Antwort liefert.
 */
// Robust: kommt auch mit leerem Body / falschem Header klar
async function safeJson(res) {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const bodyText = await res.text(); // Body EINMAL lesen

  // Debug-Log (optional; bei Bedarf später wieder entfernen)
  console.debug('[safeJson]', res.status, ct, bodyText?.slice(0,200));

  if (ct.includes('application/json')) {
    if (!bodyText || bodyText.trim() === '') return {};  // leeres JSON zulassen
    try {
      return JSON.parse(bodyText);
    } catch (e) {
      throw new Error(`Ungültiges JSON (${res.status}): ${bodyText.slice(0,200)}`);
    }
  }

  // Kein JSON – Klartext-Fehler mit Body-Auszug
  throw new Error(`Unerwartete API-Antwort (${res.status} ${res.statusText}): ${bodyText.slice(0,200)}`);
}


/*
 * -------------------------------------------------
 *  1) Titel‑Job anstoßen
 * -------------------------------------------------
 * Erwartet lediglich das Objekt mit den Unternehmens‑/Formular­daten.
 * Die aktuell gewählten LLM‑Modelle hängen wir hier zentral an, damit
 * sich der UI‑Code nicht darum kümmern muss und wir die Struktur der
 * Payload nur an einer Stelle pflegen.
 */
export async function startTitleJob (companyData) {
  const finalPayload = {
    ...companyData,              // alle Felder aus dem Formular
    agentModels: state.agentModels,
    titleModel : state.agentModels.titleGenerator // optionales Extra‑Feld
  };

  const res = await fetch(TITLE_START_URL, {
    method  : "POST",
    headers : { "Content-Type": "application/json" },
    body    : JSON.stringify(finalPayload)
  });

  return safeJson(res); // { jobId: "…" }
}

/*
 * -------------------------------------------------
 *  2) Titel‑Job pollen
 * -------------------------------------------------
 * Gibt { status: "running" | "finished" | "error", result? } zurück.
 */
export async function pollTitleJob (jobId) {
  const res = await fetch(TITLE_POLL_URL + encodeURIComponent(jobId));
  return safeJson(res);
}

/*
 * -------------------------------------------------
 *  3) Text‑Job (für später)
 * -------------------------------------------------
 * Wird im aktuellen Flow noch nicht verwendet, bleibt aber als Vorlage
 * erhalten.
 */
export async function generateText (payload) {
  const completePayload = {
    ...payload,
    agentModels: state.agentModels,
    titleModel : state.agentModels.titleGenerator
  };

  const res = await fetch(TEXT_WEBHOOK_URL, {
    method  : "POST",
    headers : { "Content-Type": "application/json" },
    body    : JSON.stringify(completePayload),
    signal
  });

  return safeJson(res); // { html }
}
// ---------- Text-Job: Start + Poll (analog Titel) ----------

export async function startTextJob(payload = {}, { signal } = {}) {
  // Modelle zentral anhängen – genauso wie beim Titel-Job
  const completePayload = {
    ...payload,
    agentModels: state.agentModels,
    // wenn du ein eigenes Text-Modell im State hast, hier tauschen:
    textModel  : state.agentModels.seoVeredler
  };

  const res = await fetch(TEXT_WEBHOOK_URL, {
    method  : "POST",
    headers : { "Content-Type": "application/json" },
    body    : JSON.stringify(completePayload),
    signal
  });
  // Erwartet: { jobId: "..." }
  console.debug('[Text-Start RAW]', res.status, res.headers.get('content-type'));
  return safeJson(res);
}

export async function pollTextJob(jobId, { signal } = {}) {
  // Cache-Buster gegen CDN/Proxy/Browser-Caching
  const url = `${TEXT_POLL_URL}${encodeURIComponent(jobId)}&_=${Date.now()}`;

  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache'
    },
    signal
  });

  return safeJson(res); // erwartet Array[0] mit Status/Text in deinem Flow
}
