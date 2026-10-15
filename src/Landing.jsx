import React from "react";
import AdSlot from "./AdSlot.jsx";

const ADSENSE_SLOT_LANDING = import.meta.env.VITE_ADSENSE_SLOT_LANDING || "";

export default function Landing({ onComenzar }) {
  return (
    <div className="ld">
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
