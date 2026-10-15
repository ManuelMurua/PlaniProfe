# Planificador de clases (1º básico a 4º medio, Chile)

App en React + Vite con una landing page de entrada y, detrás, un planificador para elegir uno o varios cursos (de 1º básico a 4º medio, con la opción de combinar 2 a 4 cursos en un aula multigrado), seleccionar varios objetivos de aprendizaje —basales y complementarios— por curso con sus indicadores de evaluación, y generar una clase con inicio, desarrollo, cierre y materiales sugeridos.

## Poner en marcha

```bash
npm install
cp .env.example .env    # pega tu clave de la API en el archivo .env
npm run dev
```

Queda en http://localhost:5173

### Abrir desde otro dispositivo en la misma red

1. Conecta el computador y el teléfono/tablet a la misma red Wi-Fi.
2. En Windows, ejecuta `ipconfig` y busca la dirección **IPv4** del adaptador Wi-Fi (por ejemplo, `192.168.1.25`).
3. En el computador ejecuta `npm run dev`; si Windows pregunta, permite el acceso solo en redes privadas.
4. En el otro dispositivo abre `http://192.168.1.25:5173`, reemplazando la IP por la de tu computador.

La API pasa por el computador que ejecuta Vite, así que su `.env` debe tener `ANTHROPIC_API_KEY`. Usa esto solo en una red de confianza: otros dispositivos de esa red podrían enviar solicitudes a la API y generar consumo. Los planes guardados quedan en el navegador de cada dispositivo y no se sincronizan.

Para probar la lógica de datos sin levantar la app: `npm run check`.

## Estructura

```
index.html                define window.__API_URL__ para usar el proxy
vite.config.js             proxy local de /api/messages hacia Anthropic
functions/api/messages.js  Pages Function que conserva la clave fuera del navegador
src/main.jsx                punto de entrada
src/App.jsx                  alterna entre la landing y el planificador
src/Landing.jsx               página de entrada antes de planificar
src/AdSlot.jsx                 bloque de anuncio (Google AdSense), configurable por .env
src/Planificador.jsx        la app de planificación: estado, prompts y render
src/curriculo.js            datos curriculares y funciones puras (sin React, testeables)
src/recursos.js             portales Mineduc verificados y página por curso (links curados de los materiales)
src/curriculo.selfcheck.mjs  self-check de curriculo.js (npm run check)
src/storage.js               reemplazo de window.storage con localStorage
```

## Cómo se obtienen los objetivos (OA) y sus indicadores

- Para 1º y 2º básico hay objetivos curados a mano en `OA_DATA` (src/curriculo.js), tomados de las Bases Curriculares.
- Para el resto de los cursos (3º básico a 4º medio) los objetivos se piden a la API de Claude al elegir asignatura y curso, y quedan en caché en memoria mientras no recargues la página. Si el servicio no responde, se muestran objetivos provisionales editables (`oaFallback`).
- Al marcar un objetivo (o usar "Elegir todos los basales") se piden además sus indicadores de evaluación (habilidad, contenido y actitud), que quedan cacheados por objetivo y se muestran bajo la tarjeta. Si el servicio no responde, se usan indicadores provisionales (`indicadoresFallback`).
- Puedes marcar qué indicadores usar como objetivo de la clase (uno o varios, por objetivo). Con esa elección la clase generada incluye un "objetivo de la clase" por curso (`objetivosClase`), calculado por la API a partir de los indicadores elegidos —o de los OA si no elegiste ninguno— y visible al principio del plan, en el texto exportado y en la clase generada sin conexión (`objetivoClaseDe` en `src/curriculo.js`).
- En cualquier curso puedes reclasificar un objetivo entre basal/complementario, o agregar uno propio si tu establecimiento usa otra redacción.

## Sobre la clave de la API

El componente arma la clase y pide los OA que faltan con llamadas a Anthropic. La clave se agrega en el servidor, nunca en el navegador; `.env` está en `.gitignore`.

Si no configuras la clave, la app sigue funcionando: muestra objetivos y arma la clase con la estructura de respaldo que está en `planRespaldo()` (src/curriculo.js).

Para desarrollo local, Vite reenvía `/api/messages` a Anthropic. En producción, `functions/api/messages.js` hace de intermediario y lee `ANTHROPIC_API_KEY` como secreto de Cloudflare Pages. Sin clave, se usan los respaldos de clase y OA; la planificación de unidad requiere API.

## Publicar como servicio web

La app está preparada para desplegarse en Cloudflare Pages:

1. Sube el proyecto a un repositorio Git y conéctalo desde **Workers & Pages → Create → Pages → Connect to Git**.
2. Configura el comando de compilación `npm run build` y la carpeta de salida `dist`.
3. En **Settings → Variables and Secrets**, agrega `ANTHROPIC_API_KEY` como secreto para producción (y para Preview si usarás versiones de prueba).
4. Despliega. Cloudflare publica el frontend y ejecuta `functions/api/messages.js` en `/api/messages`.

La función limita las respuestas a 6.000 tokens por solicitud. El alojamiento gratuito no incluye el costo de Anthropic.

Antes de compartirla públicamente, agrega inicio de sesión y cuotas por usuario o protege el despliegue. Sin esos controles, cualquier persona que encuentre el endpoint puede generar consumo de API. Para una prueba privada puedes usar la protección de acceso del proveedor de hosting.

## Sobre los materiales

Cada clase trae un set completo de materiales, sin campos vacíos. Por curso (en multigrado, uno por curso) vienen la **guía del estudiante** (ítems en 3 niveles, con solucionario), el **texto modelo** (ejemplo resuelto que modela el docente), el **instrumento de evaluación** (lista de cotejo o rúbrica con niveles, con los mismos criterios de la evaluación formativa), el **ticket de salida** (con respuestas esperadas y criterio de logro) y los **recursos Mineduc**. Además viene una **lista de materiales físicos** con cantidades calculadas a partir de "Estudiantes por curso" (acepta `25` o `1º básico: 5, 3º básico: 4`), con momento de uso y alternativa si falta, e incluye los recursos que declaraste. Ya no aparecen "Pizarra", "Cuadernos" o "Recursos propios" sueltos: son líneas de esa lista.

Cada material trae: título, propósito, momento, curso, cantidad, preparación previa paso a paso, cómo se usa en la sala, contenido listo para imprimir, solucionario, adecuación NEE, alternativa sin tecnología y referencias. Tiene botones para copiarlo o imprimirlo solo. Al imprimirlo, el solucionario sale en una página aparte, "Para el docente".

- **Con la API**: los materiales y los criterios de evaluación salen de una tercera llamada (`promptC` en `generar()`), una por curso, con `max_tokens` de 6000 para que el JSON no se trunque. Si esa llamada falla, el curso usa los materiales de respaldo y el resto de la clase se conserva. `normalizarMateriales()` (src/curriculo.js) completa los campos que falten, reemplaza por la versión de respaldo una guía, ticket o instrumento que venga sin solucionario, y agrega los tipos mínimos que falten.
- **Sin conexión**: `materialesRespaldo()` y `fichaBasica()` arman el mismo set a partir de los indicadores (elegidos, o de referencia) con plantillas por nivel. Nunca repiten el texto del OA como ítem.
- **Links**: cada referencia muestra una etiqueta. Los links directos propuestos por la IA dicen **"Sugerido por IA · verificar"**, y solo se aceptan si son `https://`. Cualquier otro se descarta y se reemplaza por una **"Búsqueda sugerida"** en YouTube o en curriculumnacional.cl, que el código arma con la asignatura, el curso y el OA. Todo material muestra además 1 o 2 portales **"Verificado Mineduc"** de `src/recursos.js`, entre ellos la página del curso en Currículum Nacional. La API no redacta esas URLs: solo entrega un `id` que el código resuelve. Como el contenido está completo, la clase funciona aunque un link sugerido no exista.
- Cada material conserva el campo opcional **"Agregar mi propio link"**. Las planificaciones guardadas con el formato antiguo (`tipo`, `descripcion`, `contenido`, `link`) se siguen abriendo y exportando.
- La lista de portales de `src/recursos.js` trae su fecha de verificación. Revísala cada semestre.

## Planificación de unidad

Selecciona los cursos y OA, indica de 2 a 12 clases y pulsa **Planificar unidad**. La IA propone una secuencia, actividades diferenciadas por curso, evidencias y evaluación final. La app valida los códigos OA propuestos y muestra cuáles quedaron sin asignar para que el docente revise la cobertura. Las unidades se pueden imprimir, descargar en Markdown y guardar por separado de las planificaciones de clase en `window.storage`. Requiere conexión con la API; no hay una secuencia de unidad de respaldo sin conexión.

## Monetización con anuncios (Google AdSense)

La app trae el enganche para mostrar anuncios de Google AdSense, pero necesitas tu propia cuenta: no se puede inventar un ID de editor ni de bloque de anuncio.

1. Crea una cuenta en [AdSense](https://adsense.google.com), agrega tu dominio y espera la aprobación (requiere sitio en línea con contenido real).
2. Copia tu ID de editor (`ca-pub-XXXXXXXXXXXXXXXX`) y crea un bloque de anuncio para la landing y otro para el planificador; cada uno te da un ID de bloque (`data-ad-slot`).
3. Pégalos en `.env`: `VITE_ADSENSE_CLIENT`, `VITE_ADSENSE_SLOT_LANDING`, `VITE_ADSENSE_SLOT_PLANIFICADOR`.
4. Vuelve a construir (`npm run build`). Sin esas variables, la app no carga ningún script de anuncios; en desarrollo (`npm run dev`) se ve un recuadro punteado marcando dónde aparecerá.

El componente (`src/AdSlot.jsx`) carga el script de AdSense solo si hay un `client` configurado. Los anuncios están marcados `noprint`, así que nunca aparecen en la planificación impresa o descargada. Antes de activarlos en producción revisa las políticas de contenido de AdSense y si corresponde agregar un aviso de cookies/consentimiento según dónde vivan tus usuarios.

## Dónde tocar cada cosa

| Qué quieres cambiar | Dónde |
| --- | --- |
| Objetivos curados de 1º y 2º básico | `OA_DATA` en `src/curriculo.js` |
| Cursos disponibles (1º básico a 4º medio) | `GRADOS` en `src/curriculo.js` |
| Asignaturas disponibles | `ASIGNATURAS` en `src/curriculo.js` |
| Duración y reparto de minutos | `TIEMPOS` en `src/curriculo.js` |
| Cómo se piden los OA de cursos sin datos curados | `pedirOA` en `src/Planificador.jsx` |
| Cómo se piden los indicadores de un objetivo | `pedirIndicadores` en `src/Planificador.jsx` |
| Cómo se calcula el objetivo de la clase | `objetivoClaseDe` en `src/curriculo.js` (respaldo) y la instrucción en `promptA` (con la API) |
| Materiales generados sin conexión | `materialesRespaldo` y `fichaBasica` en `src/curriculo.js` |
| Validación de links y completado de materiales | `normalizarMateriales` / `normalizarReferencias` en `src/curriculo.js` |
| Portales Mineduc verificados | `src/recursos.js` |
| Texto e imágenes de la landing | `src/Landing.jsx` |
| Cómo se arma la clase | `promptA`, `promptB` y `promptC` (materiales) dentro de `generar()` en `src/Planificador.jsx` |
| Cómo se genera y guarda una unidad | `generarUnidad()`, `guardarUnidad()` y `textoUnidad()` en `src/Planificador.jsx` |
| La clase que se genera sin conexión | `planRespaldo()` en `src/curriculo.js` |
| Formato de exportación | `planTexto()` en `src/curriculo.js` |
| Colores, tipografías, animaciones, impresión | la constante `CSS` en `src/Planificador.jsx` y `src/Landing.jsx` (variables `--tinta`, `--acento`, etc.) |
| Colores por curso en aula multigrado | `COLORES` / `COLORES_BG` en `src/Planificador.jsx` |
| Dónde aparecen los anuncios | `<AdSlot>` en `src/Landing.jsx` y `src/Planificador.jsx`; configuración en `src/AdSlot.jsx` |

## Ideas para seguir

- Cachear en disco (o en `window.storage`) los OA ya pedidos a la API, para no volver a pedirlos entre sesiones.
- Exportar a Word o PDF con formato de la escuela.
- Ramificar Ciencias Naturales en Biología/Física/Química para 3º y 4º medio en vez de una asignatura genérica.
