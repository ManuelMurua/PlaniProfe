import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  GRADOS,
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
} from "./curriculo.js";
import AdSlot from "./AdSlot.jsx";

const ADSENSE_SLOT_PLANIFICADOR = import.meta.env.VITE_ADSENSE_SLOT_PLANIFICADOR || "";

// En Claude se llama directo a la API. En desarrollo local, index.html define
// window.__API_URL__ = "/v1/messages" para pasar por el proxy de Vite.
const API_URL = (typeof window !== "undefined" && window.__API_URL__) || "https://api.anthropic.com/v1/messages";

async function llamarClaude(prompt) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
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

const COLORES = ["#4F46E5", "#059669", "#D97706", "#9333EA"];
const COLORES_BG = ["#EEF2FF", "#ECFDF5", "#FFFBEB", "#FAF5FF"];
const colorDe = (i) => COLORES[i % COLORES.length];
const bgDe = (i) => COLORES_BG[i % COLORES_BG.length];

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
  });
  const [ctxAbierto, setCtxAbierto] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [extras, setExtras] = useState([]);
  const [rieles, setRieles] = useState([rielVacio(GRADOS[0].id)]);
  const [oaCache, setOaCache] = useState({});
  const [oaCargando, setOaCargando] = useState({});
  const [indCache, setIndCache] = useState({});
  const [indCargando, setIndCargando] = useState({});
  const [indSel, setIndSel] = useState({}); // { [oaId]: [índices de indicadores elegidos] }
  const [bloques, setBloques] = useState(2);
  const [plan, setPlan] = useState(null);
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
    })();
  }, []);

  const guardarConfig = useCallback(async (next) => {
    try {
      await window.storage.set("planificador:config", JSON.stringify(next), false);
    } catch (e) {
      /* la sesión continúa aunque no se pueda guardar */
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => guardarConfig({ ctx, overrides, extras }), 600);
    return () => clearTimeout(id);
  }, [ctx, overrides, extras, guardarConfig]);

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
    } catch (e) {
      setOaCache((c) => ({ ...c, [key]: oaFallback(asigNombre, gradoNom) }));
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
            indicadores: indCache[o.id] || null,
            indElegidos: (indCache[o.id] || []).filter((_, k) => (indSel[o.id] || []).includes(k)),
          })),
      })),
    [rieles, oasPorRiel, indCache, indSel]
  );

  const generar = async () => {
    if (!listo) return;
    setGenerando(true);
    setAviso("");
    const t = TIEMPOS[bloques];
    const contexto = `${multigrado ? `Aula multigrado con ${cursos.length} cursos combinados en la misma sala` : "Clase de un solo curso"} en Chile.
Estudiantes: ${ctx.estudiantes || "curso completo"}.
Recursos disponibles: ${ctx.recursos || "material concreto básico, pizarra, cuadernos"}.
Diversificación requerida: ${ctx.nee || "estudiantes con distintos ritmos de aprendizaje"}.`;

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
    } Integra los distintos objetivos seleccionados de cada curso, no solo uno. Sé concreto: nombra la actividad y el material. Cada punto en máximo 25 palabras.

Además, redacta el objetivo de la clase de cada curso: una frase breve dirigida a los estudiantes (por ejemplo "Hoy aprenderemos a..."), que priorice los indicadores elegidos por el docente cuando existan, o resuma los OA del curso si no hay ninguno elegido. Un objetivo por curso, en el mismo orden en que aparecen arriba.

Responde SOLO JSON, sin markdown:
{"titulo":"título de la clase, máx 10 palabras","hilo":"situación o tema que articula la clase, máx 30 palabras","objetivosClase":[${cursos
      .map(() => '"objetivo de la clase de este curso, en lenguaje para estudiantes, máx 25 palabras"')
      .join(",")}],"inicio":{"min":${t.inicio},"estudiantes":["3 a 4 acciones que hacen los estudiantes"],"docente":["3 a 4 orientaciones de qué hacer y cómo"],"pregunta":"pregunta motivadora"},"desarrollo":{"min":${t.desarrollo},"comunEstudiantes":[${multigrado ? '"acciones de todos los cursos juntos"' : '"vacío, no aplica a un solo curso"'}],"comunDocente":[${
      multigrado ? '"orientaciones para el momento común, incluida la rotación de atención del docente"' : '"vacío, no aplica a un solo curso"'
    }],"porCurso":[${cursos
      .map(() => '{"estudiantes":["3 a 4 acciones concretas del estudiante"],"docente":["3 a 4 orientaciones de qué hacer y cómo, incluido el manejo de este grupo"]}')
      .join(",")}]},"cierre":{"min":${t.cierre},"estudiantes":["2 a 3 acciones de los estudiantes"],"docente":["2 a 3 orientaciones de qué hacer y cómo"],"metacognicion":["3 preguntas para los estudiantes"]}}`;

    const promptB = `${encabezado}

Entrega los apoyos de la clase: diversificación DUA, evaluación formativa por curso, materiales necesarios${
      multigrado ? ", tutoría entre pares propia del multigrado" : ""
    } y adecuaciones. No inventes enlaces ni URLs.

Para cada material, entrega su contenido completo y listo para usar (por ejemplo los ítems de una ficha o guía, las preguntas de una lista, un texto breve de lectura, o una pauta de evaluación) cuando sea algo que se pueda redactar directamente; si en cambio es un recurso externo real que el docente debe buscar o ya tiene (un video, un sitio web, un cuento físico del aula, un software), deja el contenido como string vacío y el docente agregará el link. Incluye al menos un material con contenido generado. Cada punto en máximo 20 palabras, salvo el contenido de los materiales.

Responde SOLO JSON, sin markdown:
{"dua":{"representacion":["3 medidas"],"accion":["3 medidas"],"motivacion":["3 medidas"]},"evaluacion":{"instrumento":"instrumento concreto","porCurso":[${cursos
      .map(() => '{"criterios":["3 criterios observables, derivados de los objetivos de este curso"]}')
      .join(",")}]},"materiales":[{"tipo":"tipo de material, 2 a 4 palabras","descripcion":"para qué se usa en la clase, máx 18 palabras","contenido":"contenido completo listo para usar en texto plano con saltos de línea, o string vacío si es un recurso externo"}],"tutoria":"${
      multigrado ? "cómo se organiza el apoyo entre los cursos, máx 35 palabras" : "deja este campo como string vacío porque la clase es de un solo curso"
    }","adecuaciones":["3 adecuaciones para estudiantes que requieren más apoyo"]}`;

    let nucleo = null;
    let apoyos = null;
    try {
      const [ra, rb] = await Promise.all([llamarClaude(promptA), llamarClaude(promptB)]);
      try {
        nucleo = JSON.parse(limpiarJSON(ra));
      } catch (e) {
        nucleo = null;
      }
      try {
        apoyos = JSON.parse(limpiarJSON(rb));
      } catch (e) {
        apoyos = null;
      }
    } catch (e) {
      /* sin conexión al servicio: se usa el plan de respaldo */
    }

    const base = planRespaldo(cursos, bloques, ctx, multigrado);
    const materialesFinal = ((apoyos && apoyos.materiales) || base.materiales).map((m) => ({
      tipo: m.tipo,
      descripcion: m.descripcion,
      contenido: m.contenido || "",
      link: "",
    }));
    const final = {
      ...base,
      ...(nucleo || {}),
      ...(apoyos || {}),
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
          oas: c.oas.map((o) => ({ cod: o.cod, basal: o.basal, texto: o.texto, indicadores: o.indicadores })),
        })),
      },
    };
    if (!nucleo || !apoyos) {
      setAviso("La clase se armó con la estructura base porque el servicio no respondió completo. Puedes volver a crearla.");
    }
    setPlan(final);
    setGenerando(false);
    setTimeout(() => {
      const el = document.getElementById("plan-clase");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const actualizarLinkMaterial = (i, link) => setPlan((p) => ({ ...p, materiales: p.materiales.map((m, idx) => (idx === i ? { ...m, link } : m)) }));

  const copiarMaterial = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Material copiado.");
      setTimeout(() => setAviso(""), 2000);
    } catch (e) {
      setAviso("No se pudo copiar.");
    }
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
    const item = { id: Date.now(), titulo: plan.titulo, fecha: ctx.fecha || new Date().toLocaleDateString("es-CL"), plan };
    const next = [item, ...guardadas].slice(0, 12);
    setGuardadas(next);
    try {
      await window.storage.set("planificador:planes", JSON.stringify(next), false);
      setAviso("Planificación guardada.");
      setTimeout(() => setAviso(""), 2500);
    } catch (e) {
      setAviso("Se guardó solo en esta sesión.");
    }
  };

  const borrarGuardada = async (id) => {
    const next = guardadas.filter((g) => g.id !== id);
    setGuardadas(next);
    try {
      await window.storage.set("planificador:planes", JSON.stringify(next), false);
    } catch (e) {
      /* nada que hacer */
    }
  };

  /* ============================================================
     RENDER
     ============================================================ */

  const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bitter:wght@500;700&family=Inter:wght@400;500;600&display=swap');
  .pm { --tinta:#0F172A; --suave:#64748B; --papel:#F1F5F9; --linea:#E2E8F0;
        --basal:#E11D48; --comp:#475569; --blanco:#FFFFFF; --acento:#4F46E5; --acentoHover:#4338CA;
        font-family:'Inter',system-ui,-apple-system,sans-serif; color:var(--tinta);
        background:var(--papel);
        background-image:linear-gradient(rgba(79,70,229,.05) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(79,70,229,.05) 1px, transparent 1px);
        background-size:26px 26px;
        min-height:100vh; padding:24px 16px 64px;
        animation:pmFadeIn .4s ease both; }
  @keyframes pmFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pmFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pmSlideDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
  .pm h1,.pm h2,.pm h3,.pm .slab { font-family:'Bitter',Georgia,serif; }
  .wrap { max-width:1180px; margin:0 auto; }
  .card { background:var(--blanco); border:1px solid var(--linea); border-radius:4px; animation:pmSlideDown .25s ease both; }
  .hd { display:flex; flex-wrap:wrap; gap:16px; align-items:flex-end; justify-content:space-between;
        border-bottom:3px solid var(--tinta); padding-bottom:14px; margin-bottom:20px; }
  .hd h1 { font-size:29px; line-height:1.15; margin:0; font-weight:700; letter-spacing:-.01em; }
  .hd p { margin:6px 0 0; font-size:14px; color:var(--suave); max-width:60ch; }
  .btn { font:inherit; font-size:14px; font-weight:500; padding:9px 15px; border-radius:3px;
         border:1px solid var(--tinta); background:var(--blanco); color:var(--tinta); cursor:pointer;
         transition:background-color .15s ease, color .15s ease, border-color .15s ease, transform .12s ease, box-shadow .15s ease; }
  .btn:hover { background:var(--tinta); color:var(--blanco); transform:translateY(-1px); }
  .btn:active { transform:translateY(0); }
  .btn:focus-visible, .pm *:focus-visible { outline:2px solid var(--acento); outline-offset:2px; }
  .btn.solid { background:var(--acento); border-color:var(--acento); color:var(--blanco); }
  .btn.solid:hover { background:var(--acentoHover); border-color:var(--acentoHover); box-shadow:0 4px 12px rgba(79,70,229,.3); }
  .btn.solid:disabled { background:#9BAAB3; border-color:#9BAAB3; cursor:not-allowed; transform:none; box-shadow:none; }
  .btn.sm { font-size:12.5px; padding:5px 10px; }
  .rieles { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:18px; }
  .riel { background:var(--blanco); border:1px solid var(--linea); border-top:5px solid var(--c);
          border-radius:4px; display:flex; flex-direction:column;
          animation:pmFadeUp .35s ease both; transition:box-shadow .18s ease; }
  .riel:nth-child(1) { animation-delay:.02s; }
  .riel:nth-child(2) { animation-delay:.08s; }
  .riel:nth-child(3) { animation-delay:.14s; }
  .riel:nth-child(4) { animation-delay:.2s; }
  .rielHd { padding:14px 16px 12px; border-bottom:1px dashed var(--linea); }
  .rielHd h2 { margin:0; font-size:17px; color:var(--c); }
  .rielHd span { font-size:12.5px; color:var(--suave); }
  .campo { width:100%; font:inherit; font-size:14px; padding:8px 10px; border:1px solid var(--linea);
           border-radius:3px; background:var(--blanco); color:var(--tinta); }
  .fila { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .chip { font-size:12.5px; padding:5px 11px; border-radius:999px; border:1px solid var(--linea);
          background:var(--blanco); cursor:pointer; color:var(--suave); font-weight:500;
          transition:background-color .15s ease, color .15s ease, border-color .15s ease; }
  .chip.on { background:var(--c); border-color:var(--c); color:#fff; }
  .lista { max-height:440px; overflow-y:auto; padding:10px 12px 4px; display:flex; flex-direction:column; gap:8px;
           -webkit-mask-image:linear-gradient(to bottom, black calc(100% - 22px), transparent 100%);
           mask-image:linear-gradient(to bottom, black calc(100% - 22px), transparent 100%);
           scrollbar-width:thin; scrollbar-color:var(--linea) transparent; }
  .lista::-webkit-scrollbar { width:8px; }
  .lista::-webkit-scrollbar-thumb { background:var(--linea); border-radius:4px; }
  .oa { border:1px solid var(--linea); background:var(--blanco); border-radius:3px; padding:9px 11px;
        transition:border-color .15s ease, background-color .15s ease; }
  .oa:hover { border-color:var(--c); }
  .oa.on { border-color:var(--c); background:var(--cbg); }
  .oaSelect { display:flex; gap:9px; align-items:flex-start; cursor:pointer; font:inherit; font-size:13.5px; line-height:1.45; }
  .oaSelect input[type=checkbox] { flex:none; width:16px; height:16px; margin-top:3px; accent-color:var(--c); cursor:pointer; }
  .oaTop { display:flex; gap:8px; align-items:center; margin-bottom:3px; flex-wrap:wrap; }
  .cod { font-family:'Bitter',serif; font-weight:700; font-size:13px; color:var(--c); }
  .tag { font-size:10.5px; font-weight:600; padding:2px 7px; border-radius:2px; letter-spacing:.02em; }
  .tag.b { background:var(--basal); color:#fff; }
  .tag.c { background:#EDF1F3; color:var(--comp); border:1px solid var(--linea); }
  .eje { font-size:11px; color:var(--suave); }
  .reclasificar { display:block; margin:6px 0 0 25px; border:none; background:none; padding:0; font:inherit;
                  font-size:11.5px; color:var(--suave); text-decoration:underline; cursor:pointer; transition:color .15s ease; }
  .reclasificar:hover { color:var(--c); }
  .indBox { margin:9px 0 0 25px; padding:9px 11px; background:#F4F7F8; border-left:3px solid var(--c); border-radius:2px;
            animation:pmSlideDown .2s ease both; }
  .indList { margin:0; padding-left:16px; }
  .indList li { font-size:12.5px; line-height:1.5; margin-bottom:8px; }
  .indList li:last-child { margin-bottom:0; }
  .indPick { display:flex; gap:8px; align-items:flex-start; cursor:pointer; }
  .indPick input { flex:none; width:14px; height:14px; margin-top:2px; accent-color:var(--c); cursor:pointer; }
  .hca { display:flex; gap:6px; flex-wrap:wrap; margin-top:4px; }
  .hcaT { font-size:10.5px; padding:2px 6px; border-radius:2px; background:#fff; border:1px solid var(--linea); color:var(--suave); }
  .hcaT b { color:var(--tinta); font-weight:600; }
  .barra { margin:20px 0; padding:16px 18px; background:var(--acento); border-radius:4px; color:#fff;
           display:flex; gap:18px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
  .barra h3 { margin:0 0 4px; font-size:16px; color:#fff; }
  .barra p { margin:0; font-size:13px; color:#E0E7FF; }
  .bloqueBtn { font:inherit; font-size:13.5px; padding:8px 14px; border-radius:3px; cursor:pointer;
               border:1px solid rgba(255,255,255,.4); background:transparent; color:#E0E7FF;
               transition:background-color .15s ease, color .15s ease, border-color .15s ease; }
  .bloqueBtn.on { background:#fff; color:var(--acento); border-color:#fff; font-weight:600; }
  .plan { margin-top:26px; background:var(--blanco); border:1px solid var(--linea); border-radius:4px; overflow:hidden;
          animation:pmFadeUp .4s ease both; }
  .planHd { padding:22px 24px; border-bottom:3px solid var(--tinta); }
  .planHd h2 { margin:0 0 6px; font-size:24px; line-height:1.2; }
  .planHd .sub { font-size:13px; color:var(--suave); }
  .momento { border-bottom:1px solid var(--linea); }
  .momentoHd { display:flex; align-items:baseline; gap:12px; padding:14px 24px 8px; }
  .momentoHd h3 { margin:0; font-size:17px; }
  .min { font-size:12.5px; color:var(--suave); font-weight:500; }
  .comun { margin:0 24px 14px; padding:12px 14px; background:#F4F7F8; border-left:3px solid var(--tinta); border-radius:2px; }
  .comun .lbl { font-size:11.5px; font-weight:600; color:var(--suave); margin-bottom:6px; }
  .ocBox { margin:14px 0 0; padding:12px 14px; background:#F4F7F8; border-left:3px solid var(--tinta); border-radius:2px; }
  .ocBox .lbl { font-size:11.5px; font-weight:600; color:var(--suave); text-transform:uppercase; letter-spacing:.02em; margin-bottom:6px; }
  .split { display:grid; grid-template-columns:repeat(var(--n,1),1fr); gap:0; border-top:1px dashed var(--linea); }
  @media (max-width:820px){ .split { grid-template-columns:1fr; } }
  .col { padding:14px 24px 18px; }
  .col.borde { border-right:1px dashed var(--linea); }
  .col h4 { margin:0 0 8px; font-size:14px; font-family:'Bitter',serif; }
  .pm ul { margin:0; padding-left:18px; }
  .pm li { font-size:14px; line-height:1.55; margin-bottom:6px; }
  .grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:0; }
  @media (max-width:820px){ .grid3 { grid-template-columns:1fr; } }
  .box { padding:16px 24px; border-right:1px dashed var(--linea); }
  .box:last-child { border-right:none; }
  .aviso { margin:14px 0; padding:10px 14px; background:#FDF3E7; border:1px solid #E4C79B;
           border-radius:3px; font-size:13.5px; animation:pmSlideDown .25s ease both; }
  .nota { font-size:12px; color:var(--suave); line-height:1.5; }
  .ctxGrid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; padding:16px; }
  .lbl2 { display:block; font-size:12px; font-weight:600; color:var(--suave); margin-bottom:4px; }
  .material { border-bottom:1px dashed var(--linea); padding:10px 0; }
  .material:last-child { border-bottom:none; }
  .matContenido { margin-top:10px; padding:10px 12px; background:#F4F7F8; border:1px solid var(--linea); border-radius:3px; }
  .matContenido pre { margin:0; font-family:inherit; font-size:12.5px; line-height:1.6; white-space:pre-wrap; }
  .spin { display:inline-block; width:13px; height:13px; border:2px solid var(--linea);
          border-top-color:var(--tinta); border-radius:50%; animation:sp .7s linear infinite; }
  @keyframes sp { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce){
    .spin { animation:none; }
    .pm, .card, .riel, .indBox, .aviso, .plan { animation:none; }
    .btn:hover, .btn:active, .riel { transform:none; }
  }
  @media print {
    .pm { background:#fff; padding:0; }
    .noprint { display:none !important; }
    .plan { border:none; margin:0; }
    .momento, .split, .box { break-inside:avoid; }
  }
  `;

  const Bullets = ({ items }) => <ul>{(items || []).map((x, i) => <li key={i}>{x}</li>)}</ul>;

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
          <span style={{ display: "block", marginTop: 10, fontSize: 12.5, color: "var(--suave)" }}>
            <strong style={{ color: "var(--tinta)" }}>
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
              <button key={k} className={"chip" + (r.filtro === k ? " on" : "")} onClick={() => cambiarFiltro(idx, k)}>
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
          {cargando && <p className="nota">Cargando objetivos de aprendizaje…</p>}
          {!cargando &&
            filtrados(idx).map((o) => {
              const on = r.oaIds.includes(o.id);
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
                  <button className="reclasificar" onClick={() => alternarBasal(o.id, o.basal)}>
                    {o.basal ? "Marcar como complementario" : "Marcar como basal"}
                  </button>
                  {on && (
                    <div className="indBox">
                      {indCargando[o.id] && <span className="nota">Recopilando indicadores de evaluación…</span>}
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
          {!cargando && filtrados(idx).length === 0 && <p className="nota">No hay objetivos con ese filtro en esta asignatura.</p>}
        </div>

        <div style={{ padding: "0 12px 12px" }}>
          {nuevoOA.abierto === idx ? (
            <div style={{ border: "1px dashed var(--linea)", padding: 10, borderRadius: 3 }}>
              <textarea
                className="campo"
                rows={3}
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
      <style>{CSS}</style>
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
            </div>
          </div>
        )}

        {aviso && <div className="aviso noprint">{aviso}</div>}

        <div className="barra noprint" style={{ marginBottom: 18 }}>
          <div>
            <h3>Tipo de clase</h3>
            <p>Un curso único, o varios cursos combinados en aula multigrado.</p>
          </div>
          <div className="fila">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} className={"bloqueBtn" + (rieles.length === n ? " on" : "")} onClick={() => cambiarNumCursos(n)}>
                {n === 1 ? "Curso único" : `${n} cursos · multigrado`}
              </button>
            ))}
          </div>
        </div>

        <div className="rieles noprint">{rieles.map((_, i) => renderRiel(i))}</div>

        <div className="barra noprint">
          <div>
            <h3>Duración de la clase</h3>
            <p>Cada bloque dura 45 minutos.</p>
          </div>
          <div className="fila">
            <button className={"bloqueBtn" + (bloques === 1 ? " on" : "")} onClick={() => setBloques(1)}>
              1 bloque · 45 min
            </button>
            <button className={"bloqueBtn" + (bloques === 2 ? " on" : "")} onClick={() => setBloques(2)}>
              2 bloques · 90 min
            </button>
          </div>
          <div style={{ textAlign: "right" }}>
            <button className="btn solid" onClick={generar} disabled={!listo || generando} style={{ background: "#fff", color: "var(--acento)", borderColor: "#fff" }}>
              {generando && <span className="spin" style={{ marginRight: 8, verticalAlign: -2 }} />}
              {generando ? "Armando la clase…" : "Crear la clase"}
            </button>
            {!listo && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#E0E7FF", maxWidth: 240 }}>Falta elegir objetivo en: {faltantes.join(", ")}</p>
            )}
          </div>
        </div>

        {plan && (
          <article className="plan" id="plan-clase">
            <div className="planHd">
              <h2>{plan.titulo}</h2>
              <div className="sub">
                {plan.meta.multigrado ? "Aula multigrado" : "Clase"} · {plan.meta.cursos.map((c) => c.gradoNombre).join(" y ")} · {plan.meta.bloques} bloque
                {plan.meta.bloques > 1 ? "s" : ""} · {plan.meta.minutos} minutos
                {plan.meta.escuela ? " · " + plan.meta.escuela : ""}
                {plan.meta.docente ? " · " + plan.meta.docente : ""}
                {plan.meta.fecha ? " · " + plan.meta.fecha : ""}
              </div>
              <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.55 }}>{plan.hilo}</p>
              {plan.objetivosClase?.length > 0 && (
                <div className="ocBox">
                  <div className="lbl">Objetivo{plan.objetivosClase.length > 1 ? "s" : ""} de la clase</div>
                  {plan.objetivosClase.map((o, i) => (
                    <p key={i} style={{ margin: "0 0 6px", fontSize: 15, lineHeight: 1.5 }}>
                      {plan.meta.cursos.length > 1 && <strong style={{ color: colorDe(i) }}>{plan.meta.cursos[i]?.gradoNombre}: </strong>}
                      {o}
                    </p>
                  ))}
                </div>
              )}
              <div className="split" style={{ "--n": plan.meta.cursos.length, marginTop: 14 }}>
                {plan.meta.cursos.map((c, i) => (
                  <div key={i} className={"col" + (i < plan.meta.cursos.length - 1 ? " borde" : "")} style={{ paddingLeft: i === 0 ? 0 : 24 }}>
                    <h4 style={{ color: colorDe(i) }}>
                      {c.gradoNombre} · {c.asig}
                    </h4>
                    {c.oas.map((o, j) => (
                      <div key={j} style={{ margin: "0 0 10px" }}>
                        <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
                          <strong>{o.cod}</strong> <span className={"tag " + (o.basal ? "b" : "c")}>{o.basal ? "Basal" : "Complementario"}</span>
                          <br />
                          {o.texto}
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

            <div className="momento">
              <div className="momentoHd">
                <h3>Inicio</h3>
                <span className="min">{plan.inicio.min} minutos</span>
              </div>
              <div className="comun">
                <div className="lbl">Estudiantes</div>
                <Bullets items={plan.inicio.estudiantes} />
                <div className="lbl" style={{ marginTop: 10 }}>
                  Orientación al docente
                </div>
                <Bullets items={plan.inicio.docente} />
                {plan.inicio.pregunta && (
                  <p style={{ margin: "8px 0 0", fontSize: 14 }}>
                    <strong>Pregunta que abre la clase:</strong> {plan.inicio.pregunta}
                  </p>
                )}
              </div>
            </div>

            <div className="momento">
              <div className="momentoHd">
                <h3>Desarrollo</h3>
                <span className="min">{plan.desarrollo.min} minutos</span>
              </div>
              {((plan.desarrollo.comunEstudiantes || []).length > 0 || (plan.desarrollo.comunDocente || []).length > 0) && (
                <div className="comun">
                  <div className="lbl">Estudiantes, con todos los cursos</div>
                  <Bullets items={plan.desarrollo.comunEstudiantes} />
                  <div className="lbl" style={{ marginTop: 10 }}>
                    Orientación al docente
                  </div>
                  <Bullets items={plan.desarrollo.comunDocente} />
                </div>
              )}
              <div className="split" style={{ "--n": plan.meta.cursos.length }}>
                {plan.meta.cursos.map((c, i) => (
                  <div key={i} className={"col" + (i < plan.meta.cursos.length - 1 ? " borde" : "")}>
                    {plan.meta.cursos.length > 1 && <h4 style={{ color: colorDe(i) }}>{c.gradoNombre} trabaja en</h4>}
                    <div className="lbl">Estudiantes</div>
                    <Bullets items={plan.desarrollo.porCurso?.[i]?.estudiantes} />
                    <div className="lbl" style={{ marginTop: 10 }}>
                      Orientación al docente
                    </div>
                    <Bullets items={plan.desarrollo.porCurso?.[i]?.docente} />
                  </div>
                ))}
              </div>
            </div>

            <div className="momento">
              <div className="momentoHd">
                <h3>Cierre</h3>
                <span className="min">{plan.cierre.min} minutos</span>
              </div>
              <div className="comun">
                <div className="lbl">Estudiantes</div>
                <Bullets items={plan.cierre.estudiantes} />
                <div className="lbl" style={{ marginTop: 10 }}>
                  Orientación al docente
                </div>
                <Bullets items={plan.cierre.docente} />
                <div className="lbl" style={{ marginTop: 10 }}>
                  Preguntas para los estudiantes
                </div>
                <Bullets items={plan.cierre.metacognicion} />
              </div>
            </div>

            <div className="momento">
              <div className="momentoHd">
                <h3>Diversificación</h3>
                <span className="min">Diseño Universal para el Aprendizaje</span>
              </div>
              <div className="grid3">
                <div className="box">
                  <h4 style={{ margin: "0 0 8px", fontFamily: "'Bitter',serif", fontSize: 14 }}>Cómo se presenta</h4>
                  <Bullets items={plan.dua.representacion} />
                </div>
                <div className="box">
                  <h4 style={{ margin: "0 0 8px", fontFamily: "'Bitter',serif", fontSize: 14 }}>Cómo responden</h4>
                  <Bullets items={plan.dua.accion} />
                </div>
                <div className="box">
                  <h4 style={{ margin: "0 0 8px", fontFamily: "'Bitter',serif", fontSize: 14 }}>Cómo se involucran</h4>
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
                    <Bullets items={plan.evaluacion.porCurso?.[i]?.criterios} />
                  </div>
                ))}
              </div>
            </div>

            {(plan.tutoria || plan.adecuaciones?.length > 0) && (
              <div className="momento">
                <div className="grid3">
                  {plan.tutoria && (
                    <div className="box">
                      <h4 style={{ margin: "0 0 8px", fontFamily: "'Bitter',serif", fontSize: 14 }}>Tutoría entre pares</h4>
                      <p style={{ fontSize: 14, lineHeight: 1.55, margin: 0 }}>{plan.tutoria}</p>
                    </div>
                  )}
                  <div className="box">
                    <h4 style={{ margin: "0 0 8px", fontFamily: "'Bitter',serif", fontSize: 14 }}>Adecuaciones</h4>
                    <Bullets items={plan.adecuaciones} />
                  </div>
                </div>
              </div>
            )}

            <div className="momento">
              <div className="momentoHd">
                <h3>Materiales</h3>
                <span className="min">El contenido listo para usar se genera solo; agrega el link solo si es un recurso externo</span>
              </div>
              <div style={{ padding: "0 24px 16px" }}>
                {(plan.materiales || []).map((m, i) => (
                  <div key={i} className="material">
                    <div className="fila" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: "1 1 240px" }}>
                        <strong style={{ fontSize: 13.5 }}>{m.tipo}</strong>
                        <p style={{ margin: "2px 0 0", fontSize: 13.5, color: "var(--suave)" }}>{m.descripcion}</p>
                      </div>
                      {!m.contenido && (
                        <div className="noprint" style={{ flex: "1 1 220px" }}>
                          <label className="lbl2" htmlFor={`mat-link-${i}`}>
                            Link (opcional)
                          </label>
                          <input
                            id={`mat-link-${i}`}
                            className="campo"
                            placeholder="Pega aquí el link del material"
                            value={m.link || ""}
                            onChange={(e) => actualizarLinkMaterial(i, e.target.value)}
                          />
                        </div>
                      )}
                      {m.link && (
                        <a className="nota" href={m.link} target="_blank" rel="noreferrer">
                          {m.link}
                        </a>
                      )}
                    </div>
                    {m.contenido && (
                      <div className="matContenido">
                        <div className="fila noprint" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                          <span className="lbl2" style={{ margin: 0 }}>
                            Contenido listo para usar
                          </span>
                          <button className="btn sm" onClick={() => copiarMaterial(m.contenido)}>
                            Copiar
                          </button>
                        </div>
                        <pre>{m.contenido}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="fila noprint" style={{ padding: "16px 24px" }}>
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
                Guardar
              </button>
              <button className="btn" onClick={generar} disabled={generando}>
                {generando && <span className="spin" style={{ marginRight: 8, verticalAlign: -2 }} />}
                {generando ? "Armando…" : "Crear otra versión"}
              </button>
            </div>
          </article>
        )}

        {guardadas.length > 0 && (
          <section className="card noprint" style={{ marginTop: 24, padding: 16 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Planificaciones guardadas</h3>
            {guardadas.map((g) => (
              <div key={g.id} className="fila" style={{ justifyContent: "space-between", borderBottom: "1px dashed var(--linea)", padding: "8px 0" }}>
                <span style={{ fontSize: 14 }}>
                  {g.titulo} <span className="nota">· {g.fecha}</span>
                </span>
                <span className="fila">
                  <button className="btn sm" onClick={() => setPlan(g.plan)}>
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

        <p className="nota noprint" style={{ marginTop: 26, maxWidth: "70ch" }}>
          Los objetivos de 1º y 2º básico vienen de las Bases Curriculares curadas en esta app; los del resto de los cursos se piden en línea y quedan en caché
          mientras no recargues la página. La marca basal o complementario es una propuesta de priorización: puedes cambiarla en cada objetivo con el botón de
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
