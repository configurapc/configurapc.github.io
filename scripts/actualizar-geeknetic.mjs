// Aplica al catálogo los precios descargados de Geeknetic (scripts/scrape-geeknetic.mjs).
//   node scripts/actualizar-geeknetic.mjs <geeknetic.json> [--nuevas] [--guardar]
// Sin --guardar solo muestra lo que cambiaría.
// --nuevas añade también piezas que no están en el catálogo, solo si se pueden leer bien sus datos técnicos.
// Las piezas que ya están conservan su nombre, datos y explicación; solo cambian sus precios.
import { readFileSync } from 'node:fs';
import '../assets/matcher.js';
import '../assets/hwdb.js';
import { load, save, today } from './lib-precios.mjs';
const M = globalThis.PCMatch, HW = globalThis.PCHW;

const [file, ...flags] = process.argv.slice(2);
if (!file) { console.error('Uso: node scripts/actualizar-geeknetic.mjs <geeknetic.json> [--nuevas] [--guardar]'); process.exit(1); }
const ADD = flags.includes('--nuevas'), SAVE = flags.includes('--guardar');
const src = JSON.parse(readFileSync(file, 'utf8'));
const db = load();
const D = today();

// Tiendas de Geeknetic (id de comerciante → clave del catálogo). Las desconocidas se añaden con su nombre.
const MERCHANTS = { 1: 'pcc', 3: 'alternate', 4: 'neobyte', 12: 'coolmod', 15: 'eci', 17: 'caseking', 26: 'ibarata', 27: 'mediamarkt', 28: 'beep', 29: 'pcbox' };
const NEW_STORES = { beep: { name: 'Beep', color: '#e30613', host: 'www.beep.es' }, eci: { name: 'El Corte Inglés', color: '#008a3e', host: 'www.elcorteingles.es' } };
const storeKey = (o) => {
  let k = MERCHANTS[o.mid];
  if (!k) { k = 'gk' + o.mid; MERCHANTS[o.mid] = k; NEW_STORES[k] = { name: o.m || 'Tienda ' + o.mid, host: 'www.geeknetic.es' }; }
  if (!db.stores[k]) db.stores[k] = NEW_STORES[k];
  return k;
};
const CAT = { procesadores: 'cpu', 'placas-base': 'mobo', 'tarjetas-graficas': 'gpu', 'memoria-ram': 'ram', ssds: 'ssd', 'fuentes-de-alimentacion': 'psu',
  'cajas-de-ordenador': 'case', disipadores: 'cooler', 'kits-de-refrigeracion-liquida': 'cooler', monitores: 'monitor', ratones: 'mouse', teclados: 'keyboard',
  auriculares: 'headset', portatiles: 'laptop' };

const num = (s) => { const m = String(s ?? '').replace(/\./g, '').replace(',', '.').match(/\d+(\.\d+)?/); return m ? +m[0] : null; };
const offerUrl = (l) => 'https://www.geeknetic.es' + l;
const compareUrl = (slug) => `https://www.geeknetic.es/comparador-precios/${slug}/comprar/`;

// Mejor oferta disponible por tienda
function bestOffers(p) {
  if (!p) return [];
  const by = new Map();
  for (const o of p.offers) {
    if (!o.av || !(o.p > 0) || o.p > 20000) continue;
    const k = storeKey(o);
    if (!by.has(k) || o.p < by.get(k).p) by.set(k, o);
  }
  // descarta precios absurdos respecto a la mediana (muy baratos o muy caros): suelen ser errores, saldos de otra versión o packs
  if (!by.size) return [];
  const ps = [...by.values()].map(o => o.p).sort((x, y) => x - y);
  const med = ps.length % 2 ? ps[(ps.length - 1) / 2] : (ps[ps.length / 2 - 1] + ps[ps.length / 2]) / 2;
  return [...by].filter(([, o]) => ps.length < 3 || (o.p >= med / 2.2 && o.p <= med * 2.2)).map(([store, o]) => ({ store, price: Math.round(o.p * 100) / 100, url: offerUrl(o.l), date: D }));
}

function applyPrices(item, offers) {
  for (const n of offers) {
    const prev = item.prices.find(p => p.store === n.store);
    if (!prev) { item.prices.push(n); continue; }
    if (prev.date && prev.date !== D && prev.price !== n.price) prev.hist = [...(prev.hist || []), [prev.date, prev.price]].slice(-26);
    // un enlace directo a la ficha de la tienda se conserva; si era a una categoría o búsqueda, pasa al de Geeknetic
    const direct = !/geeknetic\.es/.test(prev.url) && /^https:\/\/[^/]+\/[a-z0-9]+(-[a-z0-9]+){3,}\/?$/.test(prev.url);
    Object.assign(prev, { price: n.price, date: D }, direct ? {} : { url: n.url });
  }
}

// ---------- lectura de datos técnicos por categoría ----------
const SOCKETS = [[/AM5/i, 'AM5'], [/AM4/i, 'AM4'], [/1851/, 'LGA1851'], [/1700/, 'LGA1700']];
const socketOf = (s) => (SOCKETS.find(([re]) => re.test(s || '')) || [])[1] || null;
const formOf = (s) => /e-?atx/i.test(s) ? 'ATX' : /mini.?itx/i.test(s) ? 'ITX' : /micro|m-?atx/i.test(s) ? 'mATX' : /atx/i.test(s) ? 'ATX' : null;
// Disipador incluido en la caja: solo modelos que lo traen con seguridad (en la duda, no; el configurador añadirá uno)
const AMD_WITH_COOLER = /ryzen \d (4500|4600g|5500|5600|5600g|5700|5700g|7600|7700|7900|8400f|8500g|8600g|8700g|8700f)\b/i;
const INTEL_WITH_COOLER = /(i3-1[234]100f?|i5-1[234]400f?|i5-1[234]500|ultra 5 22[5]f?|ultra 5 235|ultra 7 265f?)\b/i;

// Consumo máximo (no el TDP base): AMD ≈ TDP × 1,35 (PPT); Intel ≈ TDP × 2,2 hasta 253 W (PL2). Mejor pasarse que quedarse corto con la fuente.
function cpuPower(c, s, socket) {
  const tdp = num(s['TDP']);
  if (!tdp) return c.power;
  return Math.max(c.power || 0, socket.startsWith('AM') ? Math.round(tdp * 1.35) : Math.min(253, Math.round(tdp * 2.2)));
}
function specsFor(cat, p) {
  const s = p.spec || {}, name = p.name || '';
  const nm = name.toLowerCase();
  switch (cat) {
    case 'cpu': {
      if (/tray|mpk|bandeja/i.test(s['Tipo de Embalaje'] || '') || /\btray\b/i.test(name)) return null;
      const c = HW.matchCpu(name);
      const socket = socketOf(s['Socket']) || c?.platform;
      if (!c?.exact || !['AM4', 'AM5', 'LGA1700', 'LGA1851'].includes(socket)) return null;
      // gráficos integrados según el modelo (la ficha a veces se equivoca): los F no tienen; en AM4 solo los G
      const model = c.short.split(' ').pop();
      const igpu = /F$/i.test(model) ? false : socket === 'AM4' ? /G$/i.test(model) : true;
      return { specs: { socket, mem: socket === 'LGA1700' ? ['DDR4', 'DDR5'] : [c.mem], cores: num(s['Núcleos']) || undefined, threads: num(s['Hilos de Procesamiento Concurrentes']) || undefined,
        igpu, cooler: AMD_WITH_COOLER.test('ryzen ' + c.short.toLowerCase().replace(/^ryzen /, '')) || INTEL_WITH_COOLER.test(c.short.toLowerCase().replace('core ', '')), power: cpuPower(c, s, socket) }, perf: { gaming: c.gaming, work: c.work }, short: c.short };
    }
    case 'gpu': {
      if (/\b(pro \d{4}|quadro|rtx a\d|radeon pro|blackwell)\b/i.test(name)) return null;
      const g = HW.matchGpu(name);
      if (!g || g.integrated) return null;
      const vram = num(s['Tamaño de la Memoria']) || g.vram;
      // si la ficha dice otra VRAM que la variante reconocida, buscamos la variante correcta
      let gg = g;
      if (vram && vram !== g.vram) { const alt = HW.matchGpu(name + ' ' + vram + 'GB'); if (alt && alt.vram === vram) gg = alt; else return null; }
      const len = num(s['Longitud']);
      return { specs: { chip: gg.name, vram, tbp: gg.tbp, length: len ? Math.round(len < 100 ? len * 10 : len) : null }, perf: { gaming: gg.idx }, short: gg.name };
    }
    case 'mobo': {
      const socket = socketOf(s['Socket']); const chipset = (String(s['Chipset'] || '').match(/[ABHXZW]\d{3}[A-Z]?/) || [])[0];
      const form = formOf(s['Factor de Forma']);
      const mem = socket === 'AM5' || socket === 'LGA1851' ? 'DDR5' : socket === 'AM4' ? 'DDR4' : (/\bd(dr)?4\b/i.test(name) ? 'DDR4' : (String(s['Tipo de Memoria'] || '').match(/DDR[45]/) || [])[0]);
      if (!socket || !chipset || !form || !mem) return null;
      const wifiS = s['Wi-Fi'] || ''; const wifi = /wi-?fi [4-7]/i.test(wifiS) || (!/wi-?fi/i.test(wifiS) && /wi-?fi|\bax\b|wifi7/i.test(name));
      return { specs: { socket, chipset, mem, form, wifi, m2: num(s['Puertos M.2 Totales']) || 1 } };
    }
    case 'ram': {
      const type = (String(s['Tipo de Memoria'] || name).match(/DDR[45]/) || [])[0];
      if (!type || /so-?dimm/i.test((s['Formato'] || '') + name)) return null;
      const size = num(s['Capacidad Total']); const sticks = num(s['Número de Módulos']) || 1; const speed = num(s['Frecuencia']);
      if (!size || ![8, 16, 32, 48, 64, 96, 128].includes(size) || sticks < 2) return null; // solo kits de doble canal
      return { specs: { type, size, sticks, speed, cl: num(s['Latencia CAS']) || undefined } };
    }
    case 'ssd': {
      const blob = `${s['Interfaz'] || ''} ${s['Formato'] || ''} ${s['Conector'] || ''} ${name}`;
      if (!/m\.?2/i.test(blob) || !/nvme|pcie/i.test(blob)) return null;
      const cap = String(s['Capacidad'] || '');
      const size = /tb/i.test(cap) ? Math.round(num(cap) * 1000) : num(cap);
      if (!size || size < 240) return null;
      const gen = /5\.0|gen ?5/i.test(blob) ? 5 : /4\.0|gen ?4/i.test(blob) ? 4 : 3;
      return { specs: { size: size >= 1900 && size <= 2100 ? 2000 : size >= 900 && size <= 1100 ? 1000 : size >= 450 && size <= 520 ? 500 : size, gen } };
    }
    case 'psu': {
      const watts = num(s['Potencia']); const cert = String(s['Certificación de Eficiencia 80 Plus'] || '');
      if (!watts || watts < 300 || /sfx/i.test(s['Formato'] || '')) return null;
      const rating = (cert.match(/titanium|platinum|gold|silver|bronze/i) || [])[0];
      if (!rating || watts < 450) return null; // sin certificación 80 Plus no la recomendamos
      return { specs: { watts, rating: rating ? rating[0].toUpperCase() + rating.slice(1).toLowerCase() : 'White', modular: /^(completamente|parcialmente|totalmente|full|semi)?\s*-?modular/i.test(s['Modularidad'] || '') && !/^no/i.test(s['Modularidad'] || '') } };
    }
    case 'case': {
      const f = String(s['Formato de Placa Compatible'] || '');
      const forms = [...new Set([/(^|[^-])\bATX/i.test(f.replace(/micro.?atx|m-atx|mini.?itx/gi, '')) || /e-atx/i.test(f) ? 'ATX' : null, /micro|m-?atx/i.test(f) ? 'mATX' : null, /itx/i.test(f) ? 'ITX' : null].filter(Boolean))];
      if (!forms.length || /rack|\b\du\b|fuente|psu|\d{3} ?w\b/i.test(name + ' ' + t0(s))) return null; // sin cajas rack ni con fuente incluida
      const mm = (v) => { const n = num(v); return n ? Math.round(/cm/i.test(v) ? n * 10 : n) : null; };
      const t = String(s['Tipo de Caja'] || '');
      return { specs: { forms, gpuMax: mm(s['Largo de Tarjeta Gráfica Máximo']), coolerMax: mm(s['Altitud Máxima del Disipador']), rad: mm(s['Radiador de RL Máximo Compatible']),
        size: /mini|micro|compact|cubo|itx/i.test(t) || !forms.includes('ATX') ? 'compacta' : 'media' } };
    }
    case 'cooler': {
      if (p.cat === 'kits-de-refrigeracion-liquida') {
        if (s['Componente a Enfriar'] && !/cpu|procesador/i.test(s['Componente a Enfriar'])) return null;
        const rad = num(s['Tamaño del Radiador']); if (![120, 240, 280, 360, 420].includes(rad)) return null;
        // capacidad orientativa por tamaño de radiador
        return { specs: { type: 'aio', maxPower: { 120: 150, 240: 230, 280: 260, 360: 300, 420: 320 }[rad], rad, height: null } };
      }
      const tdp = num(s['TDP']); const h = num(s['Altura']);
      if (!tdp || tdp < 65 || /portátil|laptop|gpu/i.test(name)) return null;
      return { specs: { type: 'air', maxPower: tdp, height: h ? Math.round(/cm/i.test(s['Altura']) ? h * 10 : h) : null, rad: null } };
    }
    case 'monitor': {
      const size = num(s['Tamaño']); const hz = num(s['Tasa de refresco']); const r = String(s['Resolución'] || '').replace(/\s/g, '');
      const res = /1920x1080/.test(r) ? '1080p' : /2560x1440/.test(r) ? '1440p' : /3840x2160/.test(r) ? '4K' : null;
      if (!size || !hz || !res) return null;
      const pnl = String(s['Tipo  de Panel'] || '');
      return { specs: { size, res, hz, panel: /oled/i.test(pnl + name) ? 'OLED' : /va/i.test(pnl) ? 'VA' : /tn/i.test(pnl) ? 'TN' : 'IPS' } };
    }
    case 'keyboard': {
      const lang = `${s['Idioma del Teclado'] || ''} ${s['Distribución del Teclado'] || ''}`;
      if (lang.trim() && !/espa|es\b|iso/i.test(lang)) return null;
      if (!lang.trim() && !/\b(es|español|espanol)\b/i.test(name)) return null;
      return { specs: { kind: /combo|\+ rat|y rat/i.test(name) ? 'combo' : 'keyboard', wireless: /inal|wireless|bluetooth|2,4|2\.4/i.test(s['Conectividad'] || name), gaming: /gaming|gamer|mec[aá]nic/i.test(name + (s['Tipo de Teclas'] || '')) } };
    }
    case 'mouse': return { specs: { wireless: /inal|wireless|bluetooth|2,4|2\.4/i.test((s['Tipo de Conexión'] || '') + name), gaming: /gaming|gamer/i.test(name) || num(name.match(/(\d{4,5}) ?dpi/i)?.[1]) > 8000 } };
    case 'headset': {
      if (/tws|in-ear|intraural|earbuds|botón/i.test((s['Tipo de Auriculares'] || '') + name)) return null;
      return { specs: { wireless: /inal|wireless|bluetooth|2,4|2\.4/i.test((s['Tipo de Conexión (audio)'] || '') + name) } };
    }
    case 'laptop': {
      if (/apple|macbook|chromebook/i.test(name + (s['Modelo de CPU'] || ''))) return null;
      const cpu = s['Modelo de CPU'] ? String(s['Modelo de CPU']).trim() : null;
      const ram = num(s['Capacidad de Memoria RAM']); const st = String(s['Capacidad de Almacenamiento'] || '');
      const ssd = /tb/i.test(st) ? Math.round(num(st) * 1000) : num(st); const screen = num(s['Tamaño de Pantalla']);
      if (!cpu || !ram || !ssd || !screen) return null;
      const c = cpu.toLowerCase();
      const cpuTier = /(i9|ryzen 9|ultra 9|ai 9|hx 3|\b2[789]\dhx)/.test(c) ? 4 : /(i7|ryzen 7|ultra 7|ai 7|core 7)/.test(c) ? 3 : /(i5|ryzen 5|ultra 5|ai 5|core 5)/.test(c) ? 2 : 1;
      const gpuS = String(s['Tarjeta Gráfica Dedicada'] || '');
      const gm = (gpuS + ' ' + name).match(/RTX ?(\d{4})( ?Ti)?/i);
      let gpuTier = 0, gpu = null;
      if (gm && !/^(no|sin)/i.test(gpuS)) {
        const n = +gm[1], ti = !!gm[2]; gpu = `RTX ${n}${ti ? ' Ti' : ''} Laptop`;
        gpuTier = n % 1000 >= 90 || n % 1000 === 80 ? 5 : n % 1000 === 70 ? (ti ? 4 : 3) : n % 1000 === 60 ? 2 : 1;
      }
      const os = s['Sistema Operativo Preinstalado'] || null;
      const pnl = String(s['Tipo de Panel de la Pantalla'] || '');
      return { specs: { cpu: cpu.replace(/\s+/g, ' '), cpuTier, gpu, gpuTier, ram, ramUpgrade: null, ssd, screen, panel: /oled/i.test(pnl) ? 'OLED' : null,
        hz: num(s['Tasa de Refresco de la Pantalla']) || null, os: os && /sin|free ?dos|no/i.test(os) ? 'Sin sistema operativo' : os, keyboard: 'ES' } };
    }
  }
  return null;
}

// Explicación corta y objetiva a partir de los datos (sin opiniones inventadas)
function whyFor(cat, sp) {
  const s = sp.specs;
  switch (cat) {
    case 'cpu': return `${s.cores ? s.cores + ' núcleos, ' : ''}socket ${s.socket}${s.igpu ? ', con gráficos integrados' : ', sin gráficos integrados'}${s.cooler ? '. Incluye disipador.' : '.'}`;
    case 'gpu': return `${s.vram} GB de memoria${s.length ? `, ${Math.round(s.length / 10)} cm de largo` : ''}. Consumo de la gráfica: ${s.tbp} W.`;
    case 'mobo': return `Placa ${s.form} ${s.chipset} para ${s.socket} con ${s.mem}${s.wifi ? ' y WiFi' : ''}. ${s.m2} ranura${s.m2 > 1 ? 's' : ''} M.2.`;
    case 'ram': return `${s.size} GB ${s.type} en ${s.sticks} módulos${s.speed ? ` a ${s.speed} MHz` : ''}${s.cl ? ` CL${s.cl}` : ''}.`;
    case 'ssd': return `SSD NVMe PCIe ${s.gen}.0 de ${s.size >= 1000 ? s.size / 1000 + ' TB' : s.size + ' GB'}.`;
    case 'psu': return `${s.watts} W, certificación ${s.rating}${s.modular ? ', modular' : ''}.`;
    case 'case': return `Admite placas ${s.forms.join(', ')}${s.gpuMax ? `, gráficas de hasta ${Math.round(s.gpuMax / 10)} cm` : ''}${s.rad ? ` y radiador de ${s.rad} mm` : ''}.`;
    case 'cooler': return s.type === 'aio' ? `Refrigeración líquida con radiador de ${s.rad} mm.` : `Disipador por aire para hasta ${s.maxPower} W${s.height ? `, ${s.height} mm de alto` : ''}.`;
    case 'monitor': return `${s.size}" ${s.res} a ${s.hz} Hz, panel ${s.panel}.`;
    case 'keyboard': return `${s.kind === 'combo' ? 'Teclado y ratón' : 'Teclado'}${s.wireless ? ' inalámbrico' : ' con cable'}${s.gaming ? ' para juegos' : ''}.`;
    case 'mouse': return `Ratón${s.wireless ? ' inalámbrico' : ' con cable'}${s.gaming ? ' para juegos' : ''}.`;
    case 'headset': return `Auriculares${s.wireless ? ' inalámbricos' : ' con cable'}.`;
    case 'laptop': return `${s.cpu}, ${s.ram} GB de RAM, ${s.ssd >= 1000 ? s.ssd / 1000 + ' TB' : s.ssd + ' GB'} de SSD${s.gpu ? ', ' + s.gpu : ', sin gráfica dedicada'}. Pantalla de ${s.screen}".`;
  }
  return '';
}

const t0 = (s) => String(s['Tipo de Caja'] || '');
const cleanName = (s) => String(s).replace(/^(tarjeta gr[aá]fica|procesador|placa base|memoria ram|disco ssd|ssd|fuente de alimentaci[oó]n|caja( pc)?|torre( pc)?|disipador( cpu)?|kit de refrigeraci[oó]n l[ií]quida|refrigeraci[oó]n l[ií]quida|monitor|teclado|rat[oó]n|auriculares|port[aá]til)\s+/i, '').trim().slice(0, 110);
const PREFIX = { cpu: 'cpu', gpu: 'gpu', mobo: 'mb', ram: 'ram', ssd: 'ssd', psu: 'psu', case: 'case', cooler: 'cool', monitor: 'mon', keyboard: 'kb', mouse: 'ms', headset: 'hs', laptop: 'lap' };
const ids = new Set(db.items.map(i => i.id));
const slugId = (cat, name) => { const base = (PREFIX[cat] + '-' + M.norm(name).replace(/ /g, '-')).slice(0, 56).replace(/-+$/, ''); let id = base, k = 2; while (ids.has(id)) id = base.slice(0, 53) + '-' + k++; ids.add(id); return id; };

// ---------- emparejar con el catálogo ----------
// Para cada pieza del catálogo buscamos el producto de Geeknetic que contiene todo su modelo.
const SUFFIX = new Set(['ti', 'xt', 'xtx', 'super', 'x3d', 'gre', 'plus', 'pro', 'max', 'oled', 'ultra', 'ii', 'iii', 'v2', 'v3', 's', 'x', 'f', 'k', 'kf']);
const STOPW = new Set('de con y para sin the and a el la los las tarjeta grafica procesador placa base memoria ram disco ssd fuente alimentacion caja torre disipador cpu refrigeracion liquida monitor teclado raton auriculares portatil gaming oc edition negro negra rgb argb nuevo pc box boxed tray'.split(' '));
const toks = (s) => M.norm(s).split(' ').filter(t => t && !STOPW.has(t));
const isModel = (t) => /\d/.test(t) && t.length >= 3 && !/^(\d+(gb|tb|mhz|w|mm|hz|cm|mb|ghz)|g?ddr\d|pcie\d?|am[45]|lga\d+|\d{4}mhz)$/.test(t);
function fit(item, p) {
  const ti = toks(item.name), tp = new Set(toks(p.name));
  if (!ti.length) return 0;
  if (ti.some(t => (isModel(t) || SUFFIX.has(t)) && !tp.has(t))) return 0;          // todo el modelo del catálogo está en Geeknetic
  if ([...tp].some(t => SUFFIX.has(t) && !ti.includes(t) && t.length > 1)) return 0;   // y Geeknetic no añade Ti/XT/Super/X3D…
  if (item.cat === 'cpu') { const a = HW.matchCpu(item.name), b = HW.matchCpu(cleanName(p.name)); if (!a || !b || a.short !== b.short) return 0; }
  if (item.cat === 'gpu') { const v = num(p.spec?.['Tamaño de la Memoria']); if (v && item.specs.vram && v !== item.specs.vram) return 0; }
  if (item.cat === 'ram' || item.cat === 'ssd') { const pm = toks(p.name).filter(isModel); if (pm.some(t => !ti.includes(t) && /^[a-z]+\d|\d+[a-z]/.test(t) && !/gb|tb|mhz|cl/.test(t))) return 0; }
  return ti.filter(t => tp.has(t)).length / ti.length;
}
let updated = 0, added = 0, skipped = 0;
const used = new Set();
const addedBy = {};
const products = src.products.map(p => ({ ...p, cat2: CAT[p.cat], ean: (p.spec?.EAN || '').replace(/\D/g, '') })).filter(p => p.cat2);
const bySlug = new Map(products.map(p => [p.slug, p]));
for (const item of db.items) {
  let p = item.compare ? bySlug.get(item.compare.replace(/.*comparador-precios\//, '').replace(/\/comprar\/?$/, '')) : null;
  if (!p && item.codes?.ean?.length) p = products.find(x => x.cat2 === item.cat && item.codes.ean.includes(x.ean));
  if (!p) {
    let best = null, bs = 0;
    for (const x of products) { if (x.cat2 !== item.cat || used.has(x.slug)) continue; const f = fit(item, x); if (f > bs || (f === bs && f && bestOffers(x).length > bestOffers(best).length)) { bs = f; best = x; } }
    if (bs >= 0.8) p = best;
  }
  if (!p) continue;
  const offers = bestOffers(p);
  used.add(p.slug);
  if (!offers.length) continue;
  applyPrices(item, offers);
  item.compare = item.compare || compareUrl(p.slug);
  if (p.ean.length >= 8) { item.codes = item.codes || {}; item.codes.ean = [...new Set([...(item.codes.ean || []), p.ean])].slice(0, 10); }
  updated++;
}
if (ADD) for (const p of products) {
  if (used.has(p.slug)) continue;
  const cat = p.cat2;
  const offers = bestOffers(p);
  if (!offers.length) continue;
  if (p.ean.length >= 8 && db.items.some(i => (i.codes?.ean || []).includes(p.ean))) continue;
  const sp = specsFor(cat, p);
  if (!sp) { skipped++; continue; }
  const name = cat === 'cpu' ? HW.matchCpu(cleanName(p.name)).name : cleanName(p.name);
  if (db.items.some(i => i.cat === cat && M.norm(i.name) === M.norm(name))) continue;
  if (cat === 'cpu' && db.items.some(i => i.cat === 'cpu' && HW.matchCpu(i.name)?.short === sp.short)) continue; // mismo modelo ya en el catálogo
  const it = { id: slugId(cat, name), cat, name, specs: Object.fromEntries(Object.entries(sp.specs).filter(([, v]) => v !== undefined)) };
  if (sp.perf) it.perf = sp.perf;
  it.prices = offers;
  it.compare = compareUrl(p.slug);
  if (p.ean.length >= 8 || p.spec?.MPN) it.codes = { ...(p.ean.length >= 8 ? { ean: [p.ean] } : {}), ...(p.spec?.MPN ? { mpn: String(p.spec.MPN).slice(0, 40) } : {}) };
  it.why = whyFor(cat, sp);
  it.auto = true;
  db.items.push(it);
  used.add(p.slug);
  addedBy[cat] = (addedBy[cat] || 0) + 1;
  added++;
}

const stale = db.items.filter(i => !['os', 'assembly'].includes(i.cat) && !i.prices.some(p => p.date === D));
console.log(`Geeknetic ${src.date}: ${src.products.length} productos.`);
console.log(`Piezas del catálogo actualizadas: ${updated}. Nuevas: ${added} ${JSON.stringify(addedBy)}. Descartadas por datos incompletos: ${skipped}.`);
console.log(`Sin precio de hoy (se mantienen los anteriores): ${stale.length}${stale.length ? ' → ' + stale.map(i => i.id).join(', ') : ''}`);
if (SAVE) { save(db); console.log('Guardado.'); } else console.log('(prueba: no se ha guardado nada; añade --guardar)');
