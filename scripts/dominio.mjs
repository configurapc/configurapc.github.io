// Pon tu dominio cuando publiques: rellena las URL absolutas para Google y redes sociales y crea sitemap.xml.
//   node scripts/dominio.mjs https://www.tudominio.es
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
const arg = process.argv[2];
let base;
try { base = new URL(arg); if (base.protocol !== 'https:') throw 0; } catch { console.error('Uso: node scripts/dominio.mjs https://www.tudominio.es'); process.exit(1); }
const root = base.origin + '/';
const f = (p) => new URL('../' + p, import.meta.url);
let html = readFileSync(f('index.html'), 'utf8');
html = html.replace(/<!-- dominio:inicio[\s\S]*?<!-- dominio:fin -->/, `<!-- dominio:inicio (scripts/dominio.mjs rellena las URL absolutas) -->
  <link rel="canonical" href="${root}">
  <meta property="og:url" content="${root}">
  <meta property="og:image" content="${root}assets/og.png">
  <!-- dominio:fin -->`);
writeFileSync(f('index.html'), html);
const today = new Date().toISOString().slice(0, 10);
const pages = existsSync(f('pc')) ? readdirSync(f('pc')).filter(x => x.endsWith('.html')).map(x => root + 'pc/' + (x === 'index.html' ? '' : x.replace(/\.html$/, ''))) : [];
writeFileSync(f('sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` + [root, ...pages].map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq></url>`).join('\n') + `\n</urlset>\n`);
let robots = readFileSync(f('robots.txt'), 'utf8').replace(/^Sitemap:.*\n?/m, '').trimEnd();
writeFileSync(f('robots.txt'), robots + `\nSitemap: ${root}sitemap.xml\n`);
console.log(`Listo para ${root}: index.html, sitemap.xml y robots.txt actualizados.`);
