import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import '../assets/engine.js';
import '../assets/hwdb.js';
const E = globalThis.PCEngine;
const HW = globalThis.PCHW;

const db = E.indexDb(JSON.parse(readFileSync(new URL('../data/components.json', import.meta.url))));
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

const summary = (o) => `${o.label}: ${E.euro(o.total)} | ` + E.CORE_CATS.map(k => o.build[k]?.name || '-').join(' / ');

t('todas las piezas tienen precio y url https', () => {
  for (const it of db.items) {
    assert.ok(it.prices.length, it.id);
    for (const p of it.prices) {
      assert.ok(typeof p.price === 'number' && p.price > 0, it.id);
      assert.match(p.url, /^https:\/\//, it.id);
      assert.ok(db.stores[p.store], `${it.id} tienda ${p.store}`);
    }
  }
});

const cases = [
  { use: 'office', budget: 750 },
  { use: 'office', budget: 900, periph: { monitor: true, input: true } },
  { use: 'gaming', res: '1080p', budget: 1200 },
  { use: 'gaming', res: '1080p', budget: 1500, competitive: true },
  { use: 'gaming', res: '1440p', budget: 2000 },
  { use: 'gaming', res: '1440p', budget: 2500, periph: { monitor: true, input: true, headset: true } },
  { use: 'gaming', res: '4K', budget: 3500 },
  { use: 'creative', budget: 2500 },
  { use: 'dev', budget: 1300 },
  { use: 'ai', budget: 3000 },
  { use: 'streaming', res: '1440p', budget: 2500 },
  { use: 'gaming', res: '1440p', budget: 2000, cpuBrand: 'intel', gpuBrand: 'amd', wifi: true },
  { use: 'gaming', res: '1080p', budget: 1400, size: 'compact' },
  { use: 'gaming', res: '1080p', budget: 1000, storage: 500, periph: { monitor: true, input: true } },
  { use: 'gaming', res: '1080p', budget: 1000, storage: 500 },
  { use: 'office', budget: 650, storage: 500 }
];
for (const q of cases) {
  t(`recomendación ${JSON.stringify(q)}`, () => {
    const r = E.recommend(db, q);
    assert.ok(r.options.length >= 1, 'sin opciones');
    assert.equal(r.options[0].key, 'rec');
    for (const o of r.options) {
      assert.ok(o.total <= q.budget, `se pasa del presupuesto: ${o.total} > ${q.budget}`);
      const checks = E.checkBuild(o.build, { res: q.res });
      const errs = checks.filter(c => c.level === 'error' || c.level === 'missing');
      assert.equal(errs.length, 0, summary(o) + ' → ' + JSON.stringify(errs));
      console.log('   ', summary(o), '| score', o.score.toFixed(3));
    }
    for (const w of r.warnings) console.log('    ⚠', w);
  });
}

t('presupuesto estricto: si no llega, bloquea y explica', () => {
  const r = E.recommend(db, { use: 'gaming', res: '1080p', budget: 400 });
  assert.equal(r.options.length, 0);
  assert.ok(r.blocked && r.blocked.minTotal > 400);
  const r2 = E.recommend(db, { use: 'gaming', res: '1080p', budget: 960, periph: { monitor: true, input: true } });
  if (!r2.options.length) assert.ok(r2.blocked.towerTotal < r2.blocked.minTotal);
});

t('almacenamiento de 500 GB', () => {
  const r = E.recommend(db, { use: 'office', budget: 900, storage: 500 });
  assert.equal(r.options[0].build.ssd.specs.size, 500);
});

t('alternativas compatibles y autoajuste', () => {
  const r = E.recommend(db, { use: 'gaming', res: '1440p', budget: 2000 });
  const b = r.options[0].build;
  const cpus = E.alternatives(db, b, 'cpu', { use: 'gaming', res: '1440p' });
  assert.ok(cpus.some(a => a.current));
  // cambiar a otra plataforma ajusta placa (y RAM si hace falta) sin errores
  const other = cpus.find(a => a.item.specs.socket !== b.cpu.specs.socket && !a.incompatible);
  assert.ok(other, 'debería haber CPU de otra plataforma');
  assert.ok(other.changes.some(c => c.cat === 'mobo'));
  assert.equal(E.hasErrors(E.checkBuild(other.build)), false);
  const mobos = E.alternatives(db, b, 'mobo', { use: 'gaming', res: '1440p' });
  assert.ok(mobos.some(a => a.incompatible && /Socket/.test(a.incompatible)));
  const mons = E.alternatives(db, { ...b, monitor: db.byCat.monitor[0] }, 'monitor', {});
  assert.ok(mons.some(a => a.kind === 'remove'));
});

t('detecta incompatibilidades', () => {
  const b = { cpu: db.byId.get('cpu-r7-9800x3d'), mobo: db.byId.get('mb-b550m-ds3h'), ram: db.byId.get('ram-ddr5-32'), gpu: db.byId.get('gpu-rx9070xt'),
    ssd: db.byId.get('ssd-p310-1tb'), psu: db.byId.get('psu-tempest-750'), case: db.byId.get('case-tempest-rampart'), cooler: null };
  const c = E.checkBuild(b, { res: '1440p' });
  const errs = c.filter(x => x.level === 'error').map(x => x.msg);
  assert.ok(errs.some(m => /Socket/.test(m)));
  assert.ok(errs.some(m => /DDR4/.test(m)));
  assert.ok(c.some(x => x.level === 'missing' && /disipador/.test(x.msg)));
});

t('compartir ida y vuelta', () => {
  const r = E.recommend(db, { use: 'gaming', res: '1440p', budget: 2000 });
  const b = r.options[0].build;
  const s = E.encodeShare(b, 'Prueba ñ €');
  const d = E.decodeShare(db, s);
  assert.equal(d.name, 'Prueba ñ €');
  for (const k of E.CATS) assert.equal(d.build[k]?.id, b[k]?.id);
  assert.equal(E.decodeShare(db, '<script>'), null);
  assert.equal(E.decodeShare(db, 'eyJ2IjoxfQ'), null);
});

t('csv sin inyección de fórmulas', () => {
  const csv = E.buildToCsv({ cpu: { ...db.byId.get('cpu-r5-5600'), name: '=HYPERLINK("x")' } }, 'any', db.stores);
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
});

for (const u of [
  { platform: 'AM4', gpuTier: 'oldmid', ramGB: 16, psuW: 550, hasSsd: true, budget: 700, use: 'gaming', res: '1080p' },
  { platform: 'old', gpuTier: 'entry', ramGB: 8, psuW: 450, hasSsd: false, budget: 1200, use: 'gaming', res: '1080p' },
  { platform: 'AM5', cpuId: 'cpu-r5-7600', gpuTier: 'mid', ramGB: 32, psuW: 650, hasSsd: true, budget: 1300, use: 'gaming', res: '1440p' },
  { cpu: HW.matchCpu('AMD Ryzen 5 3600 6-Core Processor'), gpu: HW.matchGpu('NVIDIA GeForce GTX 1660 SUPER'), ramGB: 16, ramType: 'DDR4', psuW: 550, hasSsd: true, budget: 600, use: 'gaming', res: '1080p' }
]) {
  t(`mejora ${JSON.stringify(u)}`, () => {
    const r = E.recommendUpgrade(db, u);
    assert.ok(r.options.length >= 1);
    for (const o of r.options) console.log('   ', o.label, E.euro(o.cost), `+${Math.round(o.gain * 100)}%`, Object.values(o.parts).map(p => p.name).join(' + '));
    for (const w of r.warnings) console.log('    ⚠', w);
  });
}
t('buscador de portátiles', () => {
  for (const use of Object.keys(E.LAPTOP_USES)) {
    for (const budget of [600, 1000, 1500, 2500]) {
      const r = E.findLaptops(db, { use, budget });
      for (const x of r.results) assert.ok(x.price <= budget, `${x.item.id} se pasa`);
      if (use === 'gaming') for (const x of r.results) assert.ok(x.item.specs.gpuTier >= 1);
      if (r.results.length) assert.equal(r.results.filter(x => x.tag === 'best').length, 1);
    }
  }
  const w = E.findLaptops(db, { use: 'office', budget: 2000, windows: true });
  assert.ok(w.results.every(x => /Windows/.test(x.item.specs.os || '')));
  assert.ok(E.laptopNotes(db.byId.get('lap-ideapad3-g8-i5')).some(n => /soldada/.test(n.msg)));
});

t('reconoce componentes', () => {
  const c = HW.matchCpu('AMD Ryzen 7 5800X3D 8-Core Processor');
  assert.equal(c.short, 'Ryzen 7 5800X3D'); assert.equal(c.platform, 'AM4');
  assert.equal(HW.matchCpu('12th Gen Intel(R) Core(TM) i5-12400F').short, 'Core i5-12400F');
  assert.equal(HW.matchCpu('Intel(R) Core(TM) Ultra 7 265K').short, 'Core Ultra 7 265K');
  assert.equal(HW.matchCpu('Intel(R) Core(TM) i7-4790K CPU @ 4.00GHz').exact, false);
  assert.equal(HW.matchGpu('NVIDIA GeForce RTX 4060 Ti').name, 'RTX 4060 Ti');
  assert.equal(HW.matchGpu('NVIDIA GeForce RTX 4060').name, 'RTX 4060');
  assert.equal(HW.matchGpu('AMD Radeon RX 6700 XT').name, 'RX 6700 XT');
  assert.equal(HW.matchGpu('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)').name, 'RTX 3060');
  assert.equal(HW.matchGpu('Intel(R) UHD Graphics 630').integrated, true);
  assert.equal(HW.bestGpu(['Intel(R) UHD Graphics 770', 'NVIDIA GeForce GTX 1070']).name, 'GTX 1070');
  const r = HW.parseReport('{"cpu":"AMD Ryzen 5 5600X 6-Core Processor","gpu":["NVIDIA GeForce RTX 3070"],"ramGB":16,"ramType":26,"ramMHz":3200,"board":"ASUSTeK COMPUTER INC. TUF GAMING B550-PLUS","disks":["SSD","HDD"]}');
  assert.equal(r.cpu.short, 'Ryzen 5 5600X'); assert.equal(r.gpu.name, 'RTX 3070');
  assert.equal(r.ramGB, 16); assert.equal(r.ramType, 'DDR4'); assert.equal(r.platform, 'AM4'); assert.equal(r.ssd, true);
  assert.equal(HW.parseReport('x'.repeat(300000)).cpu, null);
});

t('FPS por juego y tiers', () => {
  const b = { cpu: db.byId.get('cpu-r7-9800x3d'), gpu: db.byId.get('gpu-rtx5070') };
  const avg = (res) => E.gamesTable(b, res).filter(r => r.game.kind === 'aaa' && !r.game.cap).reduce((a, r) => a + r.fps, 0);
  assert.ok(avg('1080p') > avg('1440p') && avg('1440p') > avg('4K'));
  const er = E.gamesTable(b, '1080p').find(r => r.game.id === 'eldenring');
  assert.equal(er.fps, 60);
  for (const it of db.items) { const p = E.componentPoints(it, 'gaming'); if (E.EXTRA_CATS.includes(it.cat) || it.cat === 'laptop') { assert.equal(p, null); continue; } assert.ok(p.pts >= 1 && p.pts <= 100 && 'SABCDE'.includes(p.tier), it.id); }
  assert.equal(E.componentPoints(db.byId.get('cpu-r7-9800x3d'), 'gaming').tier, 'S');
  assert.ok(E.buildPoints(b, 'gaming').pts > 0);
});

console.log(`\n${n} pruebas OK`);
