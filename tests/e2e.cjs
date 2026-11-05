// Prueba de extremo a extremo con Playwright contra scripts/serve.mjs (CSP real) y abriendo el archivo con doble clic (file://).
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:8080/';
const OUT = process.env.OUT || '/tmp/shots';
const euro = (s) => Number(String(s).replace(/[^\d,]/g, '').replace(',', '.'));

(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const problems = [];
  const watch = (page) => {
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`[console ${m.type()}] ${m.text()}`); });
    page.on('pageerror', e => problems.push(`[pageerror] ${e.message}`));
    page.on('requestfailed', r => problems.push(`[requestfailed] ${r.url()}`));
  };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-ES', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage(); watch(page);

  await page.goto(BASE);
  await page.waitForSelector('#updated-badge:not(:has-text("Cargando"))');
  await page.screenshot({ path: `${OUT}/01-uso.png` });

  // Configuración rápida
  await page.click('.presets .chip-btn:has-text("Jugar a 1440p, 1.500")');
  await page.waitForSelector('#editor .games .game-list li');
  console.log('Preset 1.500 €:', await page.textContent('.sum-total b'), '| FPS Cyberpunk:', await page.textContent('.game-list li:nth-child(7) .gfps'));
  const sw = await page.evaluate(async () => !!(await navigator.serviceWorker?.getRegistration()));
  console.log('Service worker registrado:', sw);
  await page.click('#editor .back');
  // Paso 1: jugar a 1080p
  await page.click('.choice:has-text("Juegos actuales")');
  await page.click('.seg-btn:has-text("1080p")');
  await page.click('#wiz-bar button:has-text("Siguiente")');
  // Paso 2: 1.000 € con monitor y teclado/ratón, 500 GB
  await page.fill('#budget', '1000');
  await page.click('.choice:has-text("Monitor")');
  await page.click('.choice:has-text("Teclado y ratón")');
  await page.click('.seg-btn:has-text("500 GB")');
  await page.screenshot({ path: `${OUT}/02-presupuesto.png` });
  await page.click('#wiz-bar button:has-text("Siguiente")');
  await page.screenshot({ path: `${OUT}/03-ajustes.png` });
  await page.click('#wiz-bar button:has-text("Ver mi configuración")');
  await page.waitForSelector('#editor .parts');
  const total = euro(await page.textContent('.sum-total b'));
  console.log('Total 1.000 € con periféricos:', total);
  if (!(total <= 1000)) problems.push(`[presupuesto] ${total} > 1000`);
  if (await page.$('.part[data-cat="ssd"] .spec:has-text("500 GB")') == null) problems.push('[ssd] no es de 500 GB');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/04-resultado.png`, fullPage: true });

  // Cambiar la gráfica desde la hoja lateral
  await page.click('.part[data-cat="gpu"] button');
  await page.waitForSelector('#swap[open] .alt');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/05-cambiar.png` });
  const n = await page.$$eval('#swap-list > .alt', els => els.length);
  console.log('Alternativas de gráfica compatibles:', n);
  await page.click('#swap .seg-btn:has-text("Precio")');
  await page.click('#swap-list > .alt:not(.is-current)');
  await page.waitForSelector('#swap:not([open])', { state: 'attached' });
  await page.waitForSelector('#toast:not([hidden])');
  console.log('Aviso:', await page.textContent('#toast'));
  // Cambiar el procesador a otra plataforma (ajusta placa/RAM)
  await page.click('.part[data-cat="cpu"] button');
  await page.fill('#swap-search', '7600');
  await page.waitForTimeout(100);
  const also = await page.$eval('#swap-list > .alt', el => el.innerText.replace(/\s+/g, ' '));
  console.log('CPU AM5:', also.slice(0, 200));
  await page.click('#swap-list > .alt');
  const errs = await page.$$eval('.checks li.error, .checks li.missing', els => els.map(e => e.innerText));
  if (errs.length) problems.push('[compatibilidad tras cambiar CPU] ' + errs.join(' | '));
  // Escape cierra la hoja
  await page.click('.part[data-cat="case"] button'); await page.keyboard.press('Escape');
  await page.waitForSelector('#swap:not([open])', { state: 'attached' });

  // Guardar, compartir y PDF (emulación de impresión)
  await page.fill('.name-input', 'Prueba e2e');
  await page.click('.sum-actions button:has-text("Guardar")');
  await page.click('.sum-actions button:has-text("Compartir")');
  const link = await page.evaluate(() => navigator.clipboard.readText());
  console.log('Enlace:', link.slice(0, 60) + '…');
  await page.evaluate(() => { window.print = () => {}; });
  await page.click('.sum-actions button:has-text("Descargar PDF")');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: `${OUT}/presupuesto.pdf`, format: 'A4', printBackground: true });
  await page.screenshot({ path: `${OUT}/06-pdf.png`, fullPage: true });
  await page.emulateMedia({ media: 'screen' });

  // Opción de más presupuesto (opcional, marcada en rojo)
  if (await page.$('.upsell')) {
    await page.click('.opt-pill:has-text("Recomendada")');
    await page.click('.upsell');
    if (!(await page.$('.notice.err'))) problems.push('[upsell] no avisa de que se pasa');
    await page.click('.opt-pill:has-text("Recomendada")');
  }

  // Comparar opciones y guía de montaje
  await page.click('.opt-pill:has-text("Recomendada")');
  if (await page.$('button:has-text("Comparar opciones")')) {
    await page.click('button:has-text("Comparar opciones")');
    console.log('Comparación:', await page.$$eval('.compare-box th[scope=col]', e => e.map(x => x.innerText)));
  }
  await page.click('.guide summary');
  console.log('Guía de montaje:', await page.$$eval('.guide-list li', e => e.length), 'pasos');

  // Reutilizar gráfica + Windows
  await page.click('#editor .back');
  await page.click('#wiz-bar button:has-text("Siguiente")');
  await page.fill('#budget', '900');
  await page.click('#wiz-bar button:has-text("Siguiente")');
  await page.click('.switch:has-text("Tarjeta gráfica") input');
  await page.fill('#have-gpu', 'RTX 3070');
  await page.click('.switch:has-text("Incluir Windows") input');
  await page.screenshot({ path: `${OUT}/03b-reutilizar.png`, fullPage: true });
  await page.click('#wiz-bar button:has-text("Ver mi configuración")');
  await page.waitForSelector('#editor .parts');
  console.log('Con RTX 3070 propia:', await page.textContent('.part[data-cat="gpu"] .part-name'), '|', await page.textContent('.part[data-cat="os"] .part-name'), '|', await page.textContent('.sum-total b'));
  await page.screenshot({ path: `${OUT}/04b-reutilizar.png`, fullPage: true });
  await page.click('#editor .back');
  await page.click('#wiz-bar button:has-text("Siguiente")');
  await page.click('#wiz-bar button:has-text("Siguiente")');
  await page.click('.switch:has-text("Tarjeta gráfica") input');
  await page.click('.switch:has-text("Incluir Windows") input');
  await page.click('#wiz-bar button:has-text("Atrás")');
  await page.click('#wiz-bar button:has-text("Atrás")');

  // Guías por presupuesto
  const g = await ctx.newPage(); watch(g);
  await g.goto(BASE + 'pc/index.html');
  console.log('Guías:', await g.$$eval('.pg-index li', e => e.length));
  await g.click('.pg-index a >> nth=1');
  await g.waitForSelector('.pg-table');
  await g.screenshot({ path: `${OUT}/16-guia.png`, fullPage: true });
  await g.click('.pg-cta a');
  await g.waitForSelector('#editor .parts');
  console.log('Guía abierta en el configurador:', await g.textContent('.sum-total b'));
  await g.close();

  // Presupuesto imposible
  if (await page.isVisible('#editor .back')) await page.click('#editor .back');
  await page.click('#wiz-bar button:has-text("Siguiente")');
  await page.fill('#budget', '500');
  await page.click('#wiz-bar button:has-text("Ver ya mi PC")');
  await page.waitForSelector('#editor h1');
  console.log('500 € juego:', await page.textContent('#editor h1'));
  await page.screenshot({ path: `${OUT}/07-no-llega.png` });

  // Enlace compartido
  const p2 = await ctx.newPage(); watch(p2);
  await p2.goto(link);
  await p2.waitForSelector('#editor .parts');
  console.log('Compartida:', await p2.textContent('.notice.info'));
  await p2.close();

  // Mejorar mi PC con informe de Windows
  await page.click('.nav-btn[data-view="upgrade"]');
  await page.click('.choice:has-text("Informe de Windows")');
  await page.fill('#u-paste', '{"cpu":"AMD Ryzen 5 3600 6-Core Processor","gpu":["NVIDIA GeForce GTX 1660 SUPER"],"ramGB":16,"ramType":26,"ramMHz":3200,"board":"Gigabyte B450M DS3H","disks":["SSD"]}');
  await page.click('button:has-text("Leer informe")');
  console.log('Reconocido:', await page.$$eval('.recog', els => els.map(e => e.innerText).join(' | ')));
  await page.selectOption('#u-psu', '550');
  await page.fill('#u-budget', '500');
  await page.click('#u-run');
  await page.waitForSelector('#up-result .gain');
  console.log('Mejora:', await page.textContent('#up-result .gain'), await page.$$eval('#up-result .part-name', e => e.map(x => x.innerText)));
  await page.screenshot({ path: `${OUT}/08-mejorar.png`, fullPage: true });
  // Escribirlo a mano con autocompletado
  await page.click('.choice:has-text("Escribirlo")');
  await page.fill('#u-cpu', 'i5-12400F');
  console.log('Manual CPU:', await page.textContent('.recog'));

  // Portátiles
  await page.click('.nav-btn[data-view="laptops"]');
  await page.click('#laptops .choice:has-text("Programar")');
  await page.fill('#lap-budget', '1300'); await page.press('#lap-budget', 'Tab');
  console.log('Portátiles programar 1.300 €:', await page.textContent('.res-title'), '|', await page.textContent('.lap-card.is-best .part-name'));

  // Precios
  await page.click('.nav-btn[data-view="catalog"]');
  await page.click('.cat-chips button:has-text("Tarjeta gráfica")');
  await page.fill('#c-q', '5060');
  console.log('Catálogo 5060:', await page.$$eval('#c-list .cat-row', e => e.length));
  await page.screenshot({ path: `${OUT}/09-precios.png` });

  // Guardadas
  await page.click('.nav-btn[data-view="saved"]');
  console.log('Guardadas:', await page.$$eval('.saved-card h3', e => e.map(x => x.innerText)));
  await page.screenshot({ path: `${OUT}/10-guardadas.png` });

  // Modo oscuro
  await page.click('#theme-toggle');
  await page.click('.nav-btn[data-view="build"]');
  await page.click('#editor .back').catch(() => {});
  await page.click('#wiz-bar button:has-text("Siguiente")');
  await page.fill('#budget', '1500');
  await page.click('#wiz-bar button:has-text("Ver ya mi PC")');
  await page.waitForSelector('#editor .parts');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/11-oscuro.png`, fullPage: true });

  // Móvil
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-ES' });
  const mp = await m.newPage(); watch(mp);
  await mp.goto(BASE);
  await mp.waitForSelector('.choice');
  await mp.screenshot({ path: `${OUT}/12-movil-uso.png` });
  await mp.click('.choice:has-text("Ofimática")');
  await mp.click('#wiz-bar button:has-text("Siguiente")');
  await mp.fill('#budget', '800');
  await mp.click('#wiz-bar button:has-text("Ver ya mi PC")');
  await mp.waitForSelector('#mbar:not([hidden])');
  await mp.waitForTimeout(500);
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) problems.push('[móvil] desbordamiento horizontal');
  await mp.screenshot({ path: `${OUT}/13-movil-resultado.png`, fullPage: true });
  await mp.click('.part[data-cat="ram"] button');
  await mp.waitForTimeout(400);
  await mp.screenshot({ path: `${OUT}/14-movil-cambiar.png` });
  await m.close();

  // Doble clic (file://)
  const fp = await (await browser.newContext()).newPage(); watch(fp);
  await fp.goto('file://' + path.resolve(__dirname, '../index.html'));
  await fp.waitForSelector('#updated-badge:not(:has-text("Cargando"))');
  await fp.click('#wiz-bar button:has-text("Siguiente")');
  await fp.click('#wiz-bar button:has-text("Ver ya mi PC")');
  await fp.waitForSelector('#editor .parts');
  console.log('file:// OK, total', await fp.textContent('.sum-total b'));

  await browser.close();
  // Con file:// Chrome no deja cargar fuentes locales: se usa la del sistema (esperado).
  const real = problems.filter(p => !/favicon/.test(p) && !/file:.*geist\.woff2|net::ERR_FAILED/.test(p));
  console.log(real.length ? 'PROBLEMAS:\n' + real.join('\n') : 'Sin errores de consola ni de CSP.');
  process.exit(real.length ? 1 : 0);
})();
