// Importa el catálogo completo de una tienda (feed CSV de Awin, Google Merchant o exportación propia) en un paso.
//
//   node scripts/feed.mjs <archivo.csv | https://…> [--tienda pcc] [--aplicar]
//
// Sin --aplicar solo informa. Con --aplicar actualiza automáticamente las piezas reconocidas de forma segura
// (mismo enlace, mismo EAN o misma referencia del fabricante). Además deja en la carpeta importar/:
//   revisar.csv  → coincidencias por nombre: revísalas y aplícalas con «node scripts/precio.mjs importar importar/revisar.csv»
//   nuevas.csv   → productos que no tienes: completa la categoría y las especificaciones y añádelos con «node scripts/nuevas.mjs importar/nuevas.csv»
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import '../assets/matcher.js';
import { load, save, setPrice, today } from './lib-precios.mjs';
const M = globalThis.PCMatch;

const args = process.argv.slice(2);
const src = args.find(a => !a.startsWith('--'));
const apply = args.includes('--aplicar');
const forced = args.includes('--tienda') ? args[args.indexOf('--tienda') + 1] : null;
if (!src) { console.error('Uso: node scripts/feed.mjs <archivo.csv | https://…> [--tienda pcc] [--aplicar]'); process.exit(1); }

const db = load();
if (forced && !db.stores[forced]) { console.error(`Tienda desconocida «${forced}». Usa: node scripts/precio.mjs tiendas`); process.exit(1); }

let text;
if (/^https:\/\//.test(src)) {
  const r = await fetch(src, { headers: { 'User-Agent': 'ConfiguraPC-feed/1.0' } });
  if (!r.ok) { console.error(`No se ha podido descargar el feed (HTTP ${r.status}).`); process.exit(1); }
  text = await r.text();
} else text = readFileSync(src, 'utf8');
if (text.length > 400e6) { console.error('El feed es demasiado grande. Filtra antes por categoría en Awin (Create-a-Feed).'); process.exit(1); }

let rows;
try { rows = M.rowsToObjects(M.parseCsv(text)); } catch (e) { console.error(e.message); process.exit(1); }
const items = db.items;
const stats = { total: rows.length, sinPrecio: 0, sinStock: 0, otraCategoria: 0, seguras: 0, aplicadas: 0, revisar: 0, nuevas: 0, errores: 0 };
const revisar = [], nuevas = [], log = [];
const seen = new Set();

for (const r of rows) {
  if (!r.price) { stats.sinPrecio++; continue; }
  if (r.inStock === false) { stats.sinStock++; continue; }
  const store = forced || M.storeFromUrl(r.url, db.stores) || M.storeFromName(r.store, db.stores);
  if (!store) continue;
  const cat = M.guessCat(`${r.category || ''} ${r.name}`);
  if (!cat) { stats.otraCategoria++; continue; }
  const m = M.matchRow(items.filter(i => i.cat === cat || !cat), r);
  if (m.item && m.how !== 'nombre') {
    const key = m.item.id + '|' + store;
    if (seen.has(key)) continue; // la primera aparición manda
    seen.add(key); stats.seguras++;
    if (apply) {
      try { log.push('✓ ' + setPrice(db, m.item.id, store, r.price, r.url || undefined, { ean: r.ean, mpn: r.mpn })); stats.aplicadas++; }
      catch (e) { log.push(`✗ ${m.item.id}: ${e.message}`); stats.errores++; }
    } else log.push(`· ${m.item.id} en ${store}: ${r.price} € (por ${m.how})`);
  } else if (m.item) {
    stats.revisar++;
    revisar.push([m.item.id, store, String(r.price).replace('.', ','), r.url, `${Math.round(m.score * 100)} % «${r.name}» → «${m.item.name}»`]);
  } else {
    stats.nuevas++;
    nuevas.push([cat, r.name, store, String(r.price).replace('.', ','), r.url, r.ean || '', r.mpn || '', '', '']);
  }
}

mkdirSync(new URL('../importar/', import.meta.url), { recursive: true });
const csv = (rows) => rows.map(r => r.map(c => /[;"\n]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(';')).join('\n') + '\n';
writeFileSync(new URL('../importar/revisar.csv', import.meta.url),
  '# Coincidencias por nombre: borra las líneas que NO sean el mismo producto y aplica con: node scripts/precio.mjs importar importar/revisar.csv\n' +
  csv([['id', 'tienda', 'precio', 'url', '# motivo'], ...revisar.sort((a, b) => a[0].localeCompare(b[0]))]).replace(/;# /g, ';#'));
writeFileSync(new URL('../importar/nuevas.csv', import.meta.url),
  '# Productos que no están en el catálogo. Deja solo los que quieras, completa «especificaciones» y añádelos con: node scripts/nuevas.mjs importar/nuevas.csv\n' +
  csv([['categoria', 'nombre', 'tienda', 'precio', 'url', 'ean', 'mpn', 'especificaciones', 'por_que'], ...nuevas.slice(0, 3000)]));

for (const l of log.slice(0, 200)) console.log(l);
if (log.length > 200) console.log(`… y ${log.length - 200} más`);
console.log(`\nFeed: ${stats.total} productos. Sin precio: ${stats.sinPrecio}. Sin stock: ${stats.sinStock}. Fuera de categorías de PC: ${stats.otraCategoria}.`);
console.log(`Reconocidos con seguridad: ${stats.seguras}${apply ? ` (aplicados ${stats.aplicadas}, errores ${stats.errores})` : ' (usa --aplicar para guardarlos)'}.`);
console.log(`Por revisar (coincidencia por nombre): ${stats.revisar} → importar/revisar.csv`);
console.log(`Productos nuevos: ${stats.nuevas} → importar/nuevas.csv`);
if (apply && stats.aplicadas) save(db);
void today;
