// js/export-utils.js
import { state } from './state.js';

/**
 * CSV-Header exakt wie im Musterfile (21 Spalten).
 * Reihenfolge ist wichtig, weil viele Shops strikt parsen.
 */
const CSV_HEADERS = [
  'ObjectID',      // 1
  'SKU',           // 2
  'EAN',           // 3
  'Title',         // 4
  'Slug',          // 5
  'ShopType',      // 6
  'Currency',      // 7
  'Price',         // 8
  'PriceOld',      // 9
  'ShortDesc',     //10
  'LongDescHTML',  //11
  'Category',      //12
  'Brand',         //13
  'ImageUrl',      //14
  'ProductUrl',    //15
  'Stock',         //16
  'Shipping',      //17
  'Tags',          //18
  'Attributes',    //19
  'Region',        //20
  'Language'       //21
];

// Sichere Defaults (keine toten Links / Artefakte)
const DEFAULTS = {
  OBJECT_ID: '',
  SKU      : '',
  EAN      : '',
  SHOPTYPE : 'service',   // oder 'product' – bei Bedarf im UI steuerbar machen
  CURRENCY : 'EUR',
  PRICE    : '',
  PRICE_OLD: '',
  CATEGORY : '',
  BRAND    : 'Expoya',
  IMAGE    : '',          // leer lassen, wenn unbekannt
  PRODUCT  : '',          // deeplink zum Expo (falls vorhanden)
  STOCK    : '',
  SHIPPING : '',
  TAGS     : '',
  ATTRS    : '',
  REGION   : '',
  LANG     : 'de'
};

/** Hilfsfunktion: Slugify für Date/URL-Slugs */
function slugify(input) {
  if (!input) return '';
  return String(input)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Umlaute entfernen
    .replace(/[^a-z0-9]+/g, '-')                     // Nicht-Alnum -> '-'
    .replace(/^-+|-+$/g, '')                         // Trim '-'
    .slice(0, 120);
}

/** Baut eine CSV-Zeile (21 Spalten) für Index i */
function rowFor(i) {
  const title = (state.titles && state.titles[i]) || '';
  const html  = (state.texts  && state.texts[i])  || '';

  // Slug lieber leer lassen? (entspricht deinem bisherigen XML)
  const slug = ''; // alternativ: slugify(title)

  // ShortDesc aus erster Textzeile, LongDesc = HTML komplett
  const shortDesc = (String(html).replace(/<[^>]*>/g, ' ').trim().split(/\s+/).slice(0, 20).join(' ')).trim();

  return [
    DEFAULTS.OBJECT_ID,   // ObjectID
    DEFAULTS.SKU,         // SKU
    DEFAULTS.EAN,         // EAN
    title || '',          // Title
    slug,                 // Slug
    DEFAULTS.SHOPTYPE,    // ShopType
    DEFAULTS.CURRENCY,    // Currency
    DEFAULTS.PRICE,       // Price
    DEFAULTS.PRICE_OLD,   // PriceOld
    shortDesc,            // ShortDesc (plain)
    html || '',           // LongDescHTML (raw HTML)
    DEFAULTS.CATEGORY,    // Category
    DEFAULTS.BRAND,       // Brand
    DEFAULTS.IMAGE,       // ImageUrl
    DEFAULTS.PRODUCT,     // ProductUrl
    DEFAULTS.STOCK,       // Stock
    DEFAULTS.SHIPPING,    // Shipping
    DEFAULTS.TAGS,        // Tags
    DEFAULTS.ATTRS,       // Attributes
    DEFAULTS.REGION,      // Region
    DEFAULTS.LANG         // Language
  ];
}

/** Wandelt ein Array von Arrays in CSV (RFC4180-kompatibel) */
function toCsv(rows) {
  const escape = (val) => {
    const s = (val === null || val === undefined) ? '' : String(val);
    // Double quotes und Zeilenumbrüche sauber escapen
    const needQuotes = /[",\n\r]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needQuotes ? `"${escaped}"` : escaped;
  };
  return rows.map(r => r.map(escape).join(',')).join('\r\n');
}

/** Löst den Download einer CSV aus */
function downloadCsv(filename, csvString) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Entry: Buttons initialisieren */
export function initExportButtons() {
  const csvBtn = document.getElementById('exportCsvBtn');
  if (csvBtn) {
    csvBtn.style.display = 'inline-block';
    csvBtn.onclick = () => triggerCsvDownload();
  }
  // Optional: alten XML-Button deaktivieren/ausblenden
  const xmlBtn = document.getElementById('exportXmlBtn');
  if (xmlBtn) xmlBtn.style.display = 'none';
}

/** Baut CSV aus aktuellem State und lädt sie herunter */
export function triggerCsvDownload() {
  const rows = [CSV_HEADERS];
  const n = Array.isArray(state.titles) ? state.titles.length : 0;
  for (let i = 0; i < n; i++) rows.push(rowFor(i));

  const csv = toCsv(rows);
  const ts  = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  downloadCsv(`expoya-expos-${ts}.csv`, csv);
}
