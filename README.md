# ConfiguraPC

Configurador de PC: asistente por presupuesto y uso, modo «Mejorar mi PC», montaje manual con comprobación de compatibilidad, precios por tienda y configuraciones guardadas o compartidas por enlace.

Es una web estática: HTML, CSS y JS sin dependencias, con los datos en `data/components.json`.

## Seguridad
- CSP estricta (`script-src 'self'`, sin código en línea), HSTS, `X-Frame-Options: DENY`, `nosniff` y Permissions-Policy (ver `vercel.json`).
- Sin `innerHTML`: todo el texto se inserta con `textContent`.
- Los enlaces externos se validan contra una lista de dominios permitidos y usan `rel="noopener noreferrer nofollow"`.
- Los enlaces compartidos (`#b=…`) se validan contra los IDs del catálogo.
- El CSV escapa fórmulas para evitar inyecciones en Excel.
- Sin cookies, sin analítica y sin backend.

## Probarlo
- **Lo más rápido:** abre `index.html` con doble clic. Funciona sin instalar nada.
- **Como en Vercel, con las mismas cabeceras de seguridad:** `node scripts/serve.mjs` y entra en http://localhost:8080. Desde el móvil, en la misma WiFi, entra en `http://IP-de-tu-PC:8080`.
- **Pruebas automáticas:** `node tests/engine.test.mjs` (recomendaciones y compatibilidad).

## Actualizar precios
Los precios están en `data/components.json`. La web lee `data/components.js`, que se genera a partir de él.

```bash
node scripts/precio.mjs buscar 9070                     # ver ids y precios actuales
node scripts/precio.mjs gpu-rx9070xt pcc 1199.90        # cambiar un precio (pone la fecha de hoy)
node scripts/precio.mjs gpu-rx9070xt coolmod 1149 https://www.coolmod.com/...   # añadir una tienda
node scripts/precio.mjs gpu-rx9070xt neobyte --borrar   # quitar una tienda
```
Cada cambio valida los datos y regenera `data/components.js`. Si editas el JSON a mano, ejecuta después `node scripts/validate-data.mjs`.

Tiendas: `pcc`, `coolmod`, `neobyte`, `alternate`, `ibarata`, `caseking`, `pcbox`, `geek`. Los enlaces solo pueden ser de los dominios permitidos en `scripts/validate-data.mjs` y `assets/app.js` (`ALLOWED_HOSTS`). Si añades una tienda nueva, añade su dominio en los dos sitios.

## Desarrollo
```bash
node scripts/serve.mjs 8080        # servidor local con las mismas cabeceras que Vercel
node tests/engine.test.mjs         # pruebas del motor
node scripts/validate-data.mjs     # valida los precios y regenera data/components.js
```

## Despliegue en Vercel
1. Sube esta carpeta a un repositorio de GitHub.
2. En Vercel: **Add New → Project → Import** el repositorio. Framework: «Other». No hace falta comando de build.
3. Dominio propio: **Project → Settings → Domains**, añade tu dominio y crea en tu proveedor DNS el registro que te indique Vercel.
4. Cada `git push` a `main` vuelve a desplegar la web automáticamente.

## Actualización semanal de precios
Una tarea programada:
1. Revisa los precios de cada pieza de `data/components.json`: fichas de PcComponentes y el comparador de Geeknetic, que incluye Coolmod, NeoByte, Alternate y otras tiendas.
2. Actualiza `price`, `url` y `date`, y también `updated` y el aviso `market`.
3. Ejecuta `node scripts/validate-data.mjs` (que regenera `data/components.js`) y `node tests/engine.test.mjs`.
4. Si todo pasa, hace commit y push, y Vercel publica la nueva versión.

Reglas de datos: nunca se inventan precios. Si un precio no se puede verificar con fecha, se guarda con `"date": null`, y la web lo muestra como «sin confirmar».

## Diseño
Grafito y cobalto, tipografía Geist (licencia SIL OFL, en `assets/fonts`), iconos SVG propios, tema claro y oscuro. El elemento central es la barra del resumen, que reparte el presupuesto entre las piezas y se pone en rojo si te pasas.

## Cómo funciona el presupuesto
- La configuración recomendada **nunca supera** el presupuesto. Si no llega, la web te dice cuánto falta y te ofrece subirlo, quitar periféricos o bajar a 500 GB.
- «Si estiras el presupuesto» es solo una sugerencia que eliges tú, marcada en rojo.
- Al pulsar «Cambiar» en una pieza ves alternativas compatibles con la diferencia de precio y de rendimiento; si hace falta cambiar otra pieza (placa, RAM, fuente, caja) te lo dice antes.

## Mejorar mi PC
Tres formas de reconocer el equipo: detección del navegador (gráfica), informe de Windows (un comando de PowerShell que solo lee datos y copia un JSON) o escribir los modelos con autocompletado. La tabla de referencia está en `assets/hwdb.js`.

## Precios
Guía completa en [PRECIOS.md](PRECIOS.md): dónde buscar, reglas, importación masiva con CSV y rutina semanal.

## FPS por juego y tiers
- Los FPS son una **estimación** calibrada con la media de TechPowerUp para la RTX 5070 (114 FPS a 1440p, 66 a 4K, 25 juegos). El peso de cada juego (`GAMES` en `assets/engine.js`) es aproximado: ajústalo si tienes datos de una reseña.
- Cada pieza tiene puntos (1-100) y tier S/A/B/C/D/E (`componentPoints`). CPU y GPU salen de los índices de rendimiento; el resto, de capacidad, eficiencia y gama.

## Anuncios y afiliados
Por defecto la web no carga nada de terceros. En local se ven huecos marcados como «Publicidad» para que veas dónde irán.

```bash
node scripts/anuncios.mjs adsense ca-pub-XXXXXXXXXXXXXXXX 1234567890 2345678901 3456789012   # resultado, precios, pie
node scripts/anuncios.mjs amazon tuetiqueta-21     # Amazon Afiliados
node scripts/anuncios.mjs estado
node scripts/anuncios.mjs quitar
```

Al activar AdSense el script crea `ads.txt` y relaja la CSP de `vercel.json` lo justo para Google. En AdSense tienes que activar «Privacidad y mensajes» (aviso de cookies RGPD), obligatorio en España. Los enlaces de Amazon con etiqueta se marcan `rel="sponsored"`.

## Antes de publicar
```bash
node scripts/dominio.mjs https://www.tudominio.es   # URL absolutas para Google/redes, sitemap.xml y robots.txt
node tests/engine.test.mjs                           # motor
node scripts/serve.mjs 8080 & node tests/e2e.cjs     # navegador (Playwright)
npm i -D axe-core && node tests/a11y.cjs             # accesibilidad WCAG A/AA, claro y oscuro
```

## Extras
- **App instalable (PWA)**: `manifest.webmanifest` + `sw.js`. Funciona sin conexión con los últimos precios descargados (siempre intenta la red primero).
- **Historial de precios**: `scripts/precio.mjs` guarda el precio anterior cada vez que cambia (`hist`, últimos 26). La web muestra si sube o baja y el mínimo registrado.
- **Coste por FPS** en el resumen y **configuraciones rápidas** en la portada (`PRESETS` en `assets/app.js`).
- La caché de Vercel revalida HTML, JS y datos en cada visita: tras publicar nadie se queda con archivos viejos.

## Panel de precios (local)
```bash
node scripts/serve.mjs 8080 --admin     # abre http://localhost:8080/admin.html
```
Editar, añadir o quitar precios por tienda, ver pendientes e importar CSV desde el navegador. Solo escucha en tu equipo (127.0.0.1), exige cabecera propia y mismo origen, y no se publica (`.vercelignore`).

## Guías por presupuesto
`node scripts/paginas.mjs` genera `/pc/*.html` («El mejor PC gaming por 1.000 €»…) con los precios actuales. Se regeneran solas cada vez que guardas precios. `scripts/dominio.mjs` las añade al sitemap.

## Más funciones
- **Comparar opciones** (recomendada, más barata, si estiras y tu versión) con FPS medios, coste por FPS y puntuación.
- **Reutilizar piezas**: gráfica (con reconocimiento del modelo), SSD, fuente y caja cuestan 0 € y el presupuesto se reparte en lo demás. Si la fuente se queda corta, se propone otra.
- **Windows 11 Home y montaje en tienda** como extras opcionales.
- **Guía de montaje** adaptada a las piezas (zócalo, ranuras de RAM, M.2, disipador, conectores, BIOS), en la web y en el PDF.

## Portátiles
Pestaña «Portátiles»: diferencias con un sobremesa (qué se puede mejorar y qué no), buscador por uso, presupuesto, pantalla, RAM, SSD y Windows, y comparación «con el mismo dinero» contra un sobremesa con monitor, teclado y ratón. Los portátiles son piezas `cat: "laptop"` en `data/components.json` (se actualizan con el mismo panel y scripts). Los tiers de procesador (1-4) y gráfica (0-5) son orientativos.
