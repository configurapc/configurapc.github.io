// Texto editorial de las guías de /pc/: para quién es, por qué estas piezas, qué cambiar y preguntas frecuentes.
// Parte del texto es fija por tipo de uso y parte se escribe con las piezas elegidas ese día, así cada guía es distinta.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const FOR_WHO = {
  gaming: (p) => p.budget <= 1000
    ? `Es para quien quiere jugar bien a ${p.res} sin gastar de más: juegos actuales con calidad media o alta y una fluidez cómoda. El presupuesto se va sobre todo en la tarjeta gráfica, que es la pieza que más decide los FPS; el resto se elige para que no la frene y para que el equipo sea fiable.`
    : p.budget <= 2000
      ? `Es para jugar a ${p.res} con calidad alta y tasas de refresco altas, que es donde un monitor de 144 Hz o más se nota. Con este dinero ya compensa una gráfica de gama media-alta y un procesador que no se quede corto en juegos que tiran mucho de CPU.`
      : `Es para jugar a ${p.res} con todo al máximo, o para quien quiere un equipo que aguante varios años sin cambiar piezas. A partir de aquí cada euro rinde menos: la diferencia la marca casi solo la gráfica, así que el resto se elige con criterio de calidad, no de gastar más.`,
  streaming: () => 'Es para jugar y emitir a la vez (Twitch, YouTube) desde el mismo PC. Emitir pide más núcleos y más memoria que solo jugar, y una gráfica con un buen codificador de vídeo por hardware para que la emisión no le quite FPS al juego.',
  office: () => 'Es para trabajar, estudiar y navegar: ofimática, videollamadas, clases online, varias pestañas y algo de edición ligera. No necesita tarjeta gráfica: los gráficos integrados del procesador sobran, y ese dinero se dedica a que el equipo vaya rápido de verdad (SSD y suficiente memoria).',
  dev: () => 'Es para programar: IDE, compilación, Docker y alguna máquina virtual. Aquí manda la memoria RAM y el número de núcleos, y un SSD rápido acorta compilaciones y arranques. La gráfica no hace falta salvo que también vayas a jugar o a trabajar con IA.',
  creative: () => 'Es para editar foto y vídeo (Lightroom, Premiere, DaVinci Resolve). Las líneas de tiempo con mucho material piden muchos núcleos, bastante RAM y almacenamiento amplio y rápido; la gráfica acelera efectos y exportaciones, sobre todo en DaVinci.',
  ai: () => 'Es para ejecutar modelos de IA en tu equipo (modelos de texto o de imagen). La pieza clave es la memoria de la tarjeta gráfica: cuanta más VRAM, mayores modelos caben sin recurrir a la RAM del sistema, que es mucho más lenta. Por eso se prioriza la VRAM por encima de la potencia pura.'
};

const CHANGE = {
  gaming: [
    'Si ya tienes monitor de 60 Hz y no piensas cambiarlo, puedes bajar un escalón de gráfica sin notarlo en la pantalla.',
    'Si juegas sobre todo a títulos competitivos (Valorant, CS2, Fortnite), el procesador gana importancia: busca FPS altos y estables más que calidad gráfica.',
    'Si te quedas corto de almacenamiento, añade un segundo SSD más adelante: casi todas las placas actuales tienen al menos dos ranuras M.2.'
  ],
  streaming: [
    'Si emites con una segunda capturadora o un segundo PC, esta configuración se puede aligerar en procesador.',
    'Si solo grabas y editas tus partidas, suma almacenamiento: los vídeos ocupan mucho.',
    'Un micrófono decente se nota más en la emisión que subir un escalón de gráfica.'
  ],
  office: [
    'Si vas a usar dos monitores, comprueba que la placa tenga las salidas de vídeo que necesitas (HDMI y DisplayPort).',
    'Si el equipo es para varios años, subir a 32 GB de RAM es la mejora que más se nota con muchas pestañas y programas abiertos.',
    'Si necesitas WiFi, elige una placa con WiFi integrado: sale más barato y da menos problemas que una tarjeta aparte.'
  ],
  dev: [
    'Si usas muchas máquinas virtuales o contenedores, sube la RAM antes que el procesador.',
    'Si trabajas con IA o CUDA, añade una gráfica NVIDIA con al menos 12 GB de VRAM.',
    'Para compilar proyectos grandes, un SSD PCIe 4.0 con buena velocidad sostenida se nota más que uno PCIe 5.0 caro.'
  ],
  creative: [
    'Si editas vídeo 4K, prioriza RAM (64 GB) y un segundo SSD para la caché y los archivos del proyecto.',
    'Si solo editas foto, puedes bajar la gráfica y subir el procesador.',
    'Un monitor con buena cobertura de color pesa más en el resultado final que un componente más rápido.'
  ],
  ai: [
    'Si solo vas a usar modelos pequeños, una gráfica de 12–16 GB de VRAM es suficiente y mucho más barata.',
    'Para modelos grandes, la RAM del sistema también importa: con 64 GB o más puedes cargar partes del modelo en memoria.',
    'Revisa que la fuente vaya sobrada: las gráficas de gama alta tienen picos de consumo por encima de su consumo medio.'
  ]
};

const FAQ = {
  gaming: [
    ['¿Merece la pena gastar más en el procesador?', 'Para jugar, solo hasta cierto punto. A resoluciones altas manda la gráfica; un procesador de gama media actual ya no limita en la mayoría de juegos. El configurador avisa si una pieza frena a la otra.'],
    ['¿Necesito 32 GB de RAM para jugar?', 'Con 16 GB se juega bien hoy. 32 GB dan margen para juegos muy exigentes, para tener el navegador o Discord abiertos y para los próximos años.'],
    ['¿Los FPS que salen son exactos?', 'No: son una estimación con un margen de ±20 %, sin DLSS ni FSR. Sirven para comparar configuraciones entre sí, no como promesa.']
  ],
  streaming: [
    ['¿Emito con el procesador o con la gráfica?', 'Con la gráfica (NVENC en NVIDIA, AMF en AMD, QSV en Intel) el juego apenas pierde FPS y la calidad es muy buena. Emitir con el procesador solo compensa con muchos núcleos sobrantes.'],
    ['¿Cuánta RAM hace falta?', '32 GB es lo razonable: el juego, OBS, el navegador y el chat a la vez superan con facilidad 16 GB.']
  ],
  office: [
    ['¿Hace falta tarjeta gráfica?', 'No. Los gráficos integrados de los procesadores actuales mueven sin problema ofimática, vídeo en 4K y videollamadas.'],
    ['¿Es mejor un portátil?', 'Si no necesitas moverlo, un sobremesa rinde más por el mismo dinero, se puede ampliar y dura más. En el configurador tienes una sección para comparar ambos.']
  ],
  dev: [
    ['¿Intel o AMD para programar?', 'Los dos sirven. Lo que más se nota es tener muchos núcleos para compilar y suficiente RAM; el configurador busca el mejor equilibrio para tu presupuesto.'],
    ['¿Linux funciona bien con estas piezas?', 'En general sí. Si vas a usar Linux, comprueba antes la compatibilidad de la tarjeta WiFi de la placa.']
  ],
  creative: [
    ['¿NVIDIA o AMD para editar vídeo?', 'Ambas funcionan. NVIDIA tiene mejor soporte en algunos efectos y codificadores; AMD suele dar más VRAM por el mismo precio.'],
    ['¿Cuánto almacenamiento necesito?', 'Para vídeo, como mínimo 2 TB y mejor en dos unidades: una para el sistema y programas, otra para los proyectos.']
  ],
  ai: [
    ['¿Por qué tanta importancia a la VRAM?', 'Un modelo de IA tiene que caber en la memoria de la gráfica para ir rápido. Si no cabe, se reparte con la RAM del sistema y la velocidad cae mucho.'],
    ['¿Sirve una gráfica AMD para IA local?', 'Cada vez más programas la admiten, pero NVIDIA sigue teniendo la compatibilidad más amplia (CUDA). Si dudas, NVIDIA da menos problemas.']
  ]
};

export function guideExtra(p, b, rec, E) {
  const parts = [];
  if (b.cpu) parts.push(`<li><b>Procesador:</b> ${esc(b.cpu.name)}. ${esc(b.cpu.why || '')}</li>`);
  if (b.gpu) parts.push(`<li><b>Tarjeta gráfica:</b> ${esc(b.gpu.name)}. ${esc(b.gpu.why || '')} ${b.cpu ? esc(E.gamingLevel(b.gpu, b.cpu).text ? `Da para ${E.gamingLevel(b.gpu, b.cpu).text}.` : '') : ''}</li>`);
  else if (b.cpu) parts.push('<li><b>Sin tarjeta gráfica:</b> para este uso basta con los gráficos integrados del procesador, y ese dinero va a otras piezas.</li>');
  if (b.ram) parts.push(`<li><b>Memoria:</b> ${esc(b.ram.name)}. ${esc(b.ram.why || '')}</li>`);
  if (b.psu) parts.push(`<li><b>Fuente:</b> ${esc(b.psu.name)}. Calculamos el consumo máximo del procesador y la gráfica y dejamos margen para picos y ampliaciones.</li>`);
  const use = p.use;
  return `
    <h2>Para quién es</h2>
    <p>${esc(FOR_WHO[use](p))}</p>
    <h2>Por qué estas piezas</h2>
    <p>El configurador prueba todas las combinaciones compatibles del catálogo con los precios del día y elige la que más rinde para este uso sin pasarse de ${esc(E.euro(p.budget))}. Comprueba socket, tipo de memoria, tamaño de la caja, longitud de la gráfica y potencia de la fuente.</p>
    <ul class="pg-links">${parts.join('')}</ul>
    <h2>Qué cambiar según tu caso</h2>
    <ul class="pg-links">${CHANGE[use].map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    <h2>Preguntas frecuentes</h2>
    ${FAQ[use].map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('\n    ')}`;
}
