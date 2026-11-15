// Genera los artículos (/articulos/), «Sobre ConfiguraPC» y «Contacto».
// Los artículos con datos (gráficas, memoria) se rehacen con los precios del catálogo cada vez que se publica.
//   node scripts/articulos.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import '../assets/engine.js';
const E = globalThis.PCEngine;
const root = new URL('../', import.meta.url);
const raw = JSON.parse(readFileSync(new URL('data/components.json', root), 'utf8'));
const db = E.indexDb(raw);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); };
const FECHA = fmtDate(raw.updated);
const CONTACTO = 'rubenlopezdavalillo9@gmail.com';
const min = (it) => E.priceOf(it, 'any', db.stores);

function layout({ title, desc, body, depth = 1, current = 'articulos' }) {
  const up = depth ? '../' : '';
  const nav = [['Configurador', up + 'index.html', 'conf'], ['Guías', up + 'pc/index.html', 'guias'], ['Artículos', up + 'articulos/index.html', 'articulos']]
    .map(([t, h, k]) => `<a class="nav-btn" href="${h}"${k === current ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} | ConfiguraPC</title>
  <meta name="description" content="${esc(desc)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${up}assets/og.png">
  <link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${up}assets/styles.css">
</head>
<body>
  <header class="top"><div class="wrap top-in"><a class="brand" href="${up}index.html"><svg viewBox="0 0 28 28" aria-hidden="true"><rect x="2" y="2" width="24" height="24" rx="7" fill="currentColor"/><path d="M9 9h10v10H9z" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 12h4v4h-4z" fill="#fff"/></svg><span>ConfiguraPC</span></a>
  <nav class="nav" aria-label="Secciones">${nav}</nav></div></header>
  <main id="main" class="wrap pg">
${body}
  </main>
  <footer class="foot"><div class="wrap foot-in"><p><a href="${up}sobre.html">Sobre ConfiguraPC</a> · <a href="${up}contacto.html">Contacto</a> · <a href="${up}privacidad.html">Privacidad</a></p></div></footer>
</body>
</html>
`;
}
const P = (t) => `<p>${t}</p>`;
const cta = (txt = 'Configura tu PC con tu presupuesto') => `<p class="pg-cta"><a class="btn btn-primary" href="../index.html">${txt}</a></p>`;

// ---------- artículos con datos ----------
function articuloGraficas() {
  const best = new Map();
  for (const g of db.byCat.gpu) {
    const p = min(g); if (!(p > 0) || !g.perf?.gaming) continue;
    const chip = g.specs.chip || g.name; const k = /\d+ ?GB/i.test(chip) ? chip : chip + ' ' + g.specs.vram + ' GB';
    if (!best.has(k) || p < best.get(k).p) best.set(k, { k, g, p });
  }
  const rows = [...best.values()].map(x => ({ ...x, idx: x.g.perf.gaming, eur: x.p / x.g.perf.gaming })).sort((a, b) => a.eur - b.eur);
  const top = rows.slice(0, 12);
  const byPerf = [...rows].sort((a, b) => b.idx - a.idx).slice(0, 8);
  const tr = (r) => `<tr><td><b>${esc(r.k)}</b><br><span class="hint">${esc(r.g.name)}</span></td><td class="pg-r num">${r.idx}</td><td class="pg-r num"><b>${esc(E.euro(r.p))}</b></td><td class="pg-r num">${(r.eur).toFixed(2).replace('.', ',')} €</td></tr>`;
  const head = '<thead><tr><th>Gráfica</th><th class="pg-r">Rendimiento</th><th class="pg-r">Desde</th><th class="pg-r">€ por punto</th></tr></thead>';
  const body = `
    <p class="hint"><a href="index.html">Artículos</a></p>
    <h1>Las tarjetas gráficas con mejor relación rendimiento/precio</h1>
    <p class="lead">Calculado con los precios del ${esc(FECHA)} en tiendas españolas. Se actualiza cada vez que actualizamos precios.</p>
    ${P('Para elegir gráfica no basta con mirar el precio ni la potencia por separado: lo útil es saber cuánto rendimiento te da cada euro. Aquí comparamos el precio más bajo de cada modelo de chip con su índice de rendimiento en juegos, el mismo que usa el configurador para estimar FPS. Cuanto menos cuesta cada punto de rendimiento, mejor compra es.')}
    <h2>Las que más rinden por cada euro</h2>
    <div class="pg-table"><table class="cmp">${head}<tbody>${top.map(tr).join('')}</tbody></table></div>
    ${P('El índice de rendimiento es relativo (una RTX 5070 está en torno a 100) y se basa en la media de pruebas publicadas por medios especializados, no en pruebas propias. Úsalo para comparar entre sí, con un margen de error de alrededor de un 10 %.')}
    <h2>Las más potentes ahora mismo</h2>
    <div class="pg-table"><table class="cmp">${head}<tbody>${byPerf.map(tr).join('')}</tbody></table></div>
    <h2>Cómo leer esta tabla</h2>
    ${P('Las gráficas más baratas casi siempre salen mejor en «euros por punto», pero eso no significa que sean la mejor opción para ti. Si juegas a 1440p o 4K, o con un monitor de alta tasa de refresco, necesitas un mínimo de potencia: una gráfica muy eficiente en precio pero que no llega a 60 FPS en tus juegos no te sirve.')}
    ${P('Fíjate también en la memoria (VRAM). Para jugar a 1080p hoy, 8 GB todavía funcionan, pero los juegos nuevos con texturas altas ya superan esa cifra; 12 o 16 GB dan bastante más margen. Para IA local la VRAM es todavía más importante que la potencia.')}
    ${P('Y no olvides el resto del equipo: una gráfica potente pide una fuente con potencia suficiente y una caja donde quepa por longitud. El configurador comprueba ambas cosas automáticamente.')}
    ${cta('Ver qué gráfica encaja en tu presupuesto')}`;
  return { slug: 'mejores-graficas-calidad-precio', title: 'Las tarjetas gráficas con mejor relación rendimiento/precio', desc: `Ranking de tarjetas gráficas por euros por punto de rendimiento con precios del ${FECHA}.`, body };
}

function articuloRam() {
  const kits = (type, size) => db.byCat.ram.filter(r => r.specs.type === type && r.specs.size === size).map(r => ({ r, p: min(r) })).filter(x => x.p > 0).sort((a, b) => a.p - b.p);
  const line = (type, size) => { const k = kits(type, size); return k.length ? `<li><b>${size} GB ${type}</b> (${k[0].r.specs.sticks} módulos): desde <b>${esc(E.euro(k[0].p))}</b> <span class="hint">${esc(k[0].r.name)}</span></li>` : ''; };
  const prices = ['DDR4', 'DDR5'].flatMap(t => [16, 32, 64].map(s => line(t, s))).filter(Boolean).join('');
  const body = `
    <p class="hint"><a href="index.html">Artículos</a></p>
    <h1>¿Cuánta memoria RAM necesito?</h1>
    <p class="lead">Cuánta RAM poner según lo que vayas a hacer, DDR4 o DDR5, y qué significan la velocidad y la latencia. Con los precios del ${esc(FECHA)}.</p>
    <h2>La respuesta corta</h2>
    <ul class="pg-links">
      <li><b>16 GB</b>: suficiente para ofimática, navegar, estudiar y jugar a la mayoría de juegos actuales.</li>
      <li><b>32 GB</b>: lo recomendable para jugar a títulos exigentes con el navegador o Discord abiertos, hacer streaming, programar o editar foto.</li>
      <li><b>64 GB o más</b>: edición de vídeo 4K, máquinas virtuales, muchos contenedores o modelos de IA que no caben enteros en la gráfica.</li>
    </ul>
    <h2>Siempre en dos módulos</h2>
    ${P('Los procesadores de escritorio trabajan con la memoria en doble canal: con dos módulos iguales el ancho de banda se duplica respecto a uno solo, y en juegos y con gráficos integrados se nota. Por eso es mejor 2 × 8 GB que 1 × 16 GB, y 2 × 16 GB que 1 × 32 GB. El configurador solo recomienda kits de dos módulos.')}
    <h2>DDR4 o DDR5: no se elige, lo decide la plataforma</h2>
    ${P('Cada placa base admite un único tipo de memoria. Las placas AM5 (Ryzen 7000, 8000 y 9000) y LGA1851 (Intel Core Ultra 200) solo usan DDR5. Las AM4 (Ryzen hasta la serie 5000) usan DDR4. En LGA1700 (Intel de 12.ª a 14.ª generación) hay placas de los dos tipos, y hay que comprar la memoria que corresponda a la placa.')}
    ${P('La DDR4 sigue siendo una buena opción para equipos económicos en AM4 o LGA1700. Si montas un equipo nuevo pensando en ampliarlo durante años, una plataforma DDR5 te da más recorrido.')}
    <h2>Velocidad y latencia</h2>
    ${P('La velocidad se mide en MT/s (las tiendas suelen escribir MHz) y la latencia en ciclos (CL). Más velocidad y menos latencia es mejor, pero la diferencia en juegos es pequeña frente a la que marcan la gráfica o el procesador. Como referencia razonable: DDR4 a 3200–3600 con CL16–18, y DDR5 a 5600–6000 con CL30–36.')}
    ${P('Importante: la memoria arranca a una velocidad básica. Para que funcione a la velocidad que pone en la caja hay que activar el perfil XMP (Intel) o EXPO (AMD) en la BIOS. Es un solo ajuste y no tiene riesgo.')}
    <h2>Precios de hoy</h2>
    <ul class="pg-links">${prices}</ul>
    ${P('Los precios de la memoria han cambiado mucho en los últimos meses. Si tu presupuesto está justo, 16 GB ahora y otros 16 GB más adelante es una opción, siempre que la placa tenga cuatro ranuras y compres el mismo modelo.')}
    ${cta()}`;
  return { slug: 'cuanta-ram-necesito', title: '¿Cuánta memoria RAM necesito?', desc: 'Cuánta RAM poner según el uso, DDR4 o DDR5, doble canal, velocidad y latencia, con precios actuales.', body };
}

// ---------- artículos de guía ----------
const FUENTE = { slug: 'como-elegir-fuente-de-alimentacion', title: 'Cómo elegir fuente de alimentación sin quedarte corto (ni pasarte)', desc: 'Qué potencia necesita tu PC, qué significan las certificaciones 80 Plus, modular o no y qué conectores necesitan las gráficas actuales.', body: `
    <p class="hint"><a href="index.html">Artículos</a></p>
    <h1>Cómo elegir fuente de alimentación sin quedarte corto (ni pasarte)</h1>
    <p class="lead">La fuente es la pieza en la que más gente intenta ahorrar y la que más problemas da cuando falla. Esto es lo que hay que mirar.</p>
    <h2>1. La potencia: suma, deja margen y no exageres</h2>
    ${P('Lo que más consume en un PC son la tarjeta gráfica y el procesador. Para calcular la fuente no hay que usar el TDP que aparece en la caja del procesador, sino su consumo máximo real: un Intel de gama alta puede pasar de 250 W en carga, aunque su TDP diga 125 W. A eso se suma la gráfica, unos 50–80 W para el resto (placa, memoria, discos, ventiladores) y un margen.')}
    ${P('Las gráficas actuales tienen picos de consumo muy breves por encima de su consumo medio. Por eso conviene dejar entre un 20 y un 30 % de margen. Pasarse mucho tampoco sirve: una fuente de 1.200 W en un equipo que consume 350 W no rinde mejor y cuesta más. El configurador hace este cálculo con cada combinación y elige la fuente con el margen adecuado.')}
    <h2>2. La certificación 80 Plus</h2>
    ${P('Indica la eficiencia: qué parte de la electricidad que toma de la pared llega a los componentes y cuánta se pierde en calor. Va de Bronze a Silver, Gold, Platinum y Titanium. Una Gold es el punto ideal para la mayoría de equipos; una Bronze de buena marca es correcta en equipos económicos. Una fuente sin ninguna certificación es una mala señal sobre la calidad de sus componentes: en ConfiguraPC no las recomendamos.')}
    <h2>3. Modular o no</h2>
    ${P('En una fuente modular los cables se conectan solo si se necesitan, lo que facilita el montaje y deja la caja más ordenada. No mejora el rendimiento. Es una comodidad que vale la pena si no encarece mucho la fuente.')}
    <h2>4. Los conectores de la gráfica</h2>
    ${P('Muchas gráficas nuevas, sobre todo de NVIDIA, usan el conector 12V-2x6 (la versión revisada del 12VHPWR). Las fuentes ATX 3.0 y 3.1 suelen traerlo de serie; con una fuente anterior hace falta un adaptador. Si vas a comprar una gráfica de gama alta, una fuente ATX 3.1 te ahorra problemas. Conecta el cable hasta el fondo y sin doblarlo justo al salir del conector.')}
    <h2>5. Garantía y marca</h2>
    ${P('Una buena fuente suele tener entre 5 y 10 años de garantía. Si una fuente es muy barata para la potencia que anuncia, desconfía: la potencia de la etiqueta no siempre es la que entrega de forma estable.')}
    <h2>Resumen</h2>
    <ul class="pg-links"><li>Suma el consumo máximo real de procesador y gráfica, añade el resto y deja un 20–30 % de margen.</li><li>Mínimo 80 Plus Bronze; Gold si el presupuesto lo permite.</li><li>ATX 3.1 si la gráfica usa el conector 12V-2x6.</li><li>Modular es comodidad, no rendimiento.</li></ul>
    ${cta('Calcular la fuente para mi configuración')}` };

const COMPAT = { slug: 'compatibilidad-procesador-placa-base', title: 'Compatibilidad entre procesador, placa base, memoria y caja', desc: 'Qué socket usa cada procesador, qué memoria admite cada placa, actualizaciones de BIOS y cómo comprobar que la gráfica y el disipador caben.', body: `
    <p class="hint"><a href="index.html">Artículos</a></p>
    <h1>Compatibilidad entre procesador, placa base, memoria y caja</h1>
    <p class="lead">Las cinco comprobaciones que hay que hacer antes de comprar piezas sueltas, explicadas sin tecnicismos.</p>
    <h2>1. Procesador y placa: el socket</h2>
    ${P('El socket es el zócalo donde va el procesador. Procesador y placa tienen que usar el mismo:')}
    <ul class="pg-links">
      <li><b>AMD AM4</b>: Ryzen hasta la serie 5000. Plataforma veterana y económica, con memoria DDR4.</li>
      <li><b>AMD AM5</b>: Ryzen 7000, 8000 y 9000. Solo DDR5. AMD ha anunciado que la mantendrá durante varias generaciones.</li>
      <li><b>Intel LGA1700</b>: Core de 12.ª, 13.ª y 14.ª generación. Placas DDR4 o DDR5 según el modelo.</li>
      <li><b>Intel LGA1851</b>: Core Ultra 200 (por ejemplo, el Core Ultra 5 245K). Solo DDR5.</li>
    </ul>
    <h2>2. La BIOS</h2>
    ${P('A veces una placa admite un procesador más nuevo que ella, pero solo después de actualizar la BIOS. Le pasa, por ejemplo, a algunas placas AM4 de la serie 400 con los Ryzen 5000. Muchas placas actuales permiten actualizar la BIOS con un USB sin procesador instalado; si no, la tienda puede hacerlo. Consúltalo en la lista de procesadores compatibles del fabricante de la placa.')}
    <h2>3. Memoria</h2>
    ${P('La placa admite DDR4 o DDR5, nunca las dos, y los módulos no son intercambiables: tienen la muesca en otro sitio. Compra siempre el tipo que indica la placa. Más detalles en <a href="cuanta-ram-necesito.html">¿Cuánta memoria RAM necesito?</a>')}
    <h2>4. Tamaño: placa, gráfica y disipador dentro de la caja</h2>
    ${P('Las placas tienen formatos (ATX, Micro-ATX, Mini-ITX) y cada caja indica cuáles admite. Además, la caja tiene una longitud máxima de gráfica y una altura máxima de disipador. Las gráficas de gama alta superan a menudo los 30 cm y los disipadores grandes rondan los 16 cm de alto. Si usas refrigeración líquida, comprueba que la caja admite el tamaño del radiador (240, 280 o 360 mm).')}
    <h2>5. Potencia</h2>
    ${P('La fuente tiene que poder con el consumo máximo del procesador y la gráfica, con margen. Lo explicamos en <a href="como-elegir-fuente-de-alimentacion.html">cómo elegir fuente de alimentación</a>.')}
    <h2>Lo hace el configurador por ti</h2>
    ${P('ConfiguraPC comprueba automáticamente socket, tipo de memoria, formato de placa, longitud de la gráfica, altura del disipador, radiador y potencia de la fuente. Si cambias una pieza y deja de ser compatible, te avisa y te propone alternativas que sí lo son.')}
    ${cta()}` };

const MONTAJE = { slug: 'como-montar-un-pc-paso-a-paso', title: 'Cómo montar un PC paso a paso', desc: 'Guía de montaje de un PC de sobremesa: orden recomendado, errores típicos y qué hacer en el primer arranque.', body: `
    <p class="hint"><a href="index.html">Artículos</a></p>
    <h1>Cómo montar un PC paso a paso</h1>
    <p class="lead">Montar un PC es más sencillo de lo que parece: las piezas solo encajan de una forma. Este es el orden que da menos problemas.</p>
    <h2>Antes de empezar</h2>
    <ul class="pg-links"><li>Destornillador de estrella, una mesa amplia y buena luz.</li><li>Toca una parte metálica de la caja antes de manipular piezas para descargar la electricidad estática.</li><li>Ten a mano el manual de la placa: indica en qué ranuras va la memoria y dónde se conectan los cables del frontal.</li></ul>
    <h2>1. Procesador en la placa</h2>
    ${P('Con la placa sobre su caja de cartón, levanta la palanca del socket, coloca el procesador haciendo coincidir el triángulo de la esquina y baja la palanca. No hace falta fuerza. No toques los contactos.')}
    <h2>2. Memoria</h2>
    ${P('Con dos módulos, ponlos en las ranuras que indica el manual (normalmente la 2.ª y la 4.ª contando desde el procesador). Abre las pestañas y presiona hasta oír el clic en los dos extremos.')}
    <h2>3. SSD M.2</h2>
    ${P('Retira el disipador de la ranura M.2 si lo tiene, inserta el SSD en ángulo, bájalo y fíjalo con el tornillo o el cierre. Quita el plástico protector de la almohadilla térmica antes de volver a poner el disipador.')}
    <h2>4. Disipador</h2>
    ${P('La mayoría de disipadores traen la pasta térmica ya aplicada. Si no, pon una gota del tamaño de un guisante en el centro del procesador. Monta el anclaje para tu socket según su manual y conecta el ventilador al conector CPU_FAN de la placa.')}
    <h2>5. Placa en la caja</h2>
    ${P('Comprueba que los separadores (standoffs) de la caja coinciden con los agujeros de la placa. Coloca la placa encajando los puertos traseros en su hueco y atorníllala sin apretar demasiado.')}
    <h2>6. Fuente y cables</h2>
    ${P('Coloca la fuente con el ventilador hacia abajo si la caja tiene rejilla inferior. Conecta el cable de 24 pines de la placa, el de 8 pines del procesador (arriba a la izquierda de la placa) y los del frontal de la caja: botón de encendido, USB y audio, siguiendo el manual.')}
    <h2>7. Tarjeta gráfica</h2>
    ${P('Quita las tapas traseras de la caja que correspondan, inserta la gráfica en la ranura PCIe superior hasta que haga clic, atorníllala y conecta sus cables de alimentación de la fuente. Las gráficas largas y pesadas agradecen un soporte para que no se doblen.')}
    <h2>8. Primer arranque</h2>
    ${P('Conecta el monitor a la gráfica, no a la placa (salvo que no tengas gráfica). Al encender, entra en la BIOS (suele ser con Supr o F2) y comprueba que detecta el procesador, la memoria y el SSD. Activa el perfil XMP o EXPO de la memoria. Después instala Windows desde un USB y los controladores de la placa y la gráfica desde la web del fabricante.')}
    <h2>Si no arranca</h2>
    <ul class="pg-links"><li>Revisa los cables de 24 y 8 pines de la placa: son los olvidos más habituales.</li><li>Saca y vuelve a poner la memoria; prueba con un solo módulo.</li><li>Fíjate en los LED de diagnóstico de la placa: indican si el fallo está en CPU, RAM, VGA o BOOT.</li><li>La primera vez con DDR5 el arranque puede tardar uno o dos minutos mientras la placa entrena la memoria: es normal.</li></ul>
    ${P('Cuando creas una configuración en ConfiguraPC, la guía de montaje se adapta a tus piezas: tipo de disipador, número de módulos y si hay gráfica o no.')}
    ${cta('Crear mi configuración con guía de montaje')}` };

// ---------- páginas fijas ----------
const SOBRE = layout({ depth: 0, current: '', title: 'Sobre ConfiguraPC', desc: 'Qué es ConfiguraPC, de dónde salen los precios, cómo se eligen las piezas y cómo se financia.', body: `
    <h1>Sobre ConfiguraPC</h1>
    <p class="lead">ConfiguraPC ayuda a montar un PC de sobremesa con un presupuesto cerrado: eliges para qué lo quieres y cuánto quieres gastar, y te propone piezas compatibles con precios de tiendas españolas.</p>
    <h2>Quién está detrás</h2>
    ${P('Es un proyecto independiente de Rubén López-Davalillo. No pertenece a ninguna tienda ni a ningún fabricante.')}
    <h2>De dónde salen los precios</h2>
    ${P(`Se recogen del comparador de precios de Geeknetic, que reúne ofertas de PcComponentes, Coolmod, NeoByte, Alternate, Caseking, PCBox, MediaMarkt y otras tiendas, y de las fichas de las propias tiendas. Los precios actuales son del ${esc(FECHA)}. Cambian a diario: confírmalos siempre en la tienda antes de comprar.`)}
    <h2>Cómo se eligen las piezas</h2>
    ${P('Un motor propio prueba las combinaciones compatibles del catálogo (socket, memoria, tamaño de la caja, longitud de la gráfica, altura del disipador y potencia de la fuente) y elige la que más rinde para el uso indicado sin pasarse del presupuesto. Los FPS y el rendimiento son estimaciones basadas en análisis publicados por medios especializados, no en pruebas propias, y se indican con su margen de error.')}
    <h2>Cómo se financia</h2>
    ${P('La web es gratuita. Puede mostrar anuncios y algunos enlaces a tiendas pueden ser de afiliado: si compras, la tienda paga una pequeña comisión sin que a ti te cueste más. Eso no cambia qué piezas se recomiendan: la recomendación depende solo de compatibilidad, rendimiento y precio.')}
    <h2>Errores y sugerencias</h2>
    ${P(`Si ves un precio mal, una incompatibilidad o una pieza que falta, escríbenos desde la página de <a href="contacto.html">contacto</a>.`)}
    <p class="pg-cta"><a class="btn btn-primary" href="index.html">Ir al configurador</a></p>` });

const CONTACTO_HTML = layout({ depth: 0, current: '', title: 'Contacto', desc: 'Cómo contactar con ConfiguraPC para avisar de errores, sugerir piezas o cualquier consulta.', body: `
    <h1>Contacto</h1>
    <p class="lead">Escríbenos a <a href="mailto:${CONTACTO}">${CONTACTO}</a>.</p>
    <h2>Te contestamos antes si nos cuentas</h2>
    <ul class="pg-links">
      <li><b>Un precio o un enlace mal:</b> la pieza, la tienda y qué precio ves.</li>
      <li><b>Una incompatibilidad:</b> el enlace de la configuración (botón «Compartir») y qué falla.</li>
      <li><b>Una pieza que falta:</b> el modelo exacto y, si puedes, el enlace a la tienda.</li>
    </ul>
    ${P('No damos soporte técnico de equipos ni montamos PC, pero leemos todos los mensajes y los usamos para mejorar la web.')}
    ${P('Para cualquier cuestión sobre tus datos, consulta la <a href="privacidad.html">política de privacidad</a>.')}` });

// ---------- escribir ----------
const ARTS = [articuloGraficas(), articuloRam(), FUENTE, COMPAT, MONTAJE];
const dir = new URL('articulos/', root);
mkdirSync(dir, { recursive: true });
for (const a of ARTS) writeFileSync(new URL(a.slug + '.html', dir), layout({ title: a.title, desc: a.desc, body: a.body }));
writeFileSync(new URL('index.html', dir), layout({ title: 'Artículos sobre montar un PC', desc: 'Guías y comparativas para elegir piezas de PC: gráficas, memoria, fuente, compatibilidad y montaje.', body: `
    <h1>Artículos</h1>
    <p class="lead">Lo que conviene saber antes de comprar piezas, explicado sin rodeos. Los artículos con precios se actualizan con los datos del catálogo.</p>
    <ul class="pg-links pg-index">
${ARTS.map(a => `      <li><a href="${a.slug}.html"><b>${esc(a.title)}</b></a> <span class="hint">${esc(a.desc)}</span></li>`).join('\n')}
    </ul>
    <h2>Guías por presupuesto</h2>
    <p><a href="../pc/index.html">Los mejores PC por presupuesto</a>, con las piezas y los precios del día.</p>` }));
writeFileSync(new URL('sobre.html', root), SOBRE);
writeFileSync(new URL('contacto.html', root), CONTACTO_HTML);
console.log(`${ARTS.length} artículos, sobre.html y contacto.html generados.`);
