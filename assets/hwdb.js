// Referencia de procesadores y gráficas para reconocer el PC actual ("Mejorar mi PC").
// Índices orientativos en la misma escala que el catálogo:
//   CPU: juego (Ryzen 7 9800X3D = 100) y trabajo multinúcleo (Core Ultra 9 285K = 100).
//   GPU: rendimiento en juego (RTX 5070 = 100; RTX 5060 = 65).
// Expone window.PCHW. Script clásico: funciona también con doble clic.
(function (root) {
'use strict';

// [nombre, plataforma, memoria, juego, trabajo, consumo W]
const CPUS = [
  // AMD AM4
  ['Ryzen 3 1200', 'AM4', 'DDR4', 30, 9, 65], ['Ryzen 5 1400', 'AM4', 'DDR4', 33, 11, 65], ['Ryzen 5 1600', 'AM4', 'DDR4', 38, 14, 65],
  ['Ryzen 5 1600X', 'AM4', 'DDR4', 39, 15, 95], ['Ryzen 7 1700', 'AM4', 'DDR4', 38, 19, 65], ['Ryzen 7 1700X', 'AM4', 'DDR4', 40, 20, 95], ['Ryzen 7 1800X', 'AM4', 'DDR4', 41, 21, 95],
  ['Ryzen 3 2200G', 'AM4', 'DDR4', 32, 9, 65], ['Ryzen 5 2400G', 'AM4', 'DDR4', 36, 12, 65], ['Ryzen 5 2600', 'AM4', 'DDR4', 42, 16, 65], ['Ryzen 5 2600X', 'AM4', 'DDR4', 44, 17, 95],
  ['Ryzen 7 2700', 'AM4', 'DDR4', 43, 22, 65], ['Ryzen 7 2700X', 'AM4', 'DDR4', 45, 24, 105],
  ['Ryzen 3 3100', 'AM4', 'DDR4', 44, 12, 65], ['Ryzen 3 3200G', 'AM4', 'DDR4', 35, 10, 65], ['Ryzen 5 3400G', 'AM4', 'DDR4', 38, 13, 65],
  ['Ryzen 5 3500X', 'AM4', 'DDR4', 50, 18, 65], ['Ryzen 5 3600', 'AM4', 'DDR4', 55, 22, 65], ['Ryzen 5 3600X', 'AM4', 'DDR4', 56, 23, 95],
  ['Ryzen 7 3700X', 'AM4', 'DDR4', 57, 30, 65], ['Ryzen 7 3800X', 'AM4', 'DDR4', 58, 31, 105], ['Ryzen 9 3900X', 'AM4', 'DDR4', 58, 44, 105], ['Ryzen 9 3950X', 'AM4', 'DDR4', 58, 55, 105],
  ['Ryzen 5 4500', 'AM4', 'DDR4', 48, 21, 65], ['Ryzen 5 4600G', 'AM4', 'DDR4', 48, 22, 65],
  ['Ryzen 5 5500', 'AM4', 'DDR4', 55, 26, 65], ['Ryzen 5 5600', 'AM4', 'DDR4', 60, 28, 65], ['Ryzen 5 5600X', 'AM4', 'DDR4', 62, 29, 65], ['Ryzen 5 5600XT', 'AM4', 'DDR4', 63, 29, 65],
  ['Ryzen 5 5600G', 'AM4', 'DDR4', 52, 26, 65], ['Ryzen 7 5700G', 'AM4', 'DDR4', 55, 33, 65], ['Ryzen 7 5700', 'AM4', 'DDR4', 56, 34, 65],
  ['Ryzen 7 5700X', 'AM4', 'DDR4', 64, 37, 65], ['Ryzen 7 5800X', 'AM4', 'DDR4', 65, 38, 105], ['Ryzen 7 5700X3D', 'AM4', 'DDR4', 75, 35, 105],
  ['Ryzen 7 5800X3D', 'AM4', 'DDR4', 78, 37, 105], ['Ryzen 9 5900X', 'AM4', 'DDR4', 66, 52, 105], ['Ryzen 9 5950X', 'AM4', 'DDR4', 66, 65, 105],
  // AMD AM5
  ['Ryzen 5 7500F', 'AM5', 'DDR5', 73, 33, 65], ['Ryzen 5 7600', 'AM5', 'DDR5', 74, 34, 65], ['Ryzen 5 7600X', 'AM5', 'DDR5', 76, 36, 105], ['Ryzen 5 7500X3D', 'AM5', 'DDR5', 82, 32, 65],
  ['Ryzen 7 7700', 'AM5', 'DDR5', 78, 45, 65], ['Ryzen 7 7700X', 'AM5', 'DDR5', 79, 46, 105], ['Ryzen 7 7800X3D', 'AM5', 'DDR5', 89, 43, 120],
  ['Ryzen 9 7900', 'AM5', 'DDR5', 79, 62, 65], ['Ryzen 9 7900X', 'AM5', 'DDR5', 80, 65, 170], ['Ryzen 9 7950X', 'AM5', 'DDR5', 82, 80, 170], ['Ryzen 9 7950X3D', 'AM5', 'DDR5', 90, 78, 120],
  ['Ryzen 5 8400F', 'AM5', 'DDR5', 66, 30, 65], ['Ryzen 5 8500G', 'AM5', 'DDR5', 60, 28, 65], ['Ryzen 5 8600G', 'AM5', 'DDR5', 66, 33, 65], ['Ryzen 7 8700G', 'AM5', 'DDR5', 70, 42, 65], ['Ryzen 7 8700F', 'AM5', 'DDR5', 70, 42, 65],
  ['Ryzen 5 9600', 'AM5', 'DDR5', 78, 37, 65], ['Ryzen 5 9600X', 'AM5', 'DDR5', 79, 38, 65], ['Ryzen 7 9700X', 'AM5', 'DDR5', 80, 49, 65], ['Ryzen 7 9800X3D', 'AM5', 'DDR5', 100, 54, 120],
  ['Ryzen 7 9850X3D', 'AM5', 'DDR5', 103, 55, 120], ['Ryzen 9 9900X', 'AM5', 'DDR5', 82, 70, 120], ['Ryzen 9 9950X', 'AM5', 'DDR5', 84, 88, 170], ['Ryzen 9 9950X3D', 'AM5', 'DDR5', 101, 88, 170],
  // Intel antiguas (LGA1151 / LGA1200)
  ['Core i3-6100', 'old', 'DDR4', 24, 7, 51], ['Core i5-6400', 'old', 'DDR4', 27, 9, 65], ['Core i5-6500', 'old', 'DDR4', 28, 9, 65], ['Core i5-6600K', 'old', 'DDR4', 30, 10, 91], ['Core i7-6700', 'old', 'DDR4', 34, 13, 65], ['Core i7-6700K', 'old', 'DDR4', 36, 14, 91],
  ['Core i3-7100', 'old', 'DDR4', 26, 8, 51], ['Core i5-7400', 'old', 'DDR4', 29, 9, 65], ['Core i5-7500', 'old', 'DDR4', 30, 10, 65], ['Core i5-7600K', 'old', 'DDR4', 33, 11, 91], ['Core i7-7700', 'old', 'DDR4', 36, 14, 65], ['Core i7-7700K', 'old', 'DDR4', 38, 14, 91],
  ['Core i3-8100', 'old', 'DDR4', 30, 9, 65], ['Core i5-8400', 'old', 'DDR4', 36, 15, 65], ['Core i5-8500', 'old', 'DDR4', 37, 15, 65], ['Core i5-8600K', 'old', 'DDR4', 40, 16, 95], ['Core i7-8700', 'old', 'DDR4', 42, 19, 65], ['Core i7-8700K', 'old', 'DDR4', 44, 20, 95],
  ['Core i3-9100F', 'old', 'DDR4', 31, 9, 65], ['Core i5-9400F', 'old', 'DDR4', 37, 16, 65], ['Core i5-9600K', 'old', 'DDR4', 42, 17, 95], ['Core i7-9700K', 'old', 'DDR4', 47, 22, 95], ['Core i9-9900K', 'old', 'DDR4', 50, 26, 95],
  ['Core i3-10100F', 'old', 'DDR4', 38, 12, 65], ['Core i5-10400F', 'old', 'DDR4', 45, 20, 65], ['Core i5-10600K', 'old', 'DDR4', 49, 23, 125], ['Core i7-10700K', 'old', 'DDR4', 52, 30, 125], ['Core i9-10900K', 'old', 'DDR4', 55, 35, 125],
  ['Core i5-11400F', 'old', 'DDR4', 50, 24, 65], ['Core i5-11600K', 'old', 'DDR4', 54, 27, 125], ['Core i7-11700K', 'old', 'DDR4', 56, 32, 125], ['Core i9-11900K', 'old', 'DDR4', 58, 34, 125],
  // Intel LGA1700
  ['Core i3-12100F', 'LGA1700', 'DDR4', 52, 18, 58], ['Core i5-12400F', 'LGA1700', 'DDR4', 62, 30, 65], ['Core i5-12600K', 'LGA1700', 'DDR4', 68, 40, 125], ['Core i7-12700K', 'LGA1700', 'DDR4', 72, 52, 125], ['Core i9-12900K', 'LGA1700', 'DDR4', 75, 62, 125],
  ['Core i3-13100F', 'LGA1700', 'DDR4', 54, 19, 58], ['Core i5-13400F', 'LGA1700', 'DDR4', 64, 35, 65], ['Core i5-13600K', 'LGA1700', 'DDR4', 76, 52, 125], ['Core i7-13700K', 'LGA1700', 'DDR4', 80, 66, 125], ['Core i9-13900K', 'LGA1700', 'DDR4', 84, 80, 125],
  ['Core i3-14100F', 'LGA1700', 'DDR4', 56, 20, 58], ['Core i5-14400F', 'LGA1700', 'DDR4', 70, 39, 65], ['Core i5-14600K', 'LGA1700', 'DDR4', 77, 54, 125], ['Core i7-14700K', 'LGA1700', 'DDR4', 82, 72, 125], ['Core i9-14900K', 'LGA1700', 'DDR4', 85, 82, 125],
  // Intel LGA1851
  ['Core Ultra 5 225', 'LGA1851', 'DDR5', 68, 40, 65], ['Core Ultra 5 235', 'LGA1851', 'DDR5', 70, 48, 65], ['Core Ultra 5 245K', 'LGA1851', 'DDR5', 74, 57, 125], ['Core Ultra 5 250K Plus', 'LGA1851', 'DDR5', 77, 70, 125],
  ['Core Ultra 7 265K', 'LGA1851', 'DDR5', 78, 82, 125], ['Core Ultra 7 270K Plus', 'LGA1851', 'DDR5', 81, 85, 125], ['Core Ultra 9 285K', 'LGA1851', 'DDR5', 82, 100, 125]
];

// [nombre, índice, VRAM GB, consumo W]
const GPUS = [
  ['GTX 1050', 10, 2, 75], ['GTX 1050 Ti', 13, 4, 75], ['GTX 1060 3GB', 21, 3, 120], ['GTX 1060', 24, 6, 120], ['GTX 1070', 32, 8, 150], ['GTX 1070 Ti', 35, 8, 180], ['GTX 1080', 39, 8, 180], ['GTX 1080 Ti', 50, 11, 250],
  ['GTX 1630', 9, 4, 75], ['GTX 1650', 19, 4, 75], ['GTX 1650 Super', 25, 4, 100], ['GTX 1660', 30, 6, 120], ['GTX 1660 Super', 33, 6, 125], ['GTX 1660 Ti', 34, 6, 120],
  ['RTX 2060', 41, 6, 160], ['RTX 2060 Super', 47, 8, 175], ['RTX 2070', 50, 8, 175], ['RTX 2070 Super', 57, 8, 215], ['RTX 2080', 61, 8, 215], ['RTX 2080 Super', 64, 8, 250], ['RTX 2080 Ti', 74, 11, 250],
  ['RTX 3050 6GB', 28, 6, 70], ['RTX 3050', 35, 8, 130], ['RTX 3060', 50, 12, 170], ['RTX 3060 Ti', 67, 8, 200], ['RTX 3070', 75, 8, 220], ['RTX 3070 Ti', 80, 8, 290],
  ['RTX 3080', 97, 10, 320], ['RTX 3080 Ti', 105, 12, 350], ['RTX 3090', 108, 24, 350], ['RTX 3090 Ti', 118, 24, 450],
  ['RTX 4060', 55, 8, 115], ['RTX 4060 Ti', 66, 8, 160], ['RTX 4060 Ti 16GB', 67, 16, 165], ['RTX 4070', 88, 12, 200], ['RTX 4070 Super', 102, 12, 220], ['RTX 4070 Ti', 112, 12, 285],
  ['RTX 4070 Ti Super', 122, 16, 285], ['RTX 4080', 142, 16, 320], ['RTX 4080 Super', 145, 16, 320], ['RTX 4090', 185, 24, 450],
  ['RTX 5050', 50, 8, 130], ['RTX 5060', 65, 8, 145], ['RTX 5060 Ti', 75, 8, 180], ['RTX 5060 Ti 16GB', 78, 16, 180], ['RTX 5070', 100, 12, 250], ['RTX 5070 Ti', 127, 16, 300], ['RTX 5080', 150, 16, 360], ['RTX 5090', 210, 32, 575],
  ['RX 470', 18, 4, 120], ['RX 570', 18, 4, 150], ['RX 580', 21, 8, 185], ['RX 590', 23, 8, 225], ['RX Vega 56', 33, 8, 210], ['RX Vega 64', 37, 8, 295],
  ['RX 5500 XT', 25, 8, 130], ['RX 5600 XT', 36, 6, 150], ['RX 5700', 40, 8, 180], ['RX 5700 XT', 45, 8, 225],
  ['RX 6400', 14, 4, 53], ['RX 6500 XT', 22, 4, 107], ['RX 6600', 42, 8, 132], ['RX 6600 XT', 47, 8, 160], ['RX 6650 XT', 50, 8, 180], ['RX 6700', 55, 10, 175], ['RX 6700 XT', 62, 12, 230],
  ['RX 6750 XT', 66, 12, 250], ['RX 6800', 78, 16, 250], ['RX 6800 XT', 90, 16, 300], ['RX 6900 XT', 95, 16, 300], ['RX 6950 XT', 100, 16, 335],
  ['RX 7600', 52, 8, 165], ['RX 7600 XT', 55, 16, 190], ['RX 7700 XT', 80, 12, 245], ['RX 7800 XT', 95, 16, 263], ['RX 7900 GRE', 105, 16, 260], ['RX 7900 XT', 128, 20, 315], ['RX 7900 XTX', 150, 24, 355],
  ['RX 9060 XT', 72, 8, 150], ['RX 9060 XT 16GB', 76, 16, 160], ['RX 9070 GRE', 98, 12, 220], ['RX 9070', 110, 16, 220], ['RX 9070 XT', 122, 16, 304],
  ['Arc A380', 15, 6, 75], ['Arc A580', 40, 8, 185], ['Arc A750', 47, 8, 225], ['Arc A770', 52, 16, 225], ['Arc B570', 50, 10, 150], ['Arc B580', 58, 12, 190]
];

const norm = (s) => String(s || '').toLowerCase()
  .replace(/\((r|tm|c)\)|®|™/g, ' ')
  .replace(/\b(amd|intel|nvidia|geforce|radeon|processor|graphics|series|cpu|gpu|with|edition)\b/g, ' ')
  .replace(/\b\d+-core\b/g, ' ')
  .replace(/[^a-z0-9.+ ]+/g, ' ')
  .replace(/\s+/g, ' ').trim();
const keyOf = (name) => norm(name).replace(/^core /, 'core ');

const cpuList = CPUS.map(([name, platform, mem, gaming, work, power]) => ({ name: (/^Core/.test(name) ? 'Intel ' : 'AMD ') + name, short: name, key: norm(name.replace('-', ' ')), platform, mem, gaming, work, power }));
const gpuList = GPUS.map(([name, idx, vram, tbp]) => ({ name, key: norm(name.replace(/(\d+)GB/, '$1gb')), idx, vram, tbp }));

function longestMatch(list, text) {
  const t = ' ' + text + ' ';
  let best = null;
  for (const it of list) {
    if (t.includes(' ' + it.key + ' ') && (!best || it.key.length > best.key.length)) best = it;
  }
  return best;
}

function matchCpu(raw) {
  let t = norm(String(raw).replace(/(\bi\d)-(\d)/i, '$1 $2'));
  if (!t) return null;
  if (/^i\d \d/.test(t)) t = 'core ' + t;
  if (/^ultra \d/.test(t)) t = 'core ' + t;
  if (/^r(\d) (\d{4})/.test(t)) t = t.replace(/^r(\d)/, 'ryzen $1');
  const hit = longestMatch(cpuList, t);
  if (hit) return { ...hit, exact: true };
  // Aproximación por familia y generación
  let m = t.match(/ryzen (\d) (\d)(\d)(\d{2})\s?(x3d|x|g|f)?/);
  if (m) {
    const tier = +m[1], gen = +m[2];
    const platform = gen >= 7 ? 'AM5' : 'AM4';
    const base = { 1: 38, 2: 43, 3: 55, 4: 48, 5: 60, 7: 76, 8: 66, 9: 80 }[gen] || 50;
    const gaming = Math.round(base + (tier - 5) * 1.5 + (m[5] === 'x3d' ? 14 : 0));
    const work = Math.round({ 3: 0.45, 5: 0.6, 7: 0.85, 9: 1.3 }[tier] * (gen >= 7 ? 55 : gen >= 3 ? 45 : 32));
    return { name: 'AMD Ryzen ' + m[1] + ' ' + m[2] + m[3] + m[4] + (m[5] ? m[5].toUpperCase() : ''), platform, mem: platform === 'AM5' ? 'DDR5' : 'DDR4', gaming, work, power: 88, exact: false };
  }
  m = t.match(/core i(\d) (\d{4,5})(k|kf|f)?/);
  if (m) {
    const tier = +m[1], num = m[2], gen = num.length === 5 ? +num.slice(0, 2) : +num[0];
    const platform = gen >= 12 ? 'LGA1700' : 'old';
    const base = gen >= 14 ? 70 : gen >= 13 ? 64 : gen >= 12 ? 62 : gen >= 11 ? 50 : gen >= 10 ? 45 : gen >= 8 ? 37 : 28;
    const gaming = Math.round(base + (tier - 5) * 4);
    const work = Math.round(base * ({ 3: 0.35, 5: 0.5, 7: 0.75, 9: 0.95 }[tier] || 0.5));
    return { name: `Intel Core i${tier}-${num}${(m[3] || '').toUpperCase()}`, platform, mem: 'DDR4', gaming, work, power: 125, exact: false };
  }
  m = t.match(/core ultra (\d) (\d{3})/);
  if (m) return { name: `Intel Core Ultra ${m[1]} ${m[2]}`, platform: 'LGA1851', mem: 'DDR5', gaming: 72 + (+m[1] - 5) * 3, work: 45 + (+m[1] - 5) * 18, power: 125, exact: false };
  return null;
}

const IGPU_RE = /(uhd|iris|hd graphics|intel.*graphics|radeon\(tm\) graphics|radeon graphics|vega \d+|microsoft basic|llvmpipe|swiftshader|virtual|parsec|remote)/i;
function matchGpu(raw) {
  const s = String(raw || '');
  if (!s.trim()) return null;
  let t = norm(s).replace(/(\d+)\s?gb\b/g, '$1gb');
  // en WebGL (ANGLE) el nombre real va tras el primer paréntesis
  const hit = longestMatch(gpuList, t);
  if (hit) {
    let vram = hit.vram;
    const v = t.match(/\b(\d{1,2})gb\b/);
    if (v && +v[1] >= 4 && +v[1] <= 32) vram = +v[1];
    return { ...hit, vram, exact: true, integrated: false };
  }
  if (IGPU_RE.test(s)) return { name: 'Gráficos integrados', idx: 6, vram: 0, tbp: 0, exact: true, integrated: true };
  return null;
}
function bestGpu(list) {
  const found = (Array.isArray(list) ? list : [list]).map(matchGpu).filter(Boolean);
  if (!found.length) return null;
  return found.sort((a, b) => b.idx - a.idx)[0];
}

const CHIPSET_PLATFORM = [
  [/\b(a320|b350|x370|b450|x470|a520|b550|x570)\b/i, 'AM4'],
  [/\b(a620|b650e?|x670e?|b840|b850|x870e?)\b/i, 'AM5'],
  [/\b(h610|b660|h670|z690|b760|z790)\b/i, 'LGA1700'],
  [/\b(h810|b860|z890)\b/i, 'LGA1851'],
  [/\b(h110|b150|h170|z170|b250|h270|z270|h310|b360|b365|h370|z370|z390|h410|b460|h470|z490|h510|b560|z590)\b/i, 'old']
];
function platformFromBoard(board) {
  for (const [re, p] of CHIPSET_PLATFORM) if (re.test(board || '')) return p;
  return null;
}
const SMBIOS_MEM = { 20: 'DDR', 21: 'DDR2', 24: 'DDR3', 26: 'DDR4', 34: 'DDR5', 35: 'DDR5' };

// Comando de PowerShell que el usuario ejecuta en su PC; copia un JSON al portapapeles.
const PS_COMMAND = '$p=Get-CimInstance Win32_Processor;$g=Get-CimInstance Win32_VideoController;$m=Get-CimInstance Win32_PhysicalMemory;$b=Get-CimInstance Win32_BaseBoard;$d=Get-PhysicalDisk;[pscustomobject]@{cpu=@($p.Name)[0];gpu=@($g.Name);ramGB=[math]::Round(($m|Measure-Object Capacity -Sum).Sum/1GB);ramType=@($m.SMBIOSMemoryType)[0];ramMHz=@($m.Speed)[0];board="$($b.Manufacturer) $($b.Product)";disks=@($d.MediaType|ForEach-Object{"$_"})}|ConvertTo-Json -Compress|Set-Clipboard;Write-Host "Listo: pega el resultado en la web."';

// Lee el informe pegado (JSON del comando, o texto libre de dxdiag/msinfo/Administrador de tareas).
function parseReport(text) {
  const out = { cpu: null, gpu: null, ramGB: null, ramType: null, platform: null, board: null, ssd: null, raw: {} };
  if (!text || typeof text !== 'string' || text.length > 200000) return out;
  let obj = null;
  const jsonStart = text.indexOf('{');
  if (jsonStart >= 0) { try { obj = JSON.parse(text.slice(jsonStart, text.lastIndexOf('}') + 1)); } catch { obj = null; } }
  if (obj && typeof obj === 'object') {
    out.raw = obj;
    if (obj.cpu) out.cpu = matchCpu(obj.cpu) || { name: String(obj.cpu).slice(0, 80), unknown: true };
    if (obj.gpu) out.gpu = bestGpu(obj.gpu) || { name: String([].concat(obj.gpu)[0]).slice(0, 80), unknown: true };
    if (Number.isFinite(+obj.ramGB) && +obj.ramGB > 0) out.ramGB = Math.round(+obj.ramGB);
    if (SMBIOS_MEM[+obj.ramType]) out.ramType = SMBIOS_MEM[+obj.ramType];
    else if (+obj.ramMHz >= 4400) out.ramType = 'DDR5';
    else if (+obj.ramMHz >= 2133) out.ramType = 'DDR4';
    if (obj.board) { out.board = String(obj.board).slice(0, 80); out.platform = platformFromBoard(obj.board); }
    if (obj.disks) { const d = [].concat(obj.disks).map(String); out.ssd = d.some(x => /ssd/i.test(x)) ? true : d.some(x => /hdd/i.test(x)) ? false : null; }
  } else {
    // Texto libre: buscamos nombres conocidos línea a línea
    const lines = text.split(/\r?\n/).slice(0, 4000);
    for (const l of lines) {
      if (!out.cpu || !out.cpu.exact) { const c = matchCpu(l); if (c && (!out.cpu || c.exact)) out.cpu = c; }
      const g = matchGpu(l); if (g && (!out.gpu || g.idx > out.gpu.idx)) out.gpu = g;
      const r = l.match(/(\d{1,3}(?:[.,]\d)?)\s?GB\b.*(ram|memoria|memory)|(ram|memoria|memory)[^0-9]{0,30}(\d{1,3}(?:[.,]\d)?)\s?GB/i);
      if (r && !out.ramGB) { const v = parseFloat((r[1] || r[4]).replace(',', '.')); if (v >= 2 && v <= 512) out.ramGB = Math.round(v); }
      if (!out.ramType) { const t = l.match(/\bDDR([345])\b/i); if (t) out.ramType = 'DDR' + t[1]; }
      if (!out.platform) out.platform = platformFromBoard(l);
    }
  }
  if (out.cpu && out.cpu.platform && !out.unknown) out.platform = out.cpu.platform;
  if (!out.ramType && out.cpu?.mem && out.cpu.platform !== 'LGA1700') out.ramType = out.cpu.mem;
  return out;
}

// Detección sin instalar nada: lo que el navegador deja ver.
function detectBrowser() {
  const res = { gpuRaw: null, gpu: null, threads: null, ramApprox: null, os: null };
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      if (r) {
        res.gpuRaw = String(r);
        // ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x...) Direct3D11 ...)
        const inner = res.gpuRaw.match(/ANGLE \([^,]*,\s*([^,(]+)/);
        res.gpu = matchGpu(inner ? inner[1] : res.gpuRaw);
      }
    }
  } catch { /* sin WebGL */ }
  if (navigator.hardwareConcurrency) res.threads = navigator.hardwareConcurrency;
  if (navigator.deviceMemory) res.ramApprox = navigator.deviceMemory; // Chrome lo limita a 8
  const ua = navigator.userAgent;
  res.os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : null;
  return res;
}

root.PCHW = { CPUS: cpuList, GPUS: gpuList, matchCpu, matchGpu, bestGpu, parseReport, detectBrowser, platformFromBoard, PS_COMMAND };
})(typeof globalThis !== 'undefined' ? globalThis : window);
