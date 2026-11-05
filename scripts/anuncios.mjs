// Activa o desactiva anuncios de Google AdSense y el enlace de afiliado de Amazon.
//
//   node scripts/anuncios.mjs estado
//   node scripts/anuncios.mjs adsense ca-pub-1234567890123456 [bloqueResultado] [bloqueCatalogo] [bloquePie]
//   node scripts/anuncios.mjs amazon tuetiqueta-21
//   node scripts/anuncios.mjs quitar            → vuelve a la web sin anuncios ni afiliados
//
// Al activar AdSense también ajusta la política de seguridad (CSP) de vercel.json y crea ads.txt,
// porque sin eso el navegador bloquearía los anuncios.
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';

const cfgFile = new URL('../assets/config.js', import.meta.url);
const vercelFile = new URL('../vercel.json', import.meta.url);
const adsTxt = new URL('../ads.txt', import.meta.url);

const readCfg = () => JSON.parse(readFileSync(cfgFile, 'utf8').match(/window\.PC_CONFIG = (\{[\s\S]*\});/)[1]);
const writeCfg = (c) => writeFileSync(cfgFile,
  '// Configuración de anuncios y afiliados. No lo edites a mano: usa «node scripts/anuncios.mjs» (ver PRECIOS.md / README).\n' +
  '// Con todo vacío la web no carga nada de terceros y no usa cookies.\n' +
  'window.PC_CONFIG = ' + JSON.stringify(c, null, 2) + ';\n');

const CSP_STRICT = "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests";
// Dominios que necesita AdSense (incluido el aviso de cookies de Google, «Privacidad y mensajes»).
const G = 'https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.gstatic.com https://*.googleadservices.com https://fundingchoicesmessages.google.com https://*.adtrafficquality.google';
const CSP_ADS = `default-src 'none'; script-src 'self' ${G}; style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' ${G}; frame-src ${G}; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests`;

function setCsp(value) {
  const v = JSON.parse(readFileSync(vercelFile, 'utf8'));
  for (const h of v.headers) for (const x of h.headers) if (x.key === 'Content-Security-Policy') x.value = value;
  // Los anuncios cargan iframes y recursos de otros orígenes: la política COOP/CORP estricta los rompe.
  for (const h of v.headers) h.headers = h.headers.filter(x => !(value === CSP_ADS && (x.key === 'Cross-Origin-Resource-Policy')));
  if (value === CSP_STRICT) {
    const main = v.headers.find(h => h.source === '/(.*)');
    if (!main.headers.some(x => x.key === 'Cross-Origin-Resource-Policy')) main.headers.push({ key: 'Cross-Origin-Resource-Policy', value: 'same-origin' });
  }
  writeFileSync(vercelFile, JSON.stringify(v, null, 2) + '\n');
}

const [cmd, a, b, c, d] = process.argv.slice(2);
const cfg = readCfg();
if (cmd === 'adsense') {
  if (!/^ca-pub-\d{10,20}$/.test(a || '')) { console.error('El identificador debe ser como ca-pub-1234567890123456 (lo ves en AdSense, Cuenta, Información de la cuenta).'); process.exit(1); }
  for (const s of [b, c, d]) if (s && !/^\d{6,12}$/.test(s)) { console.error(`Bloque de anuncio no válido: ${s} (son solo números)`); process.exit(1); }
  cfg.adsenseClient = a;
  cfg.adSlots = { result: b || cfg.adSlots.result || '', catalog: c || cfg.adSlots.catalog || '', footer: d || cfg.adSlots.footer || '' };
  writeCfg(cfg); setCsp(CSP_ADS);
  writeFileSync(adsTxt, `google.com, ${a.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);
  console.log('AdSense activado. Creado ads.txt y ajustada la CSP de vercel.json.');
  console.log('Falta: en AdSense, activa «Privacidad y mensajes» → mensaje RGPD para Europa (obligatorio para mostrar anuncios en España).');
} else if (cmd === 'amazon') {
  if (!/^[a-z0-9-]{3,40}-21$/i.test(a || '')) { console.error('La etiqueta de Amazon Afiliados para España termina en -21 (ej.: configurapc-21).'); process.exit(1); }
  cfg.amazonTag = a; writeCfg(cfg);
  console.log(`Enlaces de Amazon con la etiqueta ${a}.`);
} else if (cmd === 'quitar') {
  writeCfg({ adsenseClient: '', adSlots: { result: '', catalog: '', footer: '' }, amazonTag: '' });
  setCsp(CSP_STRICT);
  if (existsSync(adsTxt)) unlinkSync(adsTxt);
  console.log('Anuncios y afiliados desactivados. CSP estricta restaurada.');
} else {
  console.log(`AdSense: ${cfg.adsenseClient || 'desactivado'}`);
  console.log(`Bloques: resultado=${cfg.adSlots.result || '-'} precios=${cfg.adSlots.catalog || '-'} pie=${cfg.adSlots.footer || '-'}`);
  console.log(`Amazon Afiliados: ${cfg.amazonTag || 'desactivado'}`);
}
