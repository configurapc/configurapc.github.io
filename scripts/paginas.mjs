// Genera páginas estáticas «Mejor PC por X €» en /pc/ con los precios actuales (para Google y para compartir).
// Se ejecuta solo al guardar precios (scripts/precio.mjs) y a mano con: node scripts/paginas.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import '../assets/engine.js';
const E = globalThis.PCEngine;

const root = new URL('../', import.meta.url);
const outDir = new URL('pc/', root);
const raw = JSON.parse(readFileSync(new URL('data/components.json', root), 'utf8'));
const db = E.indexDb(raw);

const PAGES = [
  { slug: 'gaming-900-euros', use: 'gaming', res: '1080p', budget: 900, storage: 500, title: 'El mejor PC gaming por 900 €' },
  { slug: 'gaming-1000-euros', use: 'gaming', res: '1080p', budget: 1000, storage: 1000, title: 'El mejor PC gaming por 1.000 €' },
  { slug: 'gaming-1000-euros-con-monitor', use: 'gaming', res: '1080p', budget: 1000, storage: 500, periph: { monitor: true, input: true }, title: 'PC gaming con monitor por 1.000 €' },
  { slug: 'gaming-1200-euros', use: 'gaming', res: '1080p', budget: 1200, storage: 1000, title: 'El mejor PC gaming por 1.200 €' },
  { slug: 'gaming-1500-euros', use: 'gaming', res: '1440p', budget: 1500, storage: 1000, title: 'El mejor PC gaming por 1.500 €' },
  { slug: 'gaming-2000-euros', use: 'gaming', res: '1440p', budget: 2000, storage: 1000, title: 'El mejor PC gaming por 2.000 €' },
  { slug: 'gaming-2500-euros', use: 'gaming', res: '1440p', budget: 2500, storage: 2000, title: 'El mejor PC gaming por 2.500 €' },
  { slug: 'gaming-4k-3500-euros', use: 'gaming', res: '4K', budget: 3500, storage: 2000, title: 'PC gaming para 4K por 3.500 €' },
  { slug: 'streaming-2000-euros', use: 'streaming', res: '1440p', budget: 2000, storage: 1000, title: 'PC para jugar y hacer streaming por 2.000 €' },
  { slug: 'ofimatica-650-euros', use: 'office', res: '1080p', budget: 650, storage: 500, title: 'PC de oficina y estudio por 650 €' },
  { slug: 'programacion-1200-euros', use: 'dev', res: '1080p', budget: 1200, storage: 1000, title: 'PC para programar por 1.200 €' },
  { slug: 'edicion-video-2000-euros', use: 'creative', res: '1080p', budget: 2000, storage: 2000, title: 'PC para edición de foto y vídeo por 2.000 €' },
  { slug: 'ia-local-3000-euros', use: 'ai', res: '1080p', budget: 3000, storage: 2000, title: 'PC para IA local por 3.000 €' }
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); };
const USE_TEXT = { gaming: 'jugar', streaming: 'jugar y emitir', office: 'ofimática y estudio', dev: 'programar', creative: 'editar foto y vídeo', ai: 'IA local' };
const ALLOWED = new Set(Object.values(raw.stores).map(s => s.host).concat(['www.geeknetic.es']));
const safe = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && (ALLOWED.has(x.hostname) || ALLOWED.has(x.hostname.replace(/^www\./, ''))) ? x.href : null; } catch { return null; } };

function page(p, rec, others) {
  const b = rec.build, sp = 'any';
  const rows = E.CATS.filter(c => b[c]).map(c => {
    const it = b[c], o = E.bestOffer(it, sp, db.stores), u = o && safe(o.url);
    const pts = E.componentPoints(it, p.use);
    return `<tr><td class="pg-cat">${esc(E.CAT_LABEL[c])}</td><td><b>${esc(it.name)}</b>${pts ? ` <span class="tier" data-t="${pts.tier}"><b>${pts.tier}</b><span>${pts.pts} pts</span></span>` : ''}<br><span class="hint">${esc(it.why || '')}</span></td>`
      + `<td class="pg-r">${o ? (u ? `<a href="${esc(u)}" rel="nofollow noopener noreferrer" target="_blank">${esc(db.stores[o.store]?.name || o.store)}</a>` : esc(db.stores[o.store]?.name)) : ''}</td><td class="pg-r num"><b>${esc(E.euro(o?.price))}</b></td></tr>`;
  }).join('\n');
  const res = ['gaming', 'streaming'].includes(p.use) ? p.res : '1080p';
  const games = b.cpu ? E.gamesTable(b, res).map(g => `<tr><td>${esc(g.game.name)} <span class="hint">${esc(g.game.preset)}</span></td><td class="pg-r num"><b>${g.fps}</b> FPS</td><td>${esc(g.tier?.text || '')}</td></tr>`).join('\n') : '';
  const level = b.cpu ? E.gamingLevel(b.gpu, b.cpu).text : '';
  const bp = E.buildPoints(b, p.use);
  const share = '../#b=' + E.encodeShare(b, p.title);
  const desc = `${p.title}: piezas compatibles por ${E.euro(rec.total)} con precios de tiendas españolas del ${fmtDate(raw.updated)}.`;
  const links = others.map(o => `<li><a href="${o.slug}.html">${esc(o.title)}</a></li>`).join('');
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(p.title)} (${esc(fmtDate(raw.updated))}) | ConfiguraPC</title>
  <meta name="description" content="${esc(desc)}">
  <meta property="og:title" content="${esc(p.title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="../assets/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
  <header class="top"><div class="wrap top-in"><a class="brand" href="../index.html"><svg viewBox="0 0 28 28" aria-hidden="true"><rect x="2" y="2" width="24" height="24" rx="7" fill="currentColor"/><path d="M9 9h10v10H9z" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 12h4v4h-4z" fill="#fff"/></svg><span>ConfiguraPC</span></a>
  <nav class="nav" aria-label="Secciones"><a class="nav-btn" href="../index.html">Configurador</a><a class="nav-btn" href="index.html" aria-current="page">Guías</a></nav></div></header>
  <main id="main" class="wrap pg">
    <p class="hint"><a href="index.html">Guías por presupuesto</a></p>
    <h1>${esc(p.title)}</h1>
    <p class="lead">Para ${esc(USE_TEXT[p.use])}${['gaming', 'streaming'].includes(p.use) ? ` a ${esc(p.res)}` : ''}. Sin pasarse del presupuesto: <b>${esc(E.euro(rec.total))}</b> con precios del ${esc(fmtDate(raw.updated))}.${level ? ` Rinde para ${esc(level)}.` : ''}${bp ? ` Puntuación del equipo: ${bp.pts}/100 (tier ${bp.tier}).` : ''}</p>
    <p class="pg-cta"><a class="btn btn-primary" href="${esc(share)}">Abrir en el configurador y personalizar</a></p>
    <div class="pg-table"><table class="cmp"><thead><tr><th>Pieza</th><th>Modelo</th><th class="pg-r">Tienda</th><th class="pg-r">Precio</th></tr></thead><tbody>
${rows}
<tr class="diff"><th colspan="3">Total</th><td class="pg-r num"><b>${esc(E.euro(rec.total))}</b></td></tr>
    </tbody></table></div>
    ${games ? `<h2>FPS estimados a ${esc(res)}</h2><div class="pg-table"><table class="cmp"><tbody>${games}</tbody></table></div>
    <p class="games-note">Estimación orientativa (±20 %), sin DLSS/FSR. Calibrada con la media de TechPowerUp para la RTX 5070; el peso de cada juego es aproximado.</p>` : ''}
    <h2>Otras guías</h2><ul class="pg-links">${links}</ul>
    <p class="hint">Precios recogidos de las tiendas indicadas; cambian a diario, confírmalos antes de comprar. Sistema operativo no incluido.</p>
  </main>
</body>
</html>
`;
}

mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (f.endsWith('.html')) unlinkSync(new URL(f, outDir));
const made = [];
for (const p of PAGES) {
  const r = E.recommend(db, { ...p, periph: p.periph || {} });
  if (!r.options.length) { console.log(`- ${p.slug}: no llega con estos precios, se omite`); continue; }
  made.push({ ...p, rec: r.options[0] });
}
for (const p of made) writeFileSync(new URL(p.slug + '.html', outDir), page(p, p.rec, made.filter(o => o !== p)));
const list = made.map(p => `<li><a href="${p.slug}.html"><b>${esc(p.title)}</b></a> <span class="hint">${esc(E.euro(p.rec.total))}</span></li>`).join('\n');
writeFileSync(new URL('index.html', outDir), `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Los mejores PC por presupuesto (${esc(fmtDate(raw.updated))}) | ConfiguraPC</title>
  <meta name="description" content="Configuraciones de PC recomendadas por presupuesto con precios de tiendas españolas, actualizadas cada semana.">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
  <header class="top"><div class="wrap top-in"><a class="brand" href="../index.html"><svg viewBox="0 0 28 28" aria-hidden="true"><rect x="2" y="2" width="24" height="24" rx="7" fill="currentColor"/><path d="M9 9h10v10H9z" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 12h4v4h-4z" fill="#fff"/></svg><span>ConfiguraPC</span></a>
  <nav class="nav" aria-label="Secciones"><a class="nav-btn" href="../index.html">Configurador</a><a class="nav-btn" href="index.html" aria-current="page">Guías</a></nav></div></header>
  <main id="main" class="wrap pg">
    <h1>Los mejores PC por presupuesto</h1>
    <p class="lead">Precios del ${esc(fmtDate(raw.updated))}. Cada configuración es compatible, no se pasa del presupuesto y se puede abrir en el configurador para cambiar piezas.</p>
    <ul class="pg-links pg-index">
${list}
    </ul>
  </main>
</body>
</html>
`);
console.log(`${made.length} páginas en /pc/ (precios del ${raw.updated}).`);
