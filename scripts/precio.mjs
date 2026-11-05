// Herramienta para mantener los precios. Guarda con la fecha de hoy, valida y regenera data/components.js.
//
//   node scripts/precio.mjs buscar 9070               → piezas que coinciden, con sus precios
//   node scripts/precio.mjs tiendas                   → claves de tienda y su dominio
//   node scripts/precio.mjs pendientes                → qué revisar primero (viejo, sin fecha o en una sola tienda)
//   node scripts/precio.mjs <id> <tienda> <precio> [url]
//   node scripts/precio.mjs <id> <tienda> --borrar
//   node scripts/precio.mjs importar precios.csv      → muchos precios a la vez (ver PRECIOS.md)
//
import { readFileSync } from 'node:fs';
import { load, save as saveDb, setPrice as setPriceDb, eur } from './lib-precios.mjs';

const db = load();
const args = process.argv.slice(2);
const ageDays = (d) => d ? Math.floor((Date.now() - new Date(d)) / 864e5) : Infinity;
const search = (q) => 'https://www.google.com/search?tbm=shop&q=' + encodeURIComponent(q);
const save = () => saveDb(db);
const setPrice = (id, store, price, url, codes) => setPriceDb(db, id, store, price, url, codes);

const [cmd] = args;
if (!cmd || cmd === 'buscar') {
  const q = (args[1] || '').toLowerCase();
  for (const it of db.items.filter(i => !q || i.name.toLowerCase().includes(q) || i.id.includes(q))) {
    const best = Math.min(...it.prices.map(p => p.price));
    console.log(`${it.id.padEnd(30)} ${eur(best).padStart(11)}  ${it.name}`);
    for (const p of it.prices) console.log(`${''.padEnd(32)}${p.store.padEnd(11)} ${eur(p.price).padStart(11)}  ${p.date || 'sin fecha'}`);
  }
} else if (cmd === 'tiendas') {
  for (const [k, s] of Object.entries(db.stores)) console.log(`${k.padEnd(12)} ${s.name.padEnd(28)} https://${s.host}/`);
} else if (cmd === 'pendientes') {
  const rows = db.items.map(it => {
    const newest = Math.min(...it.prices.map(p => ageDays(p.date)));
    const stores = it.prices.length;
    const reasons = [];
    if (!isFinite(newest)) reasons.push('sin fecha');
    else if (newest > 7) reasons.push(`hace ${newest} días`);
    if (stores < 2) reasons.push('una sola tienda');
    return { it, reasons, score: (isFinite(newest) ? newest : 60) + (stores < 2 ? 20 : 0) };
  }).filter(r => r.reasons.length).sort((a, b) => b.score - a.score);
  console.log(`${rows.length} piezas por revisar (las primeras, más urgentes):\n`);
  for (const r of rows.slice(0, Number(args[1]) || 25)) {
    console.log(`${r.it.id.padEnd(30)} ${r.reasons.join(', ').padEnd(28)} ${r.it.name}`);
    console.log(`${''.padEnd(32)}${search(r.it.name)}`);
  }
} else if (cmd === 'importar') {
  if (!args[1]) { console.error('Uso: node scripts/precio.mjs importar precios.csv'); process.exit(1); }
  const lines = readFileSync(args[1], 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  let ok = 0, bad = 0;
  for (const [n, line] of lines.entries()) {
    const cols = line.split(/[;\t]/).map(c => c.trim().replace(/^"|"$/g, ''));
    if (n === 0 && /^id$/i.test(cols[0])) continue; // cabecera
    const [id, store, price, url, ean, mpn] = cols;
    const codes = /^\d{8,14}$/.test(ean || '') ? { ean, mpn: mpn && !mpn.startsWith('#') ? mpn : '' } : null;
    try { console.log('✓ ' + setPrice(id, store, price, url || undefined, codes)); ok++; } catch (e) { console.log(`✗ línea ${n + 1}: ${e.message}`); bad++; }
  }
  console.log(`\n${ok} precios aplicados, ${bad} con error.`);
  if (ok) save();
  if (bad) process.exitCode = 1;
} else {
  const [id, store, priceArg, url] = args;
  const item = db.items.find(i => i.id === id);
  try {
    if (priceArg === '--borrar') {
      if (!item) throw new Error(`no existe la pieza «${id}»`);
      item.prices = item.prices.filter(p => p.store !== store);
      if (!item.prices.length) throw new Error('no puedes dejar una pieza sin ningún precio');
      console.log(`Quitado ${store} de ${item.name}`);
    } else console.log(setPrice(id, store, priceArg, url));
    save();
  } catch (e) { console.error('Error: ' + e.message); process.exit(1); }
}
