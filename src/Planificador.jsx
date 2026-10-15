import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  GRADOS,
  OA_DATA,
  nombreGrado,
  ASIGNATURAS,
  listaOA,
  oaFallback,
  indicadoresFallback,
  limpiarJSON,
  TIEMPOS,
  rielVacio,
  ajustarNumCursos,
  necesitaFetch,
  planRespaldo,
  planTexto,
  objetivoClaseDe,
  normalizarMateriales,
  materialTexto,
  esHttps,
  ETIQUETA_LINK,
} from "./curriculo.js";
import { PORTALES, PAGINA_ASIGNATURA } from "./recursos.js";
import AdSlot from "./AdSlot.jsx";

const ADSENSE_SLOT_PLANIFICADOR = import.meta.env.VITE_ADSENSE_SLOT_PLANIFICADOR || "";

// En desarrollo lo reenvía Vite; en producción, la función del servidor.
const API_URL = (typeof window !== "undefined" && window.__API_URL__) || "/api/messages";

async function llamarClaude(prompt, maxTokens = 1500) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error("Servicio no disponible (" + res.status + ")");
  const data = await res.json();
  return (data.content || [])
    .filter((x) => x.type === "text")
    .map((x) => x.text)
    .join("\n");
}

// Colores por curso definidos en estilos.css (claro, oscuro e impresión).
const colorDe = (i) => `var(--curso${i % 4})`;
const bgDe = (i) => `var(--curso${i % 4}-bg)`;

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */

export default function Planificador({ onVolver }) {
  const [ctx, setCtx] = useState({
    escuela: "",
    docente: "",
    fecha: "",
    estudiantes: "",
    recursos: "",
    nee: "",
    foco: "",
    previos: "",
  });
  const [ctxAbierto, setCtxAbierto] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [extras, setExtras] = useState([]);
  const [rieles, setRieles] = useState([rielVacio(GRADOS[0].id)]);
  const [oaCache, setOaCache] = useState({});
  const [oaFuentes, setOaFuentes] = useState({});
  const [oaCargando, setOaCargando] = useState({});
  const [indCache, setIndCache] = useState({});
  const [indCargando, setIndCargando] = useState({});
  const [indSel, setIndSel] = useState({}); // { [oaId]: [índices de indicadores elegidos] }
  const [bloques, setBloques] = useState(2);
  const [plan, setPlan] = useState(null);
  const [planGuardadoId, setPlanGuardadoId] = useState(null);
  const [editandoPlan, setEditandoPlan] = useState(false);
  const [unidad, setUnidad] = useState(null);
  const [unidadGuardadaId, setUnidadGuardadaId] = useState(null);
  const [unidadesGuardadas, setUnidadesGuardadas] = useState([]);
  const [sesionesUnidad, setSesionesUnidad] = useState(4);
  const [generandoUnidad, setGenerandoUnidad] = useState(false);
  const [vistaResultado, setVistaResultado] = useState("clase");
  const [generando, setGenerando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [guardadas, setGuardadas] = useState([]);
  const [nuevoOA, setNuevoOA] = useState({ abierto: -1, texto: "", basal: true });

  /* ---------- persistencia ---------- */
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("planificador:config");
        if (r && r.value) {
          const v = JSON.parse(r.value);
          if (v.ctx) setCtx((c) => ({ ...c, ...v.ctx }));
          if (v.overrides) setOverrides(v.overrides);
          if (v.extras) setExtras(v.extras);
          if (Array.isArray(v.rieles) && v.rieles.length > 0 && v.rieles.length <= 4 && v.rieles.every((x) => x && GRADOS.some((g) => g.id === x.grado) && ASIGNATURAS.some((a) => a.id === x.asig) && Array.isArray(x.oaIds))) setRieles(v.rieles);
          if (v.bloques === 1 || v.bloques === 2) setBloques(v.bloques);
        }
      } catch (e) {
        /* primera vez: no hay configuración guardada */
      }
      try {
        const r = await window.storage.get("planificador:planes");
        if (r && r.value) setGuardadas(JSON.parse(r.value));
      } catch (e) {
        /* sin planificaciones guardadas */
      }
      try {
        const r = await window.storage.get("planificador:unidades");
        if (r && r.value) setUnidadesGuardadas(JSON.parse(r.value));
      } catch (e) {
        /* sin unidades guardadas */
      }
    })();
  }, []);

  const guardarConfig = useCallback(async (next) => {
    try {
      await window.storage.set("planificador:config", JSON.stringify(next), false);
    } catch (e) {
      /* la sesión continúa aunque no se pueda guardar */
    }
  }, []);

  // Al imprimir la planificación se abren los <details> (solucionario, adecuación, alternativa) y después se cierran de nuevo.
  useEffect(() => {
    let abiertos = [];
    const abrir = () => {
      abiertos = [...document.querySelectorAll(".plan details:not([open])")];
      abiertos.forEach((d) => (d.open = true));
    };
    const cerrar = () => {
      abiertos.forEach((d) => (d.open = false));
      abiertos = [];
    };
    window.addEventListener("beforeprint", abrir);
    window.addEventListener("afterprint", cerrar);
    return () => {
      window.removeEventListener("beforeprint", abrir);
      window.removeEventListener("afterprint", cerrar);
    };
  }, []);

  useEffect(() => {
    const id = setTimeout(() => guardarConfig({ ctx, overrides, extras, rieles, bloques }), 600);
    return () => clearTimeout(id);
  }, [ctx, overrides, extras, rieles, bloques, guardarConfig]);

  /* ---------- OA por riel ---------- */
  const oasPorRiel = useMemo(
    () => rieles.map((r) => listaOA(r.asig, r.grado, extras, overrides, oaCache)),
    [rieles, extras, overrides, oaCache]
  );

  const pedirOA = useCallback(async (asig, grado) => {
    const key = `${asig}-${grado}`;
    setOaCargando((c) => ({ ...c, [key]: true }));
    const asigNombre = ASIGNATURAS.find((a) => a.id === asig).nombre;
    const gradoNom = nombreGrado(grado);
    const prompt = `Eres experto en las Bases Curriculares del Mineduc (Chile).

Asignatura: ${asigNombre}. Curso: ${gradoNom}.

Entrega los Objetivos de Aprendizaje (OA) de esta asignatura y curso según las Bases Curriculares vigentes. Para cada uno indica si es basal (imprescindible, prioritario) o complementario, y el eje temático al que pertenece.

Responde SOLO con un arreglo JSON, sin texto previo ni posterior, sin markdown:
[{"n":1,"texto":"objetivo tal como aparece en el currículum","basal":1,"eje":"nombre del eje"}]

Entrega entre 8 y 16 objetivos.`;
    try {
      const txt = await llamarClaude(prompt);
      const arr = JSON.parse(limpiarJSON(txt));
      if (!Array.isArray(arr) || !arr.length) throw new Error("respuesta vacía");
      setOaCache((c) => ({ ...c, [key]: arr.map((o) => [o.n, o.texto, o.basal ? 1 : 0, o.eje || "General"]) }));
      setOaFuentes((c) => ({ ...c, [key]: "ia" }));
    } catch (e) {
      setOaCache((c) => ({ ...c, [key]: oaFallback(asigNombre, gradoNom) }));
      setOaFuentes((c) => ({ ...c, [key]: "provisional" }));
      setAviso(`No se pudieron cargar los objetivos en línea para ${asigNombre} · ${gradoNom}. Se muestran objetivos provisionales editables.`);
    } finally {
      setOaCargando((c) => ({ ...c, [key]: false }));
    }
  }, []);

  useEffect(() => {
    rieles.forEach((r) => {
      const key = `${r.asig}-${r.grado}`;
      if (necesitaFetch(r.asig, r.grado, oaCache) && !oaCargando[key]) pedirOA(r.asig, r.grado);
    });
    // Se dispara solo cuando cambia la combinación asignatura+grado de algún riel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rieles.map((r) => `${r.asig}-${r.grado}`).join(",")]);

  // Recopila los indicadores de evaluación (habilidad, contenido, actitud) de un OA la primera vez que se selecciona.
  const pedirIndicadores = useCallback(async (oa, asigId, gradoId) => {
    if (!oa || indCache[oa.id] || indCargando[oa.id]) return;
    setIndCargando((c) => ({ ...c, [oa.id]: true }));
    const asigNombre = ASIGNATURAS.find((a) => a.id === asigId).nombre;
    const gradoNom = nombreGrado(gradoId);
    const prompt = `Eres experto en currículum nacional chileno (Bases Curriculares, Mineduc) y en evaluación educativa.

Asignatura: ${asigNombre}. Curso: ${gradoNom}.
Objetivo de Aprendizaje: "${oa.texto}"

Redacta 4 indicadores de evaluación observables para este OA, apropiados para ${gradoNom}. Para cada uno identifica por separado la HABILIDAD (verbo cognitivo o procedimental), el CONTENIDO (conocimiento o concepto) y la ACTITUD asociada del currículum.

Responde SOLO con un arreglo JSON, sin texto previo ni posterior, sin markdown:
[{"i":"indicador redactado en 3ª persona, máximo 20 palabras","h":"habilidad, 1 a 3 palabras","c":"contenido, máximo 8 palabras","a":"actitud, máximo 14 palabras"}]`;
    try {
      const txt = await llamarClaude(prompt);
      const arr = JSON.parse(limpiarJSON(txt));
      if (!Array.isArray(arr) || !arr.length) throw new Error("respuesta vacía");
      setIndCache((c) => ({ ...c, [oa.id]: arr }));
    } catch (e) {
      setIndCache((c) => ({ ...c, [oa.id]: indicadoresFallback(oa, asigId) }));
    } finally {
      setIndCargando((c) => ({ ...c, [oa.id]: false }));
    }
  }, [indCache, indCargando]);

  const filtrados = (idx) => {
    const f = rieles[idx].filtro;
    return oasPorRiel[idx].filter((o) => (f === "todos" ? true : f === "basal" ? o.basal : !o.basal));
  };

  const fuenteOA = (oa, r) => {
    const url = PAGINA_ASIGNATURA[r.asig]?.porCurso(r.grado);
    if (oa.propio) return { tipo: "propio", etiqueta: "Agregado por el docente", url };
    if (OA_DATA[r.asig]?.[r.grado]) return { tipo: "oficial", etiqueta: "Currículum Nacional · base curada", url };
    if (oaFuentes[`${r.asig}-${r.grado}`] === "provisional") return { tipo: "provisional", etiqueta: "Provisional · reemplazar por el OA oficial", url };
    return { tipo: "ia", etiqueta: "Sugerido por IA · verificar", url };
  };

  /* ---------- edición de rieles ---------- */
  const cambiarNumCursos = (n) => setRieles((r) => ajustarNumCursos(r, n));
  const cambiarGrado = (idx, grado) => setRieles((r) => r.map((x, i) => (i === idx ? { ...x, grado, oaIds: [] } : x)));
  const cambiarAsig = (idx, asig) => setRieles((r) => r.map((x, i) => (i === idx ? { ...x, asig, oaIds: [] } : x)));
  const cambiarFiltro = (idx, filtro) => setRieles((r) => r.map((x, i) => (i === idx ? { ...x, filtro } : x)));
  const alternarOA = (idx, oa) => {
    const seleccionando = !rieles[idx].oaIds.includes(oa.id);
    setRieles((r) =>
      r.map((x, i) => (i === idx ? { ...x, oaIds: x.oaIds.includes(oa.id) ? x.oaIds.filter((y) => y !== oa.id) : [...x.oaIds, oa.id] } : x))
    );
    if (seleccionando) pedirIndicadores(oa, rieles[idx].asig, rieles[idx].grado);
  };
  const alternarBasal = (id, valorActual) => setOverrides((o) => ({ ...o, [id]: !valorActual }));
  const alternarIndicador = (oaId, k) =>
    setIndSel((s) => {
      const actual = s[oaId] || [];
      return { ...s, [oaId]: actual.includes(k) ? actual.filter((x) => x !== k) : [...actual, k] };
    });
  const seleccionarBasales = (idx) => {
    const basales = oasPorRiel[idx].filter((o) => o.basal);
    setRieles((r) => r.map((x, i) => (i === idx ? { ...x, oaIds: Array.from(new Set([...x.oaIds, ...basales.map((o) => o.id)])) } : x)));
    basales.forEach((o) => pedirIndicadores(o, rieles[idx].asig, rieles[idx].grado));
  };
  const limpiarSeleccion = (idx) => setRieles((r) => r.map((x, i) => (i === idx ? { ...x, oaIds: [] } : x)));

  const agregarOA = (idx) => {
    const texto = nuevoOA.texto.trim();
    if (texto.length < 15) return;
    const r = rieles[idx];
    const id = `PROP-${r.grado}-${Date.now()}`;
    setExtras((e) => [...e, { id, asig: r.asig, grado: r.grado, texto, basal: nuevoOA.basal, cod: "OA propio", eje: "Propio" }]);
    setNuevoOA({ abierto: -1, texto: "", basal: true });
  };

  /* ---------- generación de la clase ---------- */
  const listo = rieles.length > 0 && rieles.every((r) => r.asig && r.oaIds.length > 0);
  const multigrado = rieles.length > 1;

  const cursos = useMemo(
    () =>
      rieles.map((r, i) => ({
        grado: r.grado,
        gradoNombre: nombreGrado(r.grado),
        asig: ASIGNATURAS.find((a) => a.id === r.asig),
        oas: r.oaIds
          .map((id) => oasPorRiel[i].find((o) => o.id === id))
          .filter(Boolean)
          .map((o) => ({
            ...o,
            ...fuenteOA(o, r),
            indicadores: indCache[o.id] || null,
            indElegidos: (indCache[o.id] || []).filter((_, k) => (indSel[o.id] || []).includes(k)),
          })),
      })),
    [rieles, oasPorRiel, indCache, indSel, oaFuentes]
  );

  const generar = async (ajuste = "") => {
    if (!listo) return;
    setEditandoPlan(false);
    setPlanGuardadoId(null);
    setVistaResultado("clase");
    setGenerando(true);
    setAviso("");
    const t = TIEMPOS[bloques];
    const contexto = `${multigrado ? `Aula multigrado con ${cursos.length} cursos combinados en la misma sala` : "Clase de un solo curso"} en Chile.
Estudiantes: ${ctx.estudiantes || "curso completo"}.
Recursos disponibles: ${ctx.recursos || "material concreto básico, pizarra, cuadernos"}.
Diversificación requerida: ${ctx.nee || "estudiantes con distintos ritmos de aprendizaje"}.
Foco de la clase: ${ctx.foco || "aprendizaje equilibrado de los objetivos seleccionados"}.
Conocimientos previos: ${ctx.previos || "considéralos heterogéneos y explóralos al inicio"}.
${ajuste ? `Ajuste solicitado para esta nueva versión: ${ajuste}.` : ""}`;

    const listaOAsTexto = (c) =>
      c.oas
        .map((o) => {
          const elegidos = (o.indElegidos || []).map((x) => x.i);
          const referencia = !elegidos.length ? (o.indicadores || []).slice(0, 2).map((x) => x.i) : [];
          let extra = "";
          if (elegidos.length) extra = `\n  Indicadores elegidos por el docente (usar como base del objetivo de la clase): ${elegidos.join(" / ")}`;
          else if (referencia.length) extra = `\n  Indicadores de referencia: ${referencia.join(" / ")}`;
          return `- ${o.cod} (${o.basal ? "basal" : "complementario"}): ${o.texto}${extra}`;
        })
        .join("\n");

    const encabezado = `Eres una docente chilena experta ${multigrado ? "en aula multigrado y " : ""}en planificación según las Bases Curriculares (Mineduc) y el Diseño Universal para el Aprendizaje (Decreto 83).

CONTEXTO: ${contexto}
DURACIÓN: ${bloques} bloque(s) de 45 minutos = ${t.total} minutos.

${cursos.map((c) => `${c.gradoNombre.toUpperCase()} — ${c.asig.nombre}\n${listaOAsTexto(c)}`).join("\n\n")}`;

    const promptA = `${encabezado}

Diseña la clase con inicio, desarrollo y cierre. En cada momento separa dos cosas: la secuencia de lo que hacen los ESTUDIANTES (acciones concretas y observables) y las ORIENTACIONES AL DOCENTE (qué debe hacer y cómo hacerlo: instrucciones a dar, materiales a repartir, qué modelar, qué preguntar, cómo manejar al grupo). ${
      multigrado
        ? "Los momentos comunes son para todos los cursos juntos; 'porCurso' trae el trabajo diferenciado simultáneo, un elemento por curso, en el mismo orden en que aparecen arriba."
        : "Es una clase para un solo curso: usa los campos comunes para lo que se hace con todo el curso y deja 'porCurso' con un único elemento con la secuencia principal de la clase."
    } Integra los distintos objetivos seleccionados de cada curso, no solo uno. Sé concreto: nombra la actividad y el material. Cada punto en máximo 25 palabras. Para multigrado, reparte el desarrollo en tramos consecutivos: los minutos empiezan en 0 y terminan exactamente en ${t.desarrollo}; en cada tramo indica a qué curso atiende el docente y qué hacen los demás.

Además, redacta el objetivo de la clase de cada curso: una frase breve dirigida a los estudiantes (por ejemplo "Hoy aprenderemos a..."), que priorice los indicadores elegidos por el docente cuando existan, o resuma los OA del curso si no hay ninguno elegido. Un objetivo por curso, en el mismo orden en que aparecen arriba. Incluye una alineación por cada OA: nombra una actividad concreta donde se trabaja y la evidencia observable que permitirá evaluar su logro. No omitas OA.

Responde SOLO JSON, sin markdown:
{"titulo":"título de la clase, máx 10 palabras","hilo":"situación o tema que articula la clase, máx 30 palabras","objetivosClase":[${cursos
      .map(() => '"objetivo de la clase de este curso, en lenguaje para estudiantes, máx 25 palabras"')
      .join(",")}],"alineacion":[${cursos.flatMap((c, i) => c.oas.map((o) => `{"curso":${i},"oa":"${o.cod}","actividad":"actividad concreta","evidencia":"evidencia observable"}`)).join(",")}],"inicio":{"min":${t.inicio},"estudiantes":["3 a 4 acciones que hacen los estudiantes"],"docente":["3 a 4 orientaciones de qué hacer y cómo"],"pregunta":"pregunta motivadora"},"desarrollo":{"min":${t.desarrollo},"comunEstudiantes":[${multigrado ? '"acciones de todos los cursos juntos"' : '"vacío, no aplica a un solo curso"'}],"comunDocente":[${
      multigrado ? '"orientaciones para el momento común, incluida la rotación de atención del docente"' : '"vacío, no aplica a un solo curso"'
    }],"rotaciones":[${multigrado ? cursos.map((c, i) => `{"desde":${Math.round(t.desarrollo * i / cursos.length)},"hasta":${Math.round(t.desarrollo * (i + 1) / cursos.length)},"curso":"${c.gradoNombre}","docente":"atención directa a ${c.gradoNombre}","otros":"trabajo autónomo breve con instrucciones visibles"}`).join(",") : ""}],"porCurso":[${cursos
      .map(() => '{"estudiantes":["3 a 4 acciones concretas del estudiante"],"docente":["3 a 4 orientaciones de qué hacer y cómo, incluido el manejo de este grupo"]}')
      .join(",")}]},"cierre":{"min":${t.cierre},"estudiantes":["2 a 3 acciones de los estudiantes"],"docente":["2 a 3 orientaciones de qué hacer y cómo"],"metacognicion":["3 preguntas para los estudiantes"]}}`;

    const promptB = `${encabezado}

Entrega los apoyos de la clase: diversificación DUA${
      multigrado ? ", tutoría entre pares propia del multigrado" : ""
    } y adecuaciones. No inventes enlaces ni URLs. Cada punto en máximo 20 palabras.

Responde SOLO JSON, sin markdown:
{"dua":{"representacion":["3 medidas"],"accion":["3 medidas"],"motivacion":["3 medidas"]},"tutoria":"${
      multigrado ? "cómo se organiza el apoyo entre los cursos, máx 35 palabras" : "deja este campo como string vacío porque la clase es de un solo curso"
    }","adecuaciones":["3 adecuaciones para estudiantes que requieren más apoyo"]}`;

    // Materiales y evaluación: una llamada por curso para que el JSON no se trunque en multigrado.
    const promptC = (c) => `${encabezado}

Prepara los MATERIALES de la clase para ${c.gradoNombre} (${c.asig.nombre}), completos y listos para imprimir, sin nada que el docente deba completar o interpretar. Objetivo de la clase de este curso: ${objetivoClaseDe(c)}

Entrega como mínimo estos 6 materiales, en este orden:
1. guia_estudiante: encabezado Nombre/Curso/Fecha, instrucciones y 4 a 8 ítems numerados en 3 niveles (básico, intermedio, desafío), cada uno ligado a un indicador. Solucionario ítem por ítem.
2. texto_modelo: el texto, el problema resuelto o el ejemplo que el docente modela, completo.
3. instrumento_evaluacion: lista de cotejo (Logrado / Parcial / No logrado) o rúbrica de 3 a 4 niveles (Logrado / Medianamente logrado / Por lograr / No observado) con un descriptor por nivel; sus criterios son exactamente los de "criterios". Solucionario: qué evidencia observar en cada criterio.
4. ticket_salida: 2 o 3 preguntas; solucionario con la respuesta esperada de cada una y el criterio de logro (por ejemplo "2 de 3 correctas = logrado").
5. materiales_fisicos: en "contenido", una línea por ítem con cantidad total, momento de uso, para qué se usa y alternativa si falta.${
      ctx.recursos ? ` Incluye con un uso concreto cada recurso declarado por el docente: ${ctx.recursos}.` : ""
    } "Pizarra", "Cuadernos" o "Recursos propios" nunca van como materiales sueltos: son ítems de esta lista.
6. recurso_mineduc: qué buscar en los portales Mineduc para esta clase.
Puedes agregar un video, sitio, software o cuento si aporta; su "contenido" es el guion completo que lo reemplaza (el texto del cuento o su resumen, la explicación del video, los pasos de la actividad).

Reglas: ningún campo vacío. "adecuacion" trae ítems o pasos concretos para estudiantes con NEE, no un consejo. "alternativa_sin_tecnologia" es contenido equivalente completo si no hay proyector ni internet. En "referencias", para un recurso externo propone una url directa https; para portales Mineduc NO escribas la url: usa {"id":"..."} con uno de estos ids: ${PORTALES.map((p) => `${p.id} = ${p.nombre}`).join("; ")}.

Responde SOLO JSON, sin markdown:
{"instrumento":"nombre del instrumento, máx 12 palabras","criterios":["3 a 4 criterios observables, derivados de los indicadores de este curso"],"materiales":[{"tipo":"guia_estudiante | texto_modelo | instrumento_evaluacion | ticket_salida | materiales_fisicos | recurso_mineduc | video | sitio | software | cuento","titulo":"título breve","proposito":"para qué sirve, ligado al objetivo, máx 20 palabras","momento":"inicio | desarrollo | cierre","cantidad":{"unidad":"por estudiante | por grupo | por pareja | docente","numero":1},"preparacion":["pasos del docente antes de la clase","tiempo estimado: N min"],"instrucciones_uso":["cómo se entrega y se usa en la sala, paso a paso"],"contenido":"texto completo listo para imprimir, con saltos de línea","solucionario":"respuestas esperadas ítem por ítem, o 'No aplica: motivo'","adecuacion":"versión reducida o con apoyo","alternativa_sin_tecnologia":"contenido equivalente","referencias":[{"fuente":"YouTube","titulo":"...","url":"https://..."},{"id":"textos"}]}]}`;

    const leer = (r) => {
      if (r.status !== "fulfilled") return null;
      try {
        return JSON.parse(limpiarJSON(r.value));
      } catch (e) {
        return null;
      }
    };
  const [ra, rb, ...rc] = await Promise.allSettled([
      llamarClaude(promptA, 3000),
      llamarClaude(promptB, 1500),
      ...cursos.map((c) => llamarClaude(promptC(c), 6000)),
    ]);
    const nucleo = leer(ra);
    const alineacion = Array.isArray(nucleo?.alineacion) ? nucleo.alineacion.filter((x) => x && Number.isInteger(x.curso) && cursos[x.curso]?.oas.some((o) => o.cod === x.oa) && typeof x.actividad === "string" && typeof x.evidencia === "string") : [];
    if (nucleo) {
      nucleo.alineacion = alineacion;
      if (nucleo.desarrollo) nucleo.desarrollo.rotaciones = Array.isArray(nucleo.desarrollo.rotaciones) ? nucleo.desarrollo.rotaciones.filter((x) => x && Number.isFinite(x.desde) && Number.isFinite(x.hasta) && x.desde >= 0 && x.hasta <= t.desarrollo && x.hasta > x.desde && typeof x.curso === "string" && typeof x.docente === "string" && typeof x.otros === "string") : [];
    }
    const apoyos = leer(rb);
    const mats = rc.map(leer);

    const base = planRespaldo(cursos, bloques, ctx, multigrado);
    // Si falla la llamada de materiales de un curso, ese curso usa los de respaldo (normalizarMateriales completa lo que falte).
    const materialesFinal = normalizarMateriales(
      mats.flatMap((r, i) => (r && Array.isArray(r.materiales) ? r.materiales.map((m) => ({ ...m, curso: i })) : [])),
      cursos,
      ctx
    );
    // Criterios de la API solo si son un arreglo y el instrumento de ese curso no se reemplazó por el de respaldo
    // (si no, la tarjeta de evaluación y la lista de cotejo mostrarían criterios distintos).
    const instDe = (i) => materialesFinal.find((m) => m.tipo === "instrumento_evaluacion" && m.curso === i)?.contenido || "";
    const evaluacion = {
      instrumento: mats.find((r) => r && r.instrumento)?.instrumento || base.evaluacion.instrumento,
      porCurso: cursos.map((_, i) => {
        const api = Array.isArray(mats[i]?.criterios) ? mats[i].criterios.map(String).filter((x) => x.trim()) : [];
        const respaldo = base.evaluacion.porCurso[i].criterios;
        return { criterios: api.length && !respaldo.every((x) => instDe(i).includes(x)) ? api : respaldo };
      }),
    };
    const final = {
      ...base,
      // Los campos que la API devuelve en null no pisan los de respaldo.
      ...Object.fromEntries(Object.entries({ ...(nucleo || {}), ...(apoyos || {}) }).filter(([, v]) => v != null)),
      evaluacion,
      materiales: materialesFinal,
      meta: {
        bloques,
        minutos: t.total,
        fecha: ctx.fecha,
        escuela: ctx.escuela,
        docente: ctx.docente,
        multigrado,
        cursos: cursos.map((c) => ({
          gradoNombre: c.gradoNombre,
          asig: c.asig.nombre,
          oas: c.oas.map((o) => ({ cod: o.cod, basal: o.basal, texto: o.texto, indicadores: o.indicadores, fuente: o.etiqueta, url: o.url, fuenteTipo: o.tipo })),
        })),
      },
    };
    if (!nucleo || !apoyos) {
      setAviso("La clase se armó con la estructura base porque el servicio no respondió completo. Puedes volver a crearla.");
    } else if (mats.some((r) => !r)) {
      const sin = cursos.filter((_, i) => !mats[i]).map((c) => c.gradoNombre);
      setAviso(`Los materiales de ${sin.join(", ")} se armaron con la versión base porque el servicio no respondió completo. El resto de la clase sí se generó.`);
    }
    setPlan(final);
    setGenerando(false);
    setTimeout(() => {
      const el = document.getElementById("plan-clase");
      if (el) el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }, 80);
  };

  const generarUnidad = async () => {
    if (!listo || generandoUnidad) return;
    setGenerandoUnidad(true);
    setAviso("");
    const objetivos = cursos.flatMap((c, curso) => c.oas.map((o) => ({ curso, codigo: o.cod, basal: o.basal, texto: o.texto })));
    const prompt = `Eres especialista en planificación docente chilena. Diseña una unidad coherente de ${sesionesUnidad} clases de ${TIEMPOS[bloques].total} minutos cada una para estos cursos y objetivos seleccionados.\n\nCONTEXTO: ${multigrado ? "aula multigrado" : "curso único"}; foco: ${ctx.foco || "aprendizaje equilibrado"}; conocimientos previos: ${ctx.previos || "heterogéneos"}; recursos: ${ctx.recursos || "pizarra, cuadernos y material concreto básico"}; diversificación: ${ctx.nee || "distintos ritmos de aprendizaje"}.\n\nOA DISPONIBLES (respeta exactamente curso y código):\n${objetivos.map((o) => `[curso ${o.curso}, ${o.codigo}, ${o.basal ? "basal" : "complementario"}] ${o.texto}`).join("\n")}\n\nOrdena las clases desde activación/diagnóstico hasta práctica, aplicación y cierre. Distribuye todos los OA seleccionados a lo largo de la unidad, priorizando los basales. Puedes retomar un OA en más de una clase. Cada clase debe tener objetivo breve, referencias OA exactas, actividades concretas diferenciadas por curso, evidencia observable e instrumento formativo. Incluye una evaluación final coherente con los OA. En multigrado, cada sesión debe proponer una actividad por curso y un momento común cuando aporte. No inventes ni cambies códigos OA.\n\nResponde solo JSON, sin markdown:\n{"titulo":"título de la unidad","proposito":"propósito de aprendizaje","pregunta_esencial":"pregunta que articula la unidad","clases":[{"numero":1,"objetivo":"objetivo de esta clase","oas":[{"curso":0,"codigo":"OA 1"}],"actividades":[{"curso":0,"estudiantes":"qué harán los estudiantes","docente":"qué hará el docente"}],"evidencia":"evidencia observable","evaluacion":"estrategia formativa breve"}],"evaluacion_final":"producto o desempeño final y criterios principales"}`;
    try {
      const respuesta = JSON.parse(limpiarJSON(await llamarClaude(prompt, 4500)));
      const clases = (Array.isArray(respuesta.clases) ? respuesta.clases : []).filter((clase) => clase && typeof clase === "object").slice(0, sesionesUnidad).map((clase, i) => ({
        numero: i + 1,
        objetivo: typeof clase.objetivo === "string" ? clase.objetivo : "",
        oas: Array.isArray(clase.oas) ? clase.oas.filter((o) => Number.isInteger(o.curso) && cursos[o.curso]?.oas.some((oa) => oa.cod === o.codigo)).map(({ curso, codigo }) => ({ curso, codigo })) : [],
        actividades: Array.isArray(clase.actividades) ? clase.actividades.filter((a) => Number.isInteger(a.curso) && cursos[a.curso] && typeof a.estudiantes === "string" && typeof a.docente === "string").map(({ curso, estudiantes, docente }) => ({ curso, estudiantes, docente })) : [],
        evidencia: typeof clase.evidencia === "string" ? clase.evidencia : "",
        evaluacion: typeof clase.evaluacion === "string" ? clase.evaluacion : "",
      }));
      if (!clases.length) throw new Error("La respuesta no incluyó clases válidas.");
      const nueva = {
        titulo: typeof respuesta.titulo === "string" ? respuesta.titulo : "Unidad de aprendizaje",
        proposito: typeof respuesta.proposito === "string" ? respuesta.proposito : "",
        pregunta: typeof respuesta.pregunta_esencial === "string" ? respuesta.pregunta_esencial : "",
        evaluacionFinal: typeof respuesta.evaluacion_final === "string" ? respuesta.evaluacion_final : "",
        clases,
        sesionesSolicitadas: sesionesUnidad,
        cursos: cursos.map((c) => ({ gradoNombre: c.gradoNombre, asig: c.asig.nombre, oas: c.oas.map((o) => ({ cod: o.cod, texto: o.texto, basal: o.basal })) })),
        minutosPorClase: TIEMPOS[bloques].total,
      };
      const cubiertos = new Set(clases.flatMap((c) => c.oas.map((o) => `${o.curso}|${o.codigo}`)));
      const faltantesOA = objetivos.filter((o) => !cubiertos.has(`${o.curso}|${o.codigo}`)).length;
      const faltanActividades = clases.reduce((n, c) => n + cursos.filter((_, i) => !c.actividades.some((a) => a.curso === i)).length, 0);
      setUnidad(nueva);
      setUnidadGuardadaId(null);
      setVistaResultado("unidad");
      const advertencias = [faltantesOA && `${faltantesOA} OA sin asignar`, faltanActividades && `${faltanActividades} actividades por curso sin definir`, clases.length < sesionesUnidad && `${clases.length} de ${sesionesUnidad} clases generadas`].filter(Boolean);
      setAviso(advertencias.length ? `Unidad creada con puntos pendientes: ${advertencias.join("; ")}.` : "Unidad creada. Revisa la cobertura de OA y la secuencia antes de usarla.");
      setTimeout(() => document.getElementById("plan-unidad")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }), 80);
    } catch (e) {
      setAviso("No se pudo generar la unidad. Revisa la conexión con el servicio e inténtalo otra vez.");
    } finally {
      setGenerandoUnidad(false);
    }
  };

  const actualizarLinkMaterial = (i, link) => setPlan((p) => ({ ...p, materiales: p.materiales.map((m, idx) => (idx === i ? { ...m, link } : m)) }));
  const actualizarMaterial = (i, campo, valor) => setPlan((p) => ({ ...p, materiales: p.materiales.map((m, idx) => (idx === i ? { ...m, [campo]: valor } : m)) }));
  const actualizarFase = (fase, campo, valor) => setPlan((p) => ({ ...p, [fase]: { ...p[fase], [campo]: valor } }));
  const actualizarListaFase = (fase, campo, valor) => actualizarFase(fase, campo, valor.split("\n").map((x) => x.trim()).filter(Boolean));
  const actualizarListaCurso = (fase, idx, campo, valor) => setPlan((p) => ({
    ...p,
    [fase]: {
      ...p[fase],
      porCurso: p[fase].porCurso.map((c, i) => i === idx ? { ...c, [campo]: valor.split("\n").map((x) => x.trim()).filter(Boolean) } : c),
    },
  }));
  const actualizarCriterios = (idx, valor) => setPlan((p) => ({
    ...p,
    evaluacion: { ...p.evaluacion, porCurso: p.evaluacion.porCurso.map((c, i) => i === idx ? { ...c, criterios: valor.split("\n").map((x) => x.trim()).filter(Boolean) } : c) },
  }));
  const actualizarMinutos = (fase, valor) => {
    const min = Number(valor);
    if (!Number.isFinite(min) || min < 1 || min > 240) return;
    setPlan((p) => {
      const total = ["inicio", "desarrollo", "cierre"].reduce((n, k) => n + (k === fase ? min : Number(p[k].min) || 0), 0);
      const rotaciones = fase === "desarrollo" && p.desarrollo.rotaciones?.length ? p.desarrollo.rotaciones.map((r, i, all) => ({ ...r, desde: Math.round(min * i / all.length), hasta: Math.round(min * (i + 1) / all.length) })) : p.desarrollo.rotaciones;
      return { ...p, [fase]: { ...p[fase], min, ...(fase === "desarrollo" ? { rotaciones } : {}) }, meta: { ...p.meta, minutos: total, bloques: Math.ceil(total / 45) } };
    });
  };

  const copiarMaterial = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Material copiado.");
      setTimeout(() => setAviso(""), 2000);
    } catch (e) {
      setAviso("No se pudo copiar.");
    }
  };

  // Imprime solo un material: el contenido para el estudiante y, en página aparte, lo que es para el docente.
  const imprimirMaterial = (m) => {
    const w = window.open("", "_blank");
    if (!w) return setAviso("Permite las ventanas emergentes para imprimir el material.");
    const d = w.document;
    d.title = m.titulo || m.tipo;
    const st = d.createElement("style");
    st.textContent = "body{font-family:system-ui,sans-serif;margin:24px} pre{white-space:pre-wrap;font:inherit;line-height:1.6} .docente{break-before:page}";
    d.head.appendChild(st);
    const seccion = (titulo, texto, cls) => {
      if (!texto) return;
      const s = d.createElement("section");
      if (cls) s.className = cls;
      const h = d.createElement("h2");
      h.textContent = titulo;
      const pre = d.createElement("pre");
      pre.textContent = texto;
      s.append(h, pre);
      d.body.appendChild(s);
    };
    seccion(m.titulo || m.tipo, m.contenido);
    seccion("Para el docente", materialTexto({ ...m, contenido: "" }, plan.meta.cursos), "docente");
    w.print();
  };

  /* ---------- exportar ---------- */
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(planTexto(plan));
      setAviso("Planificación copiada.");
      setTimeout(() => setAviso(""), 2500);
    } catch (e) {
      setAviso("No se pudo copiar. Usa Descargar.");
    }
  };

  const descargar = () => {
    const blob = new Blob([planTexto(plan)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clase-${(ctx.fecha || "sin-fecha").replace(/[^\w-]/g, "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const guardarPlan = async () => {
    const id = planGuardadoId || Date.now();
    const item = { id, titulo: plan.titulo, fecha: ctx.fecha || new Date().toLocaleDateString("es-CL"), plan };
    const next = planGuardadoId ? guardadas.map((g) => g.id === planGuardadoId ? item : g) : [item, ...guardadas].slice(0, 12);
    setGuardadas(next);
    setPlanGuardadoId(id);
    try {
      await window.storage.set("planificador:planes", JSON.stringify(next), false);
      setAviso("Planificación guardada.");
      setTimeout(() => setAviso(""), 2500);
    } catch (e) {
      setAviso("Se guardó solo en esta sesión.");
    }
  };

  const textoUnidad = (u) => {
    const lineas = [`# ${u.titulo}`, `${u.clases.length} clases · ${u.minutosPorClase} minutos cada una`, `\nPropósito: ${u.proposito}`, `Pregunta esencial: ${u.pregunta}`];
    u.cursos.forEach((c) => {
      lineas.push(`\n## ${c.gradoNombre} — ${c.asig}`);
      c.oas.forEach((o) => lineas.push(`- ${o.cod} (${o.basal ? "basal" : "complementario"}): ${o.texto}`));
    });
    u.clases.forEach((c) => {
      lineas.push(`\n## Clase ${c.numero}: ${c.objetivo}`, `OA: ${c.oas.map((o) => `${u.cursos[o.curso]?.gradoNombre || "curso"} ${o.codigo}`).join(", ")}`);
      c.actividades.forEach((a) => lineas.push(`${u.cursos[a.curso]?.gradoNombre || "Curso"}: estudiantes — ${a.estudiantes}; docente — ${a.docente}`));
      lineas.push(`Evidencia: ${c.evidencia}`, `Evaluación formativa: ${c.evaluacion}`);
    });
    lineas.push(`\n## Evaluación final\n${u.evaluacionFinal}`);
    return lineas.join("\n");
  };

  const descargarUnidad = () => {
    const url = URL.createObjectURL(new Blob([textoUnidad(unidad)], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `unidad-${unidad.titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "aprendizaje"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const guardarUnidad = async () => {
    const id = unidadGuardadaId || Date.now();
    const item = { id, titulo: unidad.titulo, fecha: new Date().toLocaleDateString("es-CL"), unidad };
    const next = unidadGuardadaId ? unidadesGuardadas.map((u) => u.id === id ? item : u) : [item, ...unidadesGuardadas].slice(0, 12);
    setUnidadesGuardadas(next);
    setUnidadGuardadaId(id);
    try {
      await window.storage.set("planificador:unidades", JSON.stringify(next), false);
      setAviso("Unidad guardada.");
    } catch (e) {
      setAviso("La unidad se guardó solo en esta sesión.");
    }
  };

  const borrarUnidad = async (id) => {
    const next = unidadesGuardadas.filter((u) => u.id !== id);
    setUnidadesGuardadas(next);
    if (unidadGuardadaId === id) setUnidadGuardadaId(null);
    try {
      await window.storage.set("planificador:unidades", JSON.stringify(next), false);
    } catch (e) {
      /* nada que hacer */
    }
  };

  const borrarGuardada = async (id) => {
    const next = guardadas.filter((g) => g.id !== id);
    setGuardadas(next);
    if (planGuardadoId === id) setPlanGuardadoId(null);
    try {
      await window.storage.set("planificador:planes", JSON.stringify(next), false);
    } catch (e) {
      /* nada que hacer */
    }
  };

  /* ============================================================
     RENDER
     ============================================================ */

  // [].concat: si la API devuelve un string en vez de arreglo, se muestra como un solo punto en vez de romper el render.
  const Bullets = ({ items }) => <ul>{[].concat(items || []).map((x, i) => <li key={i}>{typeof x === "object" ? JSON.stringify(x) : x}</li>)}</ul>;
  const listaEditable = (items, onChange, etiqueta) => editandoPlan ? <label className="editorPlan"><span>{etiqueta} · una línea por punto</span><textarea className="campo" value={[].concat(items || []).join("\n")} onChange={(e) => onChange(e.target.value)} /></label> : <Bullets items={items} />;
  const campoEditable = (value, onChange, etiqueta) => editandoPlan ? <label className="editorPlan"><span>{etiqueta}</span><input className="campo" value={value || ""} onChange={(e) => onChange(e.target.value)} /></label> : value;
  const textoEditable = (value, onChange, etiqueta) => editandoPlan ? <label className="editorPlan"><span>{etiqueta}</span><textarea className="campo" rows={3} value={value || ""} onChange={(e) => onChange(e.target.value)} /></label> : value && <pre className="textoPlan">{value}</pre>;
  const minutosFase = (fase) => editandoPlan ? <label className="minEditor"><span className="vh">Minutos de {fase}</span><input className="campo" type="number" min="1" max="240" step="1" value={plan[fase].min} onFocus={(e) => e.currentTarget.select()} onChange={(e) => actualizarMinutos(fase, e.target.value)} /> min</label> : <span className="min">{plan[fase].min} min</span>;

  const renderRiel = (idx) => {
    const r = rieles[idx];
    const color = colorDe(idx);
    const bg = bgDe(idx);
    const st = { "--c": color, "--cbg": bg };
    const lista = oasPorRiel[idx];
    const cargando = oaCargando[`${r.asig}-${r.grado}`];
    return (
      <section className="riel" key={"riel-" + idx} style={st}>
        <div className="rielHd">
          <div className="fila" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label className="lbl2" htmlFor={`grado-${idx}`}>
                Curso
              </label>
              <select id={`grado-${idx}`} className="campo" value={r.grado} onChange={(e) => cambiarGrado(idx, e.target.value)}>
                {GRADOS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>
            {cargando && <span className="spin" aria-label="Cargando objetivos" style={{ marginLeft: 8 }} />}
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="lbl2" htmlFor={`asig-${idx}`}>
              Asignatura
            </label>
            <select id={`asig-${idx}`} className="campo" value={r.asig} onChange={(e) => cambiarAsig(idx, e.target.value)}>
              {ASIGNATURAS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <span className="rielCuenta">
            <strong>
              {r.oaIds.length} seleccionado{r.oaIds.length === 1 ? "" : "s"}
            </strong>{" "}
            · {lista.filter((o) => o.basal).length} basales · {lista.filter((o) => !o.basal).length} complementarios
          </span>
          <div className="fila" style={{ marginTop: 10 }}>
            {[
              ["basal", "Basales"],
              ["comp", "Complementarios"],
              ["todos", "Todos"],
            ].map(([k, t]) => (
              <button key={k} className={"chip" + (r.filtro === k ? " on" : "")} aria-pressed={r.filtro === k} onClick={() => cambiarFiltro(idx, k)}>
                {t}
              </button>
            ))}
          </div>
          <div className="fila" style={{ marginTop: 8 }}>
            <button className="btn sm" onClick={() => seleccionarBasales(idx)}>
              Elegir todos los basales
            </button>
            {r.oaIds.length > 0 && (
              <button className="btn sm" onClick={() => limpiarSeleccion(idx)}>
                Limpiar selección
              </button>
            )}
          </div>
        </div>

        <div className="lista">
          {cargando && (
            <>
              {[0, 1, 2, 3].map((k) => (
                <div key={k} className="sk skOA" />
              ))}
              <span className="vh">Cargando objetivos de aprendizaje</span>
            </>
          )}
          {!cargando &&
            filtrados(idx).map((o) => {
              const on = r.oaIds.includes(o.id);
              const fuente = fuenteOA(o, r);
              return (
                <div key={o.id} className={"oa" + (on ? " on" : "")}>
                  <label className="oaSelect">
                    <input type="checkbox" checked={on} onChange={() => alternarOA(idx, o)} />
                    <span>
                      <span className="oaTop">
                        <span className="cod">{o.cod}</span>
                        <span className={"tag " + (o.basal ? "b" : "c")}>{o.basal ? "Basal" : "Complementario"}</span>
                        <span className="eje">{o.eje}</span>
                      </span>
                      {o.texto}
                    </span>
                  </label>
                  <div className="oaFuenteFila">
                    <span className={`oaFuente ${fuente.tipo}`}>{fuente.etiqueta}</span>
                    {fuente.url && <a href={fuente.url} target="_blank" rel="noreferrer">Ver página oficial del curso</a>}
                  </div>
                  <button className="reclasificar" onClick={() => alternarBasal(o.id, o.basal)}>
                    {o.basal ? "Marcar como complementario" : "Marcar como basal"}
                  </button>
                  {on && (
                    <div className="indBox">
                      {indCargando[o.id] && (
                        <>
                          <div className="sk skLinea" />
                          <div className="sk skLinea corta" />
                          <span className="vh">Recopilando indicadores de evaluación</span>
                        </>
                      )}
                      {indCache[o.id] && (
                        <>
                          <p className="nota" style={{ margin: "0 0 8px" }}>
                            Marca los indicadores que quieres usar como objetivo de la clase:
                          </p>
                          <ul className="indList">
                            {indCache[o.id].map((x, k) => {
                              const elegido = (indSel[o.id] || []).includes(k);
                              return (
                                <li key={k}>
                                  <label className="indPick">
                                    <input type="checkbox" checked={elegido} onChange={() => alternarIndicador(o.id, k)} />
                                    <span>
                                      <span style={elegido ? { fontWeight: 600 } : undefined}>{x.i}</span>
                                      <span className="hca">
                                        <span className="hcaT">
                                          <b>Habilidad:</b> {x.h}
                                        </span>
                                        <span className="hcaT">
                                          <b>Contenido:</b> {x.c}
                                        </span>
                                        <span className="hcaT">
                                          <b>Actitud:</b> {x.a}
                                        </span>
                                      </span>
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          {!cargando && filtrados(idx).length === 0 && <p className="vacio">No hay objetivos con ese filtro en esta asignatura.</p>}
        </div>

        <div className="rielPie">
          {nuevoOA.abierto === idx ? (
            <div className="nuevoOA">
              <textarea
                className="campo"
                rows={3}
                aria-label="Objetivo propio"
                placeholder="Escribe el objetivo tal como aparece en tu programa"
                value={nuevoOA.texto}
                onChange={(e) => setNuevoOA((n) => ({ ...n, texto: e.target.value }))}
              />
              <div className="fila" style={{ marginTop: 8 }}>
                <label style={{ fontSize: 13 }}>
                  <input type="checkbox" checked={nuevoOA.basal} onChange={(e) => setNuevoOA((n) => ({ ...n, basal: e.target.checked }))} /> Es basal
                </label>
                <button className="btn sm solid" onClick={() => agregarOA(idx)}>
                  Agregar objetivo
                </button>
                <button className="btn sm" onClick={() => setNuevoOA({ abierto: -1, texto: "", basal: true })}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button className="btn sm" onClick={() => setNuevoOA({ abierto: idx, texto: "", basal: true })}>
              Agregar un objetivo propio
            </button>
          )}
        </div>
      </section>
    );
  };

  const faltantes = rieles.map((r, i) => (r.asig && r.oaIds.length > 0 ? null : nombreGrado(r.grado))).filter(Boolean);

  return (
    <div className="pm">
      <div className="wrap">
        <header className="hd">
          <div>
            <h1>Planificador de clases</h1>
            <p>
              Elige uno o varios cursos (de 1º básico a 4º medio), selecciona los objetivos basales y complementarios que quieres trabajar en cada uno, y arma
              la clase con inicio, desarrollo, cierre y materiales.
            </p>
          </div>
          <div className="fila noprint">
            {onVolver && (
              <button className="btn" onClick={onVolver}>
                ← Inicio
              </button>
            )}
            <button className="btn" onClick={() => setCtxAbierto((v) => !v)}>
              {ctxAbierto ? "Ocultar datos del curso" : "Datos del curso"}
            </button>
          </div>
        </header>

        {ctxAbierto && (
          <div className="card noprint" style={{ marginBottom: 18 }}>
            <div className="ctxGrid">
              {[
                ["escuela", "Escuela"],
                ["docente", "Docente"],
                ["fecha", "Fecha"],
                ["estudiantes", "Estudiantes por curso"],
              ].map(([k, l]) => (
                <div key={k}>
                  <label className="lbl2" htmlFor={"f-" + k}>
                    {l}
                  </label>
                  <input
                    id={"f-" + k}
                    className="campo"
                    placeholder={k === "estudiantes" ? "Ej: 1º básico: 5, 3º básico: 4" : undefined}
                    value={ctx[k]}
                    onChange={(e) => setCtx((c) => ({ ...c, [k]: e.target.value }))}
                  />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="lbl2" htmlFor="f-rec">
                  Materiales con los que cuentas
                </label>
                <input
                  id="f-rec"
                  className="campo"
                  placeholder="Por ejemplo: bloques multibase, láminas, un notebook, biblioteca de aula"
                  value={ctx.recursos}
                  onChange={(e) => setCtx((c) => ({ ...c, recursos: e.target.value }))}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="lbl2" htmlFor="f-nee">
                  Qué necesitas diversificar
                </label>
                <input
                  id="f-nee"
                  className="campo"
                  placeholder="Por ejemplo: dos estudiantes aún no decodifican, uno con TEA, una estudiante con lengua materna distinta"
                  value={ctx.nee}
                  onChange={(e) => setCtx((c) => ({ ...c, nee: e.target.value }))}
                />
              </div>
              <div>
                <label className="lbl2" htmlFor="f-foco">Foco de la clase</label>
                <select id="f-foco" className="campo" value={ctx.foco} onChange={(e) => setCtx((c) => ({ ...c, foco: e.target.value }))}>
                  <option value="">Equilibrado</option>
                  <option value="introducir un aprendizaje nuevo">Introducir contenido nuevo</option>
                  <option value="practicar y aplicar lo aprendido">Practicar y aplicar</option>
                  <option value="repasar y consolidar aprendizajes">Repasar y consolidar</option>
                  <option value="recoger evidencia y evaluar formativamente">Evaluar formativamente</option>
                </select>
              </div>
              <div>
                <label className="lbl2" htmlFor="f-previos">Conocimientos previos del grupo</label>
                <input id="f-previos" className="campo" placeholder="Qué ya saben o qué conviene activar" value={ctx.previos} onChange={(e) => setCtx((c) => ({ ...c, previos: e.target.value }))} />
              </div>
            </div>
          </div>
        )}

        {aviso && (
          <div
            role="status"
            aria-live="polite"
            className={"aviso noprint" + (/copiad|guardad/i.test(aviso) && !/^No /.test(aviso) ? " ok" : /^No se pudo/.test(aviso) ? " error" : "")}
          >
            {aviso}
          </div>
        )}

        <section className="paso noprint" aria-labelledby="paso-1">
          <div className="pasoHd">
            <span className="pasoNum" aria-hidden="true">
              1
            </span>
            <div>
              <h2 id="paso-1">Tipo de clase</h2>
              <p>Un curso único, o varios cursos combinados en aula multigrado.</p>
            </div>
          </div>
          <div className="seg">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} className={"bloqueBtn" + (rieles.length === n ? " on" : "")} aria-pressed={rieles.length === n} onClick={() => cambiarNumCursos(n)}>
                {n === 1 ? "Curso único" : `${n} cursos · multigrado`}
              </button>
            ))}
          </div>
        </section>

        <section className="paso noprint" aria-labelledby="paso-2">
          <div className="pasoHd">
            <span className="pasoNum" aria-hidden="true">
              2
            </span>
            <div>
              <h2 id="paso-2">Cursos y objetivos</h2>
              <p>Elige curso, asignatura y los OA que trabajarás en cada uno.</p>
            </div>
          </div>
          <div className="rieles">{rieles.map((_, i) => renderRiel(i))}</div>
        </section>

        <section className="paso noprint" aria-labelledby="paso-3">
          <div className="pasoHd">
            <span className="pasoNum" aria-hidden="true">
              3
            </span>
            <div>
              <h2 id="paso-3">Duración</h2>
              <p>Cada bloque dura 45 minutos.</p>
            </div>
          </div>
          <div className="seg">
            {[1, 2].map((b) => (
              <button key={b} className={"bloqueBtn" + (bloques === b ? " on" : "")} aria-pressed={bloques === b} onClick={() => setBloques(b)}>
                {b === 1 ? "1 bloque · 45 min" : "2 bloques · 90 min"}
              </button>
            ))}
          </div>
          <div className="unidadConfig">
            <label className="lbl2" htmlFor="unidad-sesiones">Clases de la unidad (2 a 12)</label>
            <input id="unidad-sesiones" className="campo" type="number" min="2" max="12" step="1" value={sesionesUnidad} onChange={(e) => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 2 && n <= 12) setSesionesUnidad(n); }} />
          </div>
        </section>

        <div className="accion noprint" role="region" aria-label="Crear una clase o planificar una unidad">
          <div className="accionResumen">
            <strong>{multigrado ? `${rieles.length} cursos · multigrado` : "Curso único"}</strong>
            <span>
              {rieles.map((r) => `${nombreGrado(r.grado)}: ${r.oaIds.length} OA`).join(" · ")} · {TIEMPOS[bloques].total} min/clase · unidad de ${sesionesUnidad} clases
            </span>
            {!listo && (
              <span className="accionFalta" id="falta">
                Falta elegir objetivo en: {faltantes.join(", ")}
              </span>
            )}
          </div>
          <button className="btn solid lg" onClick={() => generar()} disabled={!listo || generando || generandoUnidad} aria-describedby={!listo ? "falta" : undefined}>
            {generando && <span className="spin" aria-hidden="true" />}
            {generando ? "Armando la clase…" : "Crear la clase"}
          </button>
          <button className="btn lg" onClick={generarUnidad} disabled={!listo || generando || generandoUnidad}>
            {generandoUnidad && <span className="spin" aria-hidden="true" />}
            {generandoUnidad ? "Planificando unidad…" : "Planificar unidad"}
          </button>
        </div>

        {generando && !plan && (
          <div className="plan esqueleto noprint" aria-busy="true" aria-label="Armando la clase">
            <div className="planHd">
              <div className="sk skTitulo" />
              <div className="sk skLinea" />
              <div className="sk skLinea corta" />
            </div>
            <div className="sk skBarra" />
            {[0, 1, 2].map((k) => (
              <div key={k} className="sk skBloque" />
            ))}
          </div>
        )}

        {generandoUnidad && <p className="aviso" role="status" aria-live="polite">Distribuyendo los objetivos entre {sesionesUnidad} clases y revisando su cobertura…</p>}

        {plan && vistaResultado === "clase" && (
          <article className="plan" id="plan-clase" aria-busy={generando}>
            <div className="planHd">
              <p className="planKicker">Planificación de clase</p>
              <h2>{plan.titulo}</h2>
              <dl className="ficha">
                <div>
                  <dt>{plan.meta.cursos.length > 1 ? "Cursos" : "Curso"}</dt>
                  <dd>
                    {plan.meta.cursos.map((c) => c.gradoNombre).join(" y ")}
                    {plan.meta.multigrado ? " · multigrado" : ""}
                  </dd>
                </div>
                <div>
                  <dt>Asignatura</dt>
                  <dd>{[...new Set(plan.meta.cursos.map((c) => c.asig))].join(", ")}</dd>
                </div>
                <div>
                  <dt>Duración</dt>
                  <dd>
                    {plan.meta.bloques} bloque{plan.meta.bloques > 1 ? "s" : ""} · {plan.meta.minutos} min
                  </dd>
                </div>
                {plan.meta.fecha && (
                  <div>
                    <dt>Fecha</dt>
                    <dd>{plan.meta.fecha}</dd>
                  </div>
                )}
                {plan.meta.docente && (
                  <div>
                    <dt>Docente</dt>
                    <dd>{plan.meta.docente}</dd>
                  </div>
                )}
                {plan.meta.escuela && (
                  <div>
                    <dt>Escuela</dt>
                    <dd>{plan.meta.escuela}</dd>
                  </div>
                )}
              </dl>
              <p className="hilo">{plan.hilo}</p>
              {plan.objetivosClase?.length > 0 && (
                <div className="ocBox">
                  <div className="lbl">Objetivo{plan.objetivosClase.length > 1 ? "s" : ""} de la clase</div>
                  {plan.objetivosClase.map((o, i) => (
                    <p key={i} className="ocItem">
                      {plan.meta.cursos.length > 1 && <strong style={{ color: colorDe(i) }}>{plan.meta.cursos[i]?.gradoNombre}: </strong>}
                      {o}
                    </p>
                  ))}
                </div>
              )}
              <section className="alineacion" aria-labelledby="alineacion-titulo">
                <h3 id="alineacion-titulo">Revisión de alineación</h3>
                <p className="nota">Vínculos sugeridos por IA entre cada OA, una actividad y la evidencia a observar. Revísalos antes de usar la planificación.</p>
                {plan.meta.cursos.map((c, i) => (
                  <div className="alineacionCurso" key={i}>
                    <h4 style={{ color: colorDe(i) }}>{c.gradoNombre} · {c.asig}</h4>
                    {c.oas.map((o, j) => {
                      const vinculo = plan.alineacion?.find((x) => x.curso === i && x.oa === o.cod);
                      return <div className="alineacionFila" key={j}><strong>{o.cod}</strong><span>{vinculo ? <><b>Actividad:</b> {vinculo.actividad}<br /><b>Evidencia:</b> {vinculo.evidencia}</> : <span className="alertaAlineacion">No se generó un vínculo para este objetivo; revísalo manualmente.</span>}</span></div>;
                    })}
                  </div>
                ))}
              </section>
              <div className="split" style={{ "--n": plan.meta.cursos.length }}>
                {plan.meta.cursos.map((c, i) => (
                  <div key={i} className={"col" + (i < plan.meta.cursos.length - 1 ? " borde" : "")}>
                    <h4 style={{ color: colorDe(i) }}>
                      {c.gradoNombre} · {c.asig}
                    </h4>
                    {c.oas.map((o, j) => (
                      <div key={j} style={{ margin: "0 0 10px" }}>
                        <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
                          <strong>{o.cod}</strong> <span className={"tag " + (o.basal ? "b" : "c")}>{o.basal ? "Basal" : "Complementario"}</span>
                          <br />
                          {o.texto}
                          <br />
                          <span className={`oaFuente ${o.fuenteTipo || "ia"}`}>{o.fuente || "Origen del objetivo no registrado en esta planificación"}</span>
                          {o.url && <> · <a href={o.url} target="_blank" rel="noreferrer">Página curricular oficial</a></>}
                        </p>
                        {o.indicadores?.length > 0 && (
                          <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                            {o.indicadores.map((x, k) => (
                              <li key={k} style={{ fontSize: 12.5, color: "var(--suave)", lineHeight: 1.5 }}>
                                {x.i}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {(() => {
              const a = +plan.inicio.min || 0,
                b = +plan.desarrollo.min || 0,
                c = +plan.cierre.min || 0;
              return (
                <div className="lineaTiempo" role="img" aria-label={`Inicio ${a} min, desarrollo ${b} min, cierre ${c} min`}>
                  <span className="lt i" style={{ flexGrow: a }}>
                    Inicio · 0–{a}
                  </span>
                  <span className="lt d" style={{ flexGrow: b }}>
                    Desarrollo · {a}–{a + b}
                  </span>
                  <span className="lt c" style={{ flexGrow: c }}>
                    Cierre · {a + b}–{a + b + c}
                  </span>
                </div>
              );
            })()}

            <div className="momentos">
              <section className="momento t">
                <div className="momentoHd">
                  <h3>Inicio</h3>
                  {minutosFase("inicio")}
                </div>
                <div className="comun duo">
                  <div className="rol est">
                    <div className="lbl">Estudiantes</div>
                    {listaEditable(plan.inicio.estudiantes, (v) => actualizarListaFase("inicio", "estudiantes", v), "Acciones de estudiantes")}
                  </div>
                  <div className="rol doc">
                    <div className="lbl">Orientación al docente</div>
                    {listaEditable(plan.inicio.docente, (v) => actualizarListaFase("inicio", "docente", v), "Orientaciones al docente")}
                  </div>
                  {(plan.inicio.pregunta || editandoPlan) && (
                    <p className="pregunta">
                      <strong>Pregunta que abre la clase:</strong> {editandoPlan ? <input className="campo" value={plan.inicio.pregunta} onChange={(e) => actualizarFase("inicio", "pregunta", e.target.value)} /> : plan.inicio.pregunta}
                    </p>
                  )}
                </div>
              </section>

              <section className="momento t">
                <div className="momentoHd">
                  <h3>Desarrollo</h3>
                  {minutosFase("desarrollo")}
                </div>
                {(editandoPlan || (plan.desarrollo.comunEstudiantes || []).length > 0 || (plan.desarrollo.comunDocente || []).length > 0) && (
                  <div className="comun duo">
                    <div className="rol est">
                      <div className="lbl">Estudiantes, con todos los cursos</div>
                      {listaEditable(plan.desarrollo.comunEstudiantes, (v) => actualizarListaFase("desarrollo", "comunEstudiantes", v), "Acciones comunes")}
                    </div>
                    <div className="rol doc">
                      <div className="lbl">Orientación al docente</div>
                      {listaEditable(plan.desarrollo.comunDocente, (v) => actualizarListaFase("desarrollo", "comunDocente", v), "Orientaciones comunes")}
                    </div>
                  </div>
                )}
                {plan.meta.multigrado && plan.desarrollo.rotaciones?.length > 0 && (
                  <div className="rotaciones">
                    <h4>Rotación de la atención docente</h4>
                    <p className="nota">Secuencia sugerida para el trabajo simultáneo; ajústala al ritmo del grupo y a los {plan.desarrollo.min} minutos disponibles.</p>
                    <ol>{plan.desarrollo.rotaciones.map((r, i) => <li key={i}><strong>Min. {r.desde}–{r.hasta} · {r.curso}</strong><span><b>Docente:</b> {r.docente}<br /><b>Mientras tanto:</b> {r.otros}</span></li>)}</ol>
                  </div>
                )}
                <div className="split" style={{ "--n": plan.meta.cursos.length }}>
                  {plan.meta.cursos.map((c, i, todos) => (
                    <div key={i} className={"col" + (i < todos.length - 1 ? " borde" : "") + (todos.length === 1 ? " duo" : "")}>
                      {todos.length > 1 && <h4 style={{ color: colorDe(i) }}>{c.gradoNombre} trabaja en</h4>}
                      <div className="rol est">
                        <div className="lbl">Estudiantes</div>
                        {listaEditable(plan.desarrollo.porCurso?.[i]?.estudiantes, (v) => actualizarListaCurso("desarrollo", i, "estudiantes", v), `Acciones para ${c.gradoNombre}`)}
                      </div>
                      <div className="rol doc">
                        <div className="lbl">Orientación al docente</div>
                        {listaEditable(plan.desarrollo.porCurso?.[i]?.docente, (v) => actualizarListaCurso("desarrollo", i, "docente", v), `Orientaciones para ${c.gradoNombre}`)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="momento t">
                <div className="momentoHd">
                  <h3>Cierre</h3>
                  {minutosFase("cierre")}
                </div>
                <div className="comun duo">
                  <div className="rol est">
                    <div className="lbl">Estudiantes</div>
                    {listaEditable(plan.cierre.estudiantes, (v) => actualizarListaFase("cierre", "estudiantes", v), "Acciones de cierre")}
                  </div>
                  <div className="rol doc">
                    <div className="lbl">Orientación al docente</div>
                    {listaEditable(plan.cierre.docente, (v) => actualizarListaFase("cierre", "docente", v), "Orientaciones de cierre")}
                  </div>
                  <div className="rol est full">
                    <div className="lbl">Preguntas para los estudiantes</div>
                    {listaEditable(plan.cierre.metacognicion, (v) => actualizarListaFase("cierre", "metacognicion", v), "Preguntas de metacognición")}
                  </div>
                </div>
              </section>
            </div>

            <div className="momento">
              <div className="momentoHd">
                <h3>Diversificación</h3>
                <span className="min">Diseño Universal para el Aprendizaje</span>
              </div>
              <div className="grid3">
                <div className="box">
                  <h4>Cómo se presenta</h4>
                  <Bullets items={plan.dua.representacion} />
                </div>
                <div className="box">
                  <h4>Cómo responden</h4>
                  <Bullets items={plan.dua.accion} />
                </div>
                <div className="box">
                  <h4>Cómo se involucran</h4>
                  <Bullets items={plan.dua.motivacion} />
                </div>
              </div>
            </div>

            <div className="momento">
              <div className="momentoHd">
                <h3>Evaluación formativa</h3>
                <span className="min">{plan.evaluacion.instrumento}</span>
              </div>
              <div className="split" style={{ "--n": plan.meta.cursos.length }}>
                {plan.meta.cursos.map((c, i) => (
                  <div key={i} className={"col" + (i < plan.meta.cursos.length - 1 ? " borde" : "")}>
                    <h4 style={{ color: colorDe(i) }}>Qué observo en {c.gradoNombre}</h4>
                    {listaEditable(plan.evaluacion.porCurso?.[i]?.criterios, (v) => actualizarCriterios(i, v), `Criterios para ${c.gradoNombre}`)}
                  </div>
                ))}
              </div>
            </div>

            {(plan.tutoria || plan.adecuaciones?.length > 0) && (
              <div className="momento">
                <div className="grid3">
                  {plan.tutoria && (
                    <div className="box">
                      <h4>Tutoría entre pares</h4>
                      <p style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}>{plan.tutoria}</p>
                    </div>
                  )}
                  <div className="box">
                    <h4>Adecuaciones</h4>
                    <Bullets items={plan.adecuaciones} />
                  </div>
                </div>
              </div>
            )}

            <section className="momento materiales">
              <div className="momentoHd">
                <h3>Materiales</h3>
                <span className="min">Listos para imprimir. Revisa el solucionario y los links sugeridos antes de usarlos</span>
              </div>
              <div className="matGrid">
                {(plan.materiales || []).map((m, i) => (
                  <article key={m.id || i} className="matCard">
                    <header className="matHd">
                      <div>
                        <h4>{campoEditable(m.titulo || m.tipo, (v) => actualizarMaterial(i, "titulo", v), "Título del material")}</h4>
                        <p>{campoEditable(m.proposito || m.descripcion, (v) => actualizarMaterial(i, "proposito", v), "Propósito")}</p>
                        {m.momento && (
                          <p className="nota">
                            {m.momento}
                            {plan.meta.cursos.length > 1 && ` · ${m.curso === "todos" ? "todos los cursos" : plan.meta.cursos[m.curso]?.gradoNombre}`}
                            {m.cantidad?.total && ` · Cantidad: ${m.cantidad.total}`}
                          </p>
                        )}
                      </div>
                      <div className="matAcciones noprint">
                        <button className="btn sm" aria-label={`Copiar ${m.titulo || m.tipo}`} onClick={() => copiarMaterial(materialTexto(m, plan.meta.cursos))}>
                          Copiar
                        </button>
                        <button className="btn sm" aria-label={`Imprimir ${m.titulo || m.tipo}`} onClick={() => imprimirMaterial(m)}>
                          Imprimir
                        </button>
                      </div>
                    </header>
                    {(m.preparacion?.length > 0 || editandoPlan) && (
                      <div className="matSec">
                        <div className="lbl2">Preparación previa</div>
                        {listaEditable(m.preparacion, (v) => actualizarMaterial(i, "preparacion", v.split("\n").map((x) => x.trim()).filter(Boolean)), "Preparación previa")}
                      </div>
                    )}
                    {(m.instrucciones_uso?.length > 0 || editandoPlan) && (
                      <div className="matSec">
                        <div className="lbl2">Cómo se usa en la sala</div>
                        {listaEditable(m.instrucciones_uso, (v) => actualizarMaterial(i, "instrucciones_uso", v.split("\n").map((x) => x.trim()).filter(Boolean)), "Instrucciones de uso")}
                      </div>
                    )}
                    {(m.contenido || editandoPlan) && (
                      <div className="matSec matContenido">
                        <div className="lbl2">Contenido listo para imprimir</div>
                        {textoEditable(m.contenido, (v) => actualizarMaterial(i, "contenido", v), "Contenido del material")}
                      </div>
                    )}
                    {[
                      ["solucionario", "Para el docente: solucionario (revisar antes de imprimir)"],
                      ["adecuacion", "Adecuación NEE"],
                      ["alternativa_sin_tecnologia", "Alternativa sin tecnología"],
                    ].map(
                      ([k, t]) =>
                        (m[k] || editandoPlan) && (
                          <details key={k} className={"matSec " + k} open={editandoPlan ? true : undefined}>
                            <summary>{t}</summary>
                            {textoEditable(m[k], (v) => actualizarMaterial(i, k, v), t)}
                          </details>
                        )
                    )}
                    {m.referencias?.length > 0 && (
                      <div className="matSec matRefs">
                        <div className="lbl2">Referencias</div>
                        <ul>
                          {m.referencias.map((r, k) => (
                            <li key={k}>
                              <span className={r.tipo_link === "ia" ? "refIA" : r.tipo_link === "curado" ? "refOficial" : "refBusq"}>{ETIQUETA_LINK[r.tipo_link]}</span>
                              <a href={r.url} target="_blank" rel="noreferrer">
                                {r.titulo}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="matSec link noprint">
                      <label className="lbl2" htmlFor={`mat-link-${i}`}>
                        Agregar mi propio link (opcional)
                      </label>
                      <input
                        id={`mat-link-${i}`}
                        className="campo"
                        placeholder="https://..."
                        value={m.link || ""}
                        onChange={(e) => actualizarLinkMaterial(i, e.target.value)}
                      />
                    </div>
                    {esHttps(m.link) && (
                      <a className="matLink" href={m.link} target="_blank" rel="noreferrer">
                        {m.link}
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <div className="planAcciones noprint">
              <button className={"btn" + (editandoPlan ? " solid" : "")} onClick={() => setEditandoPlan((v) => !v)} disabled={generando}>
                {editandoPlan ? "Terminar edición" : "Editar planificación"}
              </button>
              {editandoPlan && <span className="nota" role="status">Tus cambios se incluyen al imprimir, copiar, descargar o guardar.</span>}
              <div className="ajustesPlan" aria-label="Ajustar la planificación">
                <span className="lbl2">Ajustar y volver a generar</span>
                {[["Simplificar y reducir materiales", "Simplifica las instrucciones y reduce la cantidad de materiales."], ["Agregar movimiento", "Añade una actividad breve de movimiento vinculada a los objetivos."], ["Subir el desafío", "Haz más desafiante la práctica para estudiantes que avanzan rápido."]].map(([etiqueta, ajuste]) => <button key={etiqueta} className="btn sm" disabled={generando || editandoPlan} onClick={() => generar(ajuste)}>{etiqueta}</button>)}
              </div>
              <button className="btn solid" onClick={() => window.print()}>
                Imprimir
              </button>
              <button className="btn" onClick={copiar}>
                Copiar
              </button>
              <button className="btn" onClick={descargar}>
                Descargar
              </button>
              <button className="btn" onClick={guardarPlan}>
                {planGuardadoId ? "Guardar cambios" : "Guardar"}
              </button>
              <button className="btn" onClick={() => generar()} disabled={generando || editandoPlan}>
                {generando && <span className="spin" aria-hidden="true" />}
                {generando ? "Armando…" : "Crear otra versión"}
              </button>
            </div>
          </article>
        )}

        {unidad && vistaResultado === "unidad" && (
          <article className="plan unidad" id="plan-unidad">
            <header className="planHd">
              <p className="planKicker">Planificación de unidad · {unidad.clases.length} clases</p>
              <h2>{unidad.titulo}</h2>
              <p className="hilo">{unidad.proposito}</p>
              <div className="ocBox"><div className="lbl">Pregunta esencial</div><p className="ocItem">{unidad.pregunta}</p></div>
              <section className="coberturaUnidad" aria-labelledby="cobertura-unidad">
                <h3 id="cobertura-unidad">Cobertura de objetivos</h3>
                <p className="nota">La cobertura se calcula con los OA que la IA asignó a cada clase. Los objetivos sin asignación quedan señalados.</p>
                {unidad.cursos.map((c, i) => <div className="coberturaCurso" key={i}>
                  <h4 style={{ color: colorDe(i) }}>{c.gradoNombre} · {c.asig}</h4>
                  {c.oas.map((o, j) => {
                    const en = unidad.clases.filter((cl) => cl.oas.some((x) => x.curso === i && x.codigo === o.cod)).map((cl) => cl.numero);
                    return <div className="coberturaOA" key={j}><span><strong>{o.cod}</strong> <span className={"tag " + (o.basal ? "b" : "c")}>{o.basal ? "Basal" : "Complementario"}</span></span><span className={en.length ? "cubierto" : "sinCobertura"}>{en.length ? `Clases ${en.join(", ")}` : "Sin clase asignada · revisar"}</span></div>;
                  })}
                </div>)}
              </section>
            </header>
            <div className="momentos">
              {unidad.clases.map((clase) => <section className="momento" key={clase.numero}>
                <div className="momentoHd"><h3>Clase {clase.numero}</h3><span className="min">{unidad.minutosPorClase} min</span></div>
                <div className="unidadClase">
                  <p><strong>Objetivo:</strong> {clase.objetivo || "Pendiente de completar"}</p>
                  <div className="unidadOA"><strong>OA:</strong> {clase.oas.map((o) => `${unidad.cursos[o.curso]?.gradoNombre || "Curso"} · ${o.codigo}`).join("; ") || "Sin objetivos asignados"}</div>
                  <div className="split" style={{ "--n": Math.max(1, clase.actividades.length) }}>
                    {clase.actividades.map((a, i) => <div className="col" key={i}>
                      <h4>{unidad.cursos[a.curso]?.gradoNombre || "Curso"} · {unidad.cursos[a.curso]?.asig || ""}</h4>
                      <div className="rol est"><div className="lbl">Estudiantes</div><p>{a.estudiantes}</p></div>
                      <div className="rol doc"><div className="lbl">Docente</div><p>{a.docente}</p></div>
                    </div>)}
                  </div>
                  {clase.actividades.length === 0 && <p className="alertaAlineacion">No se generaron actividades por curso para esta clase; complétalas antes de usar la unidad.</p>}
                  <div className="unidadEvidencia"><p><strong>Evidencia:</strong> {clase.evidencia || "Revisar evidencia"}</p><p><strong>Evaluación formativa:</strong> {clase.evaluacion || "Definir estrategia"}</p></div>
                </div>
              </section>)}
            </div>
            <section className="momento">
              <div className="momentoHd"><h3>Evaluación final de la unidad</h3></div>
              <div className="unidadClase"><p>{unidad.evaluacionFinal || "Pendiente de definir"}</p></div>
            </section>
            <div className="planAcciones noprint">
              <button className="btn solid" onClick={() => window.print()}>Imprimir unidad</button>
              <button className="btn" onClick={descargarUnidad}>Descargar unidad</button>
              <button className="btn" onClick={guardarUnidad}>{unidadGuardadaId ? "Guardar cambios" : "Guardar unidad"}</button>
              {plan && <button className="btn" onClick={() => setVistaResultado("clase")}>Volver a la clase</button>}
            </div>
          </article>
        )}

        {guardadas.length > 0 && (
          <section className="card guardadas noprint">
            <h3>Planificaciones guardadas</h3>
            {guardadas.map((g) => (
              <div key={g.id} className="guardadaFila">
                <span>
                  {g.titulo} <span className="nota">· {g.fecha}</span>
                </span>
                <span className="fila">
                  <button className="btn sm" onClick={() => { setPlan(g.plan); setEditandoPlan(false); setPlanGuardadoId(g.id); setVistaResultado("clase"); }}>
                    Abrir
                  </button>
                  <button className="btn sm" onClick={() => borrarGuardada(g.id)}>
                    Eliminar
                  </button>
                </span>
              </div>
            ))}
          </section>
        )}

        {unidadesGuardadas.length > 0 && (
          <section className="card guardadas noprint">
            <h3>Unidades guardadas</h3>
            {unidadesGuardadas.map((g) => <div key={g.id} className="guardadaFila">
              <span>{g.titulo} <span className="nota">· {g.fecha}</span></span>
              <span className="fila">
                <button className="btn sm" onClick={() => { setUnidad(g.unidad); setUnidadGuardadaId(g.id); setVistaResultado("unidad"); }}>Abrir</button>
                <button className="btn sm" onClick={() => borrarUnidad(g.id)}>Eliminar</button>
              </span>
            </div>)}
          </section>
        )}

        <p className="nota noprint" style={{ marginTop: 26, maxWidth: "70ch" }}>
          Los objetivos de 1º y 2º básico vienen de las Bases Curriculares curadas en esta app; los del resto son sugerencias generadas por IA. Cada tarjeta indica
          su origen y enlaza a la página curricular del curso. La marca basal o complementario es una propuesta de priorización: puedes cambiarla en cada objetivo con el botón de
          la tarjeta, y agregar objetivos propios si tu establecimiento usa otra redacción. Revisa siempre contra el programa de estudio vigente antes de
          entregar la planificación.
        </p>

        <div style={{ marginTop: 20 }}>
          <AdSlot slot={ADSENSE_SLOT_PLANIFICADOR} />
        </div>
      </div>
    </div>
  );
}
