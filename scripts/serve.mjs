// Servidor local que aplica las mismas cabeceras que vercel.json (para probar la CSP).
//   node scripts/serve.mjs [puerto]            → la web, igual que en Vercel
//   node scripts/serve.mjs [puerto] --admin    → además, el panel de precios en /admin.html (solo en tu equipo)
import { createServer } from 'node:http';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.argv.find(a => /^\d+$/.test(a))) || 8080;
const ADMIN = process.argv.includes('--admin');
const cfg = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));
const globalHeaders = Object.fromEntries(cfg.headers[0].headers.map(h => [h.key, h.value]));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml' };
const ADMIN_FILES = new Set(['/admin.html', '/assets/admin.js', '/assets/matcher.js']);
const precio = join(root, 'scripts', 'precio.mjs');
const script = (n) => join(root, 'scripts', n);

const run = (args, file = precio) => new Promise((res) => execFile(process.execPath, [file, ...args], { cwd: root, timeout: 180000, maxBuffer: 20e6 },
  (err, stdout, stderr) => res({ ok: !err, out: (stdout + stderr).trim() })));
// Recibe un archivo grande (feed) directamente a disco, hasta 300 MB.
function receiveFile(req, dest) {
  return new Promise((resolve, reject) => {
    let size = 0; const out = createWriteStream(dest);
    req.on('data', (c) => { size += c.length; if (size > 300e6) { req.destroy(); out.destroy(); reject(new Error('archivo de más de 300 MB')); } });
    req.pipe(out); out.on('finish', resolve); out.on('error', reject);
  });
}

async function readBody(req) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > 200000) throw new Error('demasiado grande'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };

async function api(req, res, path) {
  // Protección: solo peticiones del propio panel (mismo origen) con cabecera propia.
  const origin = req.headers.origin;
  if (req.headers['x-admin'] !== '1' || (origin && origin !== `http://localhost:${port}` && origin !== `http://127.0.0.1:${port}`)) return json(res, 403, { ok: false, out: 'Prohibido' });
  if (req.method === 'GET' && path === '/api/data') return json(res, 200, JSON.parse(await readFile(join(root, 'data', 'components.json'), 'utf8')));
  if (req.method === 'GET' && path.startsWith('/api/archivo/')) {
    const n = path.split('/').pop();
    if (!['revisar', 'nuevas'].includes(n)) return json(res, 404, { ok: false, out: 'No existe' });
    try { return json(res, 200, { ok: true, out: await readFile(join(root, 'importar', n + '.csv'), 'utf8') }); } catch { return json(res, 200, { ok: true, out: '' }); }
  }
  if (req.method !== 'POST') return json(res, 405, { ok: false, out: 'Método no permitido' });
  if (path === '/api/feed') {
    const tmp = join(tmpdir(), `feed-${Date.now()}.csv`);
    try { await receiveFile(req, tmp); } catch (e) { return json(res, 400, { ok: false, out: e.message }); }
    const store = new URL(req.url, 'http://x').searchParams.get('tienda') || '';
    const args = [tmp, ...(/^[a-z0-9]{2,20}$/.test(store) ? ['--tienda', store] : []), ...(new URL(req.url, 'http://x').searchParams.get('aplicar') === '1' ? ['--aplicar'] : [])];
    try { return json(res, 200, await run(args, script('feed.mjs'))); } finally { unlink(tmp).catch(() => {}); }
  }
  let b;
  try { b = await readBody(req); } catch (e) { return json(res, 400, { ok: false, out: 'Petición no válida: ' + e.message }); }
  if (path === '/api/precio') {
    const id = String(b.id || ''), store = String(b.store || ''), price = String(b.price || ''), url = String(b.url || '');
    if (!/^[a-z0-9-]{2,60}$/.test(id) || !/^[a-z0-9]{2,20}$/.test(store)) return json(res, 400, { ok: false, out: 'id o tienda no válidos' });
    if (b.borrar) return json(res, 200, await run([id, store, '--borrar']));
    if (!/^\d{1,5}([.,]\d{1,2})?$/.test(price)) return json(res, 400, { ok: false, out: 'Precio no válido (ej.: 389,90)' });
    if (url && !/^https:\/\/[^\s]{5,500}$/.test(url)) return json(res, 400, { ok: false, out: 'Enlace no válido' });
    return json(res, 200, await run(url ? [id, store, price, url] : [id, store, price]));
  }
  if (path === '/api/importar') {
    const csv = String(b.csv || '');
    if (!csv.trim() || csv.length > 150000) return json(res, 400, { ok: false, out: 'CSV vacío o demasiado grande' });
    const tmp = join(tmpdir(), `precios-${Date.now()}.csv`);
    await writeFile(tmp, csv);
    try { return json(res, 200, await run(['importar', tmp])); } finally { unlink(tmp).catch(() => {}); }
  }
  if (path === '/api/nuevas') {
    const csv = String(b.csv || '');
    if (!csv.trim() || csv.length > 500000) return json(res, 400, { ok: false, out: 'CSV vacío o demasiado grande' });
    const tmp = join(tmpdir(), `nuevas-${Date.now()}.csv`);
    await writeFile(tmp, csv);
    try { return json(res, 200, await run([tmp, ...(b.guardar ? ['--guardar'] : [])], script('nuevas.mjs'))); } finally { unlink(tmp).catch(() => {}); }
  }
  return json(res, 404, { ok: false, out: 'No existe' });
}

createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (ADMIN && p.startsWith('/api/')) return api(req, res, p).catch(e => json(res, 500, { ok: false, out: String(e.message) }));
  if (p.endsWith('/')) p += 'index.html';
  if (!ADMIN && ADMIN_FILES.has(p)) { res.writeHead(404); return res.end('404'); }
  const file = normalize(join(root, p));
  if (!file.startsWith(root) || /\/(scripts|tests|node_modules|\.git)\//.test(file)) { res.writeHead(403); return res.end(); }
  try {
    const body = await readFile(file);
    const h = { ...globalHeaders, 'Content-Type': types[extname(file)] || 'application/octet-stream' };
    delete h['Strict-Transport-Security']; delete h['Content-Security-Policy'];
    h['Content-Security-Policy'] = globalHeaders['Content-Security-Policy'].replace('; upgrade-insecure-requests', '');
    if (ADMIN_FILES.has(p)) h['Cache-Control'] = 'no-store';
    res.writeHead(200, h); res.end(body);
  } catch { res.writeHead(404); res.end('404'); }
}).listen(port, ADMIN ? '127.0.0.1' : undefined, () => console.log(`http://localhost:${port}` + (ADMIN ? '  ·  panel de precios: http://localhost:' + port + '/admin.html' : '')));
