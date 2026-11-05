// Valida data/components.json antes de publicar. Uso: node scripts/validate-data.mjs
// Sale con código 1 si hay errores (la tarea semanal no debe hacer push en ese caso).
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../data/components.json', import.meta.url);
const errors = [], warns = [];
let db;
try { db = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error('JSON inválido:', e.message); process.exit(1); }

// Cada tienda declara su dominio en stores.<clave>.host; los enlaces de precio deben ir a ese dominio (o al comparador de Geeknetic).
const hostOk = (store, host) => { const h = store?.host; return !!h && (host === h || host === 'www.' + h || 'www.' + host === h); };
const CATS = { cpu: ['socket', 'mem', 'power', 'cooler', 'igpu'], gpu: ['vram', 'tbp'], mobo: ['socket', 'chipset', 'mem', 'form', 'wifi'],
  ram: ['type', 'size'], ssd: ['size'], psu: ['watts', 'rating'], case: ['forms'], cooler: ['type', 'maxPower'],
  monitor: ['res', 'hz'], keyboard: ['kind'], mouse: [], headset: [], os: ['edition'], assembly: [], laptop: ['cpu', 'cpuTier', 'gpuTier', 'ram', 'ssd', 'screen'] };
const today = new Date();

if (!/^\d{4}-\d{2}-\d{2}$/.test(db.updated || '')) errors.push('updated debe ser AAAA-MM-DD');
if (!db.stores || typeof db.stores !== 'object') errors.push('falta stores');
else for (const [k, st] of Object.entries(db.stores)) if (!st.name || !st.host || !/^[a-z0-9.-]+$/.test(st.host)) errors.push(`tienda ${k}: falta name o host válido`);
if (!Array.isArray(db.items) || db.items.length < 30) errors.push('items vacío o demasiado corto');

const ids = new Set();
for (const it of db.items || []) {
  const where = it.id || '(sin id)';
  if (!/^[a-z0-9-]{3,60}$/.test(it.id || '')) errors.push(`${where}: id no válido`);
  if (ids.has(it.id)) errors.push(`${where}: id duplicado`); ids.add(it.id);
  if (!CATS[it.cat]) { errors.push(`${where}: categoría desconocida ${it.cat}`); continue; }
  if (typeof it.name !== 'string' || !it.name.trim() || it.name.length > 120) errors.push(`${where}: nombre no válido`);
  for (const k of CATS[it.cat]) if (it.specs?.[k] === undefined) errors.push(`${where}: falta specs.${k}`);
  if (['cpu', 'gpu'].includes(it.cat) && typeof it.perf?.gaming !== 'number') errors.push(`${where}: falta perf.gaming`);
  if (it.cat === 'cpu' && typeof it.perf?.work !== 'number') errors.push(`${where}: falta perf.work`);
  if (it.codes != null) {
    if (typeof it.codes !== 'object' || (it.codes.ean && !(Array.isArray(it.codes.ean) && it.codes.ean.every(e => /^\d{8,14}$/.test(e))))) errors.push(`${where}: codes no válido (ean debe ser lista de números)`);
    if (it.codes.mpn != null && (typeof it.codes.mpn !== 'string' || it.codes.mpn.length > 40)) errors.push(`${where}: codes.mpn no válido`);
  }
  if (!Array.isArray(it.prices) || !it.prices.length) { errors.push(`${where}: sin precios`); continue; }
  for (const p of it.prices) {
    if (!db.stores[p.store]) errors.push(`${where}: tienda desconocida ${p.store}`);
    if (typeof p.price !== 'number' || !(p.price > 0) || p.price > 20000) errors.push(`${where}: precio no válido ${p.price}`);
    try {
      const u = new URL(p.url);
      if (u.protocol !== 'https:' || !(hostOk(db.stores[p.store], u.hostname) || u.hostname === 'www.geeknetic.es')) errors.push(`${where}: el enlace de ${p.store} debe ir a ${db.stores[p.store]?.host || '¿?'} (o al comparador de Geeknetic): ${p.url}`);
    } catch { errors.push(`${where}: URL no válida`); }
    if (p.hist != null && !(Array.isArray(p.hist) && p.hist.every(x => Array.isArray(x) && /^\d{4}-\d{2}-\d{2}$/.test(x[0]) && typeof x[1] === 'number' && x[1] > 0))) errors.push(`${where}: historial no válido en ${p.store}`);
    if (p.date != null) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) errors.push(`${where}: fecha no válida ${p.date}`);
      else if (new Date(p.date) > today) errors.push(`${where}: fecha futura ${p.date}`);
      else if ((today - new Date(p.date)) / 864e5 > 45) warns.push(`${where}: precio de hace más de 45 días (${p.date})`);
    } else warns.push(`${where}: precio ${p.store} sin fecha`);
  }
  const ps = it.prices.map(p => p.price);
  if (Math.max(...ps) > Math.min(...ps) * 2.5) warns.push(`${where}: diferencia de precio muy grande entre tiendas, revisar`);
}
// cada categoría necesaria debe tener al menos una pieza
for (const c of ['cpu', 'gpu', 'mobo', 'ram', 'ssd', 'psu', 'case', 'cooler']) {
  if (!(db.items || []).some(i => i.cat === c)) errors.push(`categoría ${c} vacía`);
}
// cada socket con CPU debe tener placa
for (const s of new Set((db.items || []).filter(i => i.cat === 'cpu').map(i => i.specs.socket))) {
  if (!(db.items || []).some(i => i.cat === 'mobo' && i.specs.socket === s)) errors.push(`no hay placa para el socket ${s}`);
}

const quiet = process.argv.includes('--quiet');
if (!quiet) for (const w of warns) console.warn('AVISO', w);
for (const e of errors) console.error('ERROR', e);
console.log(`${db.items?.length || 0} piezas, ${errors.length} errores, ${warns.length} avisos`);
if (errors.length) { console.error('No se ha generado data/components.js: corrige los errores.'); process.exit(1); }

// Genera la copia que usa la web (funciona también abriendo index.html con doble clic)
const js = '// Archivo generado por scripts/validate-data.mjs desde components.json. No lo edites a mano.\n'
  + 'window.PC_DATA = ' + JSON.stringify(db) + ';\n';
writeFileSync(new URL('../data/components.js', import.meta.url), js);
console.log('data/components.js actualizado.');
