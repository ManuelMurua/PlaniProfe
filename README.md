# Planificador de clases (1º básico a 4º medio, Chile)

App en React + Vite con una landing page de entrada y, detrás, un planificador para elegir uno o varios cursos (de 1º básico a 4º medio, con la opción de combinar 2 a 4 cursos en un aula multigrado), seleccionar varios objetivos de aprendizaje —basales y complementarios— por curso con sus indicadores de evaluación, y generar una clase con inicio, desarrollo, cierre y materiales sugeridos.

## Poner en marcha

```bash
npm install
cp .env.example .env    # pega tu clave de la API en el archivo .env
npm run dev
```

Queda en http://localhost:5173

Para probar la lógica de datos sin levantar la app: `npm run check`.

## Estructura

```
index.html                define window.__API_URL__ para usar el proxy
vite.config.js             proxy de /v1 hacia api.anthropic.com
src/main.jsx                punto de entrada
src/App.jsx                  alterna entre la landing y el planificador
src/Landing.jsx               página de entrada antes de planificar
src/AdSlot.jsx                 bloque de anuncio (Google AdSense), configurable por .env
src/Planificador.jsx        la app de planificación: estado, prompts y render
src/curriculo.js            datos curriculares y funciones puras (sin React, testeables)
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

El componente arma la clase (y pide los OA de los cursos sin datos curados) con llamadas a la API de Anthropic. El navegador no puede llamar a esa API directamente, así que el servidor de Vite hace de intermediario: recibe `/v1/messages`, agrega la cabecera `x-api-key` desde `.env` y reenvía la petición. La clave nunca llega al navegador, y `.env` está en `.gitignore`.

Si no configuras la clave, la app sigue funcionando: muestra objetivos y arma la clase con la estructura de respaldo que está en `planRespaldo()` (src/curriculo.js).

Para publicar la app necesitas mover ese intermediario a un backend propio o a una función serverless. No pongas la clave en el código del navegador.

## Sobre los materiales

La app nunca inventa links. Para cada material generado, la API decide entre dos casos:

- Si es algo que se puede redactar directamente (una ficha de trabajo, una lista de preguntas, un texto breve, una pauta de evaluación), genera su **contenido completo** listo para copiar o imprimir (botón "Copiar" en cada material). Sin conexión, se arma una ficha básica con `fichaBasica()` (src/curriculo.js) a partir de los objetivos seleccionados.
- Si es un recurso externo real (un video, un sitio web, un cuento físico del aula, un software), deja el contenido vacío y muestra un campo para que el docente pegue el link real, que queda guardado con la planificación.

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
| Ficha de trabajo generada sin conexión | `fichaBasica` en `src/curriculo.js` |
| Texto e imágenes de la landing | `src/Landing.jsx` |
| Cómo se arma la clase | `promptA` y `promptB` dentro de `generar()` en `src/Planificador.jsx` |
| La clase que se genera sin conexión | `planRespaldo()` en `src/curriculo.js` |
| Formato de exportación | `planTexto()` en `src/curriculo.js` |
| Colores, tipografías, animaciones, impresión | la constante `CSS` en `src/Planificador.jsx` y `src/Landing.jsx` (variables `--tinta`, `--acento`, etc.) |
| Colores por curso en aula multigrado | `COLORES` / `COLORES_BG` en `src/Planificador.jsx` |
| Dónde aparecen los anuncios | `<AdSlot>` en `src/Landing.jsx` y `src/Planificador.jsx`; configuración en `src/AdSlot.jsx` |

## Ideas para seguir

- Cachear en disco (o en `window.storage`) los OA ya pedidos a la API, para no volver a pedirlos entre sesiones.
- Exportar a Word o PDF con formato de la escuela.
- Agrupar varias clases en una unidad y revisar la cobertura de objetivos basales del semestre.
- Ramificar Ciencias Naturales en Biología/Física/Química para 3º y 4º medio en vez de una asignatura genérica.
