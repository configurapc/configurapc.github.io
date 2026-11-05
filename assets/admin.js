// Panel de precios local. Habla con scripts/serve.mjs --admin, que ejecuta scripts/precio.mjs.
(function () {
'use strict';
const $ = (s) => document.querySelector(s);
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
const age = (d) => d ? Math.floor((Date.now() - new Date(d)) / 864e5) : Infinity;
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3000); }
const log = (m) => { $('#log').textContent = m; };

let DB = null;
async function call(path, body) {
  const r = await fetch(path, { method: body ? 'POST' : 'GET', headers: { 'x-admin': '1', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 404) throw new Error('El panel no está activo: arranca con «node scripts/serve.mjs 8080 --admin».');
  return r.json();
}
async function load() {
  try { DB = await call('/api/data'); } catch (e) { log(e.message); return; }
  render();
}
const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
const pending = (it) => { const newest = Math.min(...it.prices.map(p => age(p.date))); return newest > 7 || it.prices.length < 2; };

function render() {
  const q = $('#q').value.trim().toLowerCase();
  const onlyPend = $('#pend').checked;
  const items = DB.items.filter(it => (!q || (it.name + ' ' + it.id).toLowerCase().includes(q)) && (!onlyPend || pending(it)));
  const nPend = DB.items.filter(pending).length;
  clear($('#stats')).append(h('span', {}, h('b', { text: String(DB.items.length) }), ' piezas'), h('span', {}, h('b', { text: String(nPend) }), ' pendientes'), h('span', { text: `Datos del ${DB.updated}` }));
  const list = clear($('#list'));
  if (!items.length) { list.append(h('p', { class: 'empty', text: onlyPend ? 'No hay pendientes. Buen trabajo.' : 'Nada coincide.' })); return; }
  for (const it of items.slice(0, 60)) list.append(card(it));
  if (items.length > 60) list.append(h('p', { class: 'hint', text: `Mostrando 60 de ${items.length}. Busca para afinar.` }));
}
function card(it) {
  const rows = h('div', { class: 'adm-rows' });
  for (const p of it.prices) {
    const price = h('input', { class: 'input', inputmode: 'decimal', value: String(p.price).replace('.', ','), 'aria-label': `Precio en ${p.store}` });
    const url = h('input', { class: 'input', value: p.url, 'aria-label': `Enlace en ${p.store}` });
    const d = age(p.date);
    rows.append(h('div', { class: 'adm-row' },
      h('span', { class: 'adm-store' }, h('b', { text: DB.stores[p.store]?.name || p.store }), h('small', { class: d > 7 ? 'trend up' : 'trend down', text: p.date ? `${p.date} (${d} días)` : 'sin fecha' })),
      price, url,
      h('a', { class: 'btn btn-sm', href: p.url, target: '_blank', rel: 'noopener noreferrer' }, 'Abrir'),
      h('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: () => save(it.id, p.store, price.value, url.value !== p.url ? url.value : '') }, 'Guardar'),
      it.prices.length > 1 ? h('button', { type: 'button', class: 'btn btn-sm btn-ghost', 'aria-label': `Quitar ${p.store}`, onclick: () => { if (confirmDel(p.store)) save(it.id, p.store, '', '', true); } }, 'Quitar') : null));
  }
  const free = Object.entries(DB.stores).filter(([k]) => !it.prices.some(p => p.store === k));
  const sel = h('select', { class: 'input', 'aria-label': 'Tienda nueva' }, free.map(([k, s]) => h('option', { value: k, text: s.name })));
  const np = h('input', { class: 'input', inputmode: 'decimal', placeholder: 'Precio', 'aria-label': 'Precio nuevo' });
  const nu = h('input', { class: 'input', placeholder: 'https://… ficha del producto', 'aria-label': 'Enlace nuevo' });
  rows.append(h('div', { class: 'adm-row adm-new' }, h('span', { class: 'adm-store' }, h('b', { text: 'Añadir tienda' })), sel, np, nu,
    h('a', { class: 'btn btn-sm', href: 'https://www.google.com/search?tbm=shop&q=' + encodeURIComponent(it.name), target: '_blank', rel: 'noopener noreferrer' }, 'Buscar'),
    h('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: () => save(it.id, sel.value, np.value, nu.value) }, 'Añadir')));
  return h('article', { class: 'panel adm-card' }, h('div', { class: 'adm-title' }, h('b', { text: it.name }), h('code', { text: it.id })), rows);
}
// Confirmación sin diálogos del navegador: segundo clic en 4 s.
const pendingDel = new Map();
function confirmDel(store) {
  const t = pendingDel.get(store);
  if (t && Date.now() - t < 4000) { pendingDel.delete(store); return true; }
  pendingDel.set(store, Date.now()); toast(`Pulsa «Quitar» otra vez para borrar ${store}.`); return false;
}
async function save(id, store, price, url, borrar) {
  log('Guardando…');
  const r = await call('/api/precio', { id, store, price: String(price).trim(), url: String(url || '').trim(), borrar: !!borrar });
  log(r.out || ''); toast(r.ok ? 'Guardado.' : 'No se ha guardado: mira el mensaje de abajo.');
  if (r.ok) await load();
}
$('#q').addEventListener('input', () => DB && render());
$('#pend').addEventListener('change', () => DB && render());
$('#csv-go').addEventListener('click', async () => {
  log('Importando…');
  const r = await call('/api/importar', { csv: $('#csv').value });
  log(r.out || ''); toast(r.ok ? 'Importado.' : 'Hay líneas con error: mira abajo.');
  await load();
});

// ---------- pestañas ----------
function showTab(t) {
  for (const b of document.querySelectorAll('.adm-tabs button')) b.setAttribute('aria-pressed', String(b.dataset.tab === t));
  for (const s of document.querySelectorAll('.adm-sec')) s.hidden = s.dataset.sec !== t;
}
for (const b of document.querySelectorAll('.adm-tabs button')) b.addEventListener('click', () => showTab(b.dataset.tab));

// ---------- 1. feed ----------
async function sendFeed(aplicar) {
  const f = $('#feed-file').files[0];
  if (!f) { toast('Elige primero el archivo del feed.'); return; }
  log(`Subiendo ${f.name} (${(f.size / 1e6).toFixed(1)} MB) y analizando…`);
  const qs = new URLSearchParams({ tienda: $('#feed-store').value, aplicar: aplicar ? '1' : '0' });
  const r = await fetch('/api/feed?' + qs, { method: 'POST', headers: { 'x-admin': '1', 'Content-Type': 'text/csv' }, body: f }).then(x => x.json()).catch(e => ({ ok: false, out: e.message }));
  log(r.out || ''); toast(r.ok ? (aplicar ? 'Feed aplicado.' : 'Análisis listo.') : 'Error al procesar el feed.');
  if (aplicar && r.ok) await load();
}
$('#feed-check').addEventListener('click', () => sendFeed(false));
$('#feed-apply').addEventListener('click', () => sendFeed(true));
$('#load-rev').addEventListener('click', async () => {
  const r = await call('/api/archivo/revisar');
  $('#csv').value = r.out || ''; showTab('csv');
  toast(r.out.split('\n').filter(l => l && !l.startsWith('#') && !l.startsWith('id;')).length + ' coincidencias por revisar: borra las que no sean el mismo producto e importa.');
});
$('#load-new').addEventListener('click', async () => {
  const r = await call('/api/archivo/nuevas');
  $('#new-csv').value = r.out || ''; showTab('new');
  toast('Deja solo los productos que quieras añadir y completa sus especificaciones.');
});

// ---------- 2. capturas ----------
const BOOKMARKLET = "javascript:(()=>{const L=[...document.querySelectorAll('script[type=\"application/ld+json\"]')].flatMap(s=>{try{const j=JSON.parse(s.textContent);return[].concat(j['@graph']||j)}catch(e){return[]}});const P=L.find(x=>/Product/.test([].concat(x['@type']).join(' ')))||{};const O=[].concat(P.offers||[])[0]||{};const q=s=>document.querySelector(s);let p=O.price||O.lowPrice||(O.priceSpecification||{}).price||q('meta[property=\"product:price:amount\"]')?.content||q('[itemprop=price]')?.getAttribute('content');const d={n:(P.name||q('meta[property=\"og:title\"]')?.content||document.title).trim(),p:String(p||''),u:(q('link[rel=canonical]')?.href||location.href).split('#')[0],e:String(P.gtin13||P.gtin||P.ean||''),m:String(P.mpn||''),h:location.hostname};const t=JSON.stringify(d);if(!d.p){alert('No encuentro el precio en esta página.');return}(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>alert('Copiado: '+d.n+' — '+d.p+' €'),()=>prompt('Copia esta línea:',t))})()";
$('#bookmarklet').setAttribute('href', BOOKMARKLET);
$('#bookmarklet').addEventListener('click', (e) => { e.preventDefault(); toast('Arrástralo a la barra de marcadores; aquí no hace nada.'); });

let CAPS = [];
$('#cap-go').addEventListener('click', () => {
  const M = window.PCMatch;
  const lines = $('#cap-text').value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  CAPS = [];
  for (const l of lines) {
    let c; try { c = JSON.parse(l); } catch { continue; }
    if (!c || typeof c !== 'object') continue;
    const price = M.parsePrice(c.p), store = M.storeFromUrl(c.u, DB.stores);
    const row = { name: String(c.n || '').slice(0, 200), url: String(c.u || ''), ean: String(c.e || ''), mpn: String(c.m || ''), price };
    const cat = M.guessCat(row.name);
    const pool = DB.items.filter(i => !cat || i.cat === cat);
    const m = M.matchRow(pool, row);
    const cands = pool.map(i => ({ i, s: M.nameScore(row.name, i.name) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 5).map(x => x.i);
    if (m.item && !cands.includes(m.item)) cands.unshift(m.item);
    CAPS.push({ row, store, cat, match: m, cands });
  }
  renderCaps();
});
function renderCaps() {
  const out = clear($('#cap-out'));
  if (!CAPS.length) { out.append(h('p', { class: 'hint', text: 'No hay líneas válidas. Pega lo que copia el marcador «Capturar precio».' })); return; }
  const t = h('table', { class: 'cmp' }, h('thead', {}, h('tr', {}, h('th', { text: '' }), h('th', { text: 'Producto capturado' }), h('th', { text: 'Precio' }), h('th', { text: 'Tienda' }), h('th', { text: 'Pieza del catálogo' }))));
  const tb = h('tbody');
  CAPS.forEach((c, k) => {
    const sel = h('select', { class: 'input', 'aria-label': 'Pieza del catálogo' },
      c.cands.map(i => h('option', { value: i.id, text: i.name, selected: c.match.item === i })), h('option', { value: '__new', text: '— Es una pieza nueva —', selected: !c.match.item }));
    const safe = c.match.item && c.match.how !== 'nombre';
    const chk = h('input', { type: 'checkbox', checked: !!c.match.item && (safe || c.match.score >= 0.75) && c.store && c.row.price, 'aria-label': 'Aplicar' });
    c.ui = { sel, chk };
    tb.append(h('tr', {}, h('td', {}, chk), h('td', {}, h('b', { text: c.row.name }), h('br'), h('small', { class: 'hint', text: c.match.how ? `Reconocida por ${c.match.how}${c.match.how === 'nombre' ? ' (' + Math.round(c.match.score * 100) + ' %)' : ''}` : 'No reconocida' })),
      h('td', { text: c.row.price ? eur(c.row.price) : 'sin precio' }), h('td', { text: c.store ? (DB.stores[c.store]?.name || c.store) : 'tienda no incluida' }), h('td', {}, sel)));
  });
  t.append(tb);
  out.append(h('div', { class: 'cmp-wrap' }, t), h('div', { class: 'adm-inline' },
    h('button', { type: 'button', class: 'btn btn-primary', onclick: applyCaps }, 'Aplicar marcados'),
    h('button', { type: 'button', class: 'btn', onclick: capsToNew }, 'Pasar las nuevas a «Piezas nuevas»')));
}
async function applyCaps() {
  const lines = CAPS.filter(c => c.ui.chk.checked && c.ui.sel.value !== '__new' && c.store && c.row.price)
    .map(c => [c.ui.sel.value, c.store, String(c.row.price).replace('.', ','), c.row.url, /^\d{8,14}$/.test(c.row.ean) ? c.row.ean : '', c.row.mpn].join(';'));
  if (!lines.length) { toast('No hay nada marcado.'); return; }
  log('Aplicando…');
  const r = await call('/api/importar', { csv: 'id;tienda;precio;url;ean;mpn\n' + lines.join('\n') });
  log(r.out || ''); toast(r.ok ? `${lines.length} precios aplicados.` : 'Alguna línea ha fallado: mira abajo.');
  await load();
}
function capsToNew() {
  const rows = CAPS.filter(c => c.ui.sel.value === '__new' && c.store && c.row.price)
    .map(c => [c.cat || '', c.row.name.replace(/;/g, ','), c.store, String(c.row.price).replace('.', ','), c.row.url, c.row.ean, c.row.mpn, '', ''].join(';'));
  if (!rows.length) { toast('No hay capturas marcadas como pieza nueva.'); return; }
  $('#new-csv').value = ($('#new-csv').value.trim() ? $('#new-csv').value.trim() + '\n' : 'categoria;nombre;tienda;precio;url;ean;mpn;especificaciones;por_que\n') + rows.join('\n');
  showTab('new'); toast('Completa la columna de especificaciones y pulsa Comprobar.');
}

// ---------- piezas nuevas ----------
const SPEC_HELP = {
  cpu: 'Se rellena solo si el modelo es conocido. Añade siempre cooler=si/no y cores=6',
  gpu: 'Se rellena solo (VRAM, consumo, rendimiento). Opcional: length=260 (mm)',
  mobo: 'socket=AM5|chipset=B650|mem=DDR5|form=mATX|wifi=no|m2=2', ram: 'type=DDR5|size=32|speed=6000', ssd: 'size=1000|gen=4',
  psu: 'watts=750|rating=Gold|modular=si', case: 'forms=ATX,mATX,ITX|gpuMax=400|coolerMax=170|rad=360|size=media',
  cooler: 'type=air|maxPower=200|height=155 (o type=aio|rad=360|maxPower=300)', monitor: 'size=27|res=1440p|hz=180|panel=IPS',
  keyboard: 'kind=combo|wireless=no|gaming=no', mouse: 'wireless=si|gaming=si', headset: 'wireless=no',
  laptop: 'cpu=Intel Core i5-13420H|cpuTier=2|gpu=RTX 5060 Laptop|gpuTier=2|ram=16|ssd=1000|screen=15.6|hz=144|os=Windows 11 Home'
};
for (const [c, t] of Object.entries(SPEC_HELP)) $('#spec-help').append(h('li', {}, h('b', { text: c + ': ' }), h('code', { text: t })));
async function sendNew(guardar) {
  log(guardar ? 'Añadiendo…' : 'Comprobando…');
  const r = await call('/api/nuevas', { csv: $('#new-csv').value, guardar });
  log(r.out || ''); toast(r.ok ? (guardar ? 'Piezas añadidas.' : 'Todo correcto: ya puedes añadirlas.') : 'Hay líneas con errores: mira abajo.');
  if (guardar && r.ok) await load();
}
$('#new-check').addEventListener('click', () => sendNew(false));
$('#new-save').addEventListener('click', () => sendNew(true));

load().then(() => { for (const [k, s] of Object.entries(DB?.stores || {})) $('#feed-store').append(h('option', { value: k, text: s.name })); });
})();
