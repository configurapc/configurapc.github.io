// Reconoce a qué pieza del catálogo corresponde un producto de una tienda (feed, captura o CSV).
// Script clásico: lo usan el panel de precios (navegador) y los scripts de importación (Node). Expone PCMatch.
(function (root) {
'use strict';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/(\d)\s*(gb|tb|mhz|w|mm|hz)\b/g, '$1$2').replace(/[^a-z0-9]+/g, ' ').trim();
// Palabras que no ayudan a distinguir modelos
const STOP = new Set(('de con y para sin the and a el la los las tarjeta grafica procesador placa base memoria ram disco ssd fuente alimentacion caja torre ' +
  'disipador refrigeracion liquida monitor teclado raton auriculares portatil gaming oc edition black negro negra blanco blanca white rgb argb nuevo pc ' +
  'reacondicionado version v2 box tray').split(' '));
const tokens = (s) => norm(s).split(' ').filter(t => t && !STOP.has(t));
// Tokens "duros": números de modelo (5060, b650, 9800x3d…) y sufijos que cambian el producto (ti, xt, super…).
// Las capacidades y tipos de memoria (8gb, gddr7, ddr5) no cuentan: las tiendas a veces los omiten.
const UNIT = /^(\d+(gb|tb|mhz|w|mm|hz|cm|mb|ghz)|g?ddr\d|gddr\d|pcie\d?|\d{1,2})$/;
const SUFFIX = new Set(['ti', 'xt', 'xtx', 'super', 'x3d', 'gre', 'plus', 'pro', 'max', 'oled', 'ultra']);
const hard = (toks) => toks.filter(t => (/\d/.test(t) && t.length >= 3 && !UNIT.test(t)) || SUFFIX.has(t));

function nameScore(a, b) {
  const ta = tokens(a), tb = new Set(tokens(b));
  if (!ta.length || !tb.size) return 0;
  const ha = hard(ta), hb = hard([...tb]);
  if (ha.some(t => !tb.has(t)) || hb.some(t => !ta.includes(t))) return 0; // modelo distinto
  const common = ta.filter(t => tb.has(t)).length;
  return common / Math.max(ta.length, tb.size);
}
const cleanUrl = (u) => { try { const x = new URL(u); return (x.hostname.replace(/^www\./, '') + x.pathname).replace(/\/+$/, '').toLowerCase(); } catch { return ''; } };
const digits = (s) => String(s || '').replace(/\D/g, '');

function storeFromUrl(url, stores) {
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
  for (const [k, s] of Object.entries(stores || {})) if (s.host && s.host.replace(/^www\./, '') === host) return k;
  return null;
}
function storeFromName(name, stores) {
  const n = norm(name).replace(/ /g, '');
  for (const [k, s] of Object.entries(stores || {})) if (norm(s.name).replace(/ /g, '') === n || k === n) return k;
  if (/pccomponentes/.test(n)) return 'pcc';
  return null;
}

// row: { name, url, ean, mpn, price }. Devuelve la mejor coincidencia y cómo se encontró.
// how: 'url' | 'ean' | 'mpn' | 'nombre'. Solo url/ean/mpn son seguras para aplicar sin revisar.
function matchRow(items, row) {
  const u = cleanUrl(row.url), e = digits(row.ean), m = norm(row.mpn).replace(/ /g, '');
  if (u) for (const it of items) if (it.prices?.some(p => cleanUrl(p.url) === u)) return { item: it, how: 'url', score: 1 };
  if (e.length >= 8) for (const it of items) if ((it.codes?.ean || []).some(x => digits(x) === e)) return { item: it, how: 'ean', score: 1 };
  if (m.length >= 4) for (const it of items) if (it.codes?.mpn && norm(it.codes.mpn).replace(/ /g, '') === m) return { item: it, how: 'mpn', score: 1 };
  let best = null, bs = 0;
  for (const it of items) { const s = nameScore(row.name, it.name); if (s > bs) { bs = s; best = it; } }
  return bs >= 0.5 ? { item: best, how: 'nombre', score: bs } : { item: null, how: null, score: bs };
}

// Categoría a partir del nombre o la categoría de la tienda
const CAT_RULES = [
  ['laptop', /portatil|laptop|notebook/], ['gpu', /tarjeta(s)? grafica|geforce|radeon rx|\brtx \d|\barc [ab]\d/], ['cpu', /procesador|\bryzen \d|core (i\d|ultra)/],
  ['mobo', /placa(s)? base|motherboard|\b[abhxz]\d{3}m?\b.*(ddr|wifi|atx)/], ['ram', /memoria(s)? ram|\bddr[45]\b.*\d+gb/], ['ssd', /\bssd\b|nvme|m 2/],
  ['psu', /fuente(s)? de alimentacion|\bpsu\b|80 plus/], ['cooler', /disipador|refrigeracion|aio|ventilador cpu/], ['case', /\bcaja(s)?\b|torre(s)? (atx|pc)|semitorre|midi tower/],
  ['monitor', /monitor/], ['keyboard', /teclado/], ['mouse', /raton|mouse/], ['headset', /auricular|headset/]
];
function guessCat(text) { const n = norm(text); for (const [c, re] of CAT_RULES) if (re.test(n)) return c; return null; }

// CSV robusto: detecta separador (; , tab |), comillas y cabecera
function parseCsv(text) {
  text = String(text || '').replace(/^﻿/, '');
  const first = text.split(/\r?\n/).find(l => l.trim() && !l.trim().startsWith('#')) || '';
  const sep = [';', '\t', '|', ','].map(s => [s, first.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}
// Convierte filas en objetos usando la cabecera. Reconoce los nombres de columna de Awin, Google Merchant y otros.
const ALIASES = {
  name: ['product_name', 'name', 'title', 'nombre', 'producto'], price: ['search_price', 'price', 'store_price', 'sale_price', 'precio', 'display_price'],
  url: ['merchant_deep_link', 'deep_link', 'link', 'url', 'product_url', 'enlace'], affiliate: ['aw_deep_link'],
  ean: ['ean', 'product_gtin', 'gtin', 'gtin13', 'upc'], mpn: ['mpn', 'model_number', 'merchant_product_id_mpn', 'part_number'],
  stock: ['in_stock', 'stock_status', 'availability', 'stock'], category: ['merchant_category', 'category_name', 'product_type', 'category', 'categoria'],
  store: ['merchant_name', 'tienda', 'store'], brand: ['brand_name', 'brand', 'marca']
};
function rowsToObjects(rows) {
  if (!rows.length) return [];
  const head = rows[0].map(h => norm(h).replace(/ /g, '_'));
  const idx = {};
  for (const [k, al] of Object.entries(ALIASES)) { const i = head.findIndex(h => al.includes(h)); if (i >= 0) idx[k] = i; }
  if (idx.name == null || idx.price == null) throw new Error('No encuentro las columnas de nombre y precio. Cabecera: ' + rows[0].slice(0, 12).join(', '));
  return rows.slice(1).map(r => {
    const o = {}; for (const [k, i] of Object.entries(idx)) o[k] = (r[i] ?? '').trim();
    o.price = parsePrice(o.price);
    o.inStock = o.stock === '' || o.stock == null ? null : /^(1|true|yes|si|sí|in stock|in_stock|instock|disponible)$/i.test(o.stock);
    return o;
  });
}
function parsePrice(v) {
  let s = String(v || '').replace(/[^\d.,]/g, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, '');
  const n = Number(s);
  return n > 0 && n < 50000 ? Math.round(n * 100) / 100 : null;
}

root.PCMatch = { norm, tokens, nameScore, cleanUrl, storeFromUrl, storeFromName, matchRow, guessCat, parseCsv, rowsToObjects, parsePrice };
})(typeof globalThis !== 'undefined' ? globalThis : window);
