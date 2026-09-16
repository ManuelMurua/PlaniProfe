import React from "react";
import AdSlot from "./AdSlot.jsx";

const ADSENSE_SLOT_LANDING = import.meta.env.VITE_ADSENSE_SLOT_LANDING || "";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bitter:wght@500;700&family=Inter:wght@400;500;600&display=swap');
.ld { --tinta:#0F172A; --suave:#64748B; --papel:#F1F5F9; --linea:#E2E8F0; --blanco:#FFFFFF;
      --acento:#4F46E5; --acentoHover:#4338CA;
      font-family:'Inter',system-ui,-apple-system,sans-serif; color:var(--tinta); background:var(--papel);
      background-image:linear-gradient(rgba(79,70,229,.05) 1px, transparent 1px),
                       linear-gradient(90deg, rgba(79,70,229,.05) 1px, transparent 1px);
      background-size:26px 26px;
      min-height:100vh; display:flex; align-items:center; padding:48px 16px; }
.ld h1,.ld h2 { font-family:'Bitter',Georgia,serif; }
@keyframes ldFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
.ldWrap { max-width:840px; margin:0 auto; animation:ldFadeUp .5s ease both; }
.ldKicker { font-size:13px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--suave); margin:0 0 10px; }
.ld h1 { font-size:40px; line-height:1.15; margin:0 0 16px; font-weight:700; letter-spacing:-.01em; }
.ldLead { font-size:16.5px; line-height:1.6; color:var(--suave); max-width:62ch; margin:0 0 34px; }
.ldGrid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; margin-bottom:34px; }
.ldCard { background:var(--blanco); border:1px solid var(--linea); border-top:4px solid var(--acento); border-radius:4px; padding:18px 18px 20px;
          animation:ldFadeUp .5s ease both; transition:transform .18s ease, box-shadow .18s ease; }
.ldCard:nth-child(1) { animation-delay:.06s; }
.ldCard:nth-child(2) { animation-delay:.13s; }
.ldCard:nth-child(3) { animation-delay:.2s; }
.ldCard:hover { transform:translateY(-3px); box-shadow:0 8px 20px rgba(23,38,47,.09); }
.ldCard h2 { font-size:15.5px; margin:0 0 8px; }
.ldCard p { font-size:13.5px; line-height:1.55; color:var(--suave); margin:0; }
.ldCta { font:inherit; font-size:16px; font-weight:600; padding:14px 26px; border-radius:3px; border:1px solid var(--acento);
         background:var(--acento); color:#fff; cursor:pointer;
         transition:background-color .15s ease, transform .12s ease, box-shadow .15s ease; }
.ldCta:hover { background:var(--acentoHover); border-color:var(--acentoHover); transform:translateY(-1px); box-shadow:0 6px 16px rgba(79,70,229,.35); }
.ldCta:active { transform:translateY(0); box-shadow:none; }
.ldCta:focus-visible { outline:2px solid var(--acento); outline-offset:3px; }
.ldFoot { margin:20px 0 0; font-size:12.5px; color:var(--suave); line-height:1.6; max-width:60ch; }
.ldAd { margin-top:28px; }
@media (prefers-reduced-motion:reduce) {
  .ldWrap, .ldCard { animation:none; }
  .ldCard:hover, .ldCta:hover, .ldCta:active { transform:none; }
}
`;

export default function Landing({ onComenzar }) {
  return (
    <div className="ld">
      <style>{CSS}</style>
      <div className="ldWrap">
        <p className="ldKicker">1º básico a 4º medio · aula única o multigrado</p>
        <h1>Arma la clase de hoy sin partir de una hoja en blanco</h1>
        <p className="ldLead">
          Elige el curso o los cursos que combinas en tu sala, selecciona los objetivos de aprendizaje —basales y complementarios— que quieres
          trabajar, y arma inicio, desarrollo, cierre, evaluación y materiales en minutos.
        </p>

        <div className="ldGrid">
          <div className="ldCard">
            <h2>De 1º básico a 4º medio</h2>
            <p>Trabaja un curso a la vez, o combina hasta 4 cursos distintos en la misma sala para aula multigrado.</p>
          </div>
          <div className="ldCard">
            <h2>Objetivos e indicadores</h2>
            <p>Elige varios OA basales y complementarios por curso, con sus indicadores de evaluación (habilidad, contenido y actitud).</p>
          </div>
          <div className="ldCard">
            <h2>Clase lista, con materiales</h2>
            <p>Inicio, desarrollo, cierre, diversificación DUA y una lista de materiales para que agregues tus propios links.</p>
          </div>
        </div>

        <button className="ldCta" onClick={onComenzar}>
          Comenzar a planificar →
        </button>

        <p className="ldFoot">
          Los objetivos vienen del currículum vigente y son editables; siempre revisa la planificación contra el programa de estudio de tu
          establecimiento antes de entregarla.
        </p>

        <div className="ldAd">
          <AdSlot slot={ADSENSE_SLOT_LANDING} />
        </div>
      </div>
    </div>
  );
}
