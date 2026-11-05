# Cómo conseguir y meter precios y piezas

Hay tres formas, de más a menos automática. Lo ideal es combinarlas: **feeds** para las tiendas que lo permiten y **capturas** para el resto.

Todo se hace desde el panel local:

```bash
node scripts/serve.mjs 8080 --admin      # abre http://localhost:8080/admin.html
```

Cada cambio se valida, se guarda con la fecha de hoy, guarda el precio anterior en el historial y regenera los datos y las guías por presupuesto.

---

## 1. Feed de la tienda (lo más rápido y fiable)

Un *feed* es un archivo con **todo el catálogo** de una tienda: nombre, precio, enlace, EAN, referencia, stock y categoría. Lo dan las redes de afiliados a sus afiliados, se actualiza a diario y es legal y estable (no se rompe si la tienda cambia su web).

**Cómo conseguirlo:**

1. Date de alta como afiliado en **Awin** (gratis). Necesitas la web publicada.
2. Solicita unirte a los programas de **PcComponentes ES** y **Coolmod ES**, que están en Awin. Lee sus condiciones: por ejemplo, PcComponentes no permite usar su marca en tu dominio.
3. Cuando te acepten, en Awin entra en *Toolbox → Create-a-Feed*. Elige la tienda y las categorías de PC, y descárgalo en CSV. También te da un enlace que se regenera solo.
4. En el panel, pestaña **1. Catálogo de una tienda**: sube el CSV, pulsa **Analizar sin guardar** y luego **Aplicar los reconocidos**.

O por terminal, incluso con el enlace directo del feed:

```bash
node scripts/feed.mjs feed-pccomponentes.csv               # informe
node scripts/feed.mjs feed-pccomponentes.csv --aplicar     # guarda
node scripts/feed.mjs "https://productdata.awin.com/…" --aplicar
```

**Qué hace con cada producto:**

| Caso | Qué pasa |
| --- | --- |
| Mismo enlace, EAN o referencia que una pieza tuya | Se actualiza el precio **automáticamente** |
| Solo coincide el nombre | Va a `importar/revisar.csv`: lo revisas y lo aplicas |
| No lo tienes | Va a `importar/nuevas.csv` para que elijas cuáles añadir |
| Sin stock, sin precio o que no es de PC | Se ignora |

La primera vez casi todo saldrá «por nombre». Al aplicarlo se guardan el EAN y la referencia, así que **a partir de la segunda vez se reconoce solo**.

Los feeds de Awin traen dos enlaces: el directo y el de afiliado. Guardamos el directo. Para cobrar comisión desde la web, añade tu identificador de Awin cuando tengas el programa aprobado.

## 2. Capturar mientras navegas (cualquier tienda)

Para tiendas sin feed (Amazon, LDLC, Aussar, Wipoid…) o piezas sueltas.

1. En el panel, pestaña **2. Capturar desde la web**, arrastra el botón **Capturar precio** a la barra de marcadores.
2. Abre la ficha del producto en la tienda y pulsa el marcador. Copia nombre, precio, enlace, EAN y referencia, que la mayoría de tiendas publican en la página para Google (datos estructurados *schema.org*).
3. Repite con todos los productos y pega todo de golpe en el panel. Pulsa **Reconocer**, revisa la tabla y pulsa **Aplicar marcados**.

Con práctica son unos 10 segundos por producto. Si una tienda no publica el precio en sus datos, el marcador te avisa: mete ese precio a mano.

## 3. Pegar un CSV

Pestaña **3. Pegar CSV** o `node scripts/precio.mjs importar precios.csv`:

```
id;tienda;precio;url;ean
gpu-rtx5060;pcc;389,90
ram-ddr4-16;amazon;49,99;https://www.amazon.es/dp/...;0840006630452
```

La URL solo hace falta la primera vez que añades una tienda a una pieza.

---

## Añadir piezas nuevas

Pestaña **Piezas nuevas** o `node scripts/nuevas.mjs archivo.csv --guardar`:

```
categoria;nombre;tienda;precio;url;ean;mpn;especificaciones;por_que
gpu;Gigabyte RTX 5060 Ti EAGLE MAX OC 16GB;pcc;553,99;https://…;4719331356644;;length=260;Buena opción de 16 GB
mobo;MSI PRO B650M-P;pcc;109,90;https://…;;;socket=AM5|chipset=B650|mem=DDR5|form=mATX|wifi=no|m2=2;
```

- **Procesadores y gráficas se completan solos** a partir del nombre (rendimiento, consumo, VRAM, zócalo) con la tabla de referencia. En procesadores añade siempre `cooler=si/no` y `cores=`.
- Para el resto, `node scripts/nuevas.mjs plantilla` te dice qué especificaciones pide cada categoría. Sácalas de la **ficha del fabricante**, no de la tienda.
- Pulsa **Comprobar** antes de **Añadir**: avisa si falta algo o si la pieza ya existe.

## Reglas para no meter datos malos

1. **Mismo modelo exacto** (fabricante, versión, capacidad). El reconocimiento por nombre exige que coincidan los números de modelo y sufijos como Ti, XT, Super o X3D; aun así, revísalo.
2. **Precio final con IVA**, sin envío ni cupones.
3. **En stock** y **vendido por la tienda**, no por vendedores externos del marketplace.
4. Si el precio cambia más de un 25 %, el sistema te avisa: compruébalo.

## Lo que NO recomiendo

- **Programas que descargan las webs de las tiendas (scraping).** Suele ir contra sus condiciones, las tiendas grandes lo bloquean y se rompe cada vez que cambian la web. Los feeds dan lo mismo de forma legal y estable.
- **Copiar precios de comparadores** para publicarlos como propios: usa sus enlaces solo para descubrir tiendas.

## Rutina semanal (10-15 minutos con feeds)

1. Descarga los feeds de PcComponentes y Coolmod (o usa el enlace directo) y aplícalos.
2. Revisa `revisar.csv` la primera vez; luego casi no habrá nada.
3. Captura 5-10 precios de Amazon u otras tiendas para las piezas que solo tienen una tienda (pestaña «Editar una a una», filtro de pendientes).
4. `node tests/engine.test.mjs` y publica.
