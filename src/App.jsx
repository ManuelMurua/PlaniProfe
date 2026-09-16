import React, { useState } from "react";
import Landing from "./Landing.jsx";
import Planificador from "./Planificador.jsx";

export default function App() {
  const [entrado, setEntrado] = useState(false);
  return entrado ? <Planificador onVolver={() => setEntrado(false)} /> : <Landing onComenzar={() => setEntrado(true)} />;
}
