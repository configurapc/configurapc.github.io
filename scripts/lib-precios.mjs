// Funciones comunes para guardar precios y piezas (las usan precio.mjs, feed.mjs y nuevas.mjs).
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export const FILE = new URL('../data/components.json', import.meta.url);
export const today = () => new Date().toISOString().slice(0, 10);
export const eur = (n) => n.toFixed(2).replace('.', ',') + ' €';
export const load = () => JSON.parse(readFileSync(FILE, 'utf8'));

export function hostOk(db, store, url) {
  try {
    const u = new URL(url), h = u.hostname, s = db.stores[store]?.host;
    return u.protocol === 'https:' && (h === s || h === 'www.' + s || 'www.' + h === s || h === 'www.geeknetic.es');
  } catch { return false; }
}
export function parsePrice(v) {
  const n = Number(String(v).trim().replace(/\s|€/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return n > 0 && n < 20000 ? Math.round(n * 100) / 100 : null;
}

// Aplica un precio. Devuelve un texto con lo que ha hecho o lanza un error.
export function setPrice(db, id, store, priceArg, url, codes) {
  const item = db.items.find(i => i.id === id);
  if (!item) throw new Error(`no existe la pieza «${id}»`);
  if (!db.stores[store]) throw new Error(`tienda desconocida «${store}»`);
  const price = parsePrice(priceArg);
  if (price == null) throw new Error(`precio no válido «${priceArg}»`);
  if (url && !hostOk(db, store, url)) throw new Error(`el enlace no es de ${db.stores[store].host}: ${url}`);
  if (codes) addCodes(item, codes);
  const d = today();
  const prev = item.prices.find(p => p.store === store);
  if (prev) {
    const old = prev.price;
    if (prev.date && prev.date !== d && prev.price !== price) prev.hist = [...(prev.hist || []), [prev.date, prev.price]].slice(-26);
    Object.assign(prev, { price, date: d }, url ? { url } : {});
    const ch = (price - old) / old;
    return `${item.name} en ${store}: ${eur(old)} → ${eur(price)}${Math.abs(ch) > 0.25 ? '  ⚠ cambio de ' + Math.round(ch * 100) + ' %, revísalo' : ''}`;
  }
  if (!url) throw new Error(`para añadir ${store} a «${id}» necesito también el enlace del producto`);
  item.prices.push({ store, price, url, date: d });
  return `Añadido ${item.name} en ${store}: ${eur(price)}`;
}
// Guarda EAN y referencia del fabricante para reconocer la pieza automáticamente la próxima vez.
export function addCodes(item, { ean, mpn } = {}) {
  const e = String(ean || '').replace(/\D/g, '');
  if (e.length >= 8) { item.codes = item.codes || {}; item.codes.ean = [...new Set([...(item.codes.ean || []), e])].slice(0, 10); }
  if (mpn && String(mpn).trim().length >= 4 && !item.codes?.mpn) { item.codes = item.codes || {}; item.codes.mpn = String(mpn).trim().slice(0, 40); }
}

export function save(db, { pages = true } = {}) {
  db.updated = today();
  writeFileSync(FILE, JSON.stringify(db, null, 2) + '\n');
  execFileSync(process.execPath, [new URL('./validate-data.mjs', import.meta.url).pathname, '--quiet'], { stdio: 'inherit' });
  if (pages) execFileSync(process.execPath, [new URL('./paginas.mjs', import.meta.url).pathname], { stdio: 'inherit' });
}
