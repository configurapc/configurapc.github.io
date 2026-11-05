// Motor de recomendación, compatibilidad y precios (script clásico: funciona también abriendo index.html con doble clic).
// Expone window.PCEngine. Sin DOM: se prueba en Node (tests/engine.test.mjs).
(function (root) {
'use strict';

const CATS = ['cpu', 'mobo', 'ram', 'gpu', 'ssd', 'psu', 'case', 'cooler', 'monitor', 'keyboard', 'mouse', 'headset', 'os', 'assembly'];
const CORE_CATS = ['cpu', 'mobo', 'ram', 'gpu', 'ssd', 'psu', 'case', 'cooler'];
const PERIPH_CATS = ['monitor', 'keyboard', 'mouse', 'headset'];
const EXTRA_CATS = ['os', 'assembly'];

const CAT_LABEL = {
  cpu: 'Procesador', mobo: 'Placa base', ram: 'Memoria RAM', gpu: 'Tarjeta gráfica', ssd: 'Almacenamiento',
  psu: 'Fuente de alimentación', case: 'Caja', cooler: 'Disipador', monitor: 'Monitor', keyboard: 'Teclado',
  mouse: 'Ratón', headset: 'Auriculares', os: 'Sistema operativo', assembly: 'Montaje', laptop: 'Portátil'
};

const USES = {
  gaming: { label: 'Jugar', ramMin: 16, ramIdeal: 32, needGpu: true },
  office: { label: 'Ofimática y estudio', ramMin: 16, ramIdeal: 16, needGpu: false },
  creative: { label: 'Edición de foto y vídeo', ramMin: 32, ramIdeal: 64, needGpu: true },
  dev: { label: 'Programación', ramMin: 32, ramIdeal: 32, needGpu: false },
  ai: { label: 'IA local', ramMin: 32, ramIdeal: 64, needGpu: true },
  streaming: { label: 'Jugar y hacer streaming', ramMin: 32, ramIdeal: 32, needGpu: true }
};

// ---------- utilidades ----------
const round50 = (w) => Math.ceil(w / 50) * 50;
const sat = (x, cap) => Math.max(0, Math.min(x, cap)) / cap;
const euro = (n) => (n == null || !isFinite(n)) ? '—' :
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);

function indexDb(db) {
  const byId = new Map();
  const byCat = {};
  for (const c of CATS) byCat[c] = [];
  byCat.laptop = [];
  for (const it of db.items) {
    byId.set(it.id, it);
    if (byCat[it.cat]) byCat[it.cat].push(it);
  }
  return { ...db, byId, byCat };
}

// Precio a usar: tienda preferida si la tiene; si no, el mínimo.
function bestOffer(item, storePref, stores) {
  if (!item || !item.prices) return null;
  const offers = item.prices.filter(p => typeof p.price === 'number' && !(stores?.[p.store]?.linkOnly));
  if (!offers.length) return null;
  if (storePref && storePref !== 'any') {
    const pref = offers.find(p => p.store === storePref);
    if (pref) return pref;
  }
  return offers.reduce((a, b) => (b.price < a.price ? b : a));
}
const priceOf = (item, storePref, stores) => item?.owned ? 0 : (bestOffer(item, storePref, stores)?.price ?? Infinity);

function buildTotal(build, storePref, stores) {
  let total = 0;
  for (const c of CATS) if (build[c]) total += priceOf(build[c], storePref, stores);
  return Math.round(total * 100) / 100;
}

// ---------- potencia ----------
function powerNeed(cpu, gpu) {
  const cpuW = cpu?.specs?.power ?? 120;
  const gpuW = gpu?.specs?.tbp ?? 0;
  return Math.max(450, round50((cpuW + gpuW + 80) * 1.3));
}
function estimatedDraw(cpu, gpu) {
  return Math.round((cpu?.specs?.power ?? 120) + (gpu?.specs?.tbp ?? 0) + 80);
}

// ---------- rendimiento ----------
// Índices orientativos (no son FPS): la GPU limita más cuanto mayor es la resolución,
// la CPU pone un techo que no depende de la resolución. Se combinan con un "mínimo suave".
const RES_LOAD = { '1080p': 1, '1440p': 1.45, '4K': 2.4 };
function gameFps(cpu, gpu, res = '1080p', competitive = false) {
  const gpuCap = gpuEff(gpu, cpu, res) / RES_LOAD[res] * (competitive ? 1.8 : 1);
  const cpuCap = (cpu?.perf?.gaming ?? 50) * 1.6;
  if (gpuCap <= 0) return 0;
  const p = 4;
  return Math.pow(Math.pow(gpuCap, -p) + Math.pow(cpuCap, -p), -1 / p);
}
// CPU mínima razonable para una gráfica (evita combinaciones desequilibradas)
const balancedPair = (cpu, gpu) => !gpu || cpu.perf.gaming >= 25 + gpu.perf.gaming * 0.35;

function vramFactor(vram, res) {
  if (!vram) return 1;
  if (res === '4K') return vram >= 16 ? 1 : vram >= 12 ? 0.88 : 0.72;
  if (res === '1440p') return vram >= 12 ? 1 : 0.9;
  return 1;
}
function igpuIndex(cpu) {
  const l = cpu?.specs?.igpuLevel ?? 0;
  return cpu?.specs?.igpu ? [0, 8, 18, 32][l] ?? 8 : 0;
}
function gpuEff(gpu, cpu, res) {
  if (!gpu) return igpuIndex(cpu);
  return gpu.perf.gaming * vramFactor(gpu.specs.vram, res);
}

function gamingLevel(gpu, cpu) {
  const e4 = gpuEff(gpu, cpu, '4K');
  const e2 = gpuEff(gpu, cpu, '1440p');
  const e1 = gpuEff(gpu, cpu, '1080p');
  // Umbrales alineados con los FPS estimados: unos 60 FPS de media en juegos exigentes a esa resolución.
  if (e4 >= 125) return { key: '4k', text: '4K con calidad alta (con DLSS/FSR en los más exigentes)' };
  if (e2 >= 95) return { key: '1440p-high', text: '1440p con calidad alta y alto refresco' };
  if (e2 >= 75) return { key: '1440p-mid', text: '1440p en calidad alta' };
  if (e1 >= 50) return { key: '1080p-high', text: '1080p en calidad alta' };
  if (e1 >= 30) return { key: '1080p-low', text: '1080p en calidad media' };
  if (e1 >= 15) return { key: 'esports', text: 'eSports y juegos ligeros a 1080p' };
  return { key: 'desktop', text: 'Escritorio, vídeo y juegos muy antiguos' };
}

function scoreBuild(b, q) {
  const cpu = b.cpu, gpu = b.gpu, ram = b.ram, ssd = b.ssd;
  if (!cpu) return 0;
  const res = q.res || '1080p';
  const ramGB = ram?.specs?.size ?? 0;
  const ssdGB = ssd?.specs?.size ?? 0;
  const cpuG = cpu.perf.gaming / 100;
  const cpuW = cpu.perf.work / 100;
  const g = gpuEff(gpu, cpu, res) / 150;
  switch (q.use) {
    case 'gaming':
      return gameFps(cpu, gpu, res, q.competitive) / 150 * (ramGB >= 32 ? 1 : ramGB >= 16 ? 0.94 : 0.8);
    case 'streaming': {
      const s = 0.65 * gameFps(cpu, gpu, res, false) / 150 + 0.35 * cpuW;
      return s * (ramGB >= 32 ? 1 : 0.9);
    }
    case 'creative': {
      const vram = gpu?.specs?.vram ?? 0;
      return 0.45 * cpuW + 0.3 * g * (vram >= 12 ? 1 : 0.85) + 0.2 * sat(ramGB, 64) + 0.05 * sat(ssdGB, 2000);
    }
    case 'dev':
      return 0.6 * sat(cpuW, 0.7) + 0.25 * sat(ramGB, 32) + 0.1 * sat(cpuG, 0.8) + 0.05 * sat(ssdGB, 1000);
    case 'ai': {
      const vram = gpu?.specs?.vram ?? 0;
      return 0.5 * sat(vram, 16) * (gpu ? gpu.perf.gaming / 150 : 0) * 2 + 0.25 * sat(ramGB, 64) + 0.15 * cpuW + 0.1 * sat(ssdGB, 2000);
    }
    case 'office':
    default:
      return 0.5 * sat(cpuW, 0.3) + 0.3 * sat(ramGB, 16) + 0.2 * sat(ssdGB, 1000);
  }
}

// ---------- compatibilidad ----------
function isK(cpu) { return /\d+K/i.test(cpu?.name || ''); }

function checkBuild(b, opts = {}) {
  const out = [];
  const add = (level, msg) => out.push({ level, msg });
  const { cpu, mobo, ram, gpu, psu, cooler } = b;
  const box = b.case;
  const res = opts.res;

  for (const c of CORE_CATS) {
    if (c === 'gpu' || c === 'cooler') continue;
    if (!b[c]) add('missing', `Falta: ${CAT_LABEL[c]}.`);
  }

  if (cpu && mobo) {
    if (cpu.specs.socket !== mobo.specs.socket) add('error', `Socket incompatible: el procesador es ${cpu.specs.socket} y la placa ${mobo.specs.socket}.`);
    else add('ok', `Socket ${cpu.specs.socket} compatible.`);
    if (mobo.specs.chipset === 'A620' && cpu.specs.power >= 120) add('warn', 'Placa A620 con un procesador de 120 W: puede limitar su rendimiento. Mejor B650/B850.');
    if (mobo.specs.chipset === 'H810' && isK(cpu)) add('warn', 'Placa H810 con un procesador K: no podrás aprovecharlo. Mejor B860/Z890.');
    if (/Ryzen \d 9\d{3}/.test(cpu.name) && ['B650', 'A620'].includes(mobo.specs.chipset)) add('info', 'Ryzen 9000 en placa B650/A620: comprueba que la BIOS esté actualizada (la tienda suele indicarlo).');
    if (/Plus/.test(cpu.name) && mobo.specs.socket === 'LGA1851') add('info', 'Core Ultra 200S Plus: comprueba que la placa tenga una BIOS reciente.');
  }
  if (ram && mobo) {
    if (ram.specs.type !== mobo.specs.mem) add('error', `La placa usa ${mobo.specs.mem} y la RAM es ${ram.specs.type}.`);
    else add('ok', `Memoria ${ram.specs.type} compatible con la placa.`);
  }
  if (ram && cpu && !cpu.specs.mem.includes(ram.specs.type)) add('error', `El procesador no admite ${ram.specs.type}.`);

  if (box && mobo) {
    if (!box.specs.forms.includes(mobo.specs.form)) add('error', `La caja no admite placas ${mobo.specs.form}.`);
    else add('ok', `La placa ${mobo.specs.form} cabe en la caja.`);
  }
  if (box && gpu) {
    const L = gpu.specs.length, M = box.specs.gpuMax;
    if (L && M) {
      if (L > M) add('error', `La gráfica mide ${L} mm y la caja admite ${M} mm.`);
      else add('ok', `La gráfica (${L} mm) cabe en la caja (máx. ${M} mm).`);
    } else add('warn', 'No tenemos verificado el espacio para la gráfica en esta caja: compruébalo en la ficha antes de comprar.');
  }
  if (cpu && !gpu && !cpu.specs.igpu) add('missing', 'Este procesador no tiene gráficos integrados: necesitas una tarjeta gráfica para tener imagen.');
  if (cpu && !gpu && cpu.specs.igpu) add('ok', 'Usará los gráficos integrados del procesador.');

  if (cpu) {
    if (!cpu.specs.cooler && !cooler) add('missing', 'El procesador no incluye disipador: añade uno.');
    if (cooler) {
      if (cooler.specs.maxPower < cpu.specs.power) add('warn', `El disipador está pensado para unos ${cooler.specs.maxPower} W y el procesador llega a ${cpu.specs.power} W.`);
      else add('ok', 'Refrigeración suficiente para el procesador.');
      if (box) {
        if (cooler.specs.type === 'aio') {
          if (box.specs.rad == null) add('warn', 'No tenemos verificado si la caja admite un radiador de 360 mm.');
          else if (box.specs.rad < (cooler.specs.rad || 0)) add('error', `La caja admite radiadores de ${box.specs.rad} mm y el kit es de ${cooler.specs.rad} mm.`);
        } else if (cooler.specs.height && box.specs.coolerMax) {
          if (cooler.specs.height > box.specs.coolerMax) add('error', `El disipador mide ${cooler.specs.height} mm y la caja admite ${box.specs.coolerMax} mm.`);
        } else if (!box.specs.coolerMax || !cooler.specs.height) {
          add('warn', 'Comprueba la altura máxima de disipador de la caja en su ficha.');
        }
      }
    } else if (cpu.specs.cooler) add('ok', 'Usará el disipador incluido con el procesador.');
  }

  if (psu && cpu) {
    const need = powerNeed(cpu, gpu);
    if (psu.specs.watts < need) add('error', `Fuente insuficiente: recomendamos ${need} W y tiene ${psu.specs.watts} W.`);
    else add('ok', `Fuente de ${psu.specs.watts} W para un consumo estimado de ${estimatedDraw(cpu, gpu)} W.`);
    if (gpu && gpu.specs.tbp >= 250 && psu.specs.rating === 'Bronze') add('warn', 'Para una gráfica de más de 250 W es mejor una fuente 80+ Gold.');
  }
  if (gpu && res && gpu.specs.vram <= 8 && res !== '1080p') add('warn', `8 GB de VRAM se quedan cortos a ${res} en juegos recientes.`);

  add('info', 'El sistema operativo no está incluido.');
  return out;
}
const hasErrors = (checks) => checks.some(c => c.level === 'error' || c.level === 'missing');

// ---------- selección de piezas ----------
function cheapest(list, storePref, stores) {
  let best = null, bp = Infinity;
  for (const it of list) { const p = priceOf(it, storePref, stores); if (p < bp) { bp = p; best = it; } }
  return best;
}

function pickCooler(db, cpu, q, sp, st) {
  const needs = !cpu.specs.cooler || (q.quiet && cpu.specs.power > 88);
  if (!needs) return null;
  let list = db.byCat.cooler.filter(c => c.specs.maxPower >= cpu.specs.power);
  if (q.quiet) {
    const quiet = list.filter(c => c.specs.maxPower >= 200);
    if (quiet.length) list = quiet;
  }
  return cheapest(list, sp, st);
}

function pickCase(db, mobo, gpu, cooler, q, sp, st) {
  const list = db.byCat.case.filter(cs => {
    if (!cs.specs.forms.includes(mobo.specs.form)) return false;
    if (q.size === 'compact' && cs.specs.size !== 'compacta' && mobo.specs.form === 'mATX') return false;
    if (gpu) {
      const L = gpu.specs.length, M = cs.specs.gpuMax;
      if (M && L && L > M) return false;
      if (!M && (!L || L > 240)) return false; // caja sin datos: solo gráficas cortas verificadas
    }
    if (cooler?.specs.type === 'aio' && !(cs.specs.rad >= (cooler.specs.rad || 0))) return false;
    if (cooler?.specs.type === 'air' && cooler.specs.height && cs.specs.coolerMax && cooler.specs.height > cs.specs.coolerMax) return false;
    return true;
  });
  return cheapest(list, sp, st);
}

function pickPsu(db, cpu, gpu, sp, st) {
  const need = powerNeed(cpu, gpu);
  let list = db.byCat.psu.filter(p => p.specs.watts >= need);
  if (gpu && gpu.specs.tbp >= 250) {
    const good = list.filter(p => p.specs.rating !== 'Bronze');
    if (good.length) list = good;
  }
  return cheapest(list, sp, st);
}

function pickMobo(db, cpu, memType, q, sp, st) {
  const list = db.byCat.mobo.filter(m => {
    if (m.specs.socket !== cpu.specs.socket || m.specs.mem !== memType) return false;
    if (q.wifi && !m.specs.wifi) return false;
    if (q.size === 'compact' && m.specs.form !== 'mATX' && m.specs.form !== 'ITX') return false;
    if (m.specs.chipset === 'A620' && cpu.specs.power >= 120) return false;
    if (m.specs.chipset === 'H810' && isK(cpu)) return false;
    if (cpu.specs.power >= 250 && !['Z890'].includes(m.specs.chipset) && q.use !== 'gaming') return false;
    return true;
  });
  return cheapest(list, sp, st);
}

function ssdFor(db, q, sp, st) {
  const size = [500, 1000, 2000].includes(+q.storage) ? +q.storage : 1000;
  return cheapest(db.byCat.ssd.filter(s => s.specs.size === size), sp, st)
    || cheapest(db.byCat.ssd.filter(s => s.specs.size >= size), sp, st)
    || cheapest(db.byCat.ssd, sp, st);
}

// Periféricos: con presupuesto ajustado, lo más barato que cumple; desde ~1.600 €, gama gaming.
function pickPeripherals(db, q, sp, st) {
  const out = {};
  const p = q.periph || {};
  const gaming = ['gaming', 'streaming'].includes(q.use);
  const roomy = (q.budget || 0) >= 1600;
  if (p.monitor) {
    let mons = db.byCat.monitor;
    if (gaming) {
      mons = mons.filter(m => m.specs.res === (q.res || '1080p'));
      if (q.competitive && roomy) {
        const maxHz = Math.max(...mons.map(m => m.specs.hz));
        const fast = mons.filter(m => m.specs.hz >= Math.min(maxHz, 240) && m.specs.panel !== 'QD-OLED');
        if (fast.length) mons = fast;
      } else mons = mons.filter(m => m.specs.panel !== 'QD-OLED');
    } else if (q.use === 'creative') {
      mons = mons.filter(m => m.specs.res === '4K' || m.specs.res === '1440p');
    } else {
      mons = mons.filter(m => m.specs.res === '1080p' || m.specs.res === '1440p');
    }
    out.monitor = cheapest(mons.length ? mons : db.byCat.monitor, sp, st);
  }
  if (p.input) {
    if (gaming && roomy) {
      out.keyboard = cheapest(db.byCat.keyboard.filter(k => k.specs.gaming), sp, st);
      out.mouse = cheapest(db.byCat.mouse.filter(m => m.specs.gaming), sp, st);
    } else {
      out.keyboard = cheapest(db.byCat.keyboard.filter(k => k.specs.kind === 'combo'), sp, st);
    }
  }
  if (p.headset) out.headset = cheapest(db.byCat.headset, sp, st);
  return out;
}

// Piezas que el usuario ya tiene (q.have): cuestan 0 € y se marcan como propias.
function ownedParts(have) {
  const o = {};
  if (!have || typeof have !== 'object') return o;
  if (have.gpu && have.gpu.idx > 0) o.gpu = { id: 'own-gpu', cat: 'gpu', owned: true, name: `${String(have.gpu.name || 'Tu gráfica').slice(0, 60)} (la que ya tienes)`,
    specs: { chip: String(have.gpu.name || ''), vram: +have.gpu.vram || 8, tbp: +have.gpu.tbp || 180, length: null }, perf: { gaming: +have.gpu.idx }, prices: [] };
  if (+have.ssd > 0) o.ssd = { id: 'own-ssd', cat: 'ssd', owned: true, name: `Tu SSD de ${+have.ssd >= 1000 ? (+have.ssd / 1000) + ' TB' : have.ssd + ' GB'}`, specs: { size: +have.ssd, gen: 3 }, prices: [] };
  if (+have.psu > 0) o.psu = { id: 'own-psu', cat: 'psu', owned: true, name: `Tu fuente de ${+have.psu} W`, specs: { watts: +have.psu, rating: 'Bronze', modular: false }, prices: [] };
  if (have.case) o.case = { id: 'own-case', cat: 'case', owned: true, name: 'Tu caja actual', specs: { forms: ['ATX', 'mATX', 'ITX'], gpuMax: null, coolerMax: null, rad: null, size: 'media' }, prices: [] };
  return o;
}

// Monta una configuración completa a partir de CPU + GPU + tamaño de RAM.
function assemble(db, cpu, gpu, ramSize, q, sp, st) {
  const memTypes = cpu.specs.mem.filter(t => db.byCat.mobo.some(m => m.specs.socket === cpu.specs.socket && m.specs.mem === t));
  let best = null;
  for (const memType of memTypes) {
    const ram = cheapest(db.byCat.ram.filter(r => r.specs.type === memType && r.specs.size === ramSize), sp, st);
    if (!ram) continue;
    const mobo = pickMobo(db, cpu, memType, q, sp, st);
    if (!mobo) continue;
    const own = q._own || {};
    const cooler = pickCooler(db, cpu, q, sp, st);
    const box = own.case || pickCase(db, mobo, gpu, cooler, q, sp, st);
    if (!box) continue;
    const psu = own.psu && own.psu.specs.watts >= powerNeed(cpu, gpu) ? own.psu : pickPsu(db, cpu, gpu, sp, st);
    if (!psu) continue;
    const ssd = own.ssd || ssdFor(db, q, sp, st);
    const b = { cpu, mobo, ram, gpu: gpu || null, ssd, psu, case: box, cooler };
    const total = buildTotal(b, sp, st);
    if (!best || total < best.total) best = { build: b, total };
  }
  return best;
}

function targetFor(q) {
  if (q.use === 'gaming' || q.use === 'streaming') return { '1080p': 50, '1440p': 75, '4K': 125 }[q.res || '1080p'];
  if (q.use === 'ai') return 16; // VRAM
  return null;
}

function meetsTarget(b, q) {
  const t = targetFor(q);
  if (q.use === 'gaming' || q.use === 'streaming') return gpuEff(b.gpu, b.cpu, q.res || '1080p') >= t;
  if (q.use === 'ai') return (b.gpu?.specs.vram ?? 0) >= t && (b.ram?.specs.size ?? 0) >= 32;
  if (q.use === 'creative') return (b.ram?.specs.size ?? 0) >= 32 && !!b.gpu;
  if (q.use === 'dev') return (b.ram?.specs.size ?? 0) >= 32;
  return true;
}

function recommend(dbRaw, q0) {
  let q = q0;
  const db = dbRaw.byCat ? dbRaw : indexDb(dbRaw);
  const sp = q.store || 'any', st = db.stores;
  const use = USES[q.use] || USES.gaming;
  const periph = pickPeripherals(db, q, sp, st);
  if (q.os && db.byCat.os?.length) periph.os = cheapest(db.byCat.os, sp, st);
  if (q.assembly && db.byCat.assembly?.length) periph.assembly = cheapest(db.byCat.assembly, sp, st);
  const own = ownedParts(q.have);
  q = { ...q, _own: own };
  const periphCost = buildTotal(periph, sp, st);
  const towerBudget = q.budget - periphCost;

  let cpus = db.byCat.cpu;
  if (q.cpuBrand === 'amd') cpus = cpus.filter(c => /AMD/.test(c.name));
  if (q.cpuBrand === 'intel') cpus = cpus.filter(c => /Intel/.test(c.name));
  let gpus = db.byCat.gpu;
  if (q.gpuBrand === 'nvidia') gpus = gpus.filter(g => /GeForce|RTX/.test(g.name));
  if (q.gpuBrand === 'amd') gpus = gpus.filter(g => /Radeon/.test(g.name));
  if (q.use === 'ai') { const nv = gpus.filter(g => /RTX/.test(g.name)); if (nv.length && q.gpuBrand !== 'amd') gpus = nv; }

  const gpuOpts = own.gpu ? [own.gpu] : use.needGpu ? gpus : [null, ...gpus];
  const ramSizes = [...new Set(db.byCat.ram.map(r => r.specs.size))].filter(s => s >= use.ramMin).sort((a, b) => a - b);
  if (q.future && !ramSizes.length) ramSizes.push(32);

  const cands = [];
  for (const cpu of cpus) {
    if (q.future && cpu.specs.socket === 'AM4') continue;
    for (const gpu of gpuOpts) {
      if (!gpu && !cpu.specs.igpu) continue;
      if (q.use === 'office' && gpu && cpu.specs.igpu) continue; // no pagues GPU para ofimática
      if (!own.gpu && !balancedPair(cpu, gpu)) continue;
      for (const size of ramSizes) {
        const a = assemble(db, cpu, gpu, size, q, sp, st);
        if (!a) continue;
        const full = { ...a.build, ...periph };
        const total = buildTotal(full, sp, st);
        const score = scoreBuild(a.build, q);
        cands.push({ build: full, total, score, meets: meetsTarget(a.build, q) });
      }
    }
  }
  if (!cands.length) return { options: [], warnings: ['No hay combinaciones posibles con estos filtros. Prueba a quitar alguna preferencia.'], periphCost };

  const pickBest = (limit) => {
    const ok = cands.filter(c => c.total <= limit);
    if (!ok.length) return null;
    const top = Math.max(...ok.map(c => c.score));
    // dentro del 2% del mejor, el más barato
    return ok.filter(c => c.score >= top * 0.98).sort((a, b) => a.total - b.total)[0];
  };

  const warnings = [];
  const options = [];
  const rec = pickBest(q.budget);

  if (!rec) {
    // Presupuesto estricto: nunca proponemos algo por encima. Explicamos cuánto haría falta.
    const cheapestAll = [...cands].sort((a, b) => a.total - b.total)[0];
    const towerOnly = {};
    for (const c of CORE_CATS) if (cheapestAll.build[c]) towerOnly[c] = cheapestAll.build[c];
    const towerTotal = buildTotal(towerOnly, sp, st);
    return {
      options: [], warnings, periphCost, towerBudget,
      blocked: { minTotal: cheapestAll.total, towerTotal, fitsWithoutPeriph: periphCost > 0 && towerTotal <= q.budget, cheapest: { key: 'min', label: 'Lo mínimo posible', ...cheapestAll } }
    };
  }

  const meeting = cands.filter(c => c.meets && c.total <= q.budget).sort((a, b) => a.total - b.total);
  let tight = meeting[0] || null;
  if (!tight || tight.score < rec.score * 0.8) {
    // sin objetivo alcanzable: lo más barato con al menos el 85% del rendimiento recomendado
    tight = cands.filter(c => c.total <= q.budget && c.score >= rec.score * 0.85).sort((a, b) => a.total - b.total)[0] || null;
  }

  if (!rec.meets) {
    const anyMeet = cands.filter(c => c.meets).sort((a, b) => a.total - b.total)[0];
    if (q.use === 'gaming' || q.use === 'streaming') {
      warnings.push(`Con este presupuesto no se alcanza ${q.res || '1080p'} en calidad alta.` + (anyMeet ? ` Necesitarías unos ${euro(anyMeet.total)}.` : ''));
    } else if (q.use === 'ai') {
      warnings.push('Para IA local conviene una gráfica de 16 GB de VRAM y 32 GB de RAM.' + (anyMeet ? ` Mínimo aproximado: ${euro(anyMeet.total)}.` : ''));
    } else if (anyMeet) {
      warnings.push(`Para este uso conviene más RAM. Mínimo aproximado: ${euro(anyMeet.total)}.`);
    }
  }

  options.push({ key: 'rec', label: 'Recomendada', ...rec });
  if (tight && tight !== rec && tight.total < rec.total - 40) options.push({ key: 'tight', label: 'Más barata', ...tight });

  // Sugerencia opcional (nunca por defecto): qué ganarías estirando hasta un 15%.
  let upsell = null;
  if (q.use !== 'office') {
    const up = pickBest(q.budget * 1.15);
    if (up && up !== rec && up.total > q.budget && up.score > rec.score * 1.06) {
      upsell = { key: 'upsell', label: 'Si estiras el presupuesto', ...up, extra: Math.round(up.total - q.budget), gain: up.score / rec.score - 1 };
    }
  }

  if (towerBudget < q.budget * 0.5 && periphCost > 0) warnings.push('Los periféricos se llevan buena parte del presupuesto. Si ya tienes alguno, desmárcalo.');
  return { options, warnings, periphCost, towerBudget, upsell };
}

// ---------- cambiar una pieza ----------
// Ajusta el resto de piezas para que la configuración siga siendo compatible tras fijar `pinned`.
function autoFix(dbRaw, b0, pinned, q = {}) {
  const db = dbRaw.byCat ? dbRaw : indexDb(dbRaw);
  const sp = q.store || 'any', st = db.stores;
  const b = { ...b0 };
  const { cpu } = b;
  if (cpu) {
    const moboOk = b.mobo && b.mobo.specs.socket === cpu.specs.socket && cpu.specs.mem.includes(b.mobo.specs.mem) && (!b.ram || pinned !== 'ram' || b.ram.specs.type === b.mobo.specs.mem);
    if (!moboOk && b.mobo && pinned !== 'mobo') {
      const prefer = b.ram && cpu.specs.mem.includes(b.ram.specs.type) ? [b.ram.specs.type] : [];
      const types = [...new Set([...prefer, ...(pinned === 'ram' ? [] : cpu.specs.mem)])];
      let mobo = null;
      for (const t of types) {
        mobo = pickMobo(db, cpu, t, { ...q, use: q.use, size: null, wifi: q.wifi && b.mobo?.specs.wifi }, sp, st)
          || pickMobo(db, cpu, t, { use: 'gaming' }, sp, st);
        if (mobo) break;
      }
      if (mobo) b.mobo = mobo;
    }
  }
  if (b.mobo && b.ram && b.ram.specs.type !== b.mobo.specs.mem && pinned !== 'ram') {
    const size = b.ram.specs.size;
    const same = db.byCat.ram.filter(r => r.specs.type === b.mobo.specs.mem);
    b.ram = cheapest(same.filter(r => r.specs.size === size), sp, st) || cheapest(same.filter(r => r.specs.size >= size), sp, st) || cheapest(same, sp, st) || b.ram;
  }
  if (cpu && pinned !== 'cooler') {
    const need = (!cpu.specs.cooler && !b.cooler && b0.mobo) || (b.cooler && b.cooler.specs.maxPower < cpu.specs.power);
    if (need) {
      const c = cheapest(db.byCat.cooler.filter(c => c.specs.maxPower >= cpu.specs.power), sp, st);
      if (c) b.cooler = c;
    }
  }
  if (b.mobo && b.case && pinned !== 'case') {
    const cs = b.case, L = b.gpu?.specs.length, M = cs.specs.gpuMax;
    const bad = !cs.specs.forms.includes(b.mobo.specs.form) || (b.gpu && M && L && L > M)
      || (b.cooler?.specs.type === 'aio' && !(cs.specs.rad >= (b.cooler.specs.rad || 0)))
      || (b.cooler?.specs.height && cs.specs.coolerMax && b.cooler.specs.height > cs.specs.coolerMax);
    if (bad) { const nc = pickCase(db, b.mobo, b.gpu, b.cooler, { size: null }, sp, st); if (nc) b.case = nc; }
  }
  if (cpu && b.psu && pinned !== 'psu' && b.psu.specs.watts < powerNeed(cpu, b.gpu)) {
    const p = pickPsu(db, cpu, b.gpu, sp, st); if (p) b.psu = p;
  }
  return b;
}

// Lista de alternativas para una categoría: precio y rendimiento respecto a la actual,
// qué otras piezas cambiarían y, si no encaja, por qué.
function alternatives(dbRaw, build, cat, q = {}) {
  const db = dbRaw.byCat ? dbRaw : indexDb(dbRaw);
  const sp = q.store || 'any', st = db.stores;
  const baseTotal = buildTotal(build, sp, st);
  const baseScore = scoreBuild(build, q) || 1;
  const cur = build[cat] || null;
  const cands = [...db.byCat[cat]];
  const baseErr = new Set(checkBuild(build, { res: q.res }).filter(c => c.level === 'error').map(c => c.msg));
  const out = [];
  const consider = (item, kind) => {
    const nb = autoFix(db, { ...build, [cat]: item }, cat, q);
    if (!item) delete nb[cat];
    const changes = CATS.filter(k => k !== cat && (nb[k]?.id || null) !== (build[k]?.id || null)).map(k => ({ cat: k, from: build[k] || null, to: nb[k] || null }));
    const checks = checkBuild(nb, { res: q.res });
    const err = checks.find(c => c.level === 'error' && !baseErr.has(c.msg));
    const total = buildTotal(nb, sp, st);
    const score = scoreBuild(nb, q);
    out.push({
      item, kind: kind || 'item', build: nb, total, delta: Math.round((total - baseTotal) * 100) / 100,
      perf: PERIPH_CATS.includes(cat) || EXTRA_CATS.includes(cat) ? 0 : score / baseScore - 1,
      changes, incompatible: err ? err.msg : null, current: (item?.id || null) === (cur?.id || null),
      price: item ? priceOf(item, sp, st) : 0
    });
  };
  if (cur?.owned) consider(cur, 'owned');
  for (const it of cands) consider(it);
  if (cat === 'gpu' && build.cpu?.specs.igpu) consider(null, 'igpu');
  if (cat === 'cooler' && build.cpu?.specs.cooler) consider(null, 'stock');
  if ((PERIPH_CATS.includes(cat) || EXTRA_CATS.includes(cat)) && cur) consider(null, 'remove');
  return out;
}

// ---------- modo mejora ----------
const CURRENT_GPU_TIERS = [
  { key: 'none', label: 'Sin gráfica dedicada / integrada', idx: 6, tbp: 0 },
  { key: 'entry', label: 'Gama baja (GTX 1050–1650, RX 560–6500 XT)', idx: 25, tbp: 100 },
  { key: 'oldmid', label: 'Gama media antigua (GTX 1070–1660, RTX 2060, RX 5600–6600)', idx: 42, tbp: 170 },
  { key: 'mid', label: 'Gama media (RTX 3060–4060 Ti, RX 6700 XT–7600)', idx: 58, tbp: 180 },
  { key: 'high', label: 'Gama alta reciente (RTX 3080/4070 Super, RX 7800 XT o superior)', idx: 88, tbp: 280 }
];
const PLATFORMS = [
  { key: 'AM4', label: 'AMD AM4 (Ryzen 1000–5000)', mem: 'DDR4', cpuIdx: { gaming: 50, work: 24 } },
  { key: 'AM5', label: 'AMD AM5 (Ryzen 7000–9000)', mem: 'DDR5', cpuIdx: { gaming: 72, work: 34 } },
  { key: 'LGA1700', label: 'Intel 12ª–14ª generación (LGA1700)', mem: 'DDR4', cpuIdx: { gaming: 62, work: 33 } },
  { key: 'LGA1851', label: 'Intel Core Ultra 200 (LGA1851)', mem: 'DDR5', cpuIdx: { gaming: 70, work: 45 } },
  { key: 'old', label: 'Más antiguo (Intel 10ª gen o anterior, etc.)', mem: 'DDR4', cpuIdx: { gaming: 38, work: 18 } }
];

function recommendUpgrade(dbRaw, u) {
  const db = dbRaw.byCat ? dbRaw : indexDb(dbRaw);
  const sp = u.store || 'any', st = db.stores;
  const det = u.cpu && typeof u.cpu === 'object' ? u.cpu : null;
  const plat = PLATFORMS.find(p => p.key === (det?.platform || u.platform)) || PLATFORMS[4];
  let curGpu = CURRENT_GPU_TIERS.find(t => t.key === u.gpuTier) || CURRENT_GPU_TIERS[2];
  if (u.gpu && typeof u.gpu === 'object') {
    curGpu = u.gpu.integrated ? { key: 'none', idx: 6, tbp: 0 } : { key: 'det', idx: +u.gpu.idx || 30, tbp: +u.gpu.tbp || 150, vram: +u.gpu.vram || 8, name: u.gpu.name };
  }
  const memType = (u.ramType === 'DDR4' || u.ramType === 'DDR5') ? u.ramType : (det?.mem || plat.mem);
  const q = { use: u.use || 'gaming', res: u.res || '1080p', competitive: false };

  // CPU actual como objeto sintético
  const curCpu = u.cpuId && db.byId.get(u.cpuId) ? db.byId.get(u.cpuId) : {
    name: det ? det.name : 'Tu procesador actual', specs: { socket: plat.key, mem: [memType], power: det?.power || 120, igpu: true, igpuLevel: 1, cooler: true },
    perf: det ? { gaming: +det.gaming || plat.cpuIdx.gaming, work: +det.work || plat.cpuIdx.work } : { ...plat.cpuIdx }, synthetic: true
  };
  const curGpuObj = curGpu.key === 'none' ? null : { name: curGpu.name || 'Tu gráfica actual', specs: { vram: curGpu.vram || (curGpu.idx >= 58 ? 12 : 8), tbp: curGpu.tbp, length: null }, perf: { gaming: curGpu.idx }, synthetic: true };
  const curRam = { name: `Tu RAM (${u.ramGB || 16} GB)`, specs: { type: memType, size: u.ramGB || 16 }, synthetic: true };
  const curSsd = { name: u.hasSsd ? 'Tu SSD actual' : 'Disco duro mecánico', specs: { size: u.hasSsd ? 1000 : 0 }, synthetic: true };
  const curDesc = { cpu: curCpu.name, gpu: curGpuObj ? curGpuObj.name : 'Gráficos integrados', ram: `${u.ramGB || 16} GB ${memType}`, platform: plat.label };
  const base = { cpu: curCpu, gpu: curGpuObj, ram: curRam, ssd: curSsd };
  const baseScore = scoreBuild(base, q);

  // Opciones por eje
  const gpuOpts = [null, ...db.byCat.gpu.filter(g => g.perf.gaming > curGpu.idx * 1.15)];
  const cpuOpts = [null];
  if (plat.key !== 'old') cpuOpts.push(...db.byCat.cpu.filter(c => c.specs.socket === plat.key && c.specs.mem.includes(memType) && c.perf.gaming > curCpu.perf.gaming * 1.08));
  // cambio de plataforma: CPU + placa + RAM nuevas
  const platOpts = [null];
  for (const cpu of db.byCat.cpu) {
    if (cpu.specs.socket === plat.key) continue;
    if (cpu.perf.gaming < curCpu.perf.gaming * 1.15 && cpu.perf.work < curCpu.perf.work * 1.3) continue;
    for (const mt of cpu.specs.mem) {
      const mobo = pickMobo(db, cpu, mt, { use: q.use }, sp, st);
      if (!mobo) continue;
      const size = Math.max(16, Math.min(32, u.ramGB || 16));
      const ram = cheapest(db.byCat.ram.filter(r => r.specs.type === mt && r.specs.size >= size), sp, st);
      if (!ram) continue;
      const cooler = cpu.specs.cooler ? null : pickCooler(db, cpu, {}, sp, st);
      platOpts.push({ cpu, mobo, ram, cooler });
    }
  }
  const ramNeed = USES[q.use]?.ramMin || 16;
  const ramOpts = [null, ...db.byCat.ram.filter(r => r.specs.type === memType && r.specs.size > (u.ramGB || 16) && r.specs.size >= ramNeed)];
  const ssdOpts = u.hasSsd ? [null] : [null, ...[500, 1000].map(sz => cheapest(db.byCat.ssd.filter(s => s.specs.size === sz), sp, st)).filter(Boolean)];

  const cands = [];
  for (const g of gpuOpts) for (const p of platOpts) for (const c of (p ? [null] : cpuOpts)) for (const r of (p ? [null] : ramOpts)) for (const s of ssdOpts) {
    const parts = {};
    if (g) parts.gpu = g;
    if (p) { parts.cpu = p.cpu; parts.mobo = p.mobo; parts.ram = p.ram; if (p.cooler) parts.cooler = p.cooler; }
    if (c) { parts.cpu = c; if (!c.specs.cooler) { const cl = pickCooler(db, c, {}, sp, st); if (cl) parts.cooler = cl; } }
    if (r) parts.ram = r;
    if (s) parts.ssd = s;
    if (!Object.keys(parts).length) continue;
    const after = { ...base, ...parts };
    // Fuente
    const need = powerNeed(after.cpu, after.gpu);
    if ((u.psuW || 0) < need) {
      const psu = pickPsu(db, after.cpu, after.gpu, sp, st);
      if (psu) parts.psu = psu;
    }
    const cost = buildTotal(parts, sp, st);
    if (cost > u.budget) continue;
    const score = scoreBuild(after, q);
    cands.push({ parts, cost, score, gain: score / baseScore - 1, after });
  }
  if (!cands.length) return { baseScore, current: curDesc, base, options: [], warnings: ['Con este presupuesto no hay una mejora que merezca la pena. Prueba a subirlo.'] };
  const top = Math.max(...cands.map(c => c.score));
  const best = cands.filter(c => c.score >= top * 0.98).sort((a, b) => a.cost - b.cost)[0];
  // mejor relación ganancia/€
  const value = [...cands].filter(c => c.gain > 0.05).sort((a, b) => (b.gain / b.cost) - (a.gain / a.cost))[0];
  const options = [];
  if (value && value !== best) options.push({ key: 'value', label: 'Más mejora por euro', ...value });
  options.push({ key: 'best', label: 'Máxima mejora', ...best });
  const warnings = [];
  if (plat.key === 'old') warnings.push('Tu plataforma ya no admite procesadores nuevos: la mejora de CPU implica cambiar placa y RAM.');
  return { baseScore, options, warnings, current: curDesc, base };
}


// ---------- FPS estimados por juego ----------
// Calibración: TechPowerUp midió una media de 114 FPS a 1440p y 66 FPS a 4K para la RTX 5070 (25 juegos, calidad máxima, sin DLSS).
// Con nuestro índice (RTX 5070 = 100) eso equivale a 1,65 FPS por punto. Los factores por juego son APROXIMADOS:
// indican cuánto más pesado (gpu > 1) o ligero (gpu < 1) es cada juego respecto a esa media y cuánto escala con el procesador.
const FPS_PER_UNIT = 1.65;
const GAMES = [
  { id: 'valorant', name: 'Valorant', preset: 'Alta', gpu: 0.22, cpu: 2.6, kind: 'esports' },
  { id: 'cs2', name: 'Counter-Strike 2', preset: 'Alta', gpu: 0.45, cpu: 1.9, kind: 'esports' },
  { id: 'fortnite', name: 'Fortnite', preset: 'Alta, DX12', gpu: 0.85, cpu: 1.15, kind: 'esports' },
  { id: 'warzone', name: 'Call of Duty: Warzone', preset: 'Alta', gpu: 0.9, cpu: 1.0, kind: 'esports' },
  { id: 'bg3', name: "Baldur's Gate 3", preset: 'Ultra', gpu: 0.95, cpu: 0.65, kind: 'aaa' },
  { id: 'rdr2', name: 'Red Dead Redemption 2', preset: 'Alta', gpu: 1.2, cpu: 0.9, kind: 'aaa' },
  { id: 'cyberpunk', name: 'Cyberpunk 2077', preset: 'Ultra, sin trazado de rayos', gpu: 1.35, cpu: 0.85, kind: 'aaa' },
  { id: 'eldenring', name: 'Elden Ring', preset: 'Máxima', gpu: 1.0, cpu: 0.8, cap: 60, kind: 'aaa' },
  { id: 'alanwake2', name: 'Alan Wake 2', preset: 'Alta, sin trazado de rayos', gpu: 2.0, cpu: 0.9, kind: 'aaa' }
];
function gameFpsFor(cpu, gpu, game, res = '1080p') {
  if (!cpu) return null;
  const gpuF = gpuEff(gpu, cpu, res) / RES_LOAD[res] / game.gpu * FPS_PER_UNIT;
  const cpuF = (cpu.perf?.gaming ?? 50) * 1.6 * game.cpu * FPS_PER_UNIT;
  if (gpuF <= 0) return 0;
  const p = 4;
  let f = Math.pow(Math.pow(gpuF, -p) + Math.pow(cpuF, -p), -1 / p);
  if (game.cap) f = Math.min(f, game.cap);
  return Math.round(f);
}
function fpsTier(f, game) {
  if (f == null) return null;
  if (game?.cap && f >= game.cap - 1) return { key: 'cap', text: 'Al límite del juego' };
  if (f >= 144) return { key: 'high', text: 'Alto refresco' };
  if (f >= 60) return { key: 'smooth', text: 'Fluido' };
  if (f >= 30) return { key: 'ok', text: 'Jugable' };
  return { key: 'bad', text: 'Insuficiente' };
}
function gamesTable(build, res) {
  return GAMES.map(g => { const fps = gameFpsFor(build.cpu, build.gpu, g, res); return { game: g, fps, tier: fpsTier(fps, g) }; });
}
// FPS medios (sin juegos con límite de FPS) y coste por FPS.
function avgFps(build, res) {
  const r = gamesTable(build, res).filter(x => !x.game.cap && x.fps != null);
  return r.length ? r.reduce((a, x) => a + x.fps, 0) / r.length : null;
}
function costPerFps(total, build, res) {
  const f = avgFps(build, res);
  return f ? total / f : null;
}
// Quién limita a esa resolución: la gráfica (normal) o el procesador.
function bottleneck(build, res = '1080p') {
  if (!build.cpu) return null;
  const gpuCap = gpuEff(build.gpu, build.cpu, res) / RES_LOAD[res];
  const cpuCap = (build.cpu.perf?.gaming ?? 50) * 1.6;
  const ratio = gpuCap / cpuCap;
  if (ratio > 1.15) return { who: 'cpu', pct: Math.round((1 - 1 / ratio) * 100), text: `El procesador limita a la gráfica a ${res}: le sacarías más con un procesador más rápido.` };
  if (ratio > 0.8) return { who: 'balanced', pct: 0, text: `Equilibrado a ${res}: procesador y gráfica van a la par.` };
  return { who: 'gpu', pct: 0, text: `La gráfica marca el ritmo a ${res}, que es lo normal en juegos.` };
}

// ---------- tier y puntos por pieza (0-100) ----------
const TIER_STEPS = [[90, 'S'], [75, 'A'], [60, 'B'], [45, 'C'], [30, 'D'], [0, 'E']];
const tierLetter = (pts) => TIER_STEPS.find(([m]) => pts >= m)[1];
const CHIPSET_PTS = { A520: 40, B550: 60, X570: 70, A620: 45, B650: 65, B840: 55, B850: 75, X870: 90, H610: 40, B760: 60, Z790: 85, H810: 40, B860: 65, Z890: 90 };
const RATING_PTS = { Bronze: 50, Silver: 58, Gold: 72, Platinum: 85, Titanium: 95 };
function componentPoints(it, use = 'gaming') {
  if (!it || EXTRA_CATS.includes(it.cat) || it.cat === 'laptop') return null;
  const s = it.specs || {};
  let pts = 0, basis = '';
  switch (it.cat) {
    case 'cpu': {
      const g = it.perf.gaming, w = it.perf.work;
      pts = ['gaming', 'streaming'].includes(use) ? (use === 'streaming' ? 0.7 * g + 0.3 * w : g) : ['office'].includes(use) ? Math.min(100, w * 2.2) : w;
      basis = ['gaming', 'streaming'].includes(use) ? 'Rendimiento en juegos (Ryzen 7 9800X3D = 100)' : 'Rendimiento multinúcleo (Core Ultra 9 285K = 100)';
      break;
    }
    case 'gpu': pts = it.perf.gaming / 1.5 * (use === 'ai' ? Math.min(1, 0.6 + (s.vram || 0) / 40) : 1); basis = 'Rendimiento en juegos (RTX 5080 = 100)'; break;
    case 'ram': pts = ({ 8: 20, 16: 45, 32: 70, 64: 90 }[s.size] ?? 50) + (s.type === 'DDR5' ? 10 : 0); basis = 'Capacidad y tipo'; break;
    case 'ssd': pts = ({ 500: 40, 1000: 62, 2000: 82, 4000: 92 }[s.size] ?? 50) + ({ 3: 0, 4: 10, 5: 15 }[s.gen] ?? 0); basis = 'Capacidad y velocidad'; break;
    case 'psu': pts = (RATING_PTS[s.rating] ?? 50) + (s.modular ? 5 : 0) + (s.watts >= 850 ? 5 : 0); basis = 'Eficiencia y potencia'; break;
    case 'mobo': pts = (CHIPSET_PTS[s.chipset] ?? 55) + (s.wifi ? 5 : 0) + ((s.m2 || 1) >= 3 ? 5 : 0); basis = 'Chipset, WiFi y ranuras M.2'; break;
    case 'case': pts = s.gpuMax ? 60 + (s.rad >= 360 ? 15 : 0) + (s.gpuMax >= 400 ? 5 : 0) : 45; basis = 'Espacio verificado y refrigeración'; break;
    case 'cooler': pts = Math.min(100, s.maxPower / 3); basis = 'Capacidad de disipación'; break;
    case 'monitor': pts = ({ '1080p': 35, '1440p': 60, '4K': 75 }[s.res] ?? 40) + Math.min(20, (s.hz - 60) / 10) + (s.panel === 'QD-OLED' || s.panel === 'OLED' ? 15 : 0); basis = 'Resolución, refresco y panel'; break;
    default: pts = (s.gaming ? 60 : 40) + (s.wireless ? 15 : 0); basis = 'Gama'; break;
  }
  pts = Math.max(1, Math.min(100, Math.round(pts)));
  return { pts, tier: tierLetter(pts), basis };
}
function buildPoints(build, use) {
  const W = { cpu: 0.25, gpu: 0.35, ram: 0.12, ssd: 0.08, mobo: 0.08, psu: 0.06, case: 0.03, cooler: 0.03 };
  if (!['gaming', 'streaming', 'ai', 'creative'].includes(use)) { W.gpu = 0.1; W.cpu = 0.4; W.ram = 0.22; }
  let sum = 0, wsum = 0;
  for (const [c, w] of Object.entries(W)) {
    let it = build[c];
    if (!it && c === 'cooler' && build.cpu?.specs.cooler) { sum += 40 * w; wsum += w; continue; }
    if (!it && c === 'gpu' && build.cpu?.specs.igpu) { sum += igpuIndex(build.cpu) / 1.5 * w; wsum += w; continue; }
    const p = componentPoints(it, use); if (!p) continue;
    sum += p.pts * w; wsum += w;
  }
  if (!wsum) return null;
  const pts = Math.round(sum / wsum);
  return { pts, tier: tierLetter(pts) };
}

// ---------- portátiles ----------
// Tiers orientativos: cpuTier 1-4 (básico, medio, alto, muy alto); gpuTier 0 integrada, 1 RTX 3050/4050/5050,
// 2 RTX 5060, 3 RTX 5070, 4 RTX 5070 Ti, 5 RTX 5080 o superior.
const LAPTOP_USES = {
  office: { label: 'Estudiar y ofimática', minRam: 8 },
  travel: { label: 'Ligero para llevar', minRam: 8 },
  dev: { label: 'Programar', minRam: 16 },
  creative: { label: 'Editar foto y vídeo', minRam: 16 },
  gaming: { label: 'Jugar', minRam: 16, needGpu: true }
};
const LAPTOP_GAMING = ['Juegos ligeros y eSports a 1080p en calidad baja', '1080p en calidad media-alta', '1080p en calidad alta',
  '1080p con mucho refresco y 1440p en alta', '1440p en calidad alta', '1440p con mucho refresco y 4K con DLSS'];
function laptopScore(l, use) {
  const s = l.specs, ram = s.ram, ssd = s.ssd;
  const ramPts = ram >= 32 ? 3 : ram >= 16 ? 2 : 1;
  const ssdPts = ssd >= 2000 ? 3 : ssd >= 1000 ? 2 : 1;
  switch (use) {
    case 'gaming': return s.gpuTier * 25 + s.cpuTier * 6 + ramPts * 3 + ssdPts * 2 + (s.hz >= 144 ? 3 : 0);
    case 'creative': return s.cpuTier * 12 + s.gpuTier * 7 + ramPts * 8 + ssdPts * 4 + (s.panel === 'OLED' ? 6 : 0);
    case 'dev': return s.cpuTier * 15 + ramPts * 10 + ssdPts * 4 + (s.gpuTier ? -6 : 0); // un portátil gaming pesa y dura menos fuera del enchufe
    case 'travel': return (s.screen <= 14.5 ? 30 : s.screen <= 15.3 ? 12 : 0) + (s.gpuTier ? -15 : 8) + s.cpuTier * 6 + ramPts * 4 + (s.panel === 'OLED' ? 5 : 0);
    default: return s.cpuTier * 8 + ramPts * 8 + ssdPts * 5 + (s.os && /Windows/.test(s.os) ? 4 : 0) - s.gpuTier * 2;
  }
}
function laptopNotes(l, q = {}) {
  const s = l.specs, out = [];
  if (s.ramUpgrade === 'no') out.push({ level: 'warn', msg: 'RAM soldada: no se puede ampliar.' });
  if (s.ramUpgrade === 'max16') out.push({ level: 'info', msg: 'RAM ampliable solo hasta 16 GB según la ficha.' });
  if (s.ram < 16) out.push({ level: 'warn', msg: `${s.ram} GB de RAM se quedan cortos hoy.` });
  if (s.os && /Sin sistema/.test(s.os)) out.push({ level: 'info', msg: 'Viene sin Windows: súmale la licencia o instala Linux.' });
  if (!s.os) out.push({ level: 'info', msg: 'Comprueba en la ficha si incluye Windows.' });
  if (s.keyboard && s.keyboard !== 'ES') out.push({ level: 'warn', msg: `Teclado ${s.keyboard === 'PT' ? 'portugués' : s.keyboard}: sin ñ.` });
  if (q.use === 'travel' && s.gpuTier) out.push({ level: 'info', msg: 'Con gráfica dedicada pesa más y dura menos la batería.' });
  return out;
}
function findLaptops(dbRaw, q) {
  const db = dbRaw.byCat ? dbRaw : indexDb(dbRaw);
  const use = LAPTOP_USES[q.use] ? q.use : 'office';
  const sp = q.store || 'any', st = db.stores;
  const all = (db.byCat.laptop || []).map(l => ({ item: l, price: priceOf(l, sp, st), score: laptopScore(l, use) }));
  const fits = all.filter(x => {
    const s = x.item.specs;
    if (q.budget && x.price > q.budget) return false;
    if (q.minRam && s.ram < q.minRam) return false;
    if (q.minSsd && s.ssd < q.minSsd) return false;
    if (q.screen === 'small' && s.screen > 14.5) return false;
    if (q.screen === 'medium' && (s.screen < 15 || s.screen > 16.1)) return false;
    if (q.screen === 'large' && s.screen < 17) return false;
    if (q.windows && !(s.os && /Windows/.test(s.os))) return false;
    if (LAPTOP_USES[use].needGpu && !s.gpuTier) return false;
    return true;
  });
  const top = fits.length ? Math.max(...fits.map(x => x.score)) : 0;
  fits.sort((a, b) => (b.score - a.score) || (a.price - b.price));
  // mejor: dentro del 5 % de la mejor puntuación, el más barato
  const best = fits.filter(x => x.score >= top * 0.95).sort((a, b) => a.price - b.price)[0] || null;
  const cheapest = [...fits].sort((a, b) => a.price - b.price)[0] || null;
  const results = fits.map(x => ({ ...x, tag: x === best ? 'best' : x === cheapest ? 'cheap' : null, gaming: LAPTOP_GAMING[x.item.specs.gpuTier] || LAPTOP_GAMING[0], notes: laptopNotes(x.item, { use }) }));
  const outside = all.filter(x => !fits.includes(x)).length;
  const minPrice = (db.byCat.laptop || []).length ? Math.min(...all.filter(x => !LAPTOP_USES[use].needGpu || x.item.specs.gpuTier).map(x => x.price)) : null;
  return { results, outside, minPrice, use };
}

// ---------- guía de montaje adaptada a las piezas ----------
function assemblyGuide(b) {
  const steps = [];
  const add = (title, text) => steps.push({ title, text });
  const { cpu, mobo, ram, gpu, ssd, psu, cooler } = b;
  const box = b.case;
  if (!cpu || !mobo) return steps;
  const sock = cpu.specs.socket;
  add('Prepara el sitio', 'Mesa amplia, buena luz y un destornillador de estrella PH2. Toca algo metálico antes de empezar para descargar la electricidad estática y no montes sobre alfombra. Monta procesador, RAM, SSD y disipador con la placa fuera de la caja, encima de su propia caja de cartón.');
  if (sock === 'AM4') add('Procesador (AM4)', `Levanta la palanca del zócalo, alinea el triángulo dorado del ${cpu.name} con la marca del zócalo y déjalo caer sin apretar: los pines están en el procesador y se doblan con facilidad. Baja la palanca.`);
  else add(`Procesador (${sock})`, `Los pines están en el zócalo de la placa: no los toques. Abre la tapa metálica, coloca el ${cpu.name} alineando las muescas (y el triángulo de la esquina) y ciérrala; la tapa de plástico protectora salta sola. Guárdala por si tienes que devolver la placa.`);
  if (ram) {
    const n = /\(2x/.test(ram.name) ? 2 : /\(4x/.test(ram.name) ? 4 : 2;
    add('Memoria RAM', n === 2
      ? `Pon los dos módulos en las ranuras A2 y B2 (normalmente la segunda y la cuarta contando desde el procesador; míralo en el manual de la ${mobo.name}). Abre las pestañas y aprieta por los dos extremos hasta oír el clic.`
      : 'Rellena las cuatro ranuras. Aprieta cada módulo por los dos extremos hasta oír el clic.');
  }
  if (ssd && !ssd.owned) add('SSD M.2', `Usa la ranura M.2 más cercana al procesador (la más rápida). Si tiene disipador metálico, quítalo, retira el plástico de la almohadilla térmica, inserta el SSD en ángulo, bájalo y fíjalo con su tornillo o pestaña.`);
  if (!cooler && cpu.specs.cooler) add('Disipador incluido', 'El disipador que trae el procesador ya lleva pasta térmica aplicada: no añadas más. Colócalo recto y aprieta los tornillos en cruz, poco a poco. Conecta su cable al conector CPU_FAN.');
  else if (cooler?.specs.type === 'aio') add('Refrigeración líquida', `Monta el soporte de ${sock} que trae el kit. El radiador de ${cooler.specs.rad} mm va mejor arriba o delante con los tubos abajo o a un lado; la bomba nunca debe quedar en el punto más alto del circuito. Conecta la bomba a CPU_FAN o AIO_PUMP y los ventiladores según el manual.`);
  else if (cooler) add('Disipador', `Instala el soporte de ${sock} del ${cooler.name}. Si la base no trae pasta aplicada, pon una gota del tamaño de un guisante en el centro del procesador. Aprieta en cruz y conecta el ventilador a CPU_FAN.`);
  add('Placa en la caja', `${box?.owned ? 'En tu caja' : `En la ${box?.name || 'caja'}`}, comprueba que los separadores (standoffs) coinciden con los agujeros de una placa ${mobo.specs.form}. Coloca el escudo trasero si la placa no lo trae integrado y atornilla la placa sin apretar demasiado.`);
  if (psu) {
    const eps = cpu.specs.power >= 120 ? 'los conectores EPS de 8 pines que tenga la placa (arriba a la izquierda; si hay dos, conecta los dos)' : 'el conector EPS de 8 pines de la placa (arriba a la izquierda)';
    add('Fuente de alimentación', `${psu.owned ? 'Tu fuente' : `La ${psu.name}`} va abajo con el ventilador mirando hacia la rejilla inferior si la caja tiene filtro. Conecta el cable de 24 pines a la placa y ${eps}.`);
  }
  if (gpu) {
    const power = gpu.specs.tbp <= 75 ? 'No necesita cable de alimentación: se alimenta por la ranura.' : 'Conecta los cables de alimentación que pida (8 pines o 12V-2x6, según el modelo) directamente desde la fuente; con el 12V-2x6, empújalo hasta el fondo. Evita los cables partidos en Y si la fuente tiene dos independientes.';
    add('Tarjeta gráfica', `Quita las tapas traseras de la caja que correspondan, abre la pestaña de la ranura PCIe x16 superior e inserta la gráfica hasta que haga clic. Atorníllala a la caja. ${power}`);
  } else add('Gráficos integrados', 'Conecta el monitor a la salida de vídeo de la placa base, no a otra.');
  add('Cables de la caja', 'Conecta el botón de encendido, el de reinicio y los LED del frontal según el esquema del manual de la placa (F_PANEL). Después el USB 3, el USB-C frontal si lo hay, el audio (HD_AUDIO) y los ventiladores de la caja a los conectores SYS_FAN o CHA_FAN.');
  const bios = [];
  if (ram) bios.push(`activa ${/AMD/.test(cpu.name) ? 'EXPO' : 'XMP'} para que la RAM vaya a su velocidad`);
  if (/Ryzen \d 9\d{3}/.test(cpu.name) && ['B650', 'A620'].includes(mobo.specs.chipset)) bios.push('si no arranca, actualiza la BIOS con el botón Flashback y un USB (los Ryzen 9000 necesitan BIOS reciente en B650/A620)');
  if (/Plus/.test(cpu.name) && sock === 'LGA1851') bios.push('comprueba que la BIOS es reciente para el Core Ultra 200S Plus');
  add('Primer arranque', `Pulsa Supr o F2 al encender para entrar en la BIOS. Comprueba que detecta el procesador, la RAM y el SSD${bios.length ? ', ' + bios.join(' y ') : ''}. El primer arranque con DDR5 puede tardar un par de minutos: es normal.`);
  add('Windows y drivers', `Crea un USB de instalación con la herramienta oficial de Microsoft (necesitas un USB de 8 GB) e instala Windows en el SSD. Después instala los drivers del chipset de ${/AMD/.test(cpu.name) ? 'AMD' : 'Intel'} desde la web del fabricante de la placa${gpu ? ` y los de la gráfica desde la web de ${/Radeon/.test(gpu.name) ? 'AMD' : /Arc/.test(gpu.name) ? 'Intel' : 'NVIDIA'}` : ''}.`);
  return steps;
}

// ---------- compartir ----------
function encodeShare(build, name) {
  const c = {};
  for (const k of CATS) if (build[k]?.id && !build[k].owned) c[k] = build[k].id;
  const json = JSON.stringify({ v: 1, n: (name || '').slice(0, 60), c });
  const b64 = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeShare(db, s) {
  if (typeof s !== 'string' || s.length > 2000 || !/^[A-Za-z0-9_-]+$/.test(s)) return null;
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function' ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, 'base64').toString('utf8');
    const o = JSON.parse(json);
    if (!o || o.v !== 1 || typeof o.c !== 'object') return null;
    const build = {};
    for (const k of CATS) {
      const id = o.c[k];
      if (id == null) continue;
      const it = db.byId.get(String(id));
      if (it && it.cat === k) build[k] = it;
    }
    return { build, name: typeof o.n === 'string' ? o.n.slice(0, 60) : '' };
  } catch { return null; }
}

// ---------- exportar ----------
function buildToText(build, storePref, stores, name) {
  const lines = [`${name || 'Mi configuración de PC'}`, ''];
  for (const k of CATS) {
    const it = build[k];
    if (!it) continue;
    const o = bestOffer(it, storePref, stores);
    lines.push(`${CAT_LABEL[k]}: ${it.name} — ${o ? euro(o.price) + ' (' + (stores[o.store]?.name || o.store) + ')' : 'sin precio'}`);
  }
  lines.push('', `Total: ${euro(buildTotal(build, storePref, stores))}`);
  return lines.join('\n');
}
function buildToCsv(build, storePref, stores) {
  const esc = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita inyección de fórmulas
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const rows = [['Componente', 'Modelo', 'Tienda', 'Precio (EUR)', 'Fecha precio', 'Enlace']];
  for (const k of CATS) {
    const it = build[k];
    if (!it) continue;
    const o = bestOffer(it, storePref, stores);
    rows.push([CAT_LABEL[k], it.name, o ? (stores[o.store]?.name || o.store) : '', o ? o.price.toFixed(2).replace('.', ',') : '', o?.date || 'sin confirmar', o?.url || '']);
  }
  rows.push(['Total', '', '', buildTotal(build, storePref, stores).toFixed(2).replace('.', ','), '', '']);
  return '﻿' + rows.map(r => r.map(esc).join(';')).join('\r\n');
}

root.PCEngine = { CATS, CORE_CATS, PERIPH_CATS, CAT_LABEL, USES, euro, indexDb, bestOffer, priceOf, buildTotal, powerNeed, estimatedDraw, gameFps, balancedPair, vramFactor, igpuIndex, gpuEff, gamingLevel, scoreBuild, isK, checkBuild, hasErrors, pickPeripherals, targetFor, recommend, LAPTOP_USES, LAPTOP_GAMING, laptopScore, laptopNotes, findLaptops, ownedParts, assemblyGuide, EXTRA_CATS, autoFix, alternatives, ssdFor, GAMES, gameFpsFor, fpsTier, gamesTable, avgFps, costPerFps, bottleneck, componentPoints, buildPoints, tierLetter, CURRENT_GPU_TIERS, PLATFORMS, recommendUpgrade, encodeShare, decodeShare, buildToText, buildToCsv };
})(typeof globalThis !== 'undefined' ? globalThis : window);
