// Revisión de accesibilidad con axe-core (WCAG 2 A/AA) en tema claro y oscuro.
// Requiere: npm i -D axe-core  (o AXE=/ruta/axe.min.js) y el servidor local en marcha.
const { chromium } = require('playwright');
const fs = require('fs');
const AXE = process.env.AXE || require.resolve('axe-core/axe.min.js');
const BASE = process.env.BASE || 'http://localhost:8080/';
const axe = fs.readFileSync(AXE, 'utf8');

(async () => {
  const b = await chromium.launch();
  let total = 0;
  for (const theme of ['light', 'dark']) {
    const ctx = await b.newContext({ colorScheme: theme, viewport: { width: 1280, height: 900 }, bypassCSP: true });
    const p = await ctx.newPage();
    const run = async (label) => {
      await p.addScriptTag({ content: axe }).catch(() => {});
      const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations
        .map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 3).map(x => x.target.join(' ') + ' :: ' + (x.failureSummary || '').split('\n').slice(1).join(' ')) })));
      total += r.length;
      console.log(`--- ${theme} ${label}: ${r.length} problemas`);
      for (const v of r) console.log(' ', v.impact, v.id, v.n, JSON.stringify(v.ex));
    };
    await p.goto(BASE); await p.waitForSelector('.choice');
    await run('inicio');
    await p.click('#wiz-bar button:has-text("Siguiente")'); await p.click('#wiz-bar button:has-text("Siguiente")');
    await run('ajustes');
    await p.goto(BASE + 'pc/gaming-1000-euros.html'); await run('guía por presupuesto');
    await p.goto(BASE); await p.waitForSelector('.choice');
    await p.click('.chip-btn:has-text("Jugar con monitor")'); await p.waitForSelector('#editor .parts'); await p.waitForTimeout(800);
    await run('resultado');
    await p.click('.part[data-cat="gpu"] button'); await p.waitForSelector('#swap[open] .alt'); await p.waitForTimeout(500);
    await run('cambiar pieza');
    await p.keyboard.press('Escape');
    await p.click('.nav-btn[data-view="upgrade"]'); await run('mejorar');
    await p.click('.nav-btn[data-view="laptops"]'); await p.click('#laptops .choice:has-text("Jugar")'); await p.waitForTimeout(300); await run('portátiles');
    await p.click('.nav-btn[data-view="catalog"]'); await run('precios');
    await ctx.close();
  }
  await b.close();
  console.log(total ? `\n${total} grupos de problemas` : '\nSin problemas de accesibilidad WCAG A/AA.');
  process.exit(total ? 1 : 0);
})();
