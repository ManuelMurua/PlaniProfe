// Recursos oficiales/confiables para docentes de Chile (1º básico a 4º medio).
// Cada URL marcada se comprobó con HTTP 200 (curl -L) y revisando el <title> o el contenido.
// Nota: curriculumnacional.cl se rediseñó (Drupal). Las URLs antiguas /portal/... hoy redirigen a la portada o al buscador.
// Revisar esta lista cada semestre.

export const PORTALES = [
  { id: 'curriculum', nombre: 'Currículum Nacional (Mineduc)', url: 'https://www.curriculumnacional.cl/', // verificado 2026-09-22
    uso: 'Bases curriculares, programas de estudio, OA e indicadores por asignatura y curso.' },
  { id: 'aprendo', nombre: 'Aprendo en Línea (Mineduc)', url: 'https://www.curriculumnacional.cl/aprendo_en_linea', // verificado 2026-09-22
    uso: 'Recursos y actividades para estudiantes, por curso y asignatura.' },
  { id: 'textos', nombre: 'Textos Escolares (Currículum Nacional)', url: 'https://www.curriculumnacional.cl/textos_escolares', // verificado 2026-09-22
    uso: 'Textos del estudiante y guías didácticas del docente en PDF.' },
  { id: 'bde', nombre: 'Biblioteca Digital Escolar', url: 'https://bdescolar.mineduc.cl/', // verificado 2026-09-22
    uso: 'Préstamo digital de libros y lecturas complementarias (requiere RUN/clave escolar para leer).' },
  { id: 'eval_formativa', nombre: 'Actividades Evaluativas Formativas', url: 'https://www.curriculumnacional.cl/evaluacion/actividades-evaluativas-formativas', // verificado 2026-09-22
    uso: 'Actividades de evaluación formativa listas para usar.' },
  { id: 'dua', nombre: 'Orientaciones Técnicas Decreto 83 (DUA)', url: 'https://especial.mineduc.cl/implementacion-decreto-83/orientaciones-tecnicas/', // verificado 2026-09-22
    uso: 'Diversificación de la enseñanza, DUA y adecuaciones curriculares.' },
];

// Patrón por curso verificado (74 URLs, todas HTTP 200; control negativo /matematica/9-basico -> 404):
//   1º-6º básico: /curriculum/1o-6o-basico/<slug>/<n>-basico
//   7º-2º medio:  /curriculum/7o-basico-2o-medio/<slug>/<7-basico|8-basico|1-medio|2-medio>   (ojo: "2o-medio")
//   3º-4º medio:  /curriculum/3o-4o-medio/<slug>/<3|4>-medio-fg   (slugs distintos, sin Historia/Tecnología/Orientación en FG)
const CN = 'https://www.curriculumnacional.cl/curriculum';
const GRADO = {
  B1: '1o-6o-basico|1-basico', B2: '1o-6o-basico|2-basico', B3: '1o-6o-basico|3-basico',
  B4: '1o-6o-basico|4-basico', B5: '1o-6o-basico|5-basico', B6: '1o-6o-basico|6-basico',
  B7: '7o-basico-2o-medio|7-basico', B8: '7o-basico-2o-medio|8-basico',
  M1: '7o-basico-2o-medio|1-medio', M2: '7o-basico-2o-medio|2-medio',
  M3: '3o-4o-medio|3-medio-fg', M4: '3o-4o-medio|4-medio-fg',
};

// slug por ciclo; null = la asignatura no existe con ese nombre en ese ciclo.
// 3º-4º medio (FG): HIS -> Educación Ciudadana; CN -> Ciencias para la Ciudadanía (módulo Ambiente y Sostenibilidad).
// TEC en 3º-4º medio -> módulo "Tecnología y Sociedad" de Ciencias para la Ciudadanía (equivalencia aproximada).
const SLUG = {
  LEN: { b: 'lenguaje-comunicacion', m: 'lengua-literatura', m34: n => `lengua-literatura-${n}o-medio` },
  MAT: { b: 'matematica', m: 'matematica', m34: n => `matematica-${n}o-medio` },
  CN:  { b: 'ciencias-naturales', m: 'ciencias-naturales', m34: () => 'ambiente-sostenibilidad' },
  HIS: { b: 'historia-geografia-ciencias-sociales', m: 'historia-geografia-ciencias-sociales', m34: n => `educacion-ciudadana-${n}-medio` },
  TEC: { b: 'tecnologia', m: 'tecnologia', m34: () => 'tecnologia-sociedad' },
  ORI: { b: 'orientacion', m: 'orientacion', m34: null },
};

function urlCurso(asig, grado) { // verificado 2026-09-22 (todas las combinaciones LEN/MAT/CN/HIS/TEC/ORI x B1..M4 no nulas)
  const s = SLUG[asig], g = GRADO[grado];
  if (!s || !g) return null;
  const [ciclo, curso] = g.split('|');
  const slug = ciclo === '1o-6o-basico' ? s.b : ciclo === '3o-4o-medio' ? (s.m34 && s.m34(curso[0])) : s.m;
  return slug ? `${CN}/${ciclo}/${slug}/${curso}` : null;
}

// Página general de ámbitos y asignaturas (no hay página "raíz" por asignatura en el sitio nuevo).
const AMBITOS = 'https://www.curriculumnacional.cl/curriculum/ambitos-y-asignaturas'; // verificado 2026-09-22

export const PAGINA_ASIGNATURA = Object.fromEntries(
  Object.keys(SLUG).map(k => [k, { url: AMBITOS, porCurso: grado => urlCurso(k, grado) }])
);
// Ej.: PAGINA_ASIGNATURA.MAT.porCurso('B1') -> .../curriculum/1o-6o-basico/matematica/1-basico ("Matemática 1° Básico")
//      PAGINA_ASIGNATURA.ORI.porCurso('M3') -> null

// NO incluidas (no verificadas o no válidas):
// - https://aprendoenlinea.mineduc.cl  -> error TLS (curl 35); usar curriculumnacional.cl/aprendo_en_linea
// - https://www.curriculumnacional.cl/portal/Priorizacion-Curricular-2023-2025/ -> redirige a un buscador vacío (vigencia hasta 2025)
// - https://www.yoestudio.cl -> responde, pero es un comparador comercial de universidades, NO Mineduc
// - https://plandelectura.gob.cl -> no responde; el oficial es plandelectura.cultura.gob.cl
// - https://leo.mineduc.cl -> no responde
// - https://www.educarchile.cl/recursos y /docentes -> 404 (sin buscador verificado en educarchile)
