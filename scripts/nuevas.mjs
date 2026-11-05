// Añade piezas nuevas al catálogo desde un CSV (por ejemplo importar/nuevas.csv que genera feed.mjs).
//
//   node scripts/nuevas.mjs <archivo.csv>          → comprueba sin guardar
//   node scripts/nuevas.mjs <archivo.csv> --guardar
//   node scripts/nuevas.mjs plantilla              → muestra qué especificaciones pide cada categoría
//
// Columnas: categoria;nombre;tienda;precio;url;ean;mpn;especificaciones;por_que
// «especificaciones» va en formato clave=valor separadas por «|», por ejemplo:  socket=AM5|chipset=B650|mem=DDR5|form=ATX|wifi=si
// Procesadores y gráficas se rellenan solos a partir del nombre (rendimiento, consumo, VRAM…) con la tabla de assets/hwdb.js.
import { readFileSync } from 'node:fs';
import '../assets/matcher.js';
import '../assets/hwdb.js';
import { load, save, hostOk, parsePrice, today, addCodes } from './lib-precios.mjs';
const M = globalThis.PCMatch, HW = globalThis.PCHW;

const SPECS = {
  cpu: 'socket (AM4/AM5/LGA1700/LGA1851), mem (DDR4,DDR5), cores, igpu (si/no), cooler (si/no: trae disipador), power (W). Se deducen del nombre si es un modelo conocido.',
  gpu: 'vram (GB), tbp (W), length (mm, opcional). Se deducen del nombre si es un modelo conocido.',
  mobo: 'socket, chipset, mem (DDR4/DDR5), form (ATX/mATX/ITX), wifi (si/no), m2 (número de ranuras)',
  ram: 'type (DDR4/DDR5), size (GB totales), speed (MHz)', ssd: 'size (GB: 500/1000/2000), gen (3/4/5)',
  psu: 'watts, rating (Bronze/Gold/Platinum), modular (si/no)', case: 'forms (ATX,mATX,ITX), gpuMax (mm), coolerMax (mm), rad (mm), size (compacta/media)',
  cooler: 'type (air/aio), maxPower (W), height (mm, aire), rad (mm, líquida)', monitor: 'size (pulgadas), res (1080p/1440p/4K), hz, panel (IPS/VA/OLED)',
  keyboard: 'kind (combo/keyboard), wireless (si/no), gaming (si/no)', mouse: 'wireless, gaming', headset: 'wireless',
  laptop: 'cpu, cpuTier (1-4), gpu (o vacío), gpuTier (0-5), ram, ssd, screen (pulgadas), hz, panel, os'
};
const REQUIRED = { cpu: ['socket', 'mem', 'power', 'cooler', 'igpu'], gpu: ['vram', 'tbp'], mobo: ['socket', 'chipset', 'mem', 'form', 'wifi'], ram: ['type', 'size'], ssd: ['size'],
  psu: ['watts', 'rating'], case: ['forms'], cooler: ['type', 'maxPower'], monitor: ['res', 'hz'], keyboard: ['kind'], mouse: [], headset: [], laptop: ['cpu', 'cpuTier', 'gpuTier', 'ram', 'ssd', 'screen'] };
const LISTS = new Set(['mem', 'forms']);
const NUMS = new Set(['cores', 'power', 'vram', 'tbp', 'length', 'm2', 'size', 'speed', 'gen', 'watts', 'gpuMax', 'coolerMax', 'rad', 'maxPower', 'height', 'hz', 'cpuTier', 'gpuTier', 'ram', 'ssd', 'screen']);

const [file, ...rest] = process.argv.slice(2);
if (!file || file === 'plantilla') {
  console.log('Especificaciones por categoría (columna «especificaciones», clave=valor|clave=valor):\n');
  for (const [c, t] of Object.entries(SPECS)) console.log(`${c.padEnd(9)} ${t}`);
  process.exit(0);
}
const doSave = rest.includes('--guardar');
const db = load();

function parseSpecs(s) {
  const o = {};
  for (const part of String(s || '').split('|')) {
    const [k, ...v] = part.split('='); const key = k?.trim(); let val = v.join('=').trim();
    if (!key || !val) continue;
    if (/^(si|sí|yes|true)$/i.test(val)) o[key] = true;
    else if (/^(no|false)$/i.test(val)) o[key] = false;
    else if (LISTS.has(key)) o[key] = val.split(/[,/ ]+/).filter(Boolean);
    else if (NUMS.has(key) && !isNaN(Number(val.replace(',', '.')))) o[key] = Number(val.replace(',', '.'));
    else o[key] = val;
  }
  return o;
}
const PLATFORM_SOCKET = { AM4: 'AM4', AM5: 'AM5', LGA1700: 'LGA1700', LGA1851: 'LGA1851' };
function autoFill(cat, name, specs, perf, notes) {
  if (cat === 'cpu') {
    const c = HW.matchCpu(name);
    if (c?.exact && PLATFORM_SOCKET[c.platform]) {
      specs.socket ??= c.platform; specs.power ??= c.power;
      specs.mem ??= c.platform === 'LGA1700' ? ['DDR4', 'DDR5'] : [c.mem];
      specs.igpu ??= /AMD/.test(c.name) ? (/\d{4}G\b|\d{4}GT\b/.test(c.short) || (/Ryzen \d [79]\d{3}/.test(c.short) && !/F\b/.test(c.short))) : !/F$/.test(c.short.replace(/ Plus$/, ''));
      perf.gaming ??= c.gaming; perf.work ??= c.work;
      notes.push(`datos de ${c.short} tomados de la tabla de referencia`);
    }
  }
  if (cat === 'gpu') {
    const g = HW.matchGpu(name);
    if (g && !g.integrated) {
      specs.chip ??= g.name; specs.vram ??= g.vram; specs.tbp ??= g.tbp; perf.gaming ??= g.idx;
      notes.push(`rendimiento de ${g.name} tomado de la tabla de referencia`);
    }
  }
}
const slug = (s) => M.norm(s).replace(/ /g, '-').slice(0, 48).replace(/-+$/, '');
// Las tiendas anteponen la categoría al nombre («Tarjeta Gráfica …», «Procesador …»): la quitamos.
const cleanName = (s) => s.replace(/^(tarjeta gr[aá]fica|procesador|placa base|memoria ram|disco ssd|ssd|fuente de alimentaci[oó]n|caja( pc)?|torre( pc)?|disipador|refrigeraci[oó]n l[ií]quida|monitor|teclado|rat[oó]n|auriculares|port[aá]til)\s+/i, '').trim();

const rows = M.parseCsv(readFileSync(file, 'utf8')).filter(r => !String(r[0]).trim().startsWith('#'));
if (rows.length && M.norm(rows[0][0]) === 'categoria') rows.shift();
let ok = 0, bad = 0;
const ids = new Set(db.items.map(i => i.id));
for (const [n, r] of rows.entries()) {
  const [catRaw, rawName, store, priceRaw, url, ean, mpn, specsRaw, why] = r.map(x => String(x ?? '').trim());
  const name = cleanName(rawName);
  const where = `línea ${n + 2} («${(name || '').slice(0, 50)}»)`;
  const cat = REQUIRED[catRaw] ? catRaw : M.guessCat(catRaw + ' ' + name);
  const errs = [], notes = [];
  if (!cat) errs.push('categoría desconocida (cpu, gpu, mobo, ram, ssd, psu, case, cooler, monitor, keyboard, mouse, headset, laptop)');
  if (!name || name.length > 120) errs.push('falta el nombre');
  if (!db.stores[store]) errs.push(`tienda desconocida «${store}»`);
  const price = parsePrice(priceRaw);
  if (price == null) errs.push(`precio no válido «${priceRaw}»`);
  if (!url || !hostOk(db, store, url)) errs.push(`el enlace debe ser de ${db.stores[store]?.host || 'la tienda'}`);
  const existing = M.matchRow(db.items, { name, url, ean, mpn });
  if (existing.item && existing.how !== 'nombre') errs.push(`ya existe como «${existing.item.id}» (por ${existing.how}): usa precio.mjs para actualizarla`);
  const specs = parseSpecs(specsRaw), perf = {};
  if (cat) autoFill(cat, name, specs, perf, notes);
  if (cat) for (const k of REQUIRED[cat]) if (specs[k] === undefined) errs.push(`falta ${k}`);
  if (cat === 'cpu' && (perf.gaming == null || perf.work == null)) errs.push('procesador no reconocido: añade perf con gaming= y work= (índices: Ryzen 7 9800X3D=100 en juegos, Core Ultra 9 285K=100 en trabajo)');
  if (cat === 'gpu' && perf.gaming == null) errs.push('gráfica no reconocida: añade gaming= (RTX 5070 = 100)');
  if (specs.gaming != null && ['cpu', 'gpu'].includes(cat)) { perf.gaming = Number(specs.gaming); delete specs.gaming; }
  if (specs.work != null && cat === 'cpu') { perf.work = Number(specs.work); delete specs.work; }
  if (errs.length) { console.log(`✗ ${where}: ${errs.join('; ')}`); bad++; continue; }
  let id = `${cat}-${slug(name)}`; let k = 2; while (ids.has(id)) id = `${cat}-${slug(name)}-${k++}`;
  ids.add(id);
  const item = { id, cat, name, specs, ...(Object.keys(perf).length ? { perf } : {}), prices: [{ store, price, url, date: today() }], why: why || '' };
  addCodes(item, { ean, mpn });
  db.items.push(item); ok++;
  console.log(`✓ ${id}  ${price} €${notes.length ? '  (' + notes.join('; ') + ')' : ''}`);
}
console.log(`\n${ok} piezas listas, ${bad} con errores.`);
if (doSave && ok) save(db);
else if (ok) console.log('Nada guardado todavía: pulsa «Añadir al catálogo» en el panel o repite con --guardar.');
if (bad) process.exitCode = 1;
