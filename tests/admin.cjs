// Prueba del panel de precios: captura con el marcador, feed y piezas nuevas. Restaura los datos al acabar.
// Requiere: node scripts/serve.mjs 8090 --admin
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const BASE = process.env.ADMIN || 'http://localhost:8090/';
const DATA = path.resolve(__dirname, '../data/components.json');
const backup = fs.readFileSync(DATA);
const PRODUCT = `<!DOCTYPE html><html><head><title>Ryzen</title><link rel="canonical" href="https://www.pccomponentes.com/procesador-amd-ryzen-5-5500-3-6ghz-box">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"AMD Ryzen 5 5500 3.6GHz Box","gtin13":"0730143314442","mpn":"100-100000457BOX","offers":{"@type":"Offer","price":"98.50","priceCurrency":"EUR"}}</script></head><body>ficha</body></html>`;
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ permissions: ['clipboard-read', 'clipboard-write'], viewport: { width: 1280, height: 900 } });
  try {
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.goto(BASE + 'admin.html'); await p.waitForSelector('#stats b');
    const code = await p.getAttribute('#bookmarklet', 'href');
    // Marcador sobre una ficha de producto de ejemplo
    const shop = await ctx.newPage();
    await shop.route('https://www.pccomponentes.com/**', r => r.fulfill({ body: PRODUCT, contentType: 'text/html' }));
    await shop.goto('https://www.pccomponentes.com/procesador-amd-ryzen-5-5500-3-6ghz-box?utm=x');
    shop.on('dialog', d => d.accept());
    await shop.evaluate(decodeURIComponent(code.replace(/^javascript:/, '')));
    await shop.waitForTimeout(300);
    const cap = await shop.evaluate(() => navigator.clipboard.readText());
    console.log('Captura:', cap);
    await shop.close();
    await p.click('button[data-tab="cap"]');
    await p.fill('#cap-text', cap + '\n' + JSON.stringify({ n: 'Tarjeta Gráfica Zotac GeForce RTX 5060 Ti Twin Edge 8GB', p: '459,90', u: 'https://www.pccomponentes.com/zotac-5060ti', e: '', m: '', h: 'www.pccomponentes.com' }));
    await p.click('#cap-go');
    console.log('Reconocidas:', await p.$$eval('#cap-out tbody tr', rs => rs.map(r => r.innerText.replace(/\s+/g, ' ').slice(0, 140))));
    await p.click('text=Aplicar marcados');
    await p.waitForFunction(() => /→|Añadido/.test(document.querySelector('#log').textContent));
    console.log('Log captura:', (await p.textContent('#log')).split('\n').slice(0, 3).join(' | '));
    // Feed
    await p.click('button[data-tab="feed"]');
    await p.setInputFiles('#feed-file', path.resolve(__dirname, 'fixtures/feed-awin.csv'));
    await p.click('#feed-check');
    await p.waitForFunction(() => /Feed:/.test(document.querySelector('#log').textContent), null, { timeout: 60000 });
    console.log('Feed:', (await p.textContent('#log')).split('\n').filter(l => /Feed:|Reconocidos|revisar|nuevos/i.test(l)).join(' | '));
    await p.click('#load-new');
    await p.waitForFunction(() => document.querySelector('#new-csv').value.includes('7700'));
    const csv = (await p.inputValue('#new-csv')).replace(/;0730143314572;100-100000592BOX;;$/m, ';0730143314572;100-100000592BOX;cooler=si|cores=8;');
    await p.fill('#new-csv', csv);
    await p.click('#new-check');
    await p.waitForFunction(() => /piezas listas/.test(document.querySelector('#log').textContent), null, { timeout: 60000 });
    console.log('Nuevas:', (await p.textContent('#log')).split('\n').filter(l => /✓|✗|listas/.test(l)).join(' | '));
    await p.screenshot({ path: '/tmp/shots/18-panel-importar.png', fullPage: true });
  } finally {
    fs.writeFileSync(DATA, backup);
    require('child_process').execFileSync(process.execPath, [path.resolve(__dirname, '../scripts/validate-data.mjs'), '--quiet']);
    require('child_process').execFileSync(process.execPath, [path.resolve(__dirname, '../scripts/paginas.mjs')]);
    fs.rmSync(path.resolve(__dirname, '../importar'), { recursive: true, force: true });
    console.log('Datos restaurados. Errores de consola:', errs);
    await b.close();
  }
})();
