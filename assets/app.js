(function () {
'use strict';
const E = window.PCEngine;
const HW = window.PCHW;

// ---------- utilidades DOM (sin innerHTML: el texto va siempre por textContent) ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style') for (const [p, val] of Object.entries(v)) el.style.setProperty(p, val);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

// ---------- iconos (SVG propios, trazo de 1,75) ----------
const ICONS = {
  cpu: ['R5,5,14,14,2', 'R9,9,6,6,1', 'M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3'],
  mobo: ['R3,3,18,18,2', 'R6,6,6,6,1', 'M15 6.5h3M15 10h3M6 15h12M6 18h7'],
  ram: ['R2,6,20,10,1.5', 'M6 9.5v3M10 9.5v3M14 9.5v3M18 9.5v3M6 16v3M12 16v3M18 16v3'],
  gpu: ['R2,5,20,12,2', 'C9,11,3', 'C16.5,11,1.5', 'M5 17v3h8v-3'],
  ssd: ['R2,8,20,8,2', 'M6 12h6', 'C17,12,1'],
  psu: ['R3,5,18,14,2', 'C13,12,4', 'M13 8v8M9 12h8', 'M5.5 9h1M5.5 12h1'],
  case: ['R6,2,12,20,2', 'M9 6h6M9 9h6', 'C12,15.5,2.5'],
  cooler: ['C12,12,9', 'C12,12,1.6', 'M12 10.4C11 7.5 12 5 14.6 4.4M13.6 12c3-1 5.5 0 6 2.6M12 13.6c1 3 0 5.5-2.6 6M10.4 12c-3 1-5.5 0-6-2.6'],
  monitor: ['R2,3,20,14,2', 'M8 21h8M12 17v4'],
  keyboard: ['R2,6,20,12,2', 'M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10'],
  mouse: ['R6,3,12,18,6', 'M12 7v4'],
  headset: ['M4 15v-3a8 8 0 0 1 16 0v3', 'R3,14,4,6,1.5', 'R17,14,4,6,1.5'],
  gaming: ['M6.5 7h11A4.5 4.5 0 0 1 22 11.5v1a3.5 3.5 0 0 1-6.3 2.1L14.5 13h-5l-1.2 1.6A3.5 3.5 0 0 1 2 12.5v-1A4.5 4.5 0 0 1 6.5 7z', 'M7 9.5v3.5M5.25 11.25h3.5', 'M16 10.5h.01M18 12.5h.01'],
  office: ['M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z', 'M14 3v5h5M9 13h6M9 17h6'],
  creative: ['R3,4,18,16,2', 'C9,10,2', 'M21 16l-5-5-9 9'],
  dev: ['M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14'],
  ai: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', 'M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z'],
  streaming: ['C12,12,2', 'M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  x: ['M6 6l12 12M18 6L6 18'],
  alert: ['M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9.5v4M12 17h.01'],
  info: ['C12,12,9', 'M12 11v5M12 7.6h.01'],
  chev: ['M9 6l6 6-6 6'],
  left: ['M15 6l-6 6 6 6'],
  search: ['C11,11,7', 'M20 20l-4-4'],
  download: ['M12 4v11M7 10l5 5 5-5M5 20h14'],
  share: ['M12 15V3M7 8l5-5 5 5', 'M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6'],
  save: ['M6 3h12v18l-6-4.5L6 21z'],
  trash: ['M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13'],
  sun: ['C12,12,4', 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],
  moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
  plus: ['M12 5v14M5 12h14'],
  ext: ['M14 4h6v6M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
  copy: ['R8,8,12,12,2', 'M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3'],
  scan: ['M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3', 'R9,9,6,6,1'],
  windows: ['M3 5.6l7.5-1.1v7H3zM12.5 4.2L21 3v8.5h-8.5zM3 12.5h7.5v7L3 18.4zM12.5 12.5H21V21l-8.5-1.2z'],
  pencil: ['M4 20h4L19 9l-4-4L4 16z', 'M14 6l4 4'],
  csv: ['M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z', 'M14 3v5h5M9 12.5h6M9 16h6'],
  bolt: ['M13 2L4 14h7l-1 8 9-12h-7z'],
  trend: ['M3 17l6-6 4 4 8-8M15 7h6v6'],
  tower: ['R6,2,12,20,2', 'M9 6h6M9 9h6', 'C12,15.5,2.5'],
  laptop: ['R4,4,16,11,1.5', 'M2 19h20'],
  travel: ['R3,7,18,13,2', 'M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M3 13h18']
};
const SVGNS = 'http://www.w3.org/2000/svg';
function icon(name) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
  for (const d of ICONS[name] || ICONS.info) {
    let el;
    if (d[0] === 'R') { const [x, y, w, hh, r] = d.slice(1).split(','); el = document.createElementNS(SVGNS, 'rect'); el.setAttribute('x', x); el.setAttribute('y', y); el.setAttribute('width', w); el.setAttribute('height', hh); el.setAttribute('rx', r); }
    else if (d[0] === 'C') { const [cx, cy, r] = d.slice(1).split(','); el = document.createElementNS(SVGNS, 'circle'); el.setAttribute('cx', cx); el.setAttribute('cy', cy); el.setAttribute('r', r); }
    else { el = document.createElementNS(SVGNS, 'path'); el.setAttribute('d', d); }
    svg.append(el);
  }
  return svg;
}

// ---------- enlaces seguros, almacenamiento, avisos ----------
// Dominios permitidos: los de las tiendas del catálogo (stores.*.host) más fuentes de noticias y búsqueda.
const ALLOWED_HOSTS = new Set(['www.geeknetic.es', 'www.amazon.es', 'www.google.com', 'www.techpowerup.com', 'www.profesionalreview.com', 'elchapuzasinformatico.com', 'www.tomshardware.com', 'www.noticias3d.com']);
function addStoreHosts(stores) {
  for (const s of Object.values(stores || {})) if (typeof s.host === 'string' && /^[a-z0-9.-]+$/.test(s.host)) { ALLOWED_HOSTS.add(s.host); ALLOWED_HOSTS.add(s.host.startsWith('www.') ? s.host.slice(4) : 'www.' + s.host); }
}
const CFG = (() => {
  const c = window.PC_CONFIG || {};
  return { client: /^ca-pub-\d{10,20}$/.test(c.adsenseClient || '') ? c.adsenseClient : '', slots: c.adSlots || {}, amazonTag: /^[a-z0-9-]{3,40}-21$/i.test(c.amazonTag || '') ? c.amazonTag : '' };
})();
function withAffiliate(url) {
  if (!CFG.amazonTag) return url;
  try { const u = new URL(url); if (u.hostname === 'www.amazon.es') { u.searchParams.set('tag', CFG.amazonTag); return u.href; } } catch { /* nada */ }
  return url;
}
function safeUrl(u) {
  try { const x = new URL(u); if (x.protocol === 'https:' && ALLOWED_HOSTS.has(x.hostname)) return x.href; } catch { /* no válida */ }
  return null;
}
function extLink(url, kids, cls) {
  const safe = safeUrl(withAffiliate(url));
  if (!safe) return h('span', { class: cls }, kids);
  return h('a', { href: safe, target: '_blank', rel: 'noopener noreferrer nofollow' + (/amazon\.es/.test(safe) && CFG.amazonTag ? ' sponsored' : ''), class: cls }, kids);
}
const amazonSearch = (name) => 'https://www.amazon.es/s?k=' + encodeURIComponent(name);
const shopSearch = (name) => 'https://www.google.com/search?tbm=shop&q=' + encodeURIComponent(name);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
};
const KEY_SAVED = 'pcconf.saved.v1', KEY_WIZ = 'pcconf.wizard.v2', KEY_THEME = 'pcconf.theme', KEY_UP = 'pcconf.upgrade.v1', KEY_LAP = 'pcconf.laptop.v1';

function toast(msg) {
  const t = $('#toast');
  t.hidden = true; void t.offsetWidth; // reinicia la animación
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2800);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = h('textarea', { 'aria-hidden': 'true', style: { position: 'fixed', opacity: '0' } }); ta.value = text;
    document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove(); return ok;
  }
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const fmtDate = (d, long) => {
  if (!d) return null;
  const [y, m, dd] = String(d).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString('es-ES', long ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' });
};
const pct = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(Math.round(x * 100)) + ' %';
const signedEuro = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + E.euro(Math.abs(Math.round(x)));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ---------- estado ----------
const S = {
  db: null,
  wiz: { step: 1, use: 'gaming', res: '1440p', competitive: false, budget: 1000, periph: { monitor: false, input: false, headset: false },
    storage: 1000, cpuBrand: 'any', gpuBrand: 'any', size: 'normal', store: 'any', wifi: false, quiet: false, future: false,
    os: false, assembly: false, have: { gpu: false, gpuText: '', ssd: 0, psu: 0, case: false } },
  rec: null, ed: null,
  up: { method: 'auto', cpuText: '', gpuText: '', cpu: null, gpu: null, platform: 'AM4', ramGB: 16, ramType: 'DDR4', psuW: 550, hasSsd: true,
    use: 'gaming', res: '1080p', budget: 500, store: 'any', detect: null },
  upRes: null, upKey: null,
  saved: store.get(KEY_SAVED, []), compare: new Set(),
  swap: { cat: null, sort: 'rec', q: '', trigger: null }
};
const USE_LIST = [
  ['gaming', 'Jugar', 'Juegos actuales con buena fluidez.'],
  ['streaming', 'Jugar y emitir', 'Juego y OBS a la vez, sin tirones.'],
  ['office', 'Ofimática y estudio', 'Navegar, Office, clases online y vídeo.'],
  ['dev', 'Programación', 'IDE, compilar, Docker y máquinas virtuales.'],
  ['creative', 'Editar foto y vídeo', 'Lightroom, Premiere, DaVinci Resolve.'],
  ['ai', 'IA local', 'Modelos de texto o imagen en tu equipo.']
];
const usesRes = (u) => u === 'gaming' || u === 'streaming';
function useTitle(q) {
  switch (q.use) {
    case 'gaming': return `jugar a ${q.res || '1080p'}`;
    case 'streaming': return `jugar y emitir a ${q.res || '1080p'}`;
    case 'office': return 'ofimática y estudio';
    case 'dev': return 'programar';
    case 'creative': return 'editar foto y vídeo';
    case 'ai': return 'IA local';
    default: return 'tu uso';
  }
}
const storeName = (k) => S.db.stores[k]?.name || k;

// ---------- arranque ----------
async function init() {
  initTheme();
  try {
    let raw = window.PC_DATA;
    if (!raw && location.protocol !== 'file:') {
      const r = await fetch('data/components.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      raw = await r.json();
    }
    if (!E || !HW || !raw || !Array.isArray(raw.items) || !raw.stores) throw new Error('formato');
    S.db = E.indexDb(raw);
    addStoreHosts(raw.stores);
  } catch {
    const el = $('#load-error');
    el.textContent = 'No se han podido cargar los precios: falta el archivo data/components.js o está dañado. Ejecuta «node scripts/validate-data.mjs» para regenerarlo.';
    el.hidden = false; $('#updated-badge').textContent = 'Sin datos';
    $('#wizard').hidden = true;
    return;
  }
  Object.assign(S.wiz, sanitizeWiz(store.get(KEY_WIZ, {})));
  S.wiz.step = 1;
  Object.assign(S.up, sanitizeUp(store.get(KEY_UP, {})));
  renderMeta();
  initNav();
  renderWizard();
  renderUpgrade();
  renderLaptops();
  renderCatalog();
  renderSaved();
  initSwap();
  loadShared();
  window.addEventListener('hashchange', loadShared);
  initAds();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
}

function sanitizeWiz(w) {
  const o = {};
  if (!w || typeof w !== 'object') return o;
  if (E.USES[w.use]) o.use = w.use;
  if (['1080p', '1440p', '4K'].includes(w.res)) o.res = w.res;
  if (Number.isFinite(w.budget) && w.budget >= 300 && w.budget <= 10000) o.budget = Math.round(w.budget);
  for (const k of ['competitive', 'wifi', 'quiet', 'future']) if (typeof w[k] === 'boolean') o[k] = w[k];
  if (['any', 'amd', 'intel'].includes(w.cpuBrand)) o.cpuBrand = w.cpuBrand;
  if (['any', 'nvidia', 'amd'].includes(w.gpuBrand)) o.gpuBrand = w.gpuBrand;
  if (['normal', 'compact'].includes(w.size)) o.size = w.size;
  if ([500, 1000, 2000].includes(w.storage)) o.storage = w.storage;
  if (typeof w.store === 'string' && (w.store === 'any' || S.db?.stores?.[w.store] || /^[a-z]{2,12}$/.test(w.store))) o.store = w.store;
  if (w.periph && typeof w.periph === 'object') o.periph = { monitor: !!w.periph.monitor, input: !!w.periph.input, headset: !!w.periph.headset };
  for (const k of ['os', 'assembly']) if (typeof w[k] === 'boolean') o[k] = w[k];
  if (w.have && typeof w.have === 'object') o.have = { gpu: !!w.have.gpu, gpuText: String(w.have.gpuText || '').slice(0, 80), ssd: [0, 500, 1000, 2000].includes(w.have.ssd) ? w.have.ssd : 0,
    psu: [0, 450, 550, 650, 750, 850, 1000].includes(w.have.psu) ? w.have.psu : 0, case: !!w.have.case };
  return o;
}
function sanitizeUp(u) {
  const o = {};
  if (!u || typeof u !== 'object') return o;
  if (typeof u.cpuText === 'string') o.cpuText = u.cpuText.slice(0, 80);
  if (typeof u.gpuText === 'string') o.gpuText = u.gpuText.slice(0, 80);
  if ([4, 8, 12, 16, 24, 32, 48, 64].includes(u.ramGB)) o.ramGB = u.ramGB;
  if (['DDR3', 'DDR4', 'DDR5'].includes(u.ramType)) o.ramType = u.ramType;
  if ([400, 550, 650, 750, 850, 1000].includes(u.psuW)) o.psuW = u.psuW;
  if (typeof u.hasSsd === 'boolean') o.hasSsd = u.hasSsd;
  if (E.USES[u.use]) o.use = u.use;
  if (['1080p', '1440p', '4K'].includes(u.res)) o.res = u.res;
  if (Number.isFinite(u.budget) && u.budget >= 50 && u.budget <= 5000) o.budget = Math.round(u.budget);
  if (E.PLATFORMS.some(p => p.key === u.platform)) o.platform = u.platform;
  if (['auto', 'report', 'manual'].includes(u.method)) o.method = u.method;
  return o;
}
const saveWiz = () => { const { step, ...rest } = S.wiz; void step; store.set(KEY_WIZ, rest); };
const saveUp = () => { const { cpu, gpu, detect, ...rest } = S.up; void cpu; void gpu; void detect; store.set(KEY_UP, rest); };

function initTheme() {
  const t = store.get(KEY_THEME, null);
  const sys = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(t === 'light' || t === 'dark' ? t : sys, false);
  $('#theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true));
}
function setTheme(t, persist) {
  document.documentElement.dataset.theme = t;
  const btn = $('#theme-toggle');
  clear(btn).append(icon(t === 'dark' ? 'sun' : 'moon'));
  btn.setAttribute('aria-label', t === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
  if (persist) store.set(KEY_THEME, t);
}

function renderMeta() {
  const db = S.db;
  $('#updated-badge').textContent = `Precios del ${fmtDate(db.updated)}`;
  const m = db.market;
  const mk = clear($('#market'));
  if (m) {
    mk.append(h('div', { class: 'market', role: 'note' }, icon('trend'), h('div', {},
      h('b', { text: m.title }), h('p', { text: m.text }),
      m.sources?.length ? h('p', {}, 'Fuentes: ', m.sources.map((s, i) => [i ? ', ' : '', extLink(s.url, s.title.split(':')[0])])) : null)));
  }
  const src = clear($('#sources'));
  src.append(h('span', { text: 'Tiendas:' }), ...Object.entries(db.stores).filter(([k]) => k !== 'geek').map(([, s]) => h('span', { text: s.name + (s.linkOnly ? ' (solo búsqueda)' : '') })));
}

// ---------- navegación ----------
function initNav() {
  for (const b of $$('.nav-btn')) b.addEventListener('click', () => setView(b.dataset.view));
}
function setView(v, focus = true) {
  for (const b of $$('.nav-btn')) { if (b.dataset.view === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
  for (const s of $$('.view')) s.hidden = s.id !== 'view-' + v;
  updateMbar();
  if (v === 'saved') renderSaved();
  window.scrollTo({ top: 0 });
  if (focus) $('#main').focus({ preventScroll: true });
}

// ---------- controles reutilizables ----------
function seg(label, options, value, onChange, opts = {}) {
  const id = 'l' + Math.random().toString(36).slice(2, 8);
  const group = h('div', { class: 'seg', role: 'radiogroup', 'aria-labelledby': id });
  const btns = options.map(([v, text]) => h('button', {
    type: 'button', class: 'seg-btn', role: 'radio', 'aria-checked': String(v === value), tabindex: v === value ? '0' : '-1',
    onclick: () => { select(v); onChange(v); }
  }, text));
  function select(v) { btns.forEach((b, i) => { const on = options[i][0] === v; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }); }
  group.addEventListener('keydown', (e) => radioKeys(e, btns));
  group.append(...btns);
  return h('div', { class: 'field' }, h('span', { class: 'field-label', id, text: label }), opts.hint ? h('span', { class: 'hint', text: opts.hint }) : null, group);
}
function radioKeys(e, btns) {
  const i = btns.indexOf(document.activeElement);
  if (i < 0) return;
  let n = null;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % btns.length;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + btns.length) % btns.length;
  if (n == null) return;
  e.preventDefault(); btns[n].focus(); btns[n].click();
}
function switchCtl(label, sub, checked, onChange) {
  const input = h('input', { type: 'checkbox', role: 'switch', checked, onchange: (e) => onChange(e.target.checked) });
  return h('label', { class: 'switch' }, h('span', {}, h('b', { text: label }), sub ? h('small', { text: sub }) : null), input);
}
function choice({ ico, title, sub, checked, role = 'radio', onClick, compact }) {
  return h('button', { type: 'button', class: 'choice' + (compact ? ' compact' : ''), role, 'aria-checked': String(!!checked), onclick: onClick },
    ico ? h('span', { class: 'ico' }, icon(ico)) : null, h('b', { text: title }), sub ? h('small', { text: sub }) : null,
    h('span', { class: 'tick' }, icon('check')));
}

// ---------- formulario por pasos ----------
const STEPS = ['Uso', 'Presupuesto', 'Ajustes'];
function renderWizard() {
  const w = S.wiz;
  const steps = clear($('#wiz-steps'));
  STEPS.forEach((s, i) => steps.append(h('li', { class: i + 1 < w.step ? 'is-done' : i + 1 === w.step ? 'is-now' : '', 'aria-current': i + 1 === w.step ? 'step' : null }, `${i + 1}. ${s}`)));
  const f = clear($('#wiz-form'));
  if (w.step === 1) stepUse(f);
  if (w.step === 2) stepBudget(f);
  if (w.step === 3) stepPrefs(f);
  renderWizBar();
}
function renderWizBar() {
  const w = S.wiz;
  const bar = clear($('#wiz-bar'));
  if (w.step > 1) bar.append(h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => goStep(w.step - 1) }, icon('left'), 'Atrás'));
  bar.append(h('span', { class: 'summary-line', text: `Para ${useTitle(w)}, hasta ${E.euro(w.budget)}` }), h('span', { class: 'spacer' }));
  if (w.step < 3) {
    if (w.step === 2) bar.append(h('button', { type: 'button', class: 'btn', onclick: runWizard }, 'Ver ya mi PC'));
    bar.append(h('button', { type: 'button', class: 'btn btn-primary', onclick: () => goStep(w.step + 1) }, 'Siguiente'));
  } else bar.append(h('button', { type: 'button', class: 'btn btn-primary', onclick: runWizard }, 'Ver mi configuración'));
}
function updateWizSummary() { const el = $('#wiz-bar .summary-line'); if (el) el.textContent = `Para ${useTitle(S.wiz)}, hasta ${E.euro(S.wiz.budget)}`; }
function goStep(n) {
  S.wiz.step = n; renderWizard();
  const first = $('#wiz-form button, #wiz-form input'); if (first) first.focus({ preventScroll: true });
  $('#wizard').scrollIntoView({ block: 'start' });
}
const PRESETS = [
  { label: 'Jugar, 900 €', q: { use: 'gaming', res: '1080p', budget: 900, storage: 500, periph: {} } },
  { label: 'Jugar con monitor, 1.000 €', q: { use: 'gaming', res: '1080p', budget: 1000, storage: 500, periph: { monitor: true, input: true } } },
  { label: 'Jugar a 1440p, 1.500 €', q: { use: 'gaming', res: '1440p', budget: 1500, storage: 1000, periph: {} } },
  { label: 'Jugar a 1440p, 2.000 €', q: { use: 'gaming', res: '1440p', budget: 2000, storage: 1000, periph: {} } },
  { label: 'Streaming, 2.000 €', q: { use: 'streaming', res: '1440p', budget: 2000, storage: 1000, periph: {} } },
  { label: 'Ofimática, 650 €', q: { use: 'office', res: '1080p', budget: 650, storage: 500, periph: {} } },
  { label: 'Programación, 1.200 €', q: { use: 'dev', res: '1080p', budget: 1200, storage: 1000, periph: {} } }
];
function applyPreset(p) {
  Object.assign(S.wiz, { cpuBrand: 'any', gpuBrand: 'any', size: 'normal', wifi: false, quiet: false, future: false, competitive: false }, p.q,
    { periph: { monitor: !!p.q.periph.monitor, input: !!p.q.periph.input, headset: !!p.q.periph.headset } });
  saveWiz(); runWizard();
}
function stepUse(f) {
  const w = S.wiz;
  f.append(h('div', { class: 'field presets' }, h('span', { class: 'field-label', text: '¿Con prisa? Empieza con una de estas' }),
    h('div', { class: 'chips' }, PRESETS.map(p => h('button', { type: 'button', class: 'chip-btn', onclick: () => applyPreset(p) }, p.label)))));
  const gid = 'use-label';
  const grid = h('div', { class: 'choices', role: 'radiogroup', 'aria-labelledby': gid });
  const btns = USE_LIST.map(([k, title, sub]) => choice({ ico: k, title, sub, checked: w.use === k, onClick: () => { w.use = k; saveWiz(); renderWizard(); $(`#wiz-form .choice[aria-checked="true"]`)?.focus(); } }));
  btns.forEach((b, i) => { b.tabIndex = USE_LIST[i][0] === w.use ? 0 : -1; });
  grid.addEventListener('keydown', (e) => radioKeys(e, btns));
  grid.append(...btns);
  f.append(h('fieldset', { class: 'field' }, h('legend', { id: gid, text: '¿Para qué lo vas a usar sobre todo?' }), grid));
  if (usesRes(w.use)) {
    f.append(h('div', { class: 'seg-row' },
      seg('¿A qué resolución juegas?', [['1080p', '1080p'], ['1440p', '1440p'], ['4K', '4K']], w.res, (v) => { w.res = v; saveWiz(); updateWizSummary(); }, { hint: 'La de tu monitor. Si dudas, 1080p o 1440p.' }),
      h('div', { class: 'field' }, h('span', { class: 'field-label', text: 'Tipo de juegos' }),
        switchCtl('Competitivos', 'Valorant, CS2, Fortnite: priorizamos muchos FPS.', w.competitive, (v) => { w.competitive = v; saveWiz(); }))));
  }
  f.append(h('p', { class: 'manual-link' }, h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: openManual }, icon('pencil'), 'Prefiero elegir pieza a pieza')));
}
function periphFrom(cat, filter) {
  const list = S.db.byCat[cat].filter(filter || (() => true));
  const p = Math.min(...list.map(i => E.priceOf(i, 'any', S.db.stores)));
  return isFinite(p) ? `Desde ${E.euro(Math.round(p))}` : '';
}
function stepBudget(f) {
  const w = S.wiz;
  const input = h('input', { type: 'number', id: 'budget', inputmode: 'numeric', min: 300, max: 10000, step: 50, value: w.budget, 'aria-describedby': 'budget-note' });
  const range = h('input', { type: 'range', class: 'range', min: 400, max: 5000, step: 50, value: Math.min(5000, Math.max(400, w.budget)), 'aria-label': 'Presupuesto' });
  const chips = h('div', { class: 'chips' });
  const presets = [700, 1000, 1500, 2000, 3000];
  const set = (v, from) => {
    v = Math.round(Number(v));
    if (!Number.isFinite(v)) return;
    w.budget = Math.min(10000, Math.max(300, v)); saveWiz();
    if (from !== 'input') input.value = w.budget;
    if (from !== 'range') range.value = Math.min(5000, Math.max(400, w.budget));
    for (const c of chips.children) c.setAttribute('aria-pressed', String(+c.dataset.v === w.budget));
    updateWizSummary();
  };
  for (const p of presets) chips.append(h('button', { type: 'button', class: 'chip-btn', dataset: { v: p }, 'aria-pressed': String(p === w.budget), onclick: () => set(p) }, E.euro(p)));
  input.addEventListener('input', () => { if (input.value) set(input.value, 'input'); });
  input.addEventListener('change', () => set(input.value || 1000));
  range.addEventListener('input', () => set(range.value, 'range'));
  f.append(h('div', { class: 'field' },
    h('label', { class: 'field-label', for: 'budget', text: '¿Cuánto quieres gastar como máximo?' }),
    h('div', { class: 'budget' },
      h('div', { class: 'budget-input' }, input, h('span', { text: '€' })), range, chips,
      h('p', { class: 'budget-note', id: 'budget-note', text: 'Es un tope: la configuración recomendada nunca lo supera. Incluye la torre y los periféricos que marques abajo.' }))));

  const pgrid = h('div', { class: 'choices cols-3', role: 'group', 'aria-labelledby': 'periph-l' });
  const P = [['monitor', 'monitor', 'Monitor', periphFrom('monitor')], ['input', 'keyboard', 'Teclado y ratón', periphFrom('keyboard', k => k.specs.kind === 'combo')], ['headset', 'headset', 'Auriculares', periphFrom('headset')]];
  for (const [k, ico, title, sub] of P) {
    pgrid.append(choice({ ico, title, sub, role: 'checkbox', checked: w.periph[k], onClick: (e) => { w.periph[k] = !w.periph[k]; saveWiz(); e.currentTarget.setAttribute('aria-checked', String(w.periph[k])); } }));
  }
  f.append(h('fieldset', { class: 'field' }, h('legend', { id: 'periph-l', text: '¿Necesitas también periféricos?' }), h('span', { class: 'hint', text: 'Si el presupuesto es ajustado elegimos modelos sencillos; a partir de 1.600 € pasamos a gama gaming.' }), pgrid));
  f.append(h('div', { class: 'seg-row' }, seg('Almacenamiento', [[500, '500 GB'], [1000, '1 TB'], [2000, '2 TB']], w.storage, (v) => { w.storage = v; saveWiz(); }, { hint: 'SSD NVMe. Con 500 GB ahorras; 1 TB es lo cómodo para juegos.' })));
}
function stepPrefs(f) {
  const w = S.wiz;
  const stores = [['any', 'La más barata en cada pieza'], ...Object.entries(S.db.stores).filter(([k, v]) => !v.linkOnly && k !== 'geek').map(([k, v]) => [k, v.name])];
  const sel = h('select', { class: 'input', id: 'q-store', onchange: (e) => { w.store = e.target.value; saveWiz(); } }, stores.map(([v, t]) => h('option', { value: v, selected: v === w.store }, t)));
  f.append(h('div', { class: 'seg-row' },
    seg('Procesador', [['any', 'Me da igual'], ['amd', 'AMD'], ['intel', 'Intel']], w.cpuBrand, (v) => { w.cpuBrand = v; saveWiz(); }),
    seg('Tarjeta gráfica', [['any', 'Me da igual'], ['nvidia', 'NVIDIA'], ['amd', 'AMD']], w.gpuBrand, (v) => { w.gpuBrand = v; saveWiz(); }),
    seg('Tamaño de la torre', [['normal', 'Normal'], ['compact', 'Compacta']], w.size, (v) => { w.size = v; saveWiz(); }),
    h('div', { class: 'field' }, h('label', { class: 'field-label', for: 'q-store', text: 'Tienda' }), h('span', { class: 'hint', text: 'Si una pieza no está en esa tienda, usamos la más barata.' }), sel)));
  f.append(h('div', { class: 'switches' },
    switchCtl('WiFi integrado', 'Si no puedes llevar cable de red al PC.', w.wifi, (v) => { w.wifi = v; saveWiz(); }),
    switchCtl('Silencioso', 'Disipador más grande para que no se oiga.', w.quiet, (v) => { w.quiet = v; saveWiz(); }),
    switchCtl('Pensar en el futuro', 'Plataforma actual (AM5 o Intel 1851) para cambiar el procesador más adelante.', w.future, (v) => { w.future = v; saveWiz(); })));

  const osIt = S.db.byCat.os?.[0], asIt = S.db.byCat.assembly?.[0];
  const pr = (it) => it ? E.euro(E.priceOf(it, 'any', S.db.stores)) : '';
  f.append(h('fieldset', { class: 'field' }, h('legend', { text: 'Extras' }), h('div', { class: 'switches' },
    osIt ? switchCtl(`Incluir Windows 11 Home (${pr(osIt)})`, 'Licencia OEM vendida por PcComponentes. Sin ella puedes usar Windows sin activar o Linux.', w.os, (v) => { w.os = v; saveWiz(); }) : null,
    asIt ? switchCtl(`Montaje en tienda (${pr(asIt)})`, 'Solo si compras todas las piezas en PcComponentes. Al activarlo elegimos esa tienda.', w.assembly, (v) => {
      w.assembly = v; if (v) w.store = 'pcc'; saveWiz(); const sel = $('#q-store'); if (sel && v) sel.value = 'pcc';
    }) : null)));

  // Piezas que reutilizas
  const hv = w.have;
  const box = h('div', { class: 'have-grid' });
  const gpuRec = h('p', { class: 'recog muted' });
  const updRec = () => {
    const g = HW.matchGpu(hv.gpuText);
    clear(gpuRec); gpuRec.className = 'recog ' + (g && !g.integrated ? 'ok' : hv.gpuText ? 'warn' : 'muted');
    gpuRec.append(g && !g.integrated ? icon('check') : hv.gpuText ? icon('alert') : '', g && !g.integrated ? `Reconocida: ${g.name}, ${g.vram} GB` : hv.gpuText ? 'No la reconocemos: prueba con el modelo, por ejemplo «RTX 3060».' : 'Escribe el modelo.');
  };
  const gpuIn = h('input', { class: 'input', id: 'have-gpu', list: 'dl-gpu-have', value: hv.gpuText, placeholder: 'Ej.: RTX 3060, RX 6700 XT', autocomplete: 'off',
    oninput: (e) => { hv.gpuText = e.target.value.slice(0, 80); saveWiz(); updRec(); } });
  updRec();
  const gpuRow = h('div', { class: 'input-wrap', hidden: !hv.gpu }, h('label', { for: 'have-gpu', text: 'Modelo de tu gráfica' }), gpuIn, h('datalist', { id: 'dl-gpu-have' }, HW.GPUS.map(g => h('option', { value: g.name }))), gpuRec);
  box.append(
    h('div', {}, switchCtl('Tarjeta gráfica', 'La pasamos al PC nuevo y repartimos el dinero en lo demás.', hv.gpu, (v) => { hv.gpu = v; saveWiz(); gpuRow.hidden = !v; if (v) gpuIn.focus(); }), gpuRow),
    seg('SSD que reutilizas', [[0, 'Ninguno'], [500, '500 GB'], [1000, '1 TB'], [2000, '2 TB']], hv.ssd, (v) => { hv.ssd = v; saveWiz(); }),
    seg('Fuente que reutilizas', [[0, 'Ninguna'], [550, '550 W'], [650, '650 W'], [750, '750 W'], [850, '850 W+']], hv.psu, (v) => { hv.psu = v; saveWiz(); }, { hint: 'Si se queda corta para la gráfica nueva, te proponemos otra.' }),
    switchCtl('Caja', 'Comprueba tú que la gráfica y el disipador caben.', hv.case, (v) => { hv.case = v; saveWiz(); }));
  f.append(h('fieldset', { class: 'field' }, h('legend', { text: '¿Reutilizas algo de tu PC actual?' }), box));
}
function wizQuery() {
  const w = S.wiz;
  return { use: w.use, res: usesRes(w.use) ? w.res : '1080p', competitive: usesRes(w.use) && w.competitive, budget: w.budget, periph: { ...w.periph },
    storage: w.storage, cpuBrand: w.cpuBrand, gpuBrand: w.gpuBrand, size: w.size, store: w.store, wifi: w.wifi, quiet: w.quiet, future: w.future,
    os: w.os, assembly: w.assembly, have: haveQuery(w.have) };
}
function haveQuery(hv) {
  if (!hv) return null;
  const o = {};
  if (hv.gpu) { const g = HW.matchGpu(hv.gpuText); if (g && !g.integrated) o.gpu = { name: g.name, idx: g.idx, vram: g.vram, tbp: g.tbp }; }
  if (hv.ssd) o.ssd = hv.ssd;
  if (hv.psu) o.psu = hv.psu;
  if (hv.case) o.case = true;
  return Object.keys(o).length ? o : null;
}
function runWizard() {
  const q = wizQuery();
  const r = E.recommend(S.db, q);
  S.rec = { r, q };
  if (r.options.length) openEditor(r.options[0].build, q, { origin: 'wizard', optKey: 'rec' });
  else openBlocked(r, q);
}

// ---------- sin presupuesto suficiente ----------
function openBlocked(r, q) {
  S.ed = null;
  const ed = clear($('#editor'));
  $('#wizard').hidden = true; ed.hidden = false;
  const b = r.blocked;
  ed.append(h('button', { type: 'button', class: 'back', onclick: backToWizard }, icon('left'), 'Cambiar respuestas'));
  ed.append(h('div', { class: 'ed-head' }, h('div', {}, h('h1', { text: `Con ${E.euro(q.budget)} no llega para ${useTitle(q)}` }),
    h('p', { class: 'lead', text: 'No te vamos a proponer algo que se pase de tu presupuesto sin avisar. Estas son tus opciones:' }))));
  const box = h('div', { class: 'panel' });
  if (!b) { box.append(h('p', { text: r.warnings[0] || 'No hay combinaciones posibles con estos filtros. Prueba a quitar alguna preferencia.' })); ed.append(box); return; }
  box.append(h('div', { class: 'perf-line' }, h('span', { class: 'ico' }, icon('info')), h('div', {}, h('b', { text: `El PC más barato que cumple cuesta ${E.euro(b.minTotal)}` }), h('small', { text: `Te faltan ${E.euro(Math.ceil(b.minTotal - q.budget))}.` }))));
  const acts = h('div', { class: 'chips' });
  const nb = Math.ceil(b.minTotal / 50) * 50;
  acts.append(h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { S.wiz.budget = nb; saveWiz(); runWizard(); } }, `Subir el presupuesto a ${E.euro(nb)}`));
  if (b.fitsWithoutPeriph) acts.append(h('button', { type: 'button', class: 'btn', onclick: () => { S.wiz.periph = { monitor: false, input: false, headset: false }; saveWiz(); runWizard(); } }, `Quitar periféricos (la torre sí entra: ${E.euro(b.towerTotal)})`));
  if (q.storage !== 500) acts.append(h('button', { type: 'button', class: 'btn', onclick: () => { S.wiz.storage = 500; saveWiz(); runWizard(); } }, 'Probar con SSD de 500 GB'));
  acts.append(h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => openEditor(b.cheapest.build, q, { origin: 'wizard', optKey: null, overNote: true }) }, 'Ver el más barato igualmente'));
  box.append(acts);
  ed.append(box);
  window.scrollTo({ top: 0 });
}
function backToWizard() {
  $('#editor').hidden = true; $('#wizard').hidden = false; S.ed = null; updateMbar();
  S.wiz.step = 1; renderWizard(); window.scrollTo({ top: 0 });
}

// ---------- editor de configuración ----------
function openEditor(build, q, opts = {}) {
  S.ed = { build: { ...build }, q: { ...q }, origin: opts.origin || 'manual', optKey: opts.optKey ?? null, name: opts.name || '', savedId: opts.savedId || null, shared: !!opts.shared };
  setView('build', false);
  $('#wizard').hidden = true; $('#editor').hidden = false;
  renderEditor(true);
  window.scrollTo({ top: 0 });
  $('#editor h1')?.focus?.();
}
function openManual() {
  const q = wizQuery();
  openEditor({}, q, { origin: 'manual' });
}
function edTotal() { return E.buildTotal(S.ed.build, S.ed.q.store, S.db.stores); }

function renderEditor(animate) {
  const ed = clear($('#editor'));
  const { build, q, origin } = S.ed;
  const total = edTotal();
  const budget = q.budget || null;

  ed.append(h('button', { type: 'button', class: 'back', onclick: origin === 'saved' ? () => setView('saved') : backToWizard }, icon('left'), origin === 'saved' ? 'Volver a guardadas' : 'Cambiar respuestas'));
  const title = origin === 'manual' && !Object.keys(build).length ? 'Elige tus piezas' : `Tu PC para ${useTitle(q)}`;
  const head = h('div', { class: 'ed-head' }, h('div', {}, h('h1', { text: title, tabindex: '-1' }),
    h('p', { class: 'lead', text: budget ? `Presupuesto máximo ${E.euro(budget)}. Precios del ${fmtDate(S.db.updated)}.` : `Precios del ${fmtDate(S.db.updated)}.` })));
  ed.append(head);

  if (origin === 'wizard' && S.rec?.r.options.length) {
    const r = S.rec.r;
    const opts = h('div', { class: 'opts', role: 'radiogroup', 'aria-label': 'Opciones' });
    const btns = r.options.map(o => h('button', { type: 'button', class: 'opt-pill', role: 'radio', 'aria-checked': String(S.ed.optKey === o.key),
      onclick: () => { S.ed.build = { ...o.build }; S.ed.optKey = o.key; renderEditor(true); } }, o.label, h('small', { class: 'num', text: E.euro(o.total) })));
    opts.addEventListener('keydown', (e) => radioKeys(e, btns));
    opts.append(...btns);
    if (!S.ed.optKey) opts.append(h('span', { class: 'hint', text: 'Has cambiado piezas a mano.' }));
    const nOpts = r.options.length + (r.upsell ? 1 : 0) + (S.ed.optKey ? 0 : 1);
    if (nOpts >= 2) opts.append(h('button', { type: 'button', class: 'btn btn-ghost btn-sm', 'aria-expanded': String(!!S.ed.compare), onclick: () => { S.ed.compare = !S.ed.compare; renderEditor(false); } }, icon('csv'), S.ed.compare ? 'Ocultar comparación' : 'Comparar opciones'));
    if (r.upsell) {
      const u = r.upsell;
      opts.append(h('button', { type: 'button', class: 'upsell', 'aria-pressed': String(S.ed.optKey === 'upsell'),
        onclick: () => { S.ed.build = { ...u.build }; S.ed.optKey = 'upsell'; renderEditor(true); } },
      icon('trend'), h('span', {}, 'Con ', h('b', { text: `${E.euro(u.extra)} más` }), `, ${pct(u.gain)} de rendimiento`)));
    }
    ed.append(h('div', { class: 'ed-head', style: { 'padding-top': '0' } }, opts));
    if (S.ed.compare) ed.append(compareOptions(r, q));
  }
  if (S.ed.shared) ed.append(notice('info', ['Te han compartido esta configuración. Los precios son los de hoy, no los del día en que se compartió.']));
  if (budget && total > budget + 0.005) ed.append(notice('err', [`Esta configuración se pasa de tu presupuesto en ${E.euro(Math.ceil(total - budget))}.`]));
  if (origin === 'wizard' && S.rec?.r.warnings.length) ed.append(notice('warn', S.rec.r.warnings));
  if (origin === 'wizard' && S.ed.optKey === 'rec' && build.ram?.specs.type === 'DDR4' && ['gaming', 'streaming', 'office'].includes(q.use)) {
    ed.append(notice('info', ['Lleva memoria DDR4 a propósito: ahora cuesta menos de la mitad que la DDR5 y en uso real apenas se nota.']));
  }

  const grid = h('div', { class: 'ed-grid' });
  const main = h('div', { class: 'ed-main' }, partsList(build, q), build.cpu ? gamesPanel(build, q) : null, guidePanel(build), adSlot('result'));
  grid.append(main, summaryCard(build, q, total, budget, animate));
  ed.append(grid);
  updateMbar();
  fillAds();
}
function notice(kind, lines) {
  return h('div', { class: 'notice ' + kind, role: kind === 'err' ? 'alert' : 'note' }, icon(kind === 'info' ? 'info' : 'alert'), h('div', {}, lines.map(l => h('p', { text: l }))));
}

function specChips(it) {
  const s = it.specs;
  const size = (n) => n >= 1000 ? `${n / 1000} TB` : `${n} GB`;
  switch (it.cat) {
    case 'cpu': return [s.socket, `${s.cores} núcleos`, s.mem.join(' y '), s.igpu ? 'Gráficos integrados' : null, s.cooler ? 'Disipador incluido' : null];
    case 'gpu': return [`${s.vram} GB`, `${s.tbp} W`, s.length ? `${s.length} mm` : null];
    case 'mobo': return [s.chipset, s.mem, s.form, s.wifi ? 'WiFi' : null];
    case 'ram': return [s.type, `${s.size} GB`, s.speed ? `${s.speed} MHz` : null];
    case 'ssd': return [size(s.size), `PCIe ${s.gen}.0`];
    case 'psu': return [`${s.watts} W`, `80+ ${s.rating}`, s.modular ? 'Modular' : null];
    case 'case': return [s.forms.join(', '), s.gpuMax ? `Gráfica hasta ${s.gpuMax} mm` : 'Medidas sin verificar', s.size === 'compacta' ? 'Compacta' : null];
    case 'cooler': return s.type === 'aio' ? [`Líquida ${s.rad} mm`, `Hasta ${s.maxPower} W`] : ['Aire', `Hasta ${s.maxPower} W`, s.height ? `${s.height} mm` : null];
    case 'monitor': return [`${s.size}"`, s.res, `${s.hz} Hz`, s.panel];
    case 'keyboard': return [s.kind === 'combo' ? 'Teclado y ratón' : 'Teclado', s.wireless ? 'Inalámbrico' : 'Con cable'];
    case 'mouse': case 'headset': return [s.wireless ? 'Inalámbrico' : 'Con cable'];
    case 'os': return [`Windows 11 ${s.edition}`, s.license];
    case 'assembly': return ['Montaje', 'Test de componentes', 'BIOS actualizada'];
    case 'laptop': return [s.cpu, s.gpu || 'Gráficos integrados', `${s.ram} GB RAM`, size(s.ssd), `${s.screen}"`, s.panel, s.hz ? `${s.hz} Hz` : null, s.os];
    default: return [];
  }
}
function tierBadge(it, use) {
  const p = E.componentPoints(it, use);
  if (!p) return null;
  return h('span', { class: 'tier', dataset: { t: p.tier }, title: `${p.pts} de 100 puntos. ${p.basis}.` }, h('b', { text: p.tier }), h('span', { text: `${p.pts} pts` }));
}
const chipsEl = (it) => h('div', { class: 'specs' }, specChips(it).filter(Boolean).map(t => h('span', { class: 'spec', text: t })));
// Historial: [[fecha, precio], ...] con los precios anteriores que guardó scripts/precio.mjs.
function histNote(p) {
  const hist = Array.isArray(p.hist) ? p.hist.filter(x => Array.isArray(x) && typeof x[1] === 'number') : [];
  if (!hist.length) return null;
  const prev = hist[hist.length - 1][1];
  const min = Math.min(...hist.map(x => x[1]), p.price);
  const d = p.price - prev;
  const bits = [];
  if (Math.abs(d) >= 0.5) bits.push(h('span', { class: d < 0 ? 'trend down' : 'trend up', text: `${d < 0 ? 'Baja' : 'Sube'} ${E.euro(Math.abs(Math.round(d)))}` }));
  if (p.price <= min + 0.005) bits.push(h('span', { class: 'trend down', text: 'Mínimo registrado' }));
  else bits.push(h('span', { class: 'trend', text: `Mín. ${E.euro(min)}` }));
  return h('span', { class: 'hist' }, bits);
}
function offersEl(item, sp) {
  const st = S.db.stores;
  const best = E.bestOffer(item, sp, st);
  const list = item.prices.filter(p => !st[p.store]?.linkOnly).sort((a, b) => a.price - b.price);
  const ul = h('ul', { class: 'offer-list' });
  for (const p of list) {
    ul.append(h('li', { class: p === best ? 'best' : '' },
      extLink(p.url, [storeName(p.store), icon('ext')]),
      h('span', { class: p.date ? 'offer-date' : 'offer-date unconfirmed' }, p.date ? fmtDate(p.date) : 'Sin confirmar', histNote(p)),
      h('b', { class: 'num', text: E.euro(p.price) })));
  }
  const n = list.length;
  const more = h('p', { class: 'find-more' }, '¿Más barato en otra tienda? Busca en ', extLink(shopSearch(item.name), ['Google Shopping', icon('ext')]), ' o ', extLink(amazonSearch(item.name), ['Amazon', icon('ext')]), '.');
  return h('details', { class: 'offers' }, h('summary', {}, icon('chev'), n === 1 ? 'Ver en la tienda' : `Comparar ${n} tiendas`), ul, more, item.why ? h('p', { class: 'why', text: item.why }) : null);
}

function partsList(build, q) {
  const box = h('div', { class: 'parts' });
  const sp = q.store;
  const coreTotal = E.buildTotal(Object.fromEntries(E.CORE_CATS.filter(c => build[c]).map(c => [c, build[c]])), sp, S.db.stores);
  box.append(h('div', { class: 'parts-group' }, h('span', { text: 'Torre' }), h('span', { class: 'num', text: E.euro(coreTotal) })));
  for (const c of E.CORE_CATS) box.append(partRow(c, build, q));
  const per = E.PERIPH_CATS.filter(c => build[c]);
  const perTotal = E.buildTotal(Object.fromEntries(per.map(c => [c, build[c]])), sp, S.db.stores);
  box.append(h('div', { class: 'parts-group' }, h('span', { text: 'Periféricos' }), h('span', { class: 'num', text: per.length ? E.euro(perTotal) : 'Opcional' })));
  for (const c of E.PERIPH_CATS) {
    if (c === 'mouse' && build.keyboard?.specs.kind === 'combo' && !build.mouse) continue;
    box.append(partRow(c, build, q));
  }
  if (S.db.byCat.os?.length || S.db.byCat.assembly?.length) {
    const ex = E.EXTRA_CATS.filter(c => build[c]);
    const exTotal = E.buildTotal(Object.fromEntries(ex.map(c => [c, build[c]])), sp, S.db.stores);
    box.append(h('div', { class: 'parts-group' }, h('span', { text: 'Software y servicios' }), h('span', { class: 'num', text: ex.length ? E.euro(exTotal) : 'Opcional' })));
    for (const c of E.EXTRA_CATS) if (S.db.byCat[c]?.length) box.append(partRow(c, build, q));
  }
  return box;
}
function partRow(cat, build, q) {
  const it = build[cat];
  const sp = q.store;
  let empty = null;
  if (!it) {
    if (cat === 'gpu' && build.cpu?.specs.igpu) empty = 'Gráficos integrados del procesador';
    else if (cat === 'cooler' && build.cpu?.specs.cooler) empty = 'Disipador incluido con el procesador';
    else if (E.PERIPH_CATS.includes(cat) || E.EXTRA_CATS.includes(cat)) empty = 'No incluido';
    else empty = 'Sin elegir';
  }
  const offer = it ? E.bestOffer(it, sp, S.db.stores) : null;
  const label = it ? 'Cambiar' : (E.PERIPH_CATS.includes(cat) || E.EXTRA_CATS.includes(cat) ? 'Añadir' : (empty === 'Sin elegir' ? 'Elegir' : 'Cambiar'));
  const btn = h('button', { type: 'button', class: 'btn btn-sm' + (label === 'Elegir' ? ' btn-primary' : ''), 'aria-label': `${label} ${E.CAT_LABEL[cat].toLowerCase()}`, onclick: (e) => openSwap(cat, e.currentTarget) },
    icon(label === 'Cambiar' ? 'chev' : 'plus'), label);
  return h('div', { class: 'part', dataset: { cat } },
    h('span', { class: 'part-tile' }, icon(cat)),
    h('div', { class: 'part-main' },
      h('span', { class: 'part-cat' }, E.CAT_LABEL[cat], it ? tierBadge(it, q.use) : null),
      h('span', { class: 'part-name' + (it ? '' : ' is-empty'), text: it ? it.name : empty }),
      it ? chipsEl(it) : null),
    h('div', { class: 'part-side' },
      it?.owned ? h('span', { class: 'owned-tag', text: 'Ya la tienes' }) : it ? h('span', {}, h('span', { class: 'price', text: E.euro(offer?.price) }), ' ', h('span', { class: 'store', text: offer ? storeName(offer.store) : '' })) : null,
      btn),
    it && !it.owned ? h('div', { class: 'part-extra' }, offersEl(it, sp)) : null);
}

// ---------- comparar opciones ----------
function compareOptions(r, q) {
  const cols = r.options.map(o => ({ label: o.label, build: o.build }));
  if (r.upsell) cols.push({ label: r.upsell.label, build: r.upsell.build });
  if (!S.ed.optKey) cols.push({ label: 'Tu versión', build: S.ed.build });
  const sp = q.store, res = usesRes(q.use) ? q.res : '1080p';
  const t = h('table', { class: 'cmp' });
  t.append(h('thead', {}, h('tr', {}, h('th', { text: '' }), cols.map(c => h('th', { scope: 'col', text: c.label })))));
  const tb = h('tbody');
  const row = (label, vals, diff, strong) => tb.append(h('tr', { class: diff ? 'diff' : '' }, h('th', { scope: 'row', text: label }), vals.map(v => h('td', {}, strong ? h('b', { text: v }) : v))));
  for (const c of E.CATS) {
    if (!cols.some(x => x.build[c])) continue;
    const ids = new Set(cols.map(x => x.build[c]?.id || ''));
    row(E.CAT_LABEL[c], cols.map(x => x.build[c] ? `${x.build[c].name} (${x.build[c].owned ? 'ya la tienes' : E.euro(E.priceOf(x.build[c], sp, S.db.stores))})` : '—'), ids.size > 1);
  }
  const totals = cols.map(x => E.buildTotal(x.build, sp, S.db.stores));
  row('Total', totals.map(v => E.euro(v)), true, true);
  if (q.budget) row('Presupuesto', totals.map(v => v <= q.budget ? `Te sobran ${E.euro(Math.floor(q.budget - v))}` : `Te pasas ${E.euro(Math.ceil(v - q.budget))}`), true);
  row(`FPS medios (${res})`, cols.map(x => { const f = E.avgFps(x.build, res); return f ? String(Math.round(f)) : '—'; }), true, true);
  row('Coste por FPS', cols.map((x, i) => { const v = E.costPerFps(totals[i], x.build, res); return v ? E.euro(Math.round(v * 100) / 100) : '—'; }), true);
  row('Puntuación', cols.map(x => { const p = E.buildPoints(x.build, q.use); return p ? `${p.pts}/100 (${p.tier})` : '—'; }), true);
  row('Nivel en juegos', cols.map(x => x.build.cpu ? E.gamingLevel(x.build.gpu, x.build.cpu).text : '—'), true);
  t.append(tb);
  return h('section', { class: 'compare-box', 'aria-label': 'Comparación de opciones' }, h('div', { class: 'cmp-wrap' }, t));
}

// ---------- guía de montaje ----------
function guidePanel(build) {
  const steps = E.assemblyGuide(build);
  if (!steps.length) return null;
  return h('details', { class: 'guide' }, h('summary', {}, icon('chev'), h('span', {}, h('b', { text: 'Guía de montaje para estas piezas' }), h('small', { text: `${steps.length} pasos. También va en el PDF.` }))),
    h('ol', { class: 'guide-list' }, steps.map(st => h('li', {}, h('b', { text: st.title }), h('p', { text: st.text })))));
}

// ---------- FPS estimados por juego ----------
function gamesPanel(build, q, opts = {}) {
  const panel = h('section', { class: 'games', 'aria-labelledby': 'games-h' });
  let res = usesRes(q.use) ? q.res : '1080p';
  const body = h('div');
  const draw = () => {
    clear(body);
    const rows = E.gamesTable(build, res);
    const before = opts.before ? E.gamesTable(opts.before, res) : null;
    const max = Math.max(240, ...rows.map(r => r.fps || 0).filter(f => f < 400));
    const list = h('ul', { class: 'game-list' });
    rows.forEach((r, i) => {
      const w = Math.max(2, Math.min(100, (r.fps || 0) / max * 100));
      const bar = h('span', { class: 'gbar' }, h('i', { dataset: { t: r.tier?.key || 'bad' }, style: { width: w + '%' } }));
      if (before) { const bw = Math.max(1, Math.min(100, (before[i].fps || 0) / max * 100)); bar.append(h('s', { style: { width: bw + '%' } })); }
      list.append(h('li', {},
        h('span', { class: 'gname' }, h('b', { text: r.game.name }), h('small', { text: r.game.preset })),
        bar,
        h('span', { class: 'gfps num' }, before ? h('small', { text: `${before[i].fps} → ` }) : null, h('b', { text: String(r.fps) }), ' FPS'),
        h('span', { class: 'gtier', dataset: { t: r.tier?.key || 'bad' }, text: r.tier?.text || '' })));
    });
    body.append(list);
    const bn = E.bottleneck(opts.after || build, res);
    if (bn && !opts.before) body.append(h('p', { class: 'bneck ' + bn.who }, icon(bn.who === 'cpu' ? 'alert' : 'info'), bn.text));
  };
  const sw = seg('Resolución', [['1080p', '1080p'], ['1440p', '1440p'], ['4K', '4K']], res, (v) => { res = v; draw(); });
  sw.querySelector('.field-label').classList.add('sr-only');
  panel.append(h('div', { class: 'games-head' }, h('div', {}, h('h2', { id: 'games-h', text: opts.title || 'FPS estimados en juegos' }),
    h('p', { class: 'hint', text: 'Calidad indicada en cada juego, sin DLSS, FSR ni generación de fotogramas.' })), sw), body,
  h('p', { class: 'games-note', text: 'Estimación orientativa (±20 %). Calibrada con la media de 25 juegos que publicó TechPowerUp para la RTX 5070; el peso de cada juego es aproximado.' }));
  draw();
  return panel;
}

// ---------- anuncios ----------
const IS_LOCAL = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);
function initAds() {
  if (CFG.client) {
    const sc = document.createElement('script');
    sc.async = true; sc.crossOrigin = 'anonymous';
    sc.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(CFG.client);
    document.head.append(sc);
    const pr = $('#privacy');
    if (pr) { clear(pr).append(h('strong', { text: 'Privacidad.' }), ' Sin cuentas ni analítica propia. Mostramos anuncios de Google, que usan cookies solo si las aceptas en el aviso. Lo que detectamos de tu PC no sale de tu navegador. ', h('a', { href: 'privacidad.html', text: 'Política de privacidad' }), '.'); }
  }
  const foot = $('#ad-footer'); if (foot) { clear(foot); const a = adSlot('footer'); if (a) foot.append(a); }
  const cat = $('#catalog'); if (cat) { const a = adSlot('catalog'); if (a) cat.append(a); }
  fillAds();
}
function adSlot(name) {
  if (CFG.client && CFG.slots[name]) {
    const ins = h('ins', { class: 'adsbygoogle', 'data-ad-client': CFG.client, 'data-ad-slot': CFG.slots[name], 'data-ad-format': 'auto', 'data-full-width-responsive': 'true' });
    ins.style.setProperty('display', 'block');
    return h('aside', { class: 'ad', 'aria-label': 'Publicidad' }, h('span', { class: 'ad-label', text: 'Publicidad' }), ins);
  }
  if (IS_LOCAL && !CFG.client) return h('aside', { class: 'ad ad-demo', 'aria-label': 'Espacio para anuncio' }, h('span', { class: 'ad-label', text: 'Publicidad' }), h('div', { class: 'ad-ph', text: 'Aquí irá un anuncio cuando actives AdSense (solo se ve en local).' }));
  return null;
}
function fillAds() {
  if (!CFG.client) return;
  for (const ins of $$('ins.adsbygoogle:not([data-filled])')) {
    ins.setAttribute('data-filled', '1');
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* bloqueador de anuncios */ }
  }
}

function perfInfo(b, q) {
  if (!b.cpu) return { title: 'Elige un procesador para ver el rendimiento', sub: '' };
  const ram = b.ram?.specs.size, vram = b.gpu?.specs.vram;
  const lvl = E.gamingLevel(b.gpu, b.cpu);
  switch (q.use) {
    case 'gaming': case 'streaming':
      return { title: `Juega a ${lvl.text}`, sub: q.use === 'streaming' ? `${b.cpu.specs.cores} núcleos para emitir con OBS mientras juegas.` : (b.gpu ? `${b.gpu.specs.chip || b.gpu.name} con ${vram} GB de VRAM.` : '') };
    case 'office': return { title: 'Va sobrado para ofimática, clases online y vídeo', sub: ram ? `${ram} GB de RAM: decenas de pestañas sin problema.` : '' };
    case 'dev': return { title: `${b.cpu.specs.cores} núcleos${ram ? ` y ${ram} GB de RAM` : ''} para compilar y virtualizar`, sub: `En juegos: ${lvl.text}.` };
    case 'creative': return { title: `${b.cpu.specs.cores} núcleos${vram ? `, ${vram} GB de VRAM` : ''}${ram ? ` y ${ram} GB de RAM` : ''}`, sub: 'Edición de 4K fluida con proxies en proyectos largos.' };
    case 'ai': return { title: vram ? `${vram} GB de VRAM para modelos locales` : 'Sin gráfica dedicada: la IA local irá muy lenta', sub: vram >= 16 ? 'Caben modelos de 13-14B cuantizados y generación de imagen.' : vram ? 'Modelos pequeños (7-8B cuantizados).' : '' };
    default: return { title: lvl.text, sub: '' };
  }
}

function budgetStack(build, total, budget, sp, animate) {
  const parts = E.CATS.filter(c => build[c]).map(c => ({ c, p: E.priceOf(build[c], sp, S.db.stores) })).sort((a, b) => b.p - a.p);
  const scale = Math.max(budget || 0, total) || 1;
  const stack = h('div', { class: 'stack' + (budget && total > budget ? ' over' : '') + (animate ? ' reveal' : ''), role: 'img',
    'aria-label': budget ? `Gastas ${E.euro(total)} de ${E.euro(budget)}` : `Total ${E.euro(total)}` });
  for (const x of parts) stack.append(h('i', { title: `${E.CAT_LABEL[x.c]}: ${E.euro(x.p)}`, style: { 'flex-grow': String(x.p / scale), 'flex-basis': '0' } }));
  if (budget && total < budget) stack.append(h('i', { class: 'rest', style: { 'flex-grow': String((budget - total) / scale), 'flex-basis': '0' } }));
  const top = parts.slice(0, 1).map(x => `${E.CAT_LABEL[x.c]} ${Math.round(x.p / (total || 1) * 100)} %`).join(', ');
  let left = null;
  if (budget) {
    const d = budget - total;
    left = d >= 0 ? h('span', { class: 'left-ok', text: d < 1 ? 'Justo en tu presupuesto' : `Te sobran ${E.euro(Math.floor(d))}` }) : h('span', { class: 'left-over', text: `Te pasas ${E.euro(Math.ceil(-d))}` });
  }
  return [stack, h('div', { class: 'stack-legend' }, h('span', { text: top ? `${top} del total` : '' }), left)];
}

function summaryCard(build, q, total, budget, animate) {
  const sp = q.store;
  const card = h('aside', { class: 'sum', id: 'summary', 'aria-label': 'Resumen' });
  const name = h('input', { class: 'name-input', type: 'text', maxlength: 60, placeholder: 'Ponle nombre (opcional)', value: S.ed.name, 'aria-label': 'Nombre de la configuración',
    oninput: (e) => { S.ed.name = e.target.value.slice(0, 60); } });
  card.append(h('div', { class: 'sum-sec' },
    h('div', { class: 'sum-total' }, h('b', { text: E.euro(total), 'aria-live': 'polite' }), h('span', { text: budget ? `de ${E.euro(budget)}` : 'total' })),
    budgetStack(build, total, budget, sp, animate)));

  const perf = perfInfo(build, q);
  const bp = E.buildPoints(build, q.use);
  card.append(h('div', { class: 'sum-sec' }, h('div', { class: 'perf-line' }, h('span', { class: 'ico' }, icon(q.use in ICONS ? q.use : 'gaming')),
    h('div', {}, h('b', { text: perf.title }), perf.sub ? h('small', { text: perf.sub }) : null)),
    bp ? h('div', { class: 'score-line' }, h('span', { class: 'tier tier-lg', dataset: { t: bp.tier } }, h('b', { text: bp.tier })), h('div', {}, h('b', { text: `${bp.pts} puntos de 100` }), h('small', { text: 'Media de las piezas, ponderada por lo que importa en tu uso.' }))) : null));

  const checks = E.checkBuild(build, { res: usesRes(q.use) ? q.res : null }).filter(c => c.level !== 'info');
  const errs = checks.filter(c => c.level === 'error' || c.level === 'missing');
  const warns = checks.filter(c => c.level === 'warn');
  const lvl = errs.length ? 'err' : warns.length ? 'warn' : 'ok';
  const label = errs.length ? (errs.length === 1 ? 'Falta algo o hay 1 problema' : `${errs.length} problemas por resolver`) : warns.length ? `Compatible, con ${warns.length === 1 ? '1 aviso' : warns.length + ' avisos'}` : 'Todo compatible';
  const order = { missing: 0, error: 0, warn: 1, ok: 2 };
  card.append(h('div', { class: 'sum-sec' }, h('details', { class: 'compat', open: errs.length > 0 || null },
    h('summary', {}, h('span', { class: 'badge ' + lvl }, icon(lvl === 'ok' ? 'check' : lvl === 'warn' ? 'alert' : 'x')), label, h('span', { class: 'chev' }, icon('chev'))),
    h('ul', { class: 'checks' }, [...checks].sort((a, b) => order[a.level] - order[b.level]).map(c => h('li', { class: c.level }, icon(c.level === 'ok' ? 'check' : c.level === 'warn' ? 'alert' : 'x'), h('span', { text: c.msg })))),
    h('p', { class: 'hint', style: { 'margin-top': '10px' }, text: 'Sistema operativo no incluido.' }))));

  if (build.cpu) {
    const kv = h('dl', { class: 'kv' });
    kv.append(h('dt', { text: 'Consumo estimado' }), h('dd', { text: `${E.estimatedDraw(build.cpu, build.gpu)} W` }));
    const cres = usesRes(q.use) ? q.res : '1080p';
    const cpf = E.costPerFps(E.buildTotal(Object.fromEntries(E.CORE_CATS.filter(c => build[c]).map(c => [c, build[c]])), sp, S.db.stores), build, cres);
    if (cpf && (usesRes(q.use) || build.gpu)) kv.append(h('dt', { text: `Coste por FPS (${cres})`, title: 'Precio de la torre dividido entre los FPS medios estimados. Menos es mejor.' }), h('dd', { text: E.euro(Math.round(cpf * 100) / 100) }));
    if (build.psu) kv.append(h('dt', { text: 'Fuente' }), h('dd', { text: `${build.psu.specs.watts} W (${E.powerNeed(build.cpu, build.gpu)} W recomendados)` }));
    const dates = E.CATS.filter(c => build[c]).map(c => E.bestOffer(build[c], sp, S.db.stores)?.date).filter(Boolean).sort();
    const unconf = E.CATS.filter(c => build[c] && !E.bestOffer(build[c], sp, S.db.stores)?.date).length;
    if (dates.length || unconf) kv.append(h('dt', { text: 'Precios' }), h('dd', { text: unconf ? `${unconf} sin confirmar` : `Del ${fmtDate(dates[0])}` }));
    card.append(h('div', { class: 'sum-sec' }, h('div', { class: 'perf-line' }, h('span', { class: 'ico' }, icon('bolt')), kv)));
  }

  const has = Object.keys(build).length > 0;
  card.append(h('div', { class: 'sum-sec' }, name,
    h('div', { class: 'sum-actions' },
      h('button', { type: 'button', class: 'btn btn-primary', disabled: !has, onclick: () => printBuild(S.ed) }, icon('download'), 'Descargar PDF'),
      h('button', { type: 'button', class: 'btn btn-sm', disabled: !has, onclick: saveCurrent }, icon('save'), 'Guardar'),
      h('button', { type: 'button', class: 'btn btn-sm', disabled: !has, onclick: () => shareBuild(S.ed.build, S.ed.name) }, icon('share'), 'Compartir'),
      h('button', { type: 'button', class: 'btn btn-sm', disabled: !has, onclick: () => download(fileName(S.ed.name, 'csv'), E.buildToCsv(S.ed.build, sp, S.db.stores), 'text/csv;charset=utf-8') }, icon('csv'), 'CSV'))));
  return card;
}
const fileName = (n, ext) => (String(n || 'configuracion-pc').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'configuracion-pc') + '.' + ext;

function updateMbar() {
  const bar = $('#mbar');
  const show = S.ed && !$('#view-build').hidden && !$('#editor').hidden && Object.keys(S.ed.build).length;
  bar.hidden = !show; document.body.classList.toggle('has-mbar', !!show);
  if (!show) return;
  const total = edTotal(), budget = S.ed.q.budget;
  const over = budget && total > budget;
  clear(bar).append(h('div', { class: 'mtotal' }, h('b', { class: 'num', text: E.euro(total) }),
    h('small', { class: over ? 'over' : '', text: budget ? (over ? `Te pasas ${E.euro(Math.ceil(total - budget))}` : `de ${E.euro(budget)}`) : 'total' })),
  h('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: () => $('#summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 'Ver resumen'));
}

// ---------- cambiar una pieza ----------
function initSwap() {
  const dlg = $('#swap');
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { S.swap.trigger?.focus?.(); });
}
function openSwap(cat, trigger) {
  S.swap = { cat, sort: 'rec', q: '', trigger };
  const dlg = $('#swap');
  renderSwap(true);
  dlg.showModal();
  if (matchMedia('(pointer: fine)').matches) $('#swap-search')?.focus(); else $('#swap .icon-btn')?.focus();
}
function renderSwap(full) {
  const dlg = $('#swap');
  const { cat } = S.swap;
  const { build, q } = S.ed;
  const cur = build[cat];
  if (full) {
    clear(dlg);
    const search = h('input', { type: 'search', id: 'swap-search', placeholder: 'Buscar modelo', autocomplete: 'off', 'aria-label': 'Buscar modelo', oninput: (e) => { S.swap.q = e.target.value; renderSwapList(); } });
    const sorter = seg('Ordenar', [['rec', 'Recomendado'], ['price', 'Precio'], ['perf', 'Rendimiento']], S.swap.sort, (v) => { S.swap.sort = v; renderSwapList(); });
    sorter.querySelector('.field-label').classList.add('sr-only');
    dlg.append(h('div', { class: 'sheet-head' },
      h('div', { class: 'sheet-title' }, h('span', { class: 'part-tile' }, icon(cat)),
        h('div', { style: { flex: '1', 'min-width': '0' } }, h('h2', { id: 'swap-title', text: `${cur ? 'Cambiar' : 'Elegir'} ${E.CAT_LABEL[cat].toLowerCase()}` }),
          h('p', { text: cur ? `Ahora: ${cur.name}` : 'Te mostramos primero lo que encaja con el resto de piezas.' })),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Cerrar', onclick: () => dlg.close() }, icon('x'))),
      h('div', { class: 'sheet-tools' }, h('div', { class: 'search' }, icon('search'), search), E.PERIPH_CATS.includes(cat) || E.EXTRA_CATS.includes(cat) ? null : sorter)),
    h('div', { class: 'sheet-body', id: 'swap-list' }));
  }
  renderSwapList();
  void q;
}
function renderSwapList() {
  const list = clear($('#swap-list'));
  const { cat, sort } = S.swap;
  const { build, q } = S.ed;
  const budget = q.budget || null;
  const query = norm(S.swap.q).trim();
  let alts = E.alternatives(S.db, build, cat, { ...q, res: usesRes(q.use) ? q.res : '1080p' });
  if (query) alts = alts.filter(a => !a.item || norm(a.item.name + ' ' + specChips(a.item).join(' ')).includes(query));
  const ok = alts.filter(a => !a.incompatible), bad = alts.filter(a => a.incompatible);
  const perfCat = !E.PERIPH_CATS.includes(cat) && !E.EXTRA_CATS.includes(cat) && build.cpu;
  const fits = (a) => !budget || a.total <= budget + 0.005;
  const cmp = {
    rec: (a, b) => (b.current - a.current) || (fits(b) - fits(a)) || (fits(a) && perfCat ? (b.perf - a.perf) : 0) || (a.delta - b.delta),
    price: (a, b) => a.delta - b.delta,
    perf: (a, b) => (b.perf - a.perf) || (a.delta - b.delta)
  }[E.PERIPH_CATS.includes(cat) || E.EXTRA_CATS.includes(cat) ? 'price' : sort];
  ok.sort(cmp);
  if (!ok.length && !bad.length) { list.append(h('p', { class: 'empty', text: 'No hay modelos que coincidan con la búsqueda.' })); return; }
  for (const a of ok) list.append(altCard(a, perfCat, budget));
  if (bad.length) {
    const d = h('details', { class: 'incompat' }, h('summary', { text: `${bad.length} ${bad.length === 1 ? 'modelo no encaja' : 'modelos no encajan'} con tu configuración` }));
    for (const a of bad) d.append(altCard(a, perfCat, budget, true));
    list.append(d);
  }
}
function altCard(a, perfCat, budget, disabled) {
  const { cat } = S.swap;
  const sp = S.ed.q.store;
  const title = a.item ? a.item.name : a.kind === 'igpu' ? 'Sin tarjeta gráfica (usar la integrada)' : a.kind === 'stock' ? 'Usar el disipador incluido' : `Quitar ${E.CAT_LABEL[cat].toLowerCase()}`;
  const meta = h('div', { class: 'alt-meta' });
  if (a.current) meta.append(h('span', { class: 'cur-tag', text: 'Elegida ahora' }));
  else {
    if (Math.abs(a.delta) >= 0.5) meta.append(h('span', { class: 'delta ' + (a.delta > 0 ? 'cost-up' : 'cost-down'), text: signedEuro(a.delta) }));
    else meta.append(h('span', { class: 'delta flat', text: 'Mismo precio' }));
    if (perfCat && Math.abs(a.perf) >= 0.01) meta.append(h('span', { class: 'delta ' + (a.perf > 0 ? 'up' : 'down'), text: `${pct(a.perf)} rendimiento` }));
    if (budget && a.total > budget + 0.005) meta.append(h('span', { class: 'delta over', text: `Te pasas ${E.euro(Math.ceil(a.total - budget))}` }));
  }
  const also = a.changes.length && !a.current ? h('p', { class: 'also' }, 'También cambia ', a.changes.map((c, i) => [i ? ', ' : '', h('b', { text: E.CAT_LABEL[c.cat].toLowerCase() }), c.to ? ` a ${c.to.name}` : ' (se quita)'])) : null;
  const price = a.item ? E.bestOffer(a.item, sp, S.db.stores) : null;
  const kids = [
    h('div', { style: { 'min-width': '0', display: 'grid', gap: '6px' } }, h('span', { class: 'alt-name' }, a.item ? tierBadge(a.item, S.ed.q.use) : null, ' ', title), a.item ? chipsEl(a.item) : null),
    h('div', { class: 'alt-side' }, a.item?.owned ? h('span', { class: 'owned-tag', text: 'Ya la tienes' }) : a.item ? h('span', { class: 'price', text: E.euro(price?.price) }) : null, a.item && price ? h('span', { class: 'store', text: storeName(price.store) }) : null),
    meta, also, disabled ? h('p', { class: 'why-not', text: a.incompatible }) : null
  ];
  if (disabled) return h('div', { class: 'alt' }, kids);
  return h('button', { type: 'button', class: 'alt' + (a.current ? ' is-current' : ''), style: { 'text-align': 'left', font: 'inherit' }, 'aria-current': a.current ? 'true' : null,
    onclick: () => applySwap(a) }, kids);
}
function applySwap(a) {
  const { cat } = S.swap;
  $('#swap').close();
  if (a.current) return;
  S.ed.build = a.build; S.ed.optKey = null;
  renderEditor(false);
  const changed = [cat, ...a.changes.map(c => c.cat)];
  for (const c of changed) {
    const row = $(`.part[data-cat="${c}"]`);
    if (row) { row.classList.add('flash'); requestAnimationFrame(() => requestAnimationFrame(() => row.classList.remove('flash'))); }
  }
  const what = a.item ? `${E.CAT_LABEL[cat]} cambiada` : a.kind === 'remove' ? `${E.CAT_LABEL[cat]} quitado` : 'Hecho';
  toast(a.changes.length ? `${what}. También se ha ajustado: ${a.changes.map(c => E.CAT_LABEL[c.cat].toLowerCase()).join(', ')}.` : `${what}.`);
  const btn = $(`.part[data-cat="${cat}"] button`); if (btn) { S.swap.trigger = btn; btn.focus({ preventScroll: true }); }
}

// ---------- guardar, compartir y PDF ----------
function saveCurrent() {
  const ed = S.ed;
  const comps = {};
  for (const k of E.CATS) if (ed.build[k]) comps[k] = ed.build[k].id;
  const name = (ed.name || '').trim() || `PC para ${useTitle(ed.q)} de ${E.euro(Math.round(edTotal()))}`;
  const entry = { id: ed.savedId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name.slice(0, 60), date: new Date().toISOString().slice(0, 10),
    comps, store: ed.q.store || 'any', budget: ed.q.budget || null, use: ed.q.use, res: ed.q.res };
  const i = S.saved.findIndex(e => e.id === entry.id);
  if (i >= 0) S.saved[i] = entry; else S.saved.unshift(entry);
  S.saved = S.saved.slice(0, 50);
  ed.savedId = entry.id; ed.name = entry.name;
  if (!persistSaved()) { toast('No se ha podido guardar: el navegador no permite almacenamiento local.'); return; }
  const inp = $('.name-input'); if (inp) inp.value = entry.name;
  toast(i >= 0 ? 'Cambios guardados.' : 'Guardada. La tienes en «Guardadas».');
}
function shareUrl(build, name) { return location.href.split('#')[0] + '#b=' + E.encodeShare(build, name); }
async function shareBuild(build, name) {
  const url = shareUrl(build, name);
  if (location.protocol === 'file:') {
    const ok = await copyText(E.buildToText(build, S.ed?.q.store || 'any', S.db.stores, name));
    toast(ok ? 'Abierto en local: hemos copiado la lista de piezas. El enlace funcionará cuando la web esté publicada.' : 'No se ha podido copiar.');
    return;
  }
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ title: name || 'Mi configuración de PC', url }); return; } catch { /* cancelado */ }
  }
  toast(await copyText(url) ? 'Enlace copiado. Quien lo abra verá estas piezas con los precios del día.' : 'No se ha podido copiar el enlace.');
}
function loadShared() {
  const m = location.hash.match(/^#b=([A-Za-z0-9_-]{1,2000})$/);
  if (!m) return;
  const d = E.decodeShare(S.db, m[1]);
  history.replaceState(null, '', location.pathname + location.search);
  if (!d || !Object.keys(d.build).length) { toast('El enlace compartido no es válido.'); return; }
  openEditor(d.build, { ...wizQuery(), budget: null }, { origin: 'manual', name: d.name, shared: true });
}

function printBuild(ed, opts = {}) {
  const doc = clear($('#print-doc'));
  const { build, q } = ed;
  const sp = q.store || 'any';
  const total = E.buildTotal(build, sp, S.db.stores);
  const title = opts.title || 'Presupuesto de PC';
  const name = (ed.name || '').trim();
  const brand = h('div', { class: 'pd-brand' });
  brand.append(icon('cpu'), 'ConfiguraPC');
  doc.append(h('header', { class: 'pd-head' }, h('div', {}, brand, h('h1', { text: name || title })),
    h('div', { class: 'pd-date' }, h('div', { text: name ? title : '' }), h('div', { text: `Generado el ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}` }), h('div', { text: `Precios del ${fmtDate(S.db.updated, true)}` }))));
  const meta = h('div', { class: 'pd-meta' });
  const cell = (k, v) => h('div', {}, h('small', { text: k }), h('b', { text: v }));
  meta.append(cell('Uso', useTitle(q).replace(/^./, c => c.toUpperCase())), cell(opts.budgetLabel || 'Presupuesto', q.budget ? E.euro(q.budget) : 'Sin fijar'),
    cell('Total', E.euro(total)), cell('Tiendas', sp === 'any' ? 'La más barata en cada pieza' : storeName(sp)));
  doc.append(meta);
  const t = h('table', { class: 'pd-table' });
  t.append(h('thead', {}, h('tr', {}, h('th', { text: 'Componente' }), h('th', { text: 'Modelo' }), h('th', { text: 'Tier' }), h('th', { text: 'Tienda' }), h('th', { class: 'r', text: 'Precio' }))));
  const tb = h('tbody');
  for (const c of E.CATS) {
    const it = build[c];
    if (!it) continue;
    const o = it.owned ? null : E.bestOffer(it, sp, S.db.stores);
    let short = '';
    try { const u = new URL(o.url); short = u.hostname.replace(/^www\./, '') + (u.pathname.length > 46 ? u.pathname.slice(0, 44) + '…' : u.pathname); } catch { short = ''; }
    tb.append(h('tr', {}, h('td', { class: 'pd-cat', text: E.CAT_LABEL[c] }),
      h('td', {}, h('div', { class: 'pd-name', text: it.name }), h('div', { class: 'pd-spec', text: specChips(it).filter(Boolean).join(', ') }), short ? h('div', { class: 'pd-url', text: short }) : null),
      h('td', { class: 'pd-tier' }, (() => { const p = E.componentPoints(it, q.use); return p ? `${p.tier} (${p.pts})` : ''; })()),
      h('td', {}, h('div', { text: it.owned ? 'Ya la tienes' : o ? storeName(o.store) : '' }), it.owned ? null : h('div', { class: 'pd-spec', text: o?.date ? fmtDate(o.date) : 'Sin confirmar' })),
      h('td', { class: 'r', text: it.owned ? '0 €' : E.euro(o?.price) })));
  }
  tb.append(h('tr', { class: 'pd-total' }, h('td', { colspan: '4', text: 'Total' }), h('td', { class: 'r', text: E.euro(total) })));
  t.append(tb); doc.append(t);
  const gb = opts.gamesBuild || build;
  if (gb.cpu) {
    const gt = h('table', { class: 'pd-table pd-games' });
    gt.append(h('thead', {}, h('tr', {}, h('th', { text: 'FPS estimados' }), h('th', { class: 'r', text: '1080p' }), h('th', { class: 'r', text: '1440p' }), h('th', { class: 'r', text: '4K' }))));
    const r1 = E.gamesTable(gb, '1080p'), r2 = E.gamesTable(gb, '1440p'), r4 = E.gamesTable(gb, '4K');
    gt.append(h('tbody', {}, r1.map((r, i) => h('tr', {}, h('td', {}, h('span', { class: 'pd-name', text: r.game.name }), ' ', h('span', { class: 'pd-spec', text: r.game.preset })),
      h('td', { class: 'r', text: String(r.fps) }), h('td', { class: 'r', text: String(r2[i].fps) }), h('td', { class: 'r', text: String(r4[i].fps) })))));
    const bp = E.buildPoints(gb, q.use);
    doc.append(h('section', { class: 'pd-gsec' }, h('h2', { text: 'Rendimiento estimado en juegos' + (bp ? `. Puntuación del equipo: ${bp.pts}/100 (tier ${bp.tier})` : '') }), gt,
      h('p', { class: 'pd-spec', text: 'Estimación orientativa (±20 %), sin DLSS/FSR. Calibrada con la media de TechPowerUp para la RTX 5070; el peso de cada juego es aproximado.' })));
  }
  const cols = h('div', { class: 'pd-cols' });
  if (!opts.noChecks && build.cpu) {
    const checks = E.checkBuild(build, { res: usesRes(q.use) ? q.res : null }).filter(c => c.level !== 'info' && c.level !== 'ok');
    const perf = perfInfo(build, q);
    cols.append(h('section', {}, h('h2', { text: 'Compatibilidad' }), h('ul', {}, checks.length ? checks.map(c => h('li', { text: c.msg })) : h('li', { text: 'Todas las piezas son compatibles entre sí.' }), h('li', { text: `Consumo estimado ${E.estimatedDraw(build.cpu, build.gpu)} W.` }))),
      h('section', {}, h('h2', { text: 'Rendimiento esperado' }), h('ul', {}, h('li', { text: perf.title + '.' }), perf.sub ? h('li', { text: perf.sub }) : null, h('li', { text: 'Sistema operativo no incluido.' }))));
  }
  if (opts.extra) cols.append(opts.extra);
  doc.append(cols);
  const guide = opts.noGuide ? [] : E.assemblyGuide(build);
  if (guide.length) doc.append(h('section', { class: 'pd-guide' }, h('h2', { text: 'Guía de montaje' }), h('ol', {}, guide.map(st => h('li', {}, h('b', { text: st.title + '. ' }), st.text)))));
  const share = location.protocol !== 'file:' && !opts.noShare ? shareUrl(build, name) : null;
  doc.append(h('footer', { class: 'pd-foot' },
    h('p', { text: 'Precios orientativos recogidos de las tiendas indicadas en la fecha que aparece en cada pieza. Cambian a diario: confírmalos antes de comprar. Los niveles de rendimiento son estimaciones basadas en análisis publicados.' }),
    share ? h('p', { text: 'Ver y editar online: ' + share }) : null));
  const old = document.title;
  document.title = fileName(name || title, 'pdf').replace(/\.pdf$/, '');
  const restore = () => { document.title = old; window.removeEventListener('afterprint', restore); };
  window.addEventListener('afterprint', restore);
  window.print();
  setTimeout(restore, 1500);
}

// ---------- mejorar mi PC ----------
function renderUpgrade() {
  const root = clear($('#upgrade'));
  const u = S.up;
  if (!u.cpu && u.cpuText) u.cpu = HW.matchCpu(u.cpuText);
  if (!u.gpu && u.gpuText) u.gpu = HW.matchGpu(u.gpuText);
  const grid = h('div', { class: 'up-grid' });

  // 1. Tu PC
  const left = h('section', { class: 'panel', 'aria-labelledby': 'up-h1' }, h('h2', { id: 'up-h1', text: '1. Tu PC actual' }));
  const methods = h('div', { class: 'method-tabs', role: 'radiogroup', 'aria-label': 'Cómo reconocer tu PC' });
  const M = [['auto', 'scan', 'Detectar', 'Desde este navegador'], ['report', 'windows', 'Informe de Windows', 'Más preciso'], ['manual', 'pencil', 'Escribirlo', 'Si sabes los modelos']];
  const mbtns = M.map(([k, ico, title, sub]) => choice({ ico, title, sub, checked: u.method === k, onClick: () => { u.method = k; saveUp(); renderUpgrade(); $('#upgrade .method-tabs .choice[aria-checked="true"]')?.focus(); } }));
  mbtns.forEach((b, i) => { b.tabIndex = M[i][0] === u.method ? 0 : -1; });
  methods.addEventListener('keydown', (e) => radioKeys(e, mbtns));
  methods.append(...mbtns);
  left.append(methods, methodBody());
  left.append(h('div', { class: 'form-grid' }, ...partFields()));
  grid.append(left);

  // 2. Qué quieres
  const right = h('section', { class: 'panel', 'aria-labelledby': 'up-h2' }, h('h2', { id: 'up-h2', text: '2. Qué quieres mejorar' }));
  const useSel = h('select', { class: 'input', id: 'u-use', onchange: (e) => { u.use = e.target.value; saveUp(); renderUpgrade(); } }, USE_LIST.map(([k, t]) => h('option', { value: k, selected: k === u.use }, t)));
  right.append(h('label', { class: 'input-wrap' }, h('span', { text: 'Uso principal' }), useSel));
  if (usesRes(u.use)) right.append(seg('Resolución', [['1080p', '1080p'], ['1440p', '1440p'], ['4K', '4K']], u.res, (v) => { u.res = v; saveUp(); }));
  const bIn = h('input', { class: 'input', type: 'number', id: 'u-budget', min: 50, max: 5000, step: 10, inputmode: 'numeric', value: u.budget,
    onchange: (e) => { const v = Math.round(+e.target.value); if (Number.isFinite(v) && v >= 50) { u.budget = Math.min(5000, v); saveUp(); } } });
  const chips = h('div', { class: 'chips' }, [200, 400, 600, 900].map(v => h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': String(u.budget === v), onclick: () => { u.budget = v; bIn.value = v; saveUp(); for (const c of chips.children) c.setAttribute('aria-pressed', String(c.textContent === E.euro(v))); } }, E.euro(v))));
  right.append(h('label', { class: 'input-wrap' }, h('span', { text: 'Cuánto quieres gastar como máximo (€)' }), bIn), chips);
  right.append(h('button', { type: 'button', class: 'btn btn-primary btn-block', id: 'u-run', onclick: runUpgrade }, 'Ver qué mejorar'));
  grid.append(right);
  root.append(grid, h('div', { id: 'up-result', class: 'up-result', style: { 'margin-top': '24px' } }));
  if (S.upRes) renderUpgradeResult();
}
function methodBody() {
  const u = S.up;
  const box = h('div', { class: 'detect-out' });
  if (u.method === 'auto') {
    box.append(h('p', { class: 'hint', text: 'Ábrelo en el PC que quieres mejorar. El navegador nos dice la gráfica; el procesador exacto no lo comparte, así que tendrás que escribirlo abajo.' }),
      h('button', { type: 'button', class: 'btn', onclick: runDetect }, icon('scan'), 'Detectar ahora'));
    if (u.detect) {
      const d = u.detect;
      box.append(h('p', {}, h('b', { text: 'Gráfica: ' }), d.gpu ? d.gpu.name + (d.gpu.integrated ? '' : ` (${d.gpu.vram} GB)`) : (d.gpuRaw ? `no reconocida (${d.gpuRaw.slice(0, 70)})` : 'el navegador no la muestra')));
      if (d.threads) box.append(h('p', {}, h('b', { text: 'Procesador: ' }), `${d.threads} hilos. Escribe el modelo abajo para afinar.`));
      if (d.os && !['Windows', 'macOS', 'Linux'].includes(d.os)) box.append(h('p', { class: 'recog warn' }, icon('alert'), 'Estás en un móvil o tableta: los datos son de este dispositivo, no de tu PC.'));
    }
  } else if (u.method === 'report') {
    const cmd = HW.PS_COMMAND;
    const ta = h('textarea', { class: 'paste', id: 'u-paste', placeholder: 'Pega aquí el resultado (Ctrl+V)', 'aria-label': 'Resultado del comando', spellcheck: 'false' });
    box.append(h('ol', { class: 'how' },
      h('li', {}, h('span', {}, 'Pulsa ', h('kbd', { text: 'Win' }), ' + ', h('kbd', { text: 'X' }), ' y abre «Terminal» o «Windows PowerShell».')),
      h('li', {}, h('div', { class: 'code' }, h('span', { text: 'Copia este comando, pégalo y pulsa Intro. Solo lee datos; no cambia nada.' }), h('pre', { text: cmd }),
        h('button', { type: 'button', class: 'btn btn-sm', onclick: async () => toast(await copyText(cmd) ? 'Comando copiado.' : 'No se ha podido copiar.') }, icon('copy'), 'Copiar comando'))),
      h('li', {}, h('div', { class: 'code' }, h('span', { text: 'El resultado ya está en tu portapapeles: pégalo aquí.' }), ta,
        h('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: () => readReport(ta.value) }, 'Leer informe')))));
    ta.addEventListener('paste', () => setTimeout(() => readReport(ta.value), 0));
  } else {
    box.append(h('p', { class: 'hint', text: 'Escribe el modelo de tu procesador y tu gráfica: te sugerimos mientras escribes. Lo encuentras en Configuración, Sistema, Información, o en el Administrador de tareas, pestaña Rendimiento.' }));
  }
  return box;
}
function runDetect() {
  const d = HW.detectBrowser();
  S.up.detect = d;
  if (d.gpu) { S.up.gpu = d.gpu; S.up.gpuText = d.gpu.integrated ? '' : d.gpu.name; }
  if (d.ramApprox && d.ramApprox < 8) S.up.ramGB = d.ramApprox >= 4 ? 4 : S.up.ramGB;
  saveUp(); renderUpgrade();
  toast(d.gpu ? 'Gráfica detectada. Revisa el resto de datos.' : 'No hemos podido detectar la gráfica. Escríbela a mano.');
}
function readReport(text) {
  const r = HW.parseReport(text);
  const u = S.up;
  if (!r.cpu && !r.gpu) { toast('No reconocemos el texto pegado. Copia de nuevo el resultado del comando.'); return; }
  if (r.cpu) { u.cpu = r.cpu.unknown ? null : r.cpu; u.cpuText = r.cpu.unknown ? r.cpu.name : r.cpu.name; }
  if (r.gpu) { u.gpu = r.gpu.unknown ? null : r.gpu; u.gpuText = r.gpu.integrated ? '' : r.gpu.name; }
  if (r.ramGB) u.ramGB = [4, 8, 12, 16, 24, 32, 48, 64].reduce((a, b) => Math.abs(b - r.ramGB) < Math.abs(a - r.ramGB) ? b : a);
  if (r.ramType) u.ramType = r.ramType === 'DDR3' || r.ramType === 'DDR4' || r.ramType === 'DDR5' ? r.ramType : u.ramType;
  if (r.platform) u.platform = r.platform;
  if (r.ssd != null) u.hasSsd = r.ssd;
  saveUp(); renderUpgrade();
  toast('Informe leído. Solo falta la fuente de alimentación: Windows no la conoce.');
  $('#u-psu')?.focus();
}
function recogLine(kind, m, text) {
  if (!text) return h('p', { class: 'recog muted', text: kind === 'gpu' ? 'Vacío si usas los gráficos del procesador.' : '' });
  if (!m) return h('p', { class: 'recog warn' }, icon('alert'), kind === 'cpu' ? 'No lo reconocemos: elige la plataforma abajo.' : 'No la reconocemos: la tomamos como gama media antigua.');
  if (kind === 'cpu') return h('p', { class: 'recog ' + (m.exact ? 'ok' : 'warn') }, icon(m.exact ? 'check' : 'info'), `${m.exact ? 'Reconocido' : 'Aproximado'}: ${m.name}, ${E.PLATFORMS.find(p => p.key === m.platform)?.label || m.platform}`);
  return h('p', { class: 'recog ok' }, icon('check'), m.integrated ? 'Gráficos integrados' : `Reconocida: ${m.name}, ${m.vram} GB`);
}
function partFields() {
  const u = S.up;
  const cpuList = h('datalist', { id: 'dl-cpu' }, HW.CPUS.map(c => h('option', { value: c.name })));
  const gpuList = h('datalist', { id: 'dl-gpu' }, HW.GPUS.map(g => h('option', { value: g.name })));
  const cpuRec = h('div'), gpuRec = h('div');
  const platWrap = h('label', { class: 'input-wrap full', hidden: !!u.cpu || !u.cpuText }, h('span', { text: 'Plataforma' }),
    h('select', { class: 'input', onchange: (e) => { u.platform = e.target.value; saveUp(); } }, E.PLATFORMS.map(p => h('option', { value: p.key, selected: p.key === u.platform }, p.label))));
  const upd = () => { clear(cpuRec).append(recogLine('cpu', u.cpu, u.cpuText)); clear(gpuRec).append(recogLine('gpu', u.gpu, u.gpuText)); platWrap.hidden = !!u.cpu || !u.cpuText; };
  const cpuIn = h('input', { class: 'input', id: 'u-cpu', list: 'dl-cpu', value: u.cpuText, autocomplete: 'off', placeholder: 'Ej.: Ryzen 5 3600, i5-10400F',
    oninput: (e) => { u.cpuText = e.target.value.slice(0, 80); u.cpu = HW.matchCpu(u.cpuText); if (u.cpu) { u.platform = u.cpu.platform; if (u.cpu.platform === 'AM5' || u.cpu.platform === 'LGA1851') u.ramType = 'DDR5'; } saveUp(); upd(); } });
  const gpuIn = h('input', { class: 'input', id: 'u-gpu', list: 'dl-gpu', value: u.gpuText, autocomplete: 'off', placeholder: 'Ej.: GTX 1660 Super, RX 6600',
    oninput: (e) => { u.gpuText = e.target.value.slice(0, 80); u.gpu = HW.matchGpu(u.gpuText); saveUp(); upd(); } });
  upd();
  const selF = (id, label, val, opts, on) => h('label', { class: 'input-wrap' }, h('span', { text: label }),
    h('select', { class: 'input', id, onchange: (e) => on(e.target.value) }, opts.map(([v, t]) => h('option', { value: v, selected: String(v) === String(val) }, t))));
  return [
    h('label', { class: 'input-wrap full' }, h('span', { text: 'Procesador' }), cpuIn, cpuList, cpuRec), platWrap,
    h('label', { class: 'input-wrap full' }, h('span', { text: 'Tarjeta gráfica' }), gpuIn, gpuList, gpuRec),
    selF('u-ram', 'Memoria RAM', u.ramGB, [4, 8, 12, 16, 24, 32, 48, 64].map(v => [v, `${v} GB`]), (v) => { u.ramGB = +v; saveUp(); }),
    selF('u-ramtype', 'Tipo de RAM', u.ramType, [['DDR3', 'DDR3'], ['DDR4', 'DDR4'], ['DDR5', 'DDR5']], (v) => { u.ramType = v; saveUp(); }),
    selF('u-psu', 'Fuente de alimentación', u.psuW, [[400, 'Hasta 450 W o no lo sé'], [550, '500-550 W'], [650, '600-650 W'], [750, '700-750 W'], [850, '800-850 W'], [1000, '1000 W o más']], (v) => { u.psuW = +v; saveUp(); }),
    selF('u-disk', 'Disco principal', u.hasSsd ? 'ssd' : 'hdd', [['ssd', 'SSD'], ['hdd', 'Disco duro mecánico']], (v) => { u.hasSsd = v === 'ssd'; saveUp(); })
  ];
}
function runUpgrade() {
  const u = S.up;
  const b = Math.round(+$('#u-budget').value);
  if (Number.isFinite(b) && b >= 50) u.budget = Math.min(5000, b);
  const ramType = u.ramType === 'DDR3' ? 'DDR4' : u.ramType;
  const platform = u.ramType === 'DDR3' ? 'old' : (u.cpu?.platform || u.platform);
  const q = { cpu: u.cpu && u.ramType !== 'DDR3' ? u.cpu : (u.cpu ? { ...u.cpu, platform: 'old' } : null), platform, ramGB: u.ramGB, ramType, psuW: u.psuW, hasSsd: u.hasSsd,
    budget: u.budget, use: u.use, res: usesRes(u.use) ? u.res : '1080p', store: 'any' };
  if (u.gpu) q.gpu = u.gpu; else if (!u.gpuText) q.gpu = { integrated: true }; else q.gpuTier = 'oldmid';
  const r = E.recommendUpgrade(S.db, q);
  S.upRes = { r, q }; S.upKey = r.options.length ? r.options[r.options.length - 1].key : null;
  renderUpgradeResult();
  $('#up-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function renderUpgradeResult() {
  const box = clear($('#up-result'));
  const { r, q } = S.upRes;
  const cur = r.current;
  box.append(h('div', { class: 'ed-head', style: { padding: '8px 0 0' } }, h('div', {}, h('h2', { text: 'Lo que te recomendamos cambiar' }),
    cur ? h('p', { class: 'now-pc' }, 'Tu PC: ', h('b', { text: [cur.cpu, cur.gpu, cur.ram].join(', ') }), '.') : null)));
  for (const w of r.warnings) box.append(notice('warn', [w]));
  if (!r.options.length) return;
  const sel = r.options.find(o => o.key === S.upKey) || r.options[0];
  if (r.options.length > 1) {
    const opts = h('div', { class: 'opts', role: 'radiogroup', 'aria-label': 'Opciones de mejora' });
    const btns = r.options.map(o => h('button', { type: 'button', class: 'opt-pill', role: 'radio', 'aria-checked': String(o === sel), onclick: () => { S.upKey = o.key; renderUpgradeResult(); } }, o.label, h('small', { text: `${E.euro(o.cost)}, ${pct(o.gain)}` })));
    opts.addEventListener('keydown', (e) => radioKeys(e, btns));
    opts.append(...btns); box.append(opts);
  }
  const grid = h('div', { class: 'ed-grid' });
  const parts = h('div', { class: 'parts' }, h('div', { class: 'parts-group' }, h('span', { text: 'Piezas a comprar' }), h('span', { class: 'num', text: E.euro(sel.cost) })));
  for (const c of E.CATS) {
    const it = sel.parts[c];
    if (!it) continue;
    const o = E.bestOffer(it, 'any', S.db.stores);
    parts.append(h('div', { class: 'part', dataset: { cat: c } }, h('span', { class: 'part-tile' }, icon(c)),
      h('div', { class: 'part-main' }, h('span', { class: 'part-cat', text: E.CAT_LABEL[c] }), h('span', { class: 'part-name', text: it.name }), chipsEl(it)),
      h('div', { class: 'part-side' }, h('span', {}, h('span', { class: 'price', text: E.euro(o?.price) }), ' ', h('span', { class: 'store', text: o ? storeName(o.store) : '' }))),
      h('div', { class: 'part-extra' }, offersEl(it, 'any'))));
  }
  const gainText = q.use === 'gaming' || q.use === 'streaming' ? `más rendimiento en juegos a ${q.res}` : 'más rendimiento para tu uso';
  const sum = h('aside', { class: 'sum', 'aria-label': 'Resumen de la mejora' },
    h('div', { class: 'sum-sec' }, h('div', { class: 'gain' }, h('b', { text: pct(sel.gain) }), h('span', { text: gainText })),
      sel.after.cpu && (q.use === 'gaming' || q.use === 'streaming') ? h('p', { class: 'hint', text: `Después: ${E.gamingLevel(sel.after.gpu, sel.after.cpu).text}.` }) : null),
    h('div', { class: 'sum-sec' }, h('div', { class: 'sum-total' }, h('b', { text: E.euro(sel.cost) }), h('span', { text: `de ${E.euro(q.budget)}` })), budgetStack(sel.parts, sel.cost, q.budget, 'any', true)),
    h('div', { class: 'sum-sec' }, h('ul', { class: 'checks' },
      sel.parts.psu ? h('li', { class: 'warn' }, icon('alert'), h('span', { text: `Incluye fuente nueva: con la tuya (${q.psuW} W) no es seguro para ${E.powerNeed(sel.after.cpu, sel.after.gpu)} W recomendados.` })) : h('li', { class: 'ok' }, icon('check'), h('span', { text: 'Tu fuente actual debería bastar. Comprueba que tiene los conectores de la gráfica.' })),
      sel.parts.mobo ? h('li', { class: 'warn' }, icon('alert'), h('span', { text: 'Cambia placa base: tendrás que reinstalar o reactivar Windows.' })) : null,
      sel.parts.gpu ? h('li', { class: 'ok' }, icon('check'), h('span', { text: 'Mide el hueco de tu caja antes de comprar la gráfica.' })) : null)),
    h('div', { class: 'sum-sec' }, h('div', { class: 'sum-actions' },
      h('button', { type: 'button', class: 'btn btn-primary', onclick: () => printBuild({ build: sel.parts, q: { ...q, store: 'any' }, name: '' }, { title: 'Mejora de PC', budgetLabel: 'Presupuesto', noChecks: true, noShare: true, noGuide: true, extra: h('section', {}, h('h2', { text: 'Tu PC actual' }), h('ul', {}, cur ? [h('li', { text: cur.cpu }), h('li', { text: cur.gpu }), h('li', { text: cur.ram })] : null, h('li', { text: `Mejora estimada: ${pct(sel.gain)} ${gainText}.` }))) }) }, icon('download'), 'Descargar PDF'),
      h('button', { type: 'button', class: 'btn btn-sm', style: { 'grid-column': '1 / -1' }, onclick: async () => toast(await copyText(E.buildToText(sel.parts, 'any', S.db.stores, 'Mejora de mi PC')) ? 'Lista copiada.' : 'No se ha podido copiar.') }, icon('copy'), 'Copiar lista'))));
  const left = h('div', { class: 'ed-main' }, parts);
  if (sel.after.cpu && r.base) left.append(gamesPanel(sel.after, q, { before: r.base, title: 'FPS antes y después' }));
  grid.append(left, sum);
  box.append(grid);
}

// ---------- portátiles ----------
const LAP_DEFAULT = { use: 'office', budget: 800, screen: 'any', minRam: 0, minSsd: 0, windows: false };
function lapState() {
  if (!S.lap) {
    const v = store.get(KEY_LAP, {});
    S.lap = { ...LAP_DEFAULT };
    if (v && typeof v === 'object') {
      if (E.LAPTOP_USES[v.use]) S.lap.use = v.use;
      if (Number.isFinite(v.budget) && v.budget >= 300 && v.budget <= 6000) S.lap.budget = Math.round(v.budget);
      if (['any', 'small', 'medium', 'large'].includes(v.screen)) S.lap.screen = v.screen;
      if ([0, 16, 32].includes(v.minRam)) S.lap.minRam = v.minRam;
      if ([0, 512, 1000].includes(v.minSsd)) S.lap.minSsd = v.minSsd;
      if (typeof v.windows === 'boolean') S.lap.windows = v.windows;
    }
  }
  return S.lap;
}
function renderLaptops() {
  const root = clear($('#laptops'));
  const L = lapState();
  const save = () => { store.set(KEY_LAP, L); renderLapResults(); };

  // Diferencias
  const card = (ico, title, items) => h('article', { class: 'vs-card' }, h('div', { class: 'vs-head' }, h('span', { class: 'part-tile' }, icon(ico)), h('h2', { text: title })),
    h('ul', { class: 'checks' }, items.map(([ok, t]) => h('li', { class: ok ? 'ok' : 'warn' }, icon(ok ? 'check' : 'alert'), h('span', { text: t })))));
  root.append(h('div', { class: 'vs' },
    card('tower', 'Sobremesa', [[1, 'Más rendimiento por euro: con el mismo dinero juega y trabaja más rápido (abajo lo ves con tu presupuesto).'], [1, 'Se mejora pieza a pieza durante años: gráfica, procesador, RAM, discos.'], [1, 'Mejor refrigeración: menos ruido y temperatura.'], [0, 'Necesitas monitor, teclado y ratón, y no te lo llevas.']]),
    card('laptop', 'Portátil', [[1, 'Te lo llevas a clase, al trabajo o de viaje.'], [1, 'Pantalla, teclado, batería, webcam y WiFi incluidos.'], [0, 'El procesador y la gráfica no se cambian nunca: compra pensando en los próximos años.'], [0, 'Más ruido con carga y reparaciones caras (pantalla, bisagras, placa).']])));
  const up = [['Procesador', 'Sí, dentro de la misma plataforma', 'No: va soldado a la placa'], ['Tarjeta gráfica', 'Sí, cuando quieras', 'No: va soldada'],
    ['Memoria RAM', 'Sí', 'A veces: solo si no va soldada (míralo en la ficha)'], ['SSD', 'Sí, y puedes añadir más', 'Casi siempre: si tiene ranura M.2 libre o cambiando el que trae'],
    ['Fuente o batería', 'Sí', 'La batería se cambia en el servicio técnico'], ['Refrigeración', 'Sí', 'Solo limpieza y cambio de pasta térmica']];
  const t = h('table', { class: 'cmp' }, h('thead', {}, h('tr', {}, h('th', { text: '¿Se puede mejorar?' }), h('th', { scope: 'col', text: 'Sobremesa' }), h('th', { scope: 'col', text: 'Portátil' }))),
    h('tbody', {}, up.map(([a, b, c]) => h('tr', {}, h('th', { scope: 'row', text: a }), h('td', { text: b }), h('td', { class: /^No/.test(c) ? 'no' : '', text: c })))));
  root.append(h('div', { class: 'cmp-wrap vs-table' }, t));

  // Buscador
  root.append(h('h2', { class: 'sec-title', text: 'Encuentra un buen portátil' }));
  const filters = h('section', { class: 'panel lap-filters', 'aria-label': 'Filtros' });
  const useGrid = h('div', { class: 'choices cols-3', role: 'radiogroup', 'aria-label': '¿Para qué lo quieres?' });
  const UI = [['office', 'office', 'Estudiar y ofimática'], ['travel', 'travel', 'Ligero para llevar'], ['dev', 'dev', 'Programar'], ['creative', 'creative', 'Editar foto y vídeo'], ['gaming', 'gaming', 'Jugar']];
  const ubtns = UI.map(([k, ico, title]) => choice({ ico, title, checked: L.use === k, compact: false, onClick: () => { L.use = k; ubtns.forEach((b, i) => { b.setAttribute('aria-checked', String(UI[i][0] === k)); b.tabIndex = UI[i][0] === k ? 0 : -1; }); save(); } }));
  ubtns.forEach((b, i) => { b.tabIndex = UI[i][0] === L.use ? 0 : -1; });
  useGrid.addEventListener('keydown', (e) => radioKeys(e, ubtns));
  useGrid.append(...ubtns);
  const bIn = h('input', { type: 'number', id: 'lap-budget', class: 'input', min: 300, max: 6000, step: 50, inputmode: 'numeric', value: L.budget });
  const range = h('input', { type: 'range', class: 'range', min: 300, max: 3000, step: 50, value: Math.min(3000, L.budget), 'aria-label': 'Presupuesto' });
  const setB = (v, from) => { v = Math.round(+v); if (!Number.isFinite(v) || v < 300) return; L.budget = Math.min(6000, v); if (from !== 'in') bIn.value = L.budget; if (from !== 'range') range.value = Math.min(3000, L.budget); save(); };
  bIn.addEventListener('change', () => setB(bIn.value, 'in'));
  range.addEventListener('input', () => setB(range.value, 'range'));
  filters.append(h('fieldset', { class: 'field' }, h('legend', { text: '¿Para qué lo quieres?' }), useGrid),
    h('div', { class: 'seg-row' },
      h('div', { class: 'field' }, h('label', { class: 'field-label', for: 'lap-budget', text: 'Presupuesto máximo (€)' }), bIn, range),
      seg('Tamaño de pantalla', [['any', 'Da igual'], ['small', 'Hasta 14"'], ['medium', '15-16"'], ['large', '17" o más']], L.screen, (v) => { L.screen = v; save(); }),
      seg('RAM mínima', [[0, 'Da igual'], [16, '16 GB'], [32, '32 GB']], L.minRam, (v) => { L.minRam = v; save(); }),
      seg('SSD mínimo', [[0, 'Da igual'], [512, '512 GB'], [1000, '1 TB']], L.minSsd, (v) => { L.minSsd = v; save(); })),
    switchCtl('Que traiga Windows', 'Si no, súmale unos 114 € de licencia o usa Linux.', L.windows, (v) => { L.windows = v; save(); }));
  root.append(filters, h('div', { id: 'lap-results', class: 'lap-results' }));
  renderLapResults();
}
const LAP_TO_DESK = { office: 'office', travel: 'office', dev: 'dev', creative: 'creative', gaming: 'gaming' };
function renderLapResults() {
  const box = clear($('#lap-results'));
  const L = S.lap;
  const r = E.findLaptops(S.db, { ...L, windows: L.windows });
  const best = r.results.find(x => x.tag === 'best');

  // Mismo dinero en sobremesa (con monitor, teclado y ratón para que la comparación sea justa)
  const dq = { use: LAP_TO_DESK[L.use], res: '1080p', budget: L.budget, storage: L.budget < 1300 ? 500 : 1000, periph: { monitor: true, input: true }, store: 'any', os: L.windows };
  const dr = E.recommend(S.db, dq);
  const desk = dr.options[0];
  if (desk || best) {
    const col = (title, ico, total, lines, action) => h('div', { class: 'same-col' }, h('div', { class: 'vs-head' }, h('span', { class: 'part-tile' }, icon(ico)), h('h3', { text: title })),
      total ? h('p', { class: 'price', text: E.euro(total) }) : null, h('ul', { class: 'same-list' }, lines.filter(Boolean).map(t => h('li', { text: t }))), action);
    const deskLines = desk ? [`${desk.build.cpu.name}${desk.build.gpu ? ' con ' + desk.build.gpu.name.replace(/^(\w+ )?(GeForce |Radeon )?/, '') : ''}`, `${desk.build.ram.specs.size} GB de RAM y ${desk.build.ssd.specs.size >= 1000 ? desk.build.ssd.specs.size / 1000 + ' TB' : desk.build.ssd.specs.size + ' GB'}`,
      desk.build.cpu ? `En juegos: ${E.gamingLevel(desk.build.gpu, desk.build.cpu).text}` : null, 'Incluye monitor, teclado y ratón'] : ['No llega para un sobremesa completo con monitor.'];
    const lapLines = best ? [best.item.specs.cpu + (best.item.specs.gpu ? ' con ' + best.item.specs.gpu : ''), `${best.item.specs.ram} GB de RAM y ${best.item.specs.ssd >= 1000 ? best.item.specs.ssd / 1000 + ' TB' : best.item.specs.ssd + ' GB'}`, `En juegos: ${best.gaming}`, `Pantalla de ${best.item.specs.screen}"`] : ['No hay portátiles con estos filtros.'];
    box.append(h('section', { class: 'same panel', 'aria-label': 'Mismo dinero' }, h('h2', { text: `Con ${E.euro(L.budget)}, ¿qué te llevas?` }),
      h('div', { class: 'same-grid' },
        col('Sobremesa', 'tower', desk?.total, deskLines, desk ? h('button', { type: 'button', class: 'btn btn-sm', onclick: () => { S.rec = { r: dr, q: dq }; openEditor(desk.build, dq, { origin: 'wizard', optKey: 'rec' }); } }, 'Ver el sobremesa') : null),
        col('Portátil', 'laptop', best?.price, lapLines, null)),
      h('p', { class: 'hint', text: 'El sobremesa incluye monitor de 24", teclado y ratón para que la comparación sea justa. Precios de piezas y portátiles de tiendas españolas.' })));
  }

  box.append(h('h3', { class: 'res-title', text: r.results.length ? `${r.results.length} ${r.results.length === 1 ? 'portátil encaja' : 'portátiles encajan'}` : 'Ningún portátil encaja' }));
  if (!r.results.length) {
    box.append(notice('warn', [r.minPrice && L.budget < r.minPrice ? `Para «${E.LAPTOP_USES[L.use].label.toLowerCase()}» el más barato que tenemos cuesta ${E.euro(r.minPrice)}.` : 'Prueba a quitar algún filtro (pantalla, RAM, SSD o Windows).']));
    return;
  }
  const list = h('div', { class: 'lap-list' });
  for (const x of r.results) list.append(lapCard(x));
  box.append(list, h('p', { class: 'games-note', text: 'Los niveles de juego y la puntuación son orientativos, según la gama de procesador y gráfica. Precios sin confirmar: comprueba el precio y las especificaciones en la tienda antes de comprar.' }), adSlot('catalog'));
  fillAds();
}
function lapCard(x) {
  const it = x.item, o = E.bestOffer(it, 'any', S.db.stores);
  return h('article', { class: 'lap-card' + (x.tag === 'best' ? ' is-best' : '') },
    h('span', { class: 'part-tile' }, icon('laptop')),
    h('div', { class: 'part-main' },
      x.tag ? h('span', { class: 'lap-tag ' + x.tag, text: x.tag === 'best' ? 'Mejor opción para ti' : 'El más barato que cumple' }) : null,
      h('span', { class: 'part-name', text: it.name }),
      chipsEl(it),
      h('p', { class: 'why', text: it.why }),
      h('p', { class: 'lap-game' }, icon('gaming'), ' En juegos: ', h('b', { text: x.gaming })),
      x.notes.length ? h('ul', { class: 'checks' }, x.notes.map(n => h('li', { class: n.level }, icon(n.level === 'warn' ? 'alert' : 'info'), h('span', { text: n.msg })))) : null),
    h('div', { class: 'part-side' }, h('span', { class: 'price', text: E.euro(o?.price) }), h('span', { class: 'date-tag unconfirmed', text: o?.date ? fmtDate(o.date) : 'Sin confirmar' }),
      extLink(o?.url, ['Ver en ', storeName(o?.store), ' ', icon('ext')], 'btn btn-sm'),
      extLink(shopSearch(it.name), ['Comparar precio ', icon('ext')], 'btn btn-sm btn-ghost')));
}

// ---------- precios ----------
const CAT_STATE = { cat: 'all', q: '', sort: 'price', limit: 30 };
function renderCatalog() {
  const root = clear($('#catalog'));
  const search = h('div', { class: 'search' }, icon('search'), h('input', { type: 'search', id: 'c-q', placeholder: 'Buscar: 9070, DDR4, 1440p…', autocomplete: 'off', 'aria-label': 'Buscar pieza',
    oninput: (e) => { CAT_STATE.q = e.target.value; CAT_STATE.limit = 30; renderCatalogList(); } }));
  const sort = h('select', { class: 'input', id: 'c-sort', style: { width: 'auto' }, 'aria-label': 'Ordenar', onchange: (e) => { CAT_STATE.sort = e.target.value; renderCatalogList(); } },
    h('option', { value: 'price' }, 'Más baratas primero'), h('option', { value: 'value' }, 'Más puntos por euro'), h('option', { value: 'tier' }, 'Mejor tier'), h('option', { value: 'spread' }, 'Más diferencia entre tiendas'), h('option', { value: 'name' }, 'Nombre'));
  const chips = h('div', { class: 'cat-chips', role: 'group', 'aria-label': 'Categoría' });
  for (const [k, t] of [['all', 'Todo'], ...E.CATS.map(c => [c, E.CAT_LABEL[c]]), ['laptop', 'Portátiles']]) {
    chips.append(h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': String(CAT_STATE.cat === k), onclick: (e) => {
      CAT_STATE.cat = k; CAT_STATE.limit = 30; for (const c of chips.children) c.setAttribute('aria-pressed', 'false'); e.currentTarget.setAttribute('aria-pressed', 'true'); renderCatalogList();
    } }, t));
  }
  root.append(h('div', { class: 'cat-tools' }, search, sort), chips, h('div', { id: 'c-list' }));
  renderCatalogList();
}
function renderCatalogList() {
  const box = clear($('#c-list'));
  const st = S.db.stores;
  const q = norm(CAT_STATE.q).trim();
  let items = S.db.items.filter(i => (CAT_STATE.cat === 'all' || i.cat === CAT_STATE.cat) && (!q || norm(i.name + ' ' + specChips(i).join(' ')).includes(q)));
  const best = (i) => E.priceOf(i, 'any', st);
  const spread = (i) => { const p = i.prices.filter(x => !st[x.store]?.linkOnly).map(x => x.price); return p.length > 1 ? Math.max(...p) - Math.min(...p) : 0; };
  const pts = (i) => E.componentPoints(i, 'gaming')?.pts ?? 0;
  const sorters = { name: (a, b) => a.name.localeCompare(b.name, 'es'), spread: (a, b) => spread(b) - spread(a), tier: (a, b) => pts(b) - pts(a) || best(a) - best(b),
    value: (a, b) => pts(b) / best(b) - pts(a) / best(a), price: (a, b) => best(a) - best(b) };
  items.sort(sorters[CAT_STATE.sort] || sorters.price);
  if (!items.length) { box.append(h('p', { class: 'empty', text: 'No hay piezas que coincidan.' })); return; }
  const list = h('div', { class: 'cat-list' });
  for (const it of items.slice(0, CAT_STATE.limit)) {
    const o = E.bestOffer(it, 'any', st);
    const n = it.prices.filter(p => !st[p.store]?.linkOnly).length;
    list.append(h('div', { class: 'cat-row' }, h('span', { class: 'part-tile' }, icon(it.cat)),
      h('div', { class: 'part-main' }, h('span', { class: 'part-cat' }, E.CAT_LABEL[it.cat], tierBadge(it, 'gaming')), h('span', { class: 'part-name', text: it.name }), chipsEl(it)),
      h('div', { class: 'part-side' }, h('span', { class: 'price', text: E.euro(o?.price) }), h('span', { class: 'store', text: n > 1 ? `${n} tiendas` : storeName(o?.store) }),
        h('span', { class: 'date-tag' + (o?.date ? '' : ' unconfirmed'), text: o?.date ? fmtDate(o.date) : 'Sin confirmar' })),
      offersEl(it, 'any')));
  }
  box.append(list);
  if (items.length > CAT_STATE.limit) box.append(h('div', { class: 'more' }, h('button', { type: 'button', class: 'btn', onclick: () => { CAT_STATE.limit += 30; renderCatalogList(); } }, `Ver ${Math.min(30, items.length - CAT_STATE.limit)} más de ${items.length - CAT_STATE.limit}`)));
}

// ---------- guardadas ----------
function persistSaved() { const ok = store.set(KEY_SAVED, S.saved); updateSavedCount(); return ok; }
function updateSavedCount() { $('#saved-count').textContent = S.saved.length ? String(S.saved.length) : ''; }
function hydrate(entry) {
  const b = {};
  for (const [c, id] of Object.entries(entry.comps || {})) { const it = S.db.byId.get(String(id)); if (it && it.cat === c) b[c] = it; }
  return b;
}
function renderSaved() {
  updateSavedCount();
  const root = clear($('#saved'));
  S.saved = S.saved.filter(e => e && typeof e === 'object' && typeof e.id === 'string' && e.comps && typeof e.comps === 'object');
  if (!S.saved.length) {
    root.append(h('div', { class: 'empty-state' }, icon('save'), h('p', { text: 'Aún no has guardado ninguna configuración.' }),
      h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { setView('build'); backToWizard(); } }, 'Montar un PC')));
    return;
  }
  const list = h('div', { class: 'saved-list' });
  for (const e of S.saved) {
    const b = hydrate(e);
    const sp = typeof e.store === 'string' ? e.store : 'any';
    const total = E.buildTotal(b, sp, S.db.stores);
    const q = { use: E.USES[e.use] ? e.use : 'gaming', res: ['1080p', '1440p', '4K'].includes(e.res) ? e.res : '1080p', budget: Number.isFinite(e.budget) ? e.budget : null, store: sp };
    const missing = Object.keys(e.comps).length - Object.keys(b).length;
    list.append(h('article', { class: 'saved-card' },
      h('h3', { text: String(e.name || 'Sin nombre').slice(0, 60) }),
      h('p', { class: 'meta', text: `Guardada el ${fmtDate(e.date) || '—'}. Para ${useTitle(q)}.` }),
      h('div', { class: 'row' }, h('span', { class: 'total', text: E.euro(total) }), q.budget ? h('span', { class: 'hint', text: `de ${E.euro(q.budget)}` }) : null),
      missing > 0 ? h('p', { class: 'recog warn' }, icon('alert'), `${missing} ${missing === 1 ? 'pieza ya no está' : 'piezas ya no están'} en el catálogo.`) : null,
      h('div', { class: 'row' },
        h('label', {}, h('input', { type: 'checkbox', checked: S.compare.has(e.id), onchange: (ev) => { if (ev.target.checked) { if (S.compare.size >= 3) { ev.target.checked = false; toast('Puedes comparar hasta tres.'); return; } S.compare.add(e.id); } else S.compare.delete(e.id); renderCompare(); } }), 'Comparar'),
        h('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: () => openEditor(b, q, { origin: 'saved', name: e.name, savedId: e.id }) }, 'Abrir'),
        h('button', { type: 'button', class: 'btn btn-sm', 'aria-label': `Compartir ${e.name}`, onclick: () => shareBuild(b, e.name) }, icon('share')),
        h('button', { type: 'button', class: 'btn btn-sm', 'aria-label': `Borrar ${e.name}`, onclick: () => { S.saved = S.saved.filter(x => x.id !== e.id); S.compare.delete(e.id); persistSaved(); renderSaved(); toast('Configuración borrada.'); } }, icon('trash')))));
  }
  root.append(list, h('div', { id: 'compare-area' }));
  renderCompare();
}
function renderCompare() {
  const area = $('#compare-area'); if (!area) return;
  clear(area);
  const list = S.saved.filter(e => S.compare.has(e.id));
  if (list.length < 2) { if (list.length === 1) area.append(h('p', { class: 'hint', style: { 'margin-top': '16px' }, text: 'Marca otra para compararlas.' })); return; }
  const builds = list.map(e => ({ e, b: hydrate(e), sp: e.store || 'any' }));
  const t = h('table', { class: 'cmp' });
  t.append(h('thead', {}, h('tr', {}, h('th', { text: '' }), builds.map(x => h('th', { scope: 'col', text: x.e.name })))));
  const tb = h('tbody');
  for (const c of E.CATS) {
    if (!builds.some(x => x.b[c])) continue;
    const ids = new Set(builds.map(x => x.b[c]?.id || ''));
    tb.append(h('tr', { class: ids.size > 1 ? 'diff' : '' }, h('th', { scope: 'row', text: E.CAT_LABEL[c] }), builds.map(x => h('td', { text: x.b[c] ? `${x.b[c].name} (${E.euro(E.priceOf(x.b[c], x.sp, S.db.stores))})` : '—' }))));
  }
  tb.append(h('tr', {}, h('th', { scope: 'row', text: 'En juegos' }), builds.map(x => h('td', { text: x.b.cpu ? E.gamingLevel(x.b.gpu, x.b.cpu).text : '—' }))));
  tb.append(h('tr', {}, h('th', { scope: 'row', text: 'Total hoy' }), builds.map(x => h('td', {}, h('b', { text: E.euro(E.buildTotal(x.b, x.sp, S.db.stores)) })))));
  t.append(tb);
  area.append(h('h2', { style: { margin: '28px 0 12px' }, text: 'Comparación' }), h('div', { class: 'cmp-wrap' }, t));
}
init();
})();
