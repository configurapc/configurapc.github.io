// Descarga precios y fichas del comparador de Geeknetic (varias tiendas por producto).
// Lo ejecuta GitHub Actions (.github/workflows/precios.yml). Uso local: node scripts/scrape-geeknetic.mjs [salida.json]
// Necesita linkedom (npm i linkedom). Va despacio a propósito para no cargar el servidor.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseHTML } from 'linkedom';
import '../assets/hwdb.js';
const HW = globalThis.PCHW;

const OUT = process.argv[2] || '_datos/geeknetic.json';
const BASE = 'https://www.geeknetic.es';
// Máximo de productos por categoría (los que venden más tiendas primero)
const CATS = { procesadores: 150, 'placas-base': 300, 'tarjetas-graficas': 300, 'memoria-ram': 200, ssds: 200, 'fuentes-de-alimentacion': 200,
  'cajas-de-ordenador': 200, disipadores: 120, 'kits-de-refrigeracion-liquida': 100, monitores: 250, ratones: 100, teclados: 100, auriculares: 100, portatiles: 300 };
const MAX_PAGES = 60;
// Qué productos interesan: procesadores y gráficas de escritorio reconocidos; del resto, los que venden al menos 2 tiendas.
function wanted(c, name, off) {
  if (c === 'procesadores') { const m = HW.matchCpu(name); return !!(m?.exact && ['AM4', 'AM5', 'LGA1700', 'LGA1851'].includes(m.platform)) && !/tray|bandeja|mpk|\(t\)|oem/i.test(name); }
  if (c === 'tarjetas-graficas') { const g = HW.matchGpu(name); return !!(g && !g.integrated) && !/\b(pro \d{4}|quadro|rtx a\d|radeon pro)\b/i.test(name); }
  return off >= 2;
}
const KEEP = ['EAN', 'MPN', 'ID de GEEKNETIC', 'Marca', 'Socket', 'Núcleos', 'Hilos de Procesamiento Concurrentes', 'TDP', 'Tipo de Gráficos Integrados', 'Tipo de Embalaje', 'Serie',
  'Chipset', 'Factor de Forma', 'Tipo de Memoria', 'Puertos M.2 Totales', 'Wi-Fi', 'Modelo de GPU', 'Tamaño de la Memoria', 'Longitud', 'Marca de GPU',
  'Capacidad Total', 'Número de Módulos', 'Frecuencia', 'Latencia CAS', 'Formato', 'Capacidad', 'Interfaz', 'Conector', 'Potencia', 'Certificación de Eficiencia 80 Plus', 'Modularidad',
  'Formato de Placa Compatible', 'Largo de Tarjeta Gráfica Máximo', 'Altitud Máxima del Disipador', 'Radiador de RL Máximo Compatible', 'Tipo de Caja', 'Altura', 'Sockets Compatiles',
  'Tipo de Refrigeración', 'Tamaño del Radiador', 'Sockets Compatibles', 'Componente a Enfriar', 'Tamaño', 'Tipo  de Panel', 'Tasa de refresco', 'Resolución', 'Tipo de Conexión',
  'Tipo de Conexión (audio)', 'Tipo de Auriculares', 'Conectividad', 'Tipo de Teclas', 'Tamaño del Teclado', 'Idioma del Teclado', 'Distribución del Teclado',
  'Tamaño de Pantalla', 'Tarjeta Gráfica Dedicada', 'Modelo de CPU', 'Serie de CPU', 'Capacidad de Memoria RAM', 'Número Ranuras de Memoria RAM', 'Capacidad de Almacenamiento',
  'Sistema Operativo Preinstalado', 'Tipo de Panel de la Pantalla', 'Tasa de Refresco de la Pantalla', 'Memoria de la Tarjeta Gráfica'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 ConfiguraPC-precios';
async function get(path) {
  for (let k = 0; k < 4; k++) {
    try {
      const r = await fetch(BASE + path, { headers: { 'user-agent': UA, 'accept-language': 'es-ES,es;q=0.9' } });
      if (r.ok) return await r.text();
      console.warn(r.status, path);
    } catch (e) { console.warn(String(e), path); }
    await sleep(2000 * (k + 1));
  }
  throw new Error('No se pudo descargar ' + path);
}

const list = new Map();
for (const [c, cap] of Object.entries(CATS)) {
  const found = [];
  let pages = 1;
  for (let p = 1; p <= Math.min(pages, MAX_PAGES); p++) {
    const path = `/comparador-precios/${c}/` + (p > 1 ? p + '/' : '');
    try {
      const html = await get(path);
      if (p === 1) pages = Math.max(1, ...[...html.matchAll(new RegExp(`/comparador-precios/${c}/(\\d+)/`, 'g'))].map((m) => +m[1]));
      const { document } = parseHTML(html);
      for (const a of document.querySelectorAll('article.product')) {
        const h = a.querySelector('h3 a')?.getAttribute('href'); const name = a.querySelector('h3 a')?.textContent.trim() || '';
        const off = parseInt(a.querySelector('.product-button')?.textContent) || 0;
        if (h && off > 0 && wanted(c, name, off)) found.push({ h, off });
      }
    } catch (e) { console.warn(String(e)); }
    await sleep(350);
  }
  found.sort((a, b) => b.off - a.off);
  for (const f of found.slice(0, cap)) if (!list.has(f.h)) list.set(f.h, c);
  console.log(c, pages, 'páginas,', found.length, 'interesantes; acumulado', list.size);
}

const out = [];
let n = 0, fails = 0;
const queue = [...list];
async function worker() {
  while (queue.length) {
    const [h, c] = queue.shift();
    try {
      const { document } = parseHTML(await get(h));
      const offers = [...document.querySelectorAll('.product-offer')].map((o) => {
        const a = o.querySelector('a[data-merchant-id]');
        return { mid: +a?.getAttribute('data-merchant-id'), m: o.querySelector('.product-offer-merchant')?.textContent.trim(), p: +o.getAttribute('data-price'),
          av: o.getAttribute('data-availablilty') === 'yes', cond: o.getAttribute('data-condition'), l: a?.getAttribute('href') || '' };
      }).filter((o) => o.cond === 'new' && o.p > 0 && o.l);
      const spec = {};
      for (const tr of document.querySelectorAll('table.table-spec tr')) {
        const td = tr.querySelectorAll('td');
        const k = td[0]?.childNodes[0]?.textContent.trim(); const v = td[1]?.textContent.trim();
        if (k && v && KEEP.includes(k)) spec[k] = v;
      }
      if (offers.length) out.push({ cat: c, slug: h.replace('/comparador-precios/', '').replace('/comprar/', ''), name: document.querySelector('h1')?.textContent.trim(), offers, spec });
    } catch (e) { fails++; console.warn(String(e)); }
    if (++n % 100 === 0) console.log('productos', n, '/', list.size);
    await sleep(350);
  }
}
await Promise.all([worker(), worker(), worker()]);
if (out.length < 200) { console.error('Muy pocos productos (' + out.length + '): no se guarda nada.'); process.exit(1); }
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString().slice(0, 10), products: out }));
console.log(`Guardado ${OUT}: ${out.length} productos, ${fails} fallos.`);
