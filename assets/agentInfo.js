/* ---------- Agent-Erklärungen ---------- */
export const agentInfo = {
  titleGenerator: `
  <p><b>Aufgabe:</b> Dieser Agent ist darauf spezialisiert, in kurzer Zeit eine große Menge an kreativen und vielfältigen Überschriften, Titeln oder Social-Media-Headlines zu generieren. Das Hauptziel ist die schnelle Produktion von vielen Optionen für A/B-Tests oder zur breiten Ideensammlung.</p>
    <p><b>Ideale Modelleigenschaften:</b></p>
    <ul>
        <li><b>Geschwindigkeit und geringe Latenz:</b> Dies ist der kritischste Faktor. Das Modell muss Ergebnisse mit hohem Durchsatz und minimaler Verzögerung liefern, um einen iterativen und effizienten Workflow zu ermöglichen.</li>
        <li><b>Kosteneffizienz:</b> Da dieser Agent potenziell Tausende von Titeln generiert, sind niedrige Kosten pro Token entscheidend, um den Prozess wirtschaftlich zu halten.</li>
        <li><b>Kreativität und Vielfalt:</b> Das Modell sollte in der Lage sein, eine breite Palette an stilistisch unterschiedlichen und ansprechenden Titeln zu erstellen. Tiefe logische Fähigkeiten sind hier weniger wichtig als sprachliche Gewandtheit.</li>
        <li><b>Gute Anweisungsbefolgung:</b> Es muss grundlegende Vorgaben wie Zeichenbegrenzungen, die Integration von Keywords oder die Einhaltung eines bestimmten Tons zuverlässig umsetzen können.</li>
    </ul>
    `,

  titleController: `
  <p><b>Aufgabe:</b> Dieser Agent fungiert als Kontroll- und Qualitätssicherungsinstanz. Er überprüft die vom "Title Generator" erstellten Titel anhand eines vordefinierten Regelwerks (z. B. SEO-Kriterien, Markenrichtlinien, Tonalität) und filtert ungeeignete Vorschläge heraus oder passt sie minimal an.</p>
    <p><b>Ideale Modelleigenschaften:</b></p>
    <ul>
        <li><b>Exzellente Anweisungsbefolgung:</b> Die Fähigkeit, komplexe und strikte Regeln präzise zu befolgen, ist hier von größter Bedeutung.</li>
        <li><b>Zuverlässigkeit und Konsistenz:</b> Das Modell muss seine Bewertungs- und Filteraufgaben über eine große Anzahl von Titeln hinweg konsistent und ohne Abweichungen ausführen.</li>
        <li><b>Pragmatismus:</b> Der Agent sollte die Aufgabe ohne "Over-Engineering" oder übermäßige Interpretation erledigen.</li>
        <li><b>Geschwindigkeit:</b> Eine hohe Verarbeitungsgeschwindigkeit ist wichtig, um den Output des Generators effizient zu bewältigen.</li>
    </ul>
  `,

  seoStrategist  : /* html */ `
    p><b>Aufgabe:</b> Dies ist ein hochrangiger Analyse-Agent, der umfassende Daten wie Keyword-Recherchen, Wettbewerbsanalysen und SERP-Daten auswertet, um eine fundierte SEO-Strategie zu entwickeln. Er identifiziert Content-Lücken, schlägt Themencluster vor und entwirft einen strategischen Content-Plan.</p>
    <p><b>Ideale Modelleigenschaften:</b></p>
    <ul>
        <li><b>Starke analytische und logische Fähigkeiten:</b> Das Modell muss in der Lage sein, große Datenmengen zu synthetisieren, Muster zu erkennen und strategische Schlussfolgerungen zu ziehen.</li>
        <li><b>Großes Kontextfenster:</b> Um umfangreiche Datensätze wie lange Keyword-Listen oder komplette Website-Analysen zu verarbeiten, ist ein großes Kontextfenster unerlässlich.</li>
        <li><b>Hohe Genauigkeit und geringe Halluzinationsrate:</b> Die entwickelte Strategie muss auf Fakten basieren, um fehlerhafte und schädliche Strategien zu vermeiden.</li>
        <li><b>Fähigkeit zur strukturierten Ausgabe:</b> Die Ausgabe von Plänen in einem strukturierten Format (z.B. JSON oder Tabellen) ist von großem Vorteil.</li>
    </ul>
  `,

  microTexter : `
  <p><b>Aufgabe:</b> Dieser Agent ist für das Verfassen von prägnanten und ansprechenden Kurztexten wie Meta-Beschreibungen, Social-Media-Posts, Werbeanzeigen oder Produktbeschreibungen zuständig. Der Fokus liegt auf Überzeugungskraft, Einhaltung von Zeichenlimits und der Wahrung der Markenstimme.</p>
    <p><b>Ideale Modelleigenschaften:</b></p>
    <ul>
        <li><b>Hohe Schreibqualität und Nuancierung:</b> Das Modell muss einen natürlichen, ansprechenden und zur Marke passenden Ton treffen können.</li>
        <li><b>Präzise Anweisungsbefolgung:</b> Die strikte Einhaltung von Zeichenbegrenzungen und die Integration spezifischer Keywords oder Calls-to-Action sind unerlässlich.</li>
        <li><b>Gute Balance aus Geschwindigkeit und Kosten:</b> Da oft mehrere Varianten eines Textes für Tests benötigt werden, ist eine Mischung aus schneller Generierung und günstigen Kosten ideal.</li>
        <li><b>Kreativität:</b> Die Fähigkeit, frische und originelle Formulierungen zu finden, ist entscheidend, um aus der Masse hervorzustechen.</li>
    </ul>
  `,
  seoVeredler : `
<p><b>Aufgabe:</b> Dieser Agent überarbeitet und optimiert bestehende Texte für Suchmaschinen. Zu seinen Aufgaben gehören die natürliche Integration von Keywords, die Verbesserung der Lesbarkeit, das Hinzufügen relevanter interner Links und die Optimierung von Überschriftenstrukturen, ohne den ursprünglichen Charakter des Textes zu zerstören.</p>
    <p><b>Ideale Modelleigenschaften:</b></p>
    <ul>
        <li><b>Hervorragende Schreib- und Editierfähigkeiten:</b> Das Modell muss in der Lage sein, bestehenden Text subtil zu verbessern, anstatt ihn komplett neu zu schreiben.</li>
        <li><b>Tiefes Kontextverständnis:</b> Um sinnvolle und kohärente Änderungen vorzunehmen, muss das Modell den gesamten Inhalt eines Dokuments verstehen.</li>
        <li><b>Chirurgische Präzision:</b> Das Modell muss Anweisungen wie "füge Keyword X zweimal in diesem Abschnitt ein" exakt umsetzen können.</li>
        <li><b>Logisches Denken:</b> Ein gewisses Maß an logischem Verständnis ist notwendig, um die Suchintention hinter einem Thema zu erkennen und Keywords oder Links strategisch sinnvoll zu platzieren.</li>
    </ul>
  `
};
