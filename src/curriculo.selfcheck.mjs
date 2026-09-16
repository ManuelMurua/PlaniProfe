// Self-check de la lógica pura (sin React). Ejecutar con: npm run check
import assert from "node:assert/strict";
import { listaOA, oaFallback, indicadoresFallback, limpiarJSON, ajustarNumCursos, rielVacio, planRespaldo, objetivoClaseDe, fichaBasica, planTexto } from "./curriculo.js";

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

// fichaBasica: genera un material listo para usar a partir de los objetivos, sin depender de la API
{
  const ficha = fichaBasica([{ oas: [{ texto: "Contar hasta 20" }] }]);
  assert.ok(ficha.includes("1. Contar hasta 20"));
  assert.ok(fichaBasica([{ oas: [] }]).length > 0, "sin objetivos igual entrega una ficha usable");
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
  plan.materiales = plan.materiales.map((m) => ({ ...m, link: "" }));
  assert.equal(plan.desarrollo.porCurso.length, 2, "debe generar un bloque de desarrollo por curso");
  assert.ok(plan.tutoria, "con más de un curso debe proponer tutoría entre pares");
  assert.equal(plan.objetivosClase[0], "Cuenta hasta 20 con material concreto.", "el objetivo de la clase debe usar el indicador elegido");
  assert.equal(plan.objetivosClase[1], "Multiplicar por 10", "sin indicador elegido debe usar el texto del OA");

  const txt = planTexto(plan);
  assert.ok(txt.includes("Contar hasta 20"));
  assert.ok(txt.includes("Multiplicar por 10"));
  assert.ok(txt.includes("Cuenta hasta 20 con material concreto."), "el texto exportado debe incluir el indicador recopilado del OA");
  assert.ok(txt.includes("Tutoría entre pares"));
  assert.ok(txt.includes("Pizarra: Para escribir los objetivos"));
  assert.ok(txt.includes("Ficha de trabajo"));
  assert.ok(txt.includes("1. Contar hasta 20"), "el contenido de la ficha generada debe quedar en el texto exportado");
}

console.log("curriculo.selfcheck: todo OK");
