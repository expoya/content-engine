/* -------------- Loader & Spinner ------------------ */
let placeholder, spinner;

/* Floskeln für updateLoader */
const floskeln = [
  "Die AI-Agents hüpfen im Quadrat, um geile Titel zu basteln…",
  "Die KI brainstormt gerade die wildesten Expo-Ideen.",
  "Gleich kommen die besten Titel aus dem neuronalen Backofen!",
  "Die AI-Agents optimieren noch für Google – bitte einen kurzen Espresso trinken!",
  "Noch ein Moment: Kreativität braucht manchmal eine kurze Denkpause.",
  "Expoya-Titelschmiede läuft auf Hochtouren!",
  "Die Agents würfeln noch ein paar Wörter zusammen…",
  "Die neuronale Kaffeemaschine läuft heiß – Titel kommen sofort!",
  "Bitte kurz chillen – die KI sortiert noch ihre besten Geistesblitze.",
  "Die Synapsen glühen – gleich funkt’s im Titelgenerator.",
  "Noch 3 kreative Purzelbäume, dann sind die Titel da.",
  "Die AI-Agents brainstormen sich gerade selbst in Ekstase.",
  "Noch ein letzter Schwung mit dem Titel-Zauberstab…"
];

/* ----------- Loader API (wird von ui-form.js aufgerufen) ------------ */
export function showLoader(text = "🚀 Generierung läuft …") {
  const list = document.getElementById("expoList");

  /* Platzhalter */
  placeholder = document.createElement("li");
  placeholder.className = "expo-placeholder";
  list.innerHTML = "";
  list.appendChild(placeholder);

  /* Spinner + Text */
  spinner = document.createElement("div");
  spinner.className = "loader-spinner";

  const wrap = document.createElement("div");
  wrap.className = "loader-wrap";
  wrap.appendChild(spinner);

  const txt = document.createElement("span");
  txt.innerHTML = text;
  wrap.appendChild(txt);

  placeholder.appendChild(wrap);
}

export function updateLoader(tick) {
  if (!placeholder) return;
  const sec = tick * 10;
  const fl  = floskeln[tick % floskeln.length];
  placeholder.querySelector("span").innerHTML =
    `🚀 Generierung läuft … (${sec}s)<br>` +
    `<span style="font-size:0.9em;color:#98a4c2;">${fl}</span>`;
}

export function hideLoader() {
  if (spinner) spinner.remove();
  placeholder = null;
}
/* ---------- kleines Toast-Popup ---------- */
export function showToast(message){
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 4000);  // 4 s später wieder weg
}
