// Self-check de la lógica pura (sin React). Ejecutar con: npm run check
import assert from "node:assert/strict";
import {
  listaOA,
  oaFallback,
  indicadoresFallback,
  limpiarJSON,
  ajustarNumCursos,
  rielVacio,
  planRespaldo,
  objetivoClaseDe,
  fichaBasica,
  planTexto,
  normalizarMaterial,
  normalizarMateriales,
  numEstudiantes,
  TIPOS_MINIMOS,
} from "./curriculo.js";

// listaOA: los datos curados traen la clasificación basal correcta y se puede sobreescribir
{
  const oas = listaOA("LEN", "B1", [], {});
  assert.ok(oas.length > 0, "LEN-B1 debería traer objetivos curados");
  const primero = oas[0];
  assert.equal(primero.basal, true);
  const conOverride = listaOA("LEN", "B1", [], { [primero.id]: false });
  assert.equal(conOverride[0].basal, false, "el override debe invertir la clasificación basal");
}

// listaOA: usa el caché (OA pedidos a la API) cuando no hay datos curados para ese curso
{
  const cache = { "MAT-B5": [[1, "OA de prueba", 1, "Eje"]] };
  const oas = listaOA("MAT", "B5", [], {}, cache);
  assert.equal(oas.length, 1);
  assert.equal(oas[0].texto, "OA de prueba");
}

// listaOA: incluye objetivos propios agregados por el docente
{
  const extras = [{ id: "PROP-B3-1", asig: "CN", grado: "B3", texto: "Objetivo propio de prueba", basal: true, cod: "OA propio", eje: "Propio" }];
  const oas = listaOA("CN", "B3", extras, {});
  assert.ok(oas.some((o) => o.propio && o.texto === "Objetivo propio de prueba"));
}

// oaFallback: siempre entrega objetivos provisionales marcados como tales
{
  const fb = oaFallback("Matemática", "5º básico");
  assert.equal(fb.length, 4);
  assert.ok(fb.every(([, , , eje]) => eje === "Provisional"));
}

// indicadoresFallback: entrega 4 indicadores con habilidad, contenido y actitud
{
  const ind = indicadoresFallback({ texto: "Contar números del 0 al 100 de 1 en 1." }, "MAT");
  assert.equal(ind.length, 4);
  assert.ok(ind.every((x) => x.i && x.h && x.c && x.a));
}

// limpiarJSON: quita fences de markdown y texto sobrante
{
  const sucio = 'Aquí tienes:\n```json\n[{"a":1}]\n```\nGracias';
  assert.equal(limpiarJSON(sucio), '[{"a":1}]');
}

// ajustarNumCursos: agranda y recorta sin repetir grado cuando hay disponibles, conservando el primero
{
  let rieles = [rielVacio("B1")];
  rieles = ajustarNumCursos(rieles, 3);
  assert.equal(rieles.length, 3);
  assert.equal(new Set(rieles.map((r) => r.grado)).size, 3, "no debería repetir grado si hay disponibles");
  rieles = ajustarNumCursos(rieles, 1);
  assert.equal(rieles.length, 1);
  assert.equal(rieles[0].grado, "B1", "debe conservar el primer riel al recortar");
}

// objetivoClaseDe: usa los indicadores elegidos por el docente si existen, si no cae al texto del OA
{
  const conElegido = { oas: [{ texto: "Contar hasta 20", indElegidos: [{ i: "Cuenta hasta 20 con material concreto." }] }] };
  assert.equal(objetivoClaseDe(conElegido), "Cuenta hasta 20 con material concreto.");
  const sinElegido = { oas: [{ texto: "Contar hasta 20", indElegidos: [] }] };
  assert.equal(objetivoClaseDe(sinElegido), "Contar hasta 20");
}

// fichaBasica: arma ítems en 3 niveles desde los indicadores, con solucionario, sin repetir el OA como ítem
{
  const ficha = fichaBasica({ gradoNombre: "1º básico", asig: { id: "MAT", nombre: "Matemática" }, oas: [{ texto: "Contar hasta 20" }] });
  assert.ok(!ficha.contenido.split("\n").some((l) => /^\d+\. Contar hasta 20\.?$/.test(l)), "no debe repetir el OA literal como ítem");
  ["NIVEL BÁSICO", "NIVEL INTERMEDIO", "NIVEL DESAFÍO"].forEach((n) => assert.ok(ficha.contenido.includes(n), "falta " + n));
  assert.ok(ficha.solucionario.includes("6. Se espera"), "el solucionario cubre cada ítem");
  assert.ok(fichaBasica({ oas: [] }).contenido.includes("1. "), "sin objetivos igual entrega una ficha usable");
}

// numEstudiantes: un número por curso, o "curso: N" separado por comas
{
  assert.equal(numEstudiantes("25", { gradoNombre: "3º básico" }), 25);
  assert.equal(numEstudiantes("1º básico: 5, 3º básico: 4", { gradoNombre: "3º básico" }), 4);
  assert.equal(numEstudiantes("", { gradoNombre: "3º básico" }), null);
}

// planRespaldo + planTexto: arman un documento con las secciones clave, con 1 y con varios cursos
{
  const cursos = [
    {
      grado: "B1",
      gradoNombre: "1º básico",
      asig: { nombre: "Matemática", corto: "Matemática" },
      oas: [
        {
          cod: "OA 1",
          basal: true,
          texto: "Contar hasta 20",
          indicadores: [{ i: "Cuenta hasta 20 con material concreto.", h: "Cuenta", c: "Números hasta 20", a: "Persevera ante el error." }],
          indElegidos: [{ i: "Cuenta hasta 20 con material concreto.", h: "Cuenta", c: "Números hasta 20", a: "Persevera ante el error." }],
        },
      ],
    },
    { grado: "B3", gradoNombre: "3º básico", asig: { nombre: "Matemática", corto: "Matemática" }, oas: [{ cod: "OA 2", basal: false, texto: "Multiplicar por 10" }] },
  ];
  const plan = planRespaldo(cursos, 2, { recursos: "" }, true);
  plan.meta = {
    bloques: 2,
    minutos: 90,
    fecha: "",
    escuela: "",
    docente: "",
    multigrado: true,
    cursos: cursos.map((c) => ({ gradoNombre: c.gradoNombre, asig: c.asig.nombre, oas: c.oas })),
  };
  assert.equal(plan.desarrollo.porCurso.length, 2, "debe generar un bloque de desarrollo por curso");
  assert.ok(plan.tutoria, "con más de un curso debe proponer tutoría entre pares");
  assert.equal(plan.objetivosClase[0], "Cuenta hasta 20 con material concreto.", "el objetivo de la clase debe usar el indicador elegido");
  assert.equal(plan.objetivosClase[1], "Multiplicar por 10", "sin indicador elegido debe usar el texto del OA");

  const txt = planTexto(plan);
  assert.ok(txt.includes("Contar hasta 20"));
  assert.ok(txt.includes("Multiplicar por 10"));
  assert.ok(txt.includes("Cuenta hasta 20 con material concreto."), "el texto exportado debe incluir el indicador recopilado del OA");
  assert.ok(txt.includes("Tutoría entre pares"));
  assert.ok(txt.includes("Guía del estudiante"));
  assert.ok(txt.includes("Para el docente, solucionario"), "el texto exportado debe incluir el solucionario");
  assert.ok(txt.includes("Preparación previa") && txt.includes("Cantidad:") && txt.includes("[Verificado Mineduc]"), "exporta preparación, cantidades y referencias");
}

// Materiales sin conexión: 6 tipos mínimos (guía, ticket e instrumento por curso), ningún campo vacío, sin genéricos sueltos
const cursoMAT = (grado, gradoNombre, texto, indicadores) => ({
  grado,
  gradoNombre,
  asig: { id: "MAT", nombre: "Matemática", corto: "Matemática" },
  oas: [{ cod: "OA 1", basal: true, texto, indicadores, indElegidos: [] }],
});
const ind = [{ i: "Cuenta hasta 20 con material concreto.", h: "Cuenta", c: "Números hasta 20", a: "Persevera." }];
const vacio = (x) => (Array.isArray(x) ? !x.length || x.some((y) => !String(y).trim()) : !String(x ?? "").trim());
for (const cursos of [
  [cursoMAT("B1", "1º básico", "Contar hasta 20", ind)],
  [cursoMAT("B1", "1º básico", "Contar hasta 20", ind), cursoMAT("B3", "3º básico", "Multiplicar por 10"), cursoMAT("B5", "5º básico", "Dividir")],
]) {
  const ctx = { estudiantes: "12", recursos: "bloques multibase, láminas" };
  const plan = planRespaldo(cursos, 1, ctx, cursos.length > 1);
  const mats = plan.materiales;
  TIPOS_MINIMOS.forEach((t) => assert.ok(mats.some((m) => m.tipo === t), "falta el tipo " + t));
  ["guia_estudiante", "ticket_salida", "instrumento_evaluacion"].forEach((t) =>
    cursos.forEach((_, i) => assert.ok(mats.some((m) => m.tipo === t && m.curso === i), `falta ${t} del curso ${i}`))
  );
  mats.forEach((m) => {
    ["id", "tipo", "titulo", "proposito", "momento", "contenido", "preparacion", "instrucciones_uso", "solucionario", "adecuacion", "alternativa_sin_tecnologia", "referencias"].forEach((k) =>
      assert.ok(!vacio(m[k]), `campo vacío: ${k} en ${m.titulo}`)
    );
    assert.ok(m.cantidad && !vacio(m.cantidad.total) && m.cantidad.numero > 0, "cantidad incompleta en " + m.titulo);
    assert.ok(!/^(pizarra|cuadernos?|recursos propios)$/i.test(m.titulo), "material genérico suelto: " + m.titulo);
    assert.ok(m.referencias.some((r) => r.tipo_link === "curado"), "cada material lleva un portal Mineduc verificado");
    if (["guia_estudiante", "ticket_salida", "instrumento_evaluacion"].includes(m.tipo)) assert.ok(!/^no aplica/i.test(m.solucionario), "solucionario obligatorio en " + m.tipo);
  });
  const fisicos = mats.find((m) => m.tipo === "materiales_fisicos");
  assert.ok(fisicos.contenido.includes("bloques multibase") && fisicos.contenido.includes("láminas"), "los recursos del docente aparecen con uso concreto");
  assert.ok(fisicos.contenido.includes("12 estudiantes"), "las cantidades usan el N° de estudiantes");
  cursos.forEach((_, i) => {
    const inst = mats.find((m) => m.tipo === "instrumento_evaluacion" && m.curso === i);
    plan.evaluacion.porCurso[i].criterios.forEach((c) => assert.ok(inst.contenido.includes(c), "el instrumento usa los criterios de la evaluación"));
  });
}

// normalizarMaterial: un link no https (o vacío) se reemplaza por búsqueda con curso y asignatura; un https queda como "ia"
{
  const cursos = [cursoMAT("B1", "1º básico", "Contar hasta 20", ind)];
  for (const url of ["javascript:x", "", "http://inseguro.cl"]) {
    const m = normalizarMaterial({ tipo: "video", titulo: "Video", contenido: "Guion del video", referencias: [{ url, titulo: "x" }] }, cursos, {});
    assert.ok(!m.referencias.some((r) => r.url === url), "el link inválido debe descartarse: " + url);
    const b = m.referencias.filter((r) => r.tipo_link === "busqueda");
    assert.ok(b.length && b.every((r) => decodeURIComponent(r.url).includes("Matemática") && decodeURIComponent(r.url).includes("1º básico")), "la búsqueda lleva asignatura y curso");
    assert.ok(m.referencias.some((r) => r.tipo_link === "curado"));
  }
  const ok = normalizarMaterial({ tipo: "video", contenido: "Guion", referencias: [{ url: "https://www.youtube.com/watch?v=abc" }, { id: "textos" }] }, cursos, {});
  assert.ok(ok.referencias.some((r) => r.tipo_link === "ia" && r.url === "https://www.youtube.com/watch?v=abc"));
  assert.ok(ok.referencias.some((r) => r.tipo_link === "curado" && r.url.includes("textos_escolares")), "un id de portal se resuelve con la lista curada");
  // la API trae una guía sin solucionario y una "Pizarra" suelta: se usa la guía de respaldo, se quita la pizarra y se completan los tipos
  const lista = normalizarMateriales([{ tipo: "guia_estudiante", contenido: "1. algo", solucionario: "" }, { tipo: "Pizarra", titulo: "Pizarra", contenido: "x" }], cursos, {});
  assert.ok(!lista.some((m) => m.titulo === "Pizarra"));
  assert.ok(lista.find((m) => m.tipo === "guia_estudiante").solucionario.includes("Se espera"));
  TIPOS_MINIMOS.forEach((t) => assert.ok(lista.some((m) => m.tipo === t)));
}

// Compatibilidad: un plan guardado con el formato antiguo de materiales pasa por planTexto sin romper
{
  const viejo = planRespaldo([cursoMAT("B1", "1º básico", "Contar hasta 20", ind)], 1, {}, false);
  viejo.meta = { bloques: 1, minutos: 45, fecha: "", escuela: "", docente: "", multigrado: false, cursos: [{ gradoNombre: "1º básico", asig: "Matemática", oas: [] }] };
  viejo.materiales = [
    { tipo: "Ficha de trabajo", descripcion: "Ítems para practicar.", contenido: "1. Cuenta", link: "" },
    { tipo: "Pizarra", descripcion: "Para escribir los objetivos.", contenido: "", link: "https://ejemplo.cl/x" },
  ];
  const txt = planTexto(viejo);
  assert.ok(txt.includes("Ficha de trabajo: Ítems para practicar.") && txt.includes("1. Cuenta"));
  assert.ok(txt.includes("Link del docente: https://ejemplo.cl/x"));
}

console.log("curriculo.selfcheck: todo OK");
