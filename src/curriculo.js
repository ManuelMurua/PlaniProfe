/* ============================================================
   DATOS Y LÓGICA PURA (sin React, sin fetch): se puede importar
   y probar directamente con Node. Ver curriculo.selfcheck.mjs.
   ============================================================ */

import { PORTALES, PAGINA_ASIGNATURA } from "./recursos.js";

export const GRADOS = [
  { id: "B1", nombre: "1º básico" },
  { id: "B2", nombre: "2º básico" },
  { id: "B3", nombre: "3º básico" },
  { id: "B4", nombre: "4º básico" },
  { id: "B5", nombre: "5º básico" },
  { id: "B6", nombre: "6º básico" },
  { id: "B7", nombre: "7º básico" },
  { id: "B8", nombre: "8º básico" },
  { id: "M1", nombre: "1º medio" },
  { id: "M2", nombre: "2º medio" },
  { id: "M3", nombre: "3º medio" },
  { id: "M4", nombre: "4º medio" },
];

export const nombreGrado = (id) => GRADOS.find((g) => g.id === id)?.nombre || id;

export const ASIGNATURAS = [
  { id: "LEN", nombre: "Lenguaje y Comunicación", corto: "Lenguaje" },
  { id: "MAT", nombre: "Matemática", corto: "Matemática" },
  { id: "CN", nombre: "Ciencias Naturales", corto: "Ciencias" },
  { id: "HIS", nombre: "Historia, Geografía y Cs. Sociales", corto: "Historia" },
  { id: "TEC", nombre: "Tecnología", corto: "Tecnología" },
  { id: "ORI", nombre: "Orientación", corto: "Orientación" },
];

/* ============================================================
   BASE CURRICULAR CURADA — hoy solo 1º y 2º básico (Chile)
   Formato: [nº OA, texto, 1=basal / 0=complementario, eje]
   Para el resto de los cursos (3º básico a 4º medio) los OA se
   piden a la API (ver pedirOA en Planificador.jsx) y quedan en
   caché; si no hay conexión se usa oaFallback().
   ============================================================ */

export const OA_DATA = {
  LEN: {
    B1: [
      [1, "Reconocer que los textos escritos transmiten mensajes y que son escritos por alguien para cumplir un propósito.", 1, "Lectura"],
      [2, "Reconocer que las palabras son unidades de significado separadas por espacios en el texto escrito.", 1, "Lectura"],
      [3, "Identificar los sonidos que componen las palabras (conciencia fonológica), reconociendo, separando y combinando sus fonemas y sílabas.", 1, "Lectura"],
      [4, "Leer palabras aisladas y en contexto, aplicando su conocimiento de la correspondencia letra-sonido en diferentes combinaciones.", 1, "Lectura"],
      [5, "Leer textos breves en voz alta para adquirir fluidez, pronunciando cada palabra con precisión y respetando el punto seguido y aparte.", 1, "Lectura"],
      [6, "Comprender textos aplicando estrategias de comprensión lectora: relacionar con las propias experiencias, visualizar, preguntar sobre lo leído.", 1, "Lectura"],
      [7, "Leer independientemente y familiarizarse con un amplio repertorio de literatura para aumentar su conocimiento del mundo y desarrollar su imaginación.", 0, "Lectura"],
      [8, "Demostrar comprensión de narraciones que aborden temas que les sean familiares: extrayendo información explícita e implícita, describiendo personajes, expresando opiniones.", 1, "Lectura"],
      [9, "Leer habitualmente y disfrutar textos poéticos breves, recitando poemas y rimas.", 0, "Lectura"],
      [10, "Leer independientemente y comprender textos no literarios (cartas, notas, instrucciones y artículos informativos) para entretenerse y ampliar su conocimiento del mundo.", 1, "Lectura"],
      [11, "Desarrollar el gusto por la lectura, explorando libros y sus ilustraciones.", 0, "Lectura"],
      [12, "Asistir habitualmente a la biblioteca para elegir, escuchar, leer y explorar textos de su interés.", 0, "Lectura"],
      [13, "Experimentar con la escritura para comunicar hechos, ideas y sentimientos, incorporando las palabras que ha aprendido.", 1, "Escritura"],
      [14, "Escribir oraciones completas para transmitir mensajes.", 1, "Escritura"],
      [15, "Escribir con letra clara, separando las palabras con un espacio, para que pueda ser leída por otros con facilidad.", 1, "Escritura"],
      [16, "Incorporar de manera pertinente en la escritura el vocabulario nuevo extraído de textos escuchados o leídos.", 0, "Escritura"],
      [17, "Comprender y disfrutar versiones completas de obras de la literatura narradas o leídas por un adulto.", 1, "Comunicación oral"],
      [18, "Comprender textos orales (explicaciones, instrucciones, relatos, anécdotas) para obtener información y desarrollar su curiosidad por el mundo.", 1, "Comunicación oral"],
      [19, "Desarrollar la curiosidad por las palabras o expresiones que desconocen y adquirir el hábito de averiguar su significado.", 0, "Comunicación oral"],
      [20, "Disfrutar de la experiencia de escuchar y reproducir rimas, poemas, canciones y juegos de lenguaje.", 0, "Comunicación oral"],
      [21, "Participar activamente en conversaciones grupales sobre textos leídos o escuchados, expresando sus ideas u opiniones.", 1, "Comunicación oral"],
      [22, "Expresarse de manera coherente y articulada sobre temas de su interés.", 1, "Comunicación oral"],
      [23, "Desempeñar diferentes roles para representar situaciones y desarrollar su lenguaje y autoestima.", 0, "Comunicación oral"],
      [24, "Incorporar de manera pertinente en sus intervenciones orales el vocabulario nuevo extraído de textos escuchados o leídos.", 0, "Comunicación oral"],
      [25, "Recitar poemas y rimas con entonación y expresión, para fortalecer la confianza en sí mismos.", 0, "Comunicación oral"],
      [26, "Producir textos orales breves y planificados: recuentos de experiencias y descripciones simples.", 0, "Comunicación oral"],
    ],
    B2: [
      [1, "Leer palabras aisladas y en contexto, aplicando el conocimiento de la correspondencia letra-sonido en diferentes combinaciones y de letras con más de un sonido.", 1, "Lectura"],
      [2, "Leer en voz alta para adquirir fluidez: pronunciando cada palabra con precisión, respetando el punto seguido y aparte y leyendo con velocidad adecuada.", 1, "Lectura"],
      [3, "Comprender textos aplicando estrategias de comprensión lectora: relacionar con las propias experiencias, visualizar, preguntar, subrayar información relevante.", 1, "Lectura"],
      [4, "Leer independientemente y familiarizarse con un amplio repertorio de literatura para aumentar su conocimiento del mundo.", 0, "Lectura"],
      [5, "Demostrar comprensión de las narraciones leídas: extrayendo información explícita e implícita, reconstruyendo la secuencia de las acciones, describiendo personajes y ambientes, expresando opiniones fundamentadas.", 1, "Lectura"],
      [6, "Leer independientemente y comprender textos no literarios para ampliar su conocimiento del mundo y formarse una opinión.", 1, "Lectura"],
      [7, "Leer y familiarizarse con un amplio repertorio de literatura: poemas, cuentos folclóricos, fábulas, leyendas, mitos e historietas.", 0, "Lectura"],
      [8, "Desarrollar el gusto por la lectura, leyendo habitualmente diversos textos.", 0, "Lectura"],
      [9, "Asistir habitualmente a la biblioteca para satisfacer diversos propósitos, cuidando el material.", 0, "Lectura"],
      [10, "Escribir frecuentemente para desarrollar la creatividad y expresar sus ideas, sobre temas de su interés.", 1, "Escritura"],
      [11, "Escribir creativamente narraciones (experiencias personales, relatos de hechos, cuentos) que tengan inicio, desarrollo y desenlace.", 1, "Escritura"],
      [12, "Escribir artículos informativos para comunicar información sobre un tema, presentando el tema en una oración e incorporando información relevante.", 1, "Escritura"],
      [13, "Escribir con letra clara para que pueda ser leída por otros con facilidad.", 0, "Escritura"],
      [14, "Escribir oraciones completas, separando las palabras con espacios y utilizando mayúscula al inicio y punto al final.", 1, "Escritura"],
      [15, "Escribir correctamente para facilitar la comprensión por parte del lector: mayúscula al iniciar una oración y en sustantivos propios, punto final, ortografía literal aprendida.", 1, "Escritura"],
      [16, "Planificar la escritura generando ideas a partir de conversaciones, experiencias personales o lecturas.", 0, "Escritura"],
      [17, "Comprender y disfrutar versiones completas de obras de la literatura narradas o leídas por un adulto.", 0, "Comunicación oral"],
      [18, "Disfrutar de la experiencia de escuchar y reproducir rimas, poemas, canciones y juegos de lenguaje.", 0, "Comunicación oral"],
      [19, "Desarrollar la curiosidad por las palabras y expresiones que desconocen y adquirir el hábito de averiguar su significado.", 0, "Comunicación oral"],
      [20, "Comprender textos orales (explicaciones, instrucciones, noticias, documentales, relatos) para obtener información y desarrollar su curiosidad por el mundo.", 1, "Comunicación oral"],
      [21, "Participar activamente en conversaciones grupales, manteniendo el foco, formulando preguntas para aclarar dudas y respetando los turnos.", 1, "Comunicación oral"],
      [22, "Expresarse de manera coherente y articulada sobre temas de su interés, incorporando descripciones y ejemplos.", 1, "Comunicación oral"],
      [23, "Desempeñar diferentes roles para representar situaciones y desarrollar su lenguaje y autoestima.", 0, "Comunicación oral"],
      [24, "Incorporar de manera pertinente en sus intervenciones orales el vocabulario nuevo extraído de textos escuchados o leídos.", 0, "Comunicación oral"],
      [25, "Recitar poemas con entonación y expresión para fortalecer la confianza en sí mismos.", 0, "Comunicación oral"],
      [26, "Producir textos orales planificados de diverso tipo para desarrollar su capacidad expresiva: poemas, relatos, recuentos, dramatizaciones.", 0, "Comunicación oral"],
    ],
  },
  MAT: {
    B1: [
      [1, "Contar números del 0 al 100 de 1 en 1, de 2 en 2, de 5 en 5 y de 10 en 10, hacia adelante y hacia atrás, empezando por cualquier número menor que 100.", 1, "Números y operaciones"],
      [2, "Identificar el orden de los elementos de una serie, utilizando números ordinales del primero (1º) al décimo (10º).", 0, "Números y operaciones"],
      [3, "Leer números del 0 al 20 y representarlos en forma concreta, pictórica y simbólica.", 1, "Números y operaciones"],
      [4, "Comparar y ordenar números del 0 al 20 de menor a mayor y viceversa, usando material concreto y monedas nacionales de manera manual y/o por medio de software educativo.", 1, "Números y operaciones"],
      [5, "Estimar cantidades hasta 20 en situaciones concretas, usando un referente.", 0, "Números y operaciones"],
      [6, "Componer y descomponer números del 0 a 20 de manera aditiva, en forma concreta, pictórica y simbólica.", 1, "Números y operaciones"],
      [7, "Describir y aplicar estrategias de cálculo mental para las adiciones y sustracciones hasta 20: conteo hacia adelante y atrás, completar 10, dobles y mitades.", 1, "Números y operaciones"],
      [8, "Determinar las unidades y decenas en números del 0 al 20, agrupando de a 10, de manera concreta, pictórica y simbólica.", 1, "Números y operaciones"],
      [9, "Demostrar que comprende la adición y la sustracción de números del 0 al 20 progresivamente: usando un lenguaje cotidiano, representando, resolviendo problemas en contextos familiares.", 1, "Números y operaciones"],
      [10, "Demostrar que la adición y la sustracción son operaciones inversas, de manera concreta, pictórica y simbólica.", 0, "Números y operaciones"],
      [11, "Reconocer, describir, crear y continuar patrones repetitivos (sonidos, figuras, ritmos) y patrones numéricos hasta el 20, crecientes y decrecientes, usando material concreto, pictórico y simbólico.", 1, "Patrones y álgebra"],
      [12, "Describir y registrar la igualdad y la desigualdad como equilibrio y desequilibrio, usando una balanza en forma concreta, pictórica y simbólica del 0 al 20, usando el símbolo igual (=).", 0, "Patrones y álgebra"],
      [13, "Describir la posición de objetos y personas en relación a sí mismos y a otros objetos y personas, usando un lenguaje común (izquierda, derecha, delante, detrás, sobre, bajo).", 1, "Geometría"],
      [14, "Identificar en el entorno figuras 3D y figuras 2D y relacionarlas, usando material concreto.", 1, "Geometría"],
      [15, "Identificar y dibujar líneas rectas y curvas.", 0, "Geometría"],
      [16, "Usar unidades no estandarizadas de tiempo para comparar la duración de eventos cotidianos.", 0, "Medición"],
      [17, "Identificar días, semanas, meses y fechas en el calendario.", 1, "Medición"],
      [18, "Determinar la longitud de objetos, usando unidades de medida no estandarizadas y de acuerdo a un referente.", 1, "Medición"],
      [19, "Recolectar y registrar datos para responder preguntas estadísticas sobre sí mismo y el entorno, usando bloques, tablas de conteo y pictogramas.", 1, "Datos y probabilidades"],
      [20, "Construir, leer e interpretar pictogramas.", 1, "Datos y probabilidades"],
    ],
    B2: [
      [1, "Contar números del 0 al 1.000 de 2 en 2, de 5 en 5, de 10 en 10 y de 100 en 100, hacia adelante y hacia atrás, empezando por cualquier número menor que 1.000.", 1, "Números y operaciones"],
      [2, "Leer números del 0 al 100 y representarlos en forma concreta, pictórica y simbólica.", 1, "Números y operaciones"],
      [3, "Comparar y ordenar números del 0 al 100 de menor a mayor y viceversa, usando material concreto y monedas nacionales de manera manual y/o por medio de software educativo.", 1, "Números y operaciones"],
      [4, "Estimar cantidades hasta 100 en situaciones concretas, usando un referente.", 0, "Números y operaciones"],
      [5, "Componer y descomponer números del 0 a 100 de manera aditiva, en forma concreta, pictórica y simbólica.", 1, "Números y operaciones"],
      [6, "Describir y aplicar estrategias de cálculo mental para adiciones y sustracciones hasta 20: completar 10, usar dobles y mitades, uno más uno menos, dos más dos menos.", 1, "Números y operaciones"],
      [7, "Identificar las unidades y decenas en números del 0 al 100, representando las cantidades de acuerdo a su valor posicional.", 1, "Números y operaciones"],
      [8, "Demostrar que comprende la adición y la sustracción en el ámbito del 0 al 100: usando un lenguaje cotidiano y matemático, resolviendo problemas, aplicando algoritmos con y sin canje.", 1, "Números y operaciones"],
      [9, "Demostrar que comprende la relación entre la adición y la sustracción, usando la 'familia de operaciones' en cálculos aritméticos y en la resolución de problemas.", 0, "Números y operaciones"],
      [10, "Demostrar que comprende la multiplicación: usando representaciones concretas y pictóricas, expresando una multiplicación como una adición de sumandos iguales, resolviendo problemas en contextos cotidianos.", 1, "Números y operaciones"],
      [11, "Crear, representar y continuar una variedad de patrones numéricos y completar los elementos faltantes, de manera manual y/o usando software educativo.", 1, "Patrones y álgebra"],
      [12, "Demostrar, explicar y registrar la igualdad y la desigualdad en forma concreta y pictórica del 0 al 20, usando el símbolo igual (=) y los símbolos no igual (>, <).", 0, "Patrones y álgebra"],
      [13, "Describir la posición de objetos y personas con relación a sí mismos y a otros objetos y personas, usando un lenguaje común.", 0, "Geometría"],
      [14, "Representar y describir la posición de objetos y personas en relación a un punto de referencia, mediante conceptos de ubicación y trayectoria.", 1, "Geometría"],
      [15, "Describir, comparar y construir figuras 2D (triángulos, cuadrados, rectángulos y círculos) con material concreto.", 1, "Geometría"],
      [16, "Describir, comparar y construir figuras 3D (cubos, paralelepípedos, esferas y conos) con diversos materiales.", 1, "Geometría"],
      [17, "Determinar la longitud de objetos, usando unidades de medida no estandarizadas y unidades estandarizadas (cm y m), en el contexto de la resolución de problemas.", 1, "Medición"],
      [18, "Leer horas y medias horas en relojes digitales, en el contexto de la resolución de problemas.", 1, "Medición"],
      [19, "Registrar en tablas y gráficos de barra simple resultados de juegos aleatorios con dados y monedas.", 0, "Datos y probabilidades"],
      [20, "Recolectar y registrar datos para responder preguntas estadísticas sobre sí mismo y el entorno, usando bloques, tablas de conteo y pictogramas.", 1, "Datos y probabilidades"],
      [21, "Construir, leer e interpretar pictogramas con escala y gráficos de barra simple.", 1, "Datos y probabilidades"],
    ],
  },
  CN: {
    B1: [
      [1, "Reconocer y observar, por medio de la exploración, que los seres vivos crecen, responden a estímulos del medio, se reproducen y necesitan agua, alimento y aire para vivir, comparándolos con las cosas no vivas.", 1, "Ciencias de la vida"],
      [2, "Observar y comparar animales de acuerdo a características como tamaño, cubierta corporal, estructuras de desplazamiento y hábitat, entre otras.", 1, "Ciencias de la vida"],
      [3, "Observar e identificar, por medio de la exploración, las estructuras principales de las plantas: hojas, flores, tallos y raíces.", 1, "Ciencias de la vida"],
      [4, "Observar y comparar las características de las semillas y su germinación, registrando los cambios observados.", 0, "Ciencias de la vida"],
      [5, "Observar, describir y clasificar, por medio de la exploración, las características de los vertebrados: mamíferos, aves, reptiles, anfibios y peces.", 1, "Ciencias de la vida"],
      [6, "Identificar y describir la ubicación y la función de los sentidos, proponiendo medidas para protegerlos y para prevenir situaciones de riesgo.", 1, "Cuerpo humano y salud"],
      [7, "Describir, dar ejemplos y practicar hábitos de vida saludable para mantener el cuerpo sano y prevenir enfermedades: actividad física, aseo del cuerpo, lavado de alimentos y descanso.", 1, "Cuerpo humano y salud"],
      [8, "Explorar y describir los diferentes tipos de materiales en diversos objetos, clasificándolos según sus propiedades (goma, plástico, madera, metal) e identificando su uso.", 1, "Ciencias físicas y químicas"],
      [9, "Observar, describir y comparar el día y la noche, identificando sus efectos en plantas, animales y personas.", 1, "Ciencias de la Tierra y el Universo"],
      [10, "Describir y comparar los cambios que se producen entre el día y la noche en relación a las sombras, la luz y la temperatura.", 0, "Ciencias de la Tierra y el Universo"],
      [11, "Describir y registrar el ciclo diario y las diferencias entre las estaciones del año, y sus efectos en el entorno y en las actividades de las personas.", 1, "Ciencias de la Tierra y el Universo"],
      [12, "Comunicar y explicar observaciones y experiencias de exploración, usando dibujos, tablas simples y lenguaje científico apropiado al nivel.", 0, "Habilidades de investigación"],
    ],
    B2: [
      [1, "Observar y comparar las características de las etapas del ciclo de vida de distintos animales (mariposa, rana, tortuga, pollo), relacionándolas con su hábitat.", 1, "Ciencias de la vida"],
      [2, "Observar y comparar animales de acuerdo a características como tamaño, cubierta corporal y estructuras de desplazamiento, clasificándolos en vertebrados e invertebrados.", 1, "Ciencias de la vida"],
      [3, "Observar e identificar algunos animales nativos que se encuentran en peligro de extinción, así como el deterioro de su hábitat, proponiendo y comunicando medidas para protegerlos.", 1, "Ciencias de la vida"],
      [4, "Observar y describir, por medio de la investigación experimental, las necesidades de las plantas y su relación con la raíz, el tallo y las hojas.", 1, "Ciencias de la vida"],
      [5, "Explicar la importancia de las plantas para los seres vivos, el ser humano y el medioambiente, proponiendo y comunicando medidas de cuidado.", 1, "Ciencias de la vida"],
      [6, "Identificar la ubicación y explicar la función de algunas partes del cuerpo que son fundamentales para vivir: corazón, pulmones, estómago, esqueleto y músculos.", 1, "Cuerpo humano y salud"],
      [7, "Observar, describir y comparar los efectos de la actividad física y del descanso en el cuerpo (efecto en el pulso, la respiración y la temperatura corporal).", 1, "Cuerpo humano y salud"],
      [8, "Explicar la importancia de la alimentación saludable, la higiene y el descanso para el crecimiento y el bienestar, proponiendo hábitos concretos.", 1, "Cuerpo humano y salud"],
      [9, "Observar y describir, por medio de la exploración, los componentes del tiempo atmosférico (temperatura, nubosidad, precipitaciones y viento), usando instrumentos y registros simples.", 1, "Ciencias de la Tierra y el Universo"],
      [10, "Describir y registrar el ciclo diario y las diferencias entre las estaciones del año, y sus efectos en el entorno y en las actividades de las personas.", 1, "Ciencias de la Tierra y el Universo"],
      [11, "Describir, dar ejemplos y practicar medidas de cuidado y prevención de riesgos frente a distintas condiciones del tiempo atmosférico.", 0, "Ciencias de la Tierra y el Universo"],
      [12, "Comunicar y explicar los resultados de observaciones y experiencias, usando dibujos, tablas, gráficos simples y lenguaje científico apropiado al nivel.", 0, "Habilidades de investigación"],
    ],
  },
  HIS: {
    B1: [
      [1, "Nombrar y secuenciar días de la semana y meses del año, utilizando calendarios, e identificar el año en curso.", 1, "Historia"],
      [2, "Secuenciar acontecimientos y actividades de la vida cotidiana, personal y familiar, utilizando categorías relativas de ubicación temporal: antes, después, ayer, hoy, mañana, día, noche.", 1, "Historia"],
      [3, "Registrar y comunicar información sobre elementos que forman parte de su identidad personal: nombre, fecha de nacimiento, lugar de procedencia, ascendencias, gustos, intereses y amigos.", 1, "Historia"],
      [4, "Obtener y comunicar aspectos de la historia de su familia y sus características, por medio de entrevistas a familiares, relatos, fotografías y objetos.", 1, "Historia"],
      [5, "Conocer expresiones culturales locales y nacionales: canciones, tradiciones, comidas, festividades, juegos y leyendas.", 1, "Historia"],
      [6, "Secuenciar cronológicamente eventos significativos ocurridos en la escuela o la comunidad durante el año.", 0, "Historia"],
      [7, "Ubicar personas, lugares y objetos en el espacio, utilizando categorías de ubicación relativa: delante-detrás, arriba-abajo, izquierda-derecha, dentro-fuera.", 1, "Geografía"],
      [8, "Representar la ubicación de objetos y lugares de su entorno cercano mediante dibujos y planos simples.", 1, "Geografía"],
      [9, "Identificar los símbolos representativos de Chile (bandera, escudo e himno nacional) y reconocerlos como elementos de identidad nacional.", 1, "Geografía"],
      [10, "Reconocer diversos tipos de paisajes de Chile: desierto, valles, montañas, costa, bosques y hielos.", 1, "Geografía"],
      [11, "Reconocer que los mapas y planos son representaciones de lugares reales y usarlos para localizar espacios conocidos.", 0, "Geografía"],
      [12, "Practicar y proponer acciones para cuidar y respetar los espacios públicos y el medioambiente de su entorno cercano.", 1, "Formación ciudadana"],
      [13, "Mostrar actitudes y realizar acciones concretas en su entorno cercano que reflejen respeto al otro: saludar, escuchar, compartir, ayudar y pedir por favor.", 1, "Formación ciudadana"],
      [14, "Conocer sobre la vida de hombres y mujeres que han contribuido a la sociedad chilena en distintos ámbitos.", 0, "Formación ciudadana"],
    ],
    B2: [
      [1, "Aplicar conceptos relacionados con el tiempo (años, décadas, pasado, presente, futuro) para secuenciar acontecimientos de su vida y de la historia local.", 1, "Historia"],
      [2, "Secuenciar acontecimientos y actividades de la vida cotidiana e identificar la duración relativa de distintos períodos.", 0, "Historia"],
      [3, "Registrar y comunicar información sobre la historia de la comunidad local: sus orígenes, personajes y cambios en el tiempo.", 1, "Historia"],
      [4, "Obtener información sobre el pasado a partir de distintas fuentes: relatos orales, fotografías, objetos antiguos y testimonios de familiares.", 1, "Historia"],
      [5, "Comparar modos de vida del pasado y del presente en la localidad: viviendas, vestimenta, transporte, trabajo, escuela y juegos.", 1, "Historia"],
      [6, "Conocer expresiones culturales de pueblos originarios de Chile (mapuche, aymara, rapa nui, entre otros): vivienda, alimentación, costumbres, lengua y cosmovisión.", 1, "Historia"],
      [7, "Reconocer el aporte de los pueblos originarios y de otros grupos que han llegado al país a la sociedad chilena actual.", 1, "Historia"],
      [8, "Ubicar Chile, Santiago, la propia región y la localidad en el globo terráqueo y en mapas.", 1, "Geografía"],
      [9, "Identificar océanos, continentes y líneas de referencia (Ecuador, polos) en mapas y globos terráqueos.", 1, "Geografía"],
      [10, "Clasificar y caracterizar los paisajes de Chile según sus zonas naturales: norte grande, norte chico, zona central, zona sur y zona austral.", 1, "Geografía"],
      [11, "Reconocer diversas formas en que las personas se adaptan y utilizan los recursos del lugar donde viven.", 0, "Geografía"],
      [12, "Practicar y proponer acciones para cuidar los recursos naturales y el medioambiente de su localidad.", 1, "Formación ciudadana"],
      [13, "Mostrar actitudes y realizar acciones de respeto, colaboración y responsabilidad en la escuela y la comunidad.", 1, "Formación ciudadana"],
      [14, "Participar en la construcción de normas de convivencia y explicar su importancia para la vida en común.", 1, "Formación ciudadana"],
    ],
  },
  TEC: {
    B1: [
      [1, "Crear diseños de objetos tecnológicos a partir de sus propias experiencias, representando sus ideas mediante dibujos a mano alzada o modelos concretos.", 1, "Diseñar"],
      [2, "Elaborar un objeto tecnológico según indicaciones del docente, seleccionando y experimentando con técnicas y herramientas para medir, marcar, cortar, plegar, unir y pintar, y con materiales como papeles, fibras, plásticos y desechos.", 1, "Hacer"],
      [3, "Probar y explicar los resultados de los trabajos propios y de otros, de forma verbal o a través de imágenes, destacando fortalezas y aspectos por mejorar.", 1, "Probar y evaluar"],
      [4, "Usar software de dibujo para crear y representar ideas por medio de imágenes, guiados por el docente.", 0, "TIC"],
      [5, "Explorar y usar programas y aplicaciones educativas para el aprendizaje, con apoyo del docente.", 0, "TIC"],
      [6, "Usar internet y buscadores bajo supervisión para localizar información, desarrollando hábitos de uso seguro y responsable de las tecnologías.", 0, "TIC"],
    ],
    B2: [
      [1, "Crear diseños de objetos tecnológicos que respondan a necesidades propias o del entorno, representando sus ideas mediante dibujos a mano alzada o modelos concretos.", 1, "Diseñar"],
      [2, "Elaborar un objeto tecnológico para resolver un problema, seleccionando y experimentando con técnicas y herramientas (medir, marcar, cortar, plegar, unir, pintar) y con materiales diversos.", 1, "Hacer"],
      [3, "Probar y explicar los resultados de los trabajos propios y de otros, destacando fortalezas y aspectos por mejorar.", 1, "Probar y evaluar"],
      [4, "Usar software de dibujo y de presentación para crear y comunicar ideas.", 0, "TIC"],
      [5, "Usar procesadores de texto e internet, con apoyo del docente, para escribir, buscar y organizar información.", 0, "TIC"],
      [6, "Usar las tecnologías de manera segura y responsable, cuidando los equipos y la información personal.", 1, "TIC"],
    ],
  },
  ORI: {
    B1: [
      [1, "Observar, describir y valorar sus características, habilidades y fortalezas, reconociéndose como una persona única y valiosa.", 1, "Crecimiento personal"],
      [2, "Identificar y expresar emociones y sentimientos propios y de otros en distintas situaciones, de manera respetuosa.", 1, "Crecimiento personal"],
      [3, "Practicar hábitos y actitudes de autocuidado y prevención de riesgos: higiene, alimentación, descanso y pedir ayuda a adultos de confianza.", 1, "Crecimiento personal"],
      [4, "Reconocer y respetar la diversidad de características, intereses y necesidades de las demás personas.", 1, "Relaciones interpersonales"],
      [5, "Manifestar actitudes de solidaridad, respeto y buen trato en la convivencia diaria: saludar, escuchar, compartir, agradecer y ayudar.", 1, "Relaciones interpersonales"],
      [6, "Resolver conflictos de manera pacífica con apoyo de un adulto, escuchando al otro y buscando acuerdos.", 1, "Relaciones interpersonales"],
      [7, "Participar en la construcción y el cumplimiento de normas y acuerdos de la sala de clases.", 1, "Participación y pertenencia"],
      [8, "Colaborar en actividades y juegos grupales, asumiendo responsabilidades y respetando turnos.", 1, "Participación y pertenencia"],
      [9, "Practicar hábitos de trabajo escolar: orden, cuidado de los materiales, cumplimiento de tareas y perseverancia.", 1, "Trabajo escolar"],
      [10, "Reconocer sus logros y dificultades en el aprendizaje y pedir ayuda cuando la necesita.", 0, "Gestión del aprendizaje"],
      [11, "Identificar personas e instituciones de su entorno que brindan ayuda y protección.", 0, "Crecimiento personal"],
    ],
    B2: [
      [1, "Reconocer y describir sus características, habilidades, fortalezas y aspectos por mejorar, valorándose positivamente.", 1, "Crecimiento personal"],
      [2, "Identificar, expresar y regular emociones propias y reconocer las de otros, usando estrategias simples: respirar, conversar y pedir ayuda.", 1, "Crecimiento personal"],
      [3, "Practicar hábitos de autocuidado, vida saludable y prevención de riesgos en la escuela, el hogar y el entorno.", 1, "Crecimiento personal"],
      [4, "Reconocer y valorar la diversidad, evitando actitudes discriminatorias, burlas o exclusión.", 1, "Relaciones interpersonales"],
      [5, "Demostrar actitudes de empatía, respeto y buen trato en las relaciones con pares y adultos.", 1, "Relaciones interpersonales"],
      [6, "Resolver conflictos de manera pacífica mediante el diálogo, la escucha activa y la búsqueda de acuerdos.", 1, "Relaciones interpersonales"],
      [7, "Participar activa y responsablemente en la construcción y el cumplimiento de las normas de convivencia.", 1, "Participación y pertenencia"],
      [8, "Trabajar en equipo asumiendo roles y responsabilidades, colaborando con el logro de metas comunes.", 1, "Participación y pertenencia"],
      [9, "Practicar y mejorar hábitos de trabajo escolar: planificación, orden, perseverancia y cuidado de los materiales.", 1, "Trabajo escolar"],
      [10, "Evaluar sus avances y dificultades en el aprendizaje, proponiéndose metas simples de mejora.", 0, "Gestión del aprendizaje"],
      [11, "Identificar redes de apoyo y saber a quién acudir frente a situaciones de riesgo o maltrato.", 1, "Crecimiento personal"],
    ],
  },
};

/* ============================================================
   UTILIDADES
   ============================================================ */

export const oaId = (asig, grado, n) => `${asig}-${grado}-${n}`;

export function necesitaFetch(asig, grado, oaCache) {
  return !((OA_DATA[asig] && OA_DATA[asig][grado]) || (oaCache && oaCache[`${asig}-${grado}`]));
}

export function listaOA(asig, grado, extras, overrides, oaCache) {
  const base = (OA_DATA[asig] && OA_DATA[asig][grado]) || (oaCache && oaCache[`${asig}-${grado}`]) || [];
  const propios = (extras || []).filter((e) => e.asig === asig && e.grado === grado);
  const arr = base.map(([n, texto, basal, eje]) => ({
    id: oaId(asig, grado, n),
    cod: `OA ${n}`,
    n,
    texto,
    eje,
    basal: overrides[oaId(asig, grado, n)] !== undefined ? overrides[oaId(asig, grado, n)] : basal === 1,
    propio: false,
  }));
  propios.forEach((p) => {
    arr.push({
      id: p.id,
      cod: p.cod || "OA propio",
      n: 999,
      texto: p.texto,
      eje: p.eje || "Propio",
      basal: overrides[p.id] !== undefined ? overrides[p.id] : !!p.basal,
      propio: true,
    });
  });
  return arr;
}

// Se usa cuando el servicio no responde al pedir los OA de un curso sin datos curados.
export function oaFallback(asigNombre, gradoNombre) {
  return [1, 2, 3, 4].map((n) => [
    n,
    `Objetivo provisional ${n} de ${asigNombre} para ${gradoNombre}: reemplázalo por el OA real de tu programa de estudio.`,
    n <= 2 ? 1 : 0,
    "Provisional",
  ]);
}

const VERBOS_DEFECTO = {
  LEN: ["identifica", "explica", "relaciona", "produce"],
  MAT: ["representa", "resuelve", "explica", "compara"],
  CN: ["observa", "describe", "clasifica", "registra"],
  HIS: ["ubica", "compara", "explica", "valora"],
  TEC: ["diseña", "construye", "prueba", "mejora"],
  ORI: ["reconoce", "expresa", "practica", "propone"],
};

const ACTITUDES_DEFECTO = {
  LEN: "Demostrar interés y disposición por comunicarse, respetando los turnos y las ideas de los demás.",
  MAT: "Manifestar curiosidad y esfuerzo frente a los desafíos matemáticos, aceptando el error como parte del aprendizaje.",
  CN: "Mostrar curiosidad por el entorno natural y responsabilidad en el cuidado de los seres vivos y los materiales.",
  HIS: "Valorar la propia identidad y la de los demás, participando con respeto en la vida en común.",
  TEC: "Trabajar con rigor y perseverancia, cuidando los materiales y valorando el trabajo propio y ajeno.",
  ORI: "Actuar con respeto, empatía y responsabilidad en la relación con los demás.",
};

// Se usa cuando el servicio no responde al pedir los indicadores de un OA.
export function indicadoresFallback(oa, asig) {
  const verbos = VERBOS_DEFECTO[asig] || VERBOS_DEFECTO.LEN;
  const nucleo = oa.texto.replace(/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s/, "").split(",")[0].trim();
  return verbos.map((v, i) => ({
    i: `${v.charAt(0).toUpperCase() + v.slice(1)} ${nucleo}, con apoyo de material ${i % 2 === 0 ? "concreto" : "pictórico"}.`,
    h: v.charAt(0).toUpperCase() + v.slice(1),
    c: nucleo.charAt(0).toUpperCase() + nucleo.slice(1),
    a: ACTITUDES_DEFECTO[asig] || ACTITUDES_DEFECTO.LEN,
  }));
}

export function limpiarJSON(txt) {
  if (!txt) return "";
  let t = txt.trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = t.indexOf("{");
  const b = t.indexOf("[");
  let start = -1;
  if (a === -1) start = b;
  else if (b === -1) start = a;
  else start = Math.min(a, b);
  if (start > 0) t = t.slice(start);
  const lastC = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (lastC !== -1) t = t.slice(0, lastC + 1);
  return t;
}

export const TIEMPOS = {
  1: { total: 45, inicio: 10, desarrollo: 25, cierre: 10 },
  2: { total: 90, inicio: 15, desarrollo: 60, cierre: 15 },
};

export const rielVacio = (grado) => ({ grado, asig: ASIGNATURAS[0].id, filtro: "basal", oaIds: [] });

// Agranda o recorta la lista de rieles (cursos combinados) a n elementos,
// evitando repetir grado mientras queden grados disponibles.
export function ajustarNumCursos(rieles, n) {
  const usados = new Set(rieles.map((r) => r.grado));
  const disponibles = GRADOS.map((g) => g.id).filter((id) => !usados.has(id));
  const next = rieles.slice(0, n);
  while (next.length < n) {
    const g = disponibles.shift() || GRADOS[next.length % GRADOS.length].id;
    next.push(rielVacio(g));
  }
  return next;
}

/* ============================================================
   PLAN DE RESPALDO (sin conexión al servicio)
   ============================================================ */

// El objetivo de la clase de un curso se arma con los indicadores que el docente eligió;
// si no eligió ninguno, se usa el texto de los OA seleccionados.
export function objetivoClaseDe(curso) {
  const elegidos = curso.oas.flatMap((o) => o.indElegidos || []);
  const base = elegidos.length ? elegidos.map((x) => x.i) : curso.oas.map((o) => o.texto);
  return base.join(" ");
}

/* ============================================================
   MATERIALES: esquema, links y versión sin conexión
   Cada material: { id, tipo, titulo, proposito, momento, curso,
   cantidad {unidad, numero, total}, preparacion[], instrucciones_uso[],
   contenido, solucionario, adecuacion, alternativa_sin_tecnologia,
   referencias [{fuente, titulo, url, tipo_link}], link (el del docente) }
   ============================================================ */

export const TIPOS_MINIMOS = ["guia_estudiante", "texto_modelo", "instrumento_evaluacion", "ticket_salida", "materiales_fisicos", "recurso_mineduc"];
const EXTERNOS = ["recurso_mineduc", "video", "sitio", "software", "cuento"];
const GRADUADOS = ["guia_estudiante", "ticket_salida", "instrumento_evaluacion"];
const UNIDADES = ["por estudiante", "por grupo", "por pareja", "docente"];
const MOMENTOS = ["inicio", "desarrollo", "cierre"];
const MOMENTO_DEFECTO = { texto_modelo: "inicio", ticket_salida: "cierre", materiales_fisicos: "inicio" };
const PORTAL_TIPO = { guia_estudiante: "textos", texto_modelo: "textos", instrumento_evaluacion: "eval_formativa", ticket_salida: "eval_formativa", materiales_fisicos: "dua", recurso_mineduc: "textos", cuento: "bde" };

export const ETIQUETA_LINK = { ia: "Sugerido por IA · verificar", curado: "Verificado Mineduc", busqueda: "Búsqueda sugerida" };

const vacio = (x) => !String(x ?? "").trim();
const textos = (x) => (Array.isArray(x) ? x : [x]).map((s) => String(s ?? "").trim()).filter(Boolean);

export function esHttps(url) {
  try {
    const u = new URL(String(url));
    return u.protocol === "https:" && !!u.hostname;
  } catch (e) {
    return false;
  }
}

function portal(id) {
  const p = PORTALES.find((x) => x.id === id);
  return p ? { fuente: "Mineduc", titulo: p.nombre, url: p.url, tipo_link: "curado" } : null;
}

// Links de búsqueda deterministas: siempre incluyen asignatura y curso.
export function busquedas(curso) {
  const asig = curso?.asig?.nombre || "";
  const g = curso?.gradoNombre || "";
  const o = curso?.oas?.[0];
  const tema = String(o?.indElegidos?.[0]?.c || o?.indicadores?.[0]?.c || o?.texto || "").split(/\s+/).slice(0, 6).join(" ");
  return [
    { fuente: "YouTube", titulo: `Videos: ${asig} ${g} ${tema}`.trim(), url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${asig} ${g} ${tema}`.trim())}`, tipo_link: "busqueda" },
    { fuente: "Curriculum Nacional", titulo: `Buscar ${o?.cod || "el OA"} de ${asig} ${g}`, url: `https://www.google.com/search?q=${encodeURIComponent(`site:curriculumnacional.cl ${asig} ${g} ${o?.cod || ""}`.trim())}`, tipo_link: "busqueda" },
  ];
}

// Links de la API: se aceptan solo https (tipo "ia"); un {id} de portal se resuelve con la lista curada.
// Lo que no sirve se descarta y se reemplaza por búsqueda. Siempre se suman 2 portales Mineduc verificados.
export function normalizarReferencias(refs, tipo, curso) {
  const out = [];
  let descartado = false;
  (Array.isArray(refs) ? refs : []).forEach((r) => {
    if (!r) return;
    const p = r.id && portal(r.id);
    if (p) out.push(p);
    else if (esHttps(r.url)) out.push({ fuente: r.fuente || "Sugerido por IA", titulo: r.titulo || r.url, url: r.url, tipo_link: "ia" });
    else descartado = true;
  });
  if (descartado || (EXTERNOS.includes(tipo) && !out.some((r) => r.tipo_link === "ia"))) out.push(...busquedas(curso));
  const pag = curso?.asig?.id && PAGINA_ASIGNATURA[curso.asig.id]?.porCurso(curso.grado);
  out.push(pag ? { fuente: "Curriculum Nacional", titulo: `${curso.asig.nombre} ${curso.gradoNombre}`, url: pag, tipo_link: "curado" } : portal("curriculum"));
  out.push(portal(PORTAL_TIPO[tipo] || "aprendo"));
  return out.filter((r, i) => out.findIndex((x) => x.url === r.url) === i);
}

// N° de estudiantes de un curso según lo que escribió el docente ("25" o "1º básico: 5, 3º básico: 4"); null si no se sabe.
export function numEstudiantes(texto, curso) {
  const t = String(texto || "");
  const pares = [...t.matchAll(/([^,;]*?)\s*:\s*(\d+)/g)];
  if (pares.length) {
    const clave = (s) => (s.match(/\d+/) || [""])[0] + (/medio/i.test(s) ? "M" : "B");
    const p = curso && pares.find((m) => clave(m[1]) === clave(curso.gradoNombre || ""));
    return p ? +p[2] : null;
  }
  const n = t.match(/\d+/);
  return n ? +n[0] : null;
}

function estudiantesDe(ctx, cursos, curso) {
  const lista = curso === "todos" ? cursos : [cursos[curso]];
  const ns = lista.map((c) => numEstudiantes(ctx?.estudiantes, c));
  return ns.length && ns.every((n) => n) ? ns.reduce((a, b) => a + b, 0) : null;
}

export function calcularTotal(unidad, numero, n) {
  if (unidad === "docente") return `${numero} (para el docente)`;
  if (!n) return `${numero} ${unidad} (N° de estudiantes)`;
  if (unidad === "por grupo") return `${numero * Math.ceil(n / 4)} (${numero} por grupo, ${Math.ceil(n / 4)} grupos de 4)`;
  if (unidad === "por pareja") return `${numero * Math.ceil(n / 2)} (${numero} por pareja, ${Math.ceil(n / 2)} parejas)`;
  return `${numero * n} (${numero} por estudiante, ${n} estudiantes)`;
}

// Indicadores con los que se arman ítems y criterios: los elegidos por el docente o, si no hay, los de referencia del OA.
function indicadoresDe(curso) {
  const inds = (curso.oas || []).flatMap((o) =>
    o.indElegidos?.length ? o.indElegidos : o.indicadores?.length ? o.indicadores.slice(0, 2) : indicadoresFallback(o, curso.asig?.id).slice(0, 2)
  );
  return (inds.length ? inds : [{ i: "Aplica lo aprendido en la clase.", h: "Aplica", c: "lo aprendido en la clase" }]).slice(0, 4);
}

export const criteriosDe = (curso) => indicadoresDe(curso).map((x) => x.i);

const contenidoDe = (x) => String(x.c || x.i || "").replace(/\.$/, "").toLowerCase();
const accionDe = (x) => `${x.h || "Aplica"} ${contenidoDe(x)}`;
const encabezadoFicha = (curso) =>
  `${curso.asig?.nombre || ""} · ${curso.gradoNombre || ""}\nNombre: _______________________________  Curso: ____________  Fecha: ____________\nObjetivo de hoy: ${objetivoClaseDe(curso) || "el objetivo de la clase"}`;

// Plantillas por nivel y verbo (identificar, describir, resolver, comparar, crear). Cada ítem queda ligado a un indicador.
const PLANTILLAS = [
  { nivel: "BÁSICO", item: (x) => `Dibuja o escribe un ejemplo de: ${contenidoDe(x)}.`, sol: (x) => `Se espera un ejemplo correcto de ${contenidoDe(x)}. Si lo logra solo con material concreto, se registra como parcial.` },
  { nivel: "BÁSICO", item: (x) => `Identifica: en el ejemplo resuelto del texto modelo, encierra dónde aparece ${contenidoDe(x)}.`, sol: (x) => `Se espera que marque los pasos 2 y 3 del texto modelo, donde se trabaja ${contenidoDe(x)}.` },
  { nivel: "INTERMEDIO", item: (x) => `Explica con tus palabras: ¿qué es ${contenidoDe(x)} y cómo lo reconoces?`, sol: (x) => `Se espera que mencione al menos una característica de ${contenidoDe(x)} y dé un ejemplo propio.` },
  { nivel: "INTERMEDIO", item: (x) => `Resuelve paso a paso la tarea gemela del texto modelo (${accionDe(x)}) y escribe cada paso.`, sol: (x) => `Se espera que siga los mismos pasos del ejemplo resuelto y llegue a un resultado correcto, cumpliendo: ${x.i}` },
  { nivel: "DESAFÍO", item: (x) => `Compara: escribe o dibuja dos ejemplos distintos de ${contenidoDe(x)}. ¿En qué se parecen y en qué se diferencian?`, sol: (x) => `Se espera una semejanza y una diferencia correctas entre dos ejemplos válidos de ${contenidoDe(x)}.` },
  { nivel: "DESAFÍO", item: (x) => `Crea tu propio ejemplo, pregunta o problema sobre ${contenidoDe(x)} y respóndelo.`, sol: (x) => `Se espera un ejemplo nuevo (no copiado del texto modelo), coherente con ${contenidoDe(x)} y bien resuelto.` },
];

// Guía del estudiante sin conexión: 6 ítems en 3 niveles a partir de los indicadores (nunca repite el texto del OA).
export function fichaBasica(curso) {
  const inds = indicadoresDe(curso);
  const L = [encabezadoFicha(curso), "", "Instrucciones: lee cada pregunta con calma. Puedes responder escribiendo, dibujando o con el material concreto."];
  const S = [];
  PLANTILLAS.forEach((p, k) => {
    const x = inds[k % inds.length];
    if (k === 0 || PLANTILLAS[k - 1].nivel !== p.nivel) L.push("", `NIVEL ${p.nivel}`);
    L.push(`${k + 1}. ${p.item(x)}`);
    S.push(`${k + 1}. ${p.sol(x)} (Indicador: ${x.i})`);
  });
  return {
    contenido: L.join("\n"),
    solucionario: S.join("\n"),
    adecuacion: `Versión con apoyo: responde solo los ítems 1, 2 y 3, con el texto modelo pegado en la mesa. En el ítem 3 puede responder oralmente al docente o con un dibujo. Las instrucciones se leen en voz alta, una a la vez.`,
  };
}

// Set completo de materiales sin API: los 6 tipos mínimos, con guía, texto, instrumento, ticket y recurso Mineduc por curso.
export function materialesRespaldo(cursos, ctx) {
  const out = [];
  const multi = cursos.length > 1;
  const n = (curso) => estudiantesDe(ctx, cursos, curso);
  const mat = (tipo, curso, campos, unidad = "por estudiante", numero = 1) => ({
    tipo,
    momento: MOMENTO_DEFECTO[tipo] || "desarrollo",
    curso,
    cantidad: { unidad, numero, total: calcularTotal(unidad, numero, n(curso)) },
    ...campos,
    referencias: normalizarReferencias([], tipo, cursos[curso === "todos" ? 0 : curso]),
    link: "",
  });
  cursos.forEach((c, i) => {
    const inds = indicadoresDe(c);
    const g = c.gradoNombre || "";
    const ficha = fichaBasica(c);
    out.push(
      mat("guia_estudiante", i, {
        titulo: `Guía del estudiante: ${g}`,
        proposito: "Practicar el objetivo de la clase en tres niveles de dificultad.",
        preparacion: [`Imprime una guía por estudiante de ${g} (ver cantidad).`, "Lee el solucionario y resuelve tú el ítem 4 antes de la clase.", "Tiempo estimado: 10 min"],
        instrucciones_uso: ["Entrega la guía después de modelar el texto modelo.", "Lee en voz alta las instrucciones y el ítem 1.", "Todos parten por el nivel básico; quien termina sigue al intermedio y al desafío.", "Revisa con el solucionario mientras circulas."],
        contenido: ficha.contenido,
        solucionario: ficha.solucionario,
        adecuacion: ficha.adecuacion,
        alternativa_sin_tecnologia: "Copia los ítems en la pizarra; los estudiantes responden en el cuaderno numerando cada ítem.",
      }),
      mat("texto_modelo", i, {
        titulo: `Texto modelo (ejemplo resuelto): ${g}`,
        proposito: "Mostrar paso a paso cómo se hace la tarea antes del trabajo autónomo.",
        preparacion: ["Lee el guion y prepara el ejemplo con el material concreto.", "Escribe los 5 pasos en la pizarra o en un papelógrafo.", "Tiempo estimado: 10 min"],
        instrucciones_uso: ["Desarrolla el ejemplo frente al curso pensando en voz alta.", "Deja los pasos escritos a la vista durante toda la clase.", "Pide a un estudiante que repita los pasos con sus palabras."],
        contenido: [
          `TEXTO MODELO — ${c.asig?.nombre || ""} · ${g}`,
          "Para el docente: desarrolla este ejemplo frente al curso pensando en voz alta (unos 5 minutos).",
          "",
          `Tarea: ${accionDe(inds[0])}.`,
          "Paso 1. Leo la tarea en voz alta y digo con mis palabras qué me piden.",
          `Paso 2. Muestro qué sé: escribo o armo un ejemplo de ${contenidoDe(inds[0])} con el material concreto.`,
          "Paso 3. Hago la tarea paso a paso y nombro cada paso mientras lo hago.",
          `Paso 4. Reviso con la pregunta: ¿cumplo con "${inds[0].i}"?`,
          "Paso 5. Digo en una frase lo que aprendí.",
          "",
          `Tarea gemela (ítem 4 de la guía): ${accionDe(inds[inds.length > 1 ? 1 : 0])}, con un ejemplo distinto al modelado.`,
        ].join("\n"),
        solucionario: "No aplica: es el ejemplo que el docente desarrolla frente al curso.",
        adecuacion: "Entrega una copia de los 5 pasos, con un dibujo al lado de cada paso, para tener en la mesa durante la guía.",
        alternativa_sin_tecnologia: "Escribe los 5 pasos en la pizarra y modela con el material concreto o con dibujos.",
      }, "docente"),
      mat(
        "instrumento_evaluacion",
        i,
        {
          titulo: `Lista de cotejo: ${g}`,
          proposito: "Registrar el logro de cada estudiante en los indicadores de la clase.",
          momento: "desarrollo",
          preparacion: ["Imprime la lista y escribe los nombres del curso en la primera columna.", "Lee los criterios y ubica en el solucionario qué ítems los evidencian.", "Tiempo estimado: 5 min"],
          instrucciones_uso: ["Marca mientras circulas durante la guía.", "Completa las marcas pendientes con el ticket de salida.", "Usa los resultados para planificar la próxima clase."],
          contenido: [
            `LISTA DE COTEJO — ${c.asig?.nombre || ""} · ${g}`,
            "Estudiante: __________________________  Fecha: ____________",
            "",
            "Criterio | Logrado | Parcial | No logrado",
            ...inds.map((x, k) => `${k + 1}. ${x.i} | ☐ | ☐ | ☐`),
            "",
            "Niveles:",
            "Logrado: cumple el criterio de forma autónoma y correcta.",
            "Parcial: cumple con apoyo del docente o del material, o con errores menores.",
            "No logrado: aún no lo muestra, incluso con apoyo.",
          ].join("\n"),
          solucionario: inds
            .map((x, k) => {
              const items = PLANTILLAS.map((_, j) => j).filter((j) => j % inds.length === k).map((j) => j + 1);
              return `${k + 1}. Evidencia: ítems ${items.join(", ")} de la guía${k < 2 ? ` y pregunta ${k + 1} del ticket de salida` : ""}. Se observa que ${x.i.charAt(0).toLowerCase() + x.i.slice(1)}`;
            })
            .join("\n"),
          adecuacion: "Para estudiantes con NEE, registra el logro con apoyo como Parcial y anota qué apoyo usó (material, lectura, respuesta oral).",
          alternativa_sin_tecnologia: "Copia los criterios en el libro o cuaderno del docente y marca con L / P / NL junto a cada nombre.",
        },
        "docente"
      ),
      mat("ticket_salida", i, {
        titulo: `Ticket de salida: ${g}`,
        proposito: "Comprobar al cierre si cada estudiante logró el objetivo de la clase.",
        preparacion: ["Imprime o recorta un ticket por estudiante (un cuarto de hoja).", "Tiempo estimado: 5 min"],
        instrucciones_uso: ["Entrega el ticket en los últimos 5 minutos.", "Cada estudiante responde solo y lo entrega al salir.", "Clasifica los tickets en tres montones según el criterio de logro."],
        contenido: [
          `TICKET DE SALIDA — ${g}`,
          "Nombre: ______________________",
          `Objetivo de hoy: ${objetivoClaseDe(c) || "el objetivo de la clase"}`,
          "",
          `1. Escribe o dibuja un ejemplo de ${contenidoDe(inds[0])}.`,
          `2. ${accionDe(inds[inds.length > 1 ? 1 : 0])}: hazlo en este espacio.`,
          '3. Completa: "Hoy aprendí que ..."',
        ].join("\n"),
        solucionario: [
          `1. Un ejemplo correcto de ${contenidoDe(inds[0])}.`,
          `2. Se espera que cumpla el indicador: ${inds[inds.length > 1 ? 1 : 0].i}`,
          `3. Una frase que mencione ${contenidoDe(inds[0])} con sus palabras.`,
          "Criterio de logro: 2 o 3 respuestas como se espera = logrado; 1 = parcial; 0 = por lograr (retoma el texto modelo la próxima clase).",
        ].join("\n"),
        adecuacion: "Versión con apoyo: solo las preguntas 1 y 3; puede responder dibujando o dictando al docente.",
        alternativa_sin_tecnologia: "Escribe las 3 preguntas en la pizarra; responden en un trozo de papel con su nombre.",
      }),
      mat("recurso_mineduc", i, {
        titulo: `Recursos Mineduc: ${c.asig?.nombre || ""} ${g}`,
        proposito: "Profundizar la clase con el programa de estudio y el texto escolar oficial.",
        momento: "desarrollo",
        preparacion: ["Abre la página del curso en Currículum Nacional (referencias).", `Busca ${(c.oas || []).map((o) => o.cod).join(", ") || "el OA de la clase"} y revisa sus actividades sugeridas.`, "Tiempo estimado: 15 min"],
        instrucciones_uso: ["Usa una actividad sugerida del programa como ejemplo extra en el texto modelo.", "Si tienes el texto escolar, indica la página del tema a los estudiantes."],
        contenido: [
          `Qué buscar para ${c.asig?.nombre || ""} ${g}:`,
          `1. Currículum Nacional, página del curso: abre ${(c.oas || []).map((o) => o.cod).join(", ") || "el OA"} y revisa las actividades y ejemplos de evaluación del programa de estudio.`,
          `2. Textos Escolares: descarga el texto del estudiante de ${g} y busca la unidad de ${contenidoDe(inds[0])}.`,
          "3. Búsqueda sugerida: videos y recursos del mismo tema para proyectar si tienes conexión.",
        ].join("\n"),
        solucionario: "No aplica: es una guía de búsqueda para el docente.",
        adecuacion: "Elige del texto escolar una página con imágenes para quien necesita apoyo visual.",
        alternativa_sin_tecnologia: "Usa el texto escolar impreso de la biblioteca o la guía didáctica del docente.",
      }, "docente")
    );
  });
  const lineas = [];
  lineas.push(`- Pizarra y plumones: 1 (docente) · inicio: ${multi ? "una fila por curso con su objetivo" : "el objetivo de la clase y los 5 pasos del texto modelo"} · si falta: papelógrafo pegado en el muro.`);
  cursos.forEach((c, i) => {
    lineas.push(`- Guías del estudiante ${c.gradoNombre}: ${calcularTotal("por estudiante", 1, n(i))} · desarrollo: práctica en 3 niveles · si falta: copiar los ítems en la pizarra.`);
    lineas.push(`- Tickets de salida ${c.gradoNombre}: ${calcularTotal("por estudiante", 1, n(i))} · cierre · si falta: responder en papel recortado.`);
    lineas.push(`- Lista de cotejo ${c.gradoNombre}: 1 (docente) · desarrollo y cierre · si falta: registro en el cuaderno del docente.`);
  });
  lineas.push(`- Cuaderno y lápiz grafito: ${calcularTotal("por estudiante", 1, n("todos"))} · desarrollo: responder la guía · si falta: hojas sueltas.`);
  const concreto = MATERIAL_CONCRETO[cursos[0]?.asig?.id] || MATERIAL_CONCRETO.LEN;
  lineas.push(`- ${concreto[0]}: ${calcularTotal("por pareja", 1, n("todos"))} · desarrollo: modelaje y ítems básicos de la guía · si falta: ${concreto[1]}.`);
  textos(String(ctx?.recursos || "").split(/[,;]/)).forEach((r) =>
    lineas.push(`- ${r} (declarado por el docente): según disponibilidad · desarrollo: úsalo al modelar el texto modelo y en los ítems básicos de la guía · si falta: el material concreto de esta lista.`)
  );
  out.push(
    mat(
      "materiales_fisicos",
      "todos",
      {
        titulo: "Lista de materiales físicos",
        proposito: "Tener listo todo lo necesario antes de la clase, con cantidades.",
        preparacion: ["Revisa la lista y marca lo que ya tienes.", "Imprime guías, tickets y lista de cotejo según las cantidades.", "Deja el material concreto separado por mesa o grupo.", "Tiempo estimado: 15 min"],
        instrucciones_uso: ["Reparte el material concreto al empezar el desarrollo.", "Nombra un encargado de materiales por mesa para repartir y recoger."],
        contenido: lineas.join("\n"),
        solucionario: "No aplica: es una lista de preparación.",
        adecuacion: "Deja material concreto extra y la copia de los pasos del texto modelo en la mesa de quien necesita apoyo.",
        alternativa_sin_tecnologia: "Todos los materiales de la lista son físicos; si falta alguno, usa la alternativa indicada en cada línea.",
      },
      "docente"
    )
  );
  return out;
}

const MATERIAL_CONCRETO = {
  LEN: ["Tarjetas con palabras o imágenes del tema", "palabras escritas en la pizarra"],
  MAT: ["Material para contar y agrupar (20 fichas, cubos o palitos)", "dibujos de puntos en el cuaderno"],
  CN: ["Objetos o imágenes para observar (y una lupa si hay)", "dibujos en la pizarra"],
  HIS: ["Mapa o imágenes impresas del tema", "un dibujo del mapa en la pizarra"],
  TEC: ["Materiales reciclados: cartón, tijeras y pegamento", "hojas de cuaderno"],
  ORI: ["Tarjetas con situaciones de la vida escolar", "situaciones leídas en voz alta"],
};

const DEFECTO = {
  preparacion: ["Revisa el material completo y ajústalo a tu curso.", "Imprime o copia en la pizarra lo necesario.", "Tiempo estimado: 10 min"],
  instrucciones_uso: ["Presenta el material y para qué sirve.", "Muestra cómo se usa con un ejemplo.", "Retira o revisa el material al terminar."],
  solucionario: "No aplica: material de apoyo sin respuestas cerradas.",
  adecuacion: "Versión con apoyo: la mitad de los pasos o ítems, con un ejemplo resuelto a la vista e instrucciones leídas en voz alta; puede responder oralmente o dibujando.",
  alternativa_sin_tecnologia: "Sin proyector ni internet: lee o escribe en la pizarra el contenido de este material; los estudiantes trabajan en el cuaderno.",
};

// Completa un material de la API con el esquema entero. Si una guía, ticket o instrumento viene sin contenido
// o sin solucionario, se reemplaza por el de respaldo del mismo curso. Devuelve null si no se puede usar.
export function normalizarMaterial(m, cursos, ctx, respaldo = []) {
  if (!m || typeof m !== "object") return null;
  const tipo = String(m.tipo || "sitio").trim().toLowerCase().replace(/\s+/g, "_");
  const curso = /^\d+$/.test(String(m.curso)) && cursos[+m.curso] ? +m.curso : "todos";
  const cp = respaldo.find((r) => r.tipo === tipo && r.curso === curso) || respaldo.find((r) => r.tipo === tipo);
  const sinSol = vacio(m.solucionario) || /^no aplica/i.test(String(m.solucionario));
  if (cp && (vacio(m.contenido) || (GRADUADOS.includes(tipo) && sinSol))) return cp;
  const contenido = vacio(m.contenido) ? m.alternativa_sin_tecnologia : m.contenido;
  if (vacio(contenido)) return null;
  const base = cp || DEFECTO;
  const unidad = UNIDADES.includes(m.cantidad?.unidad) ? m.cantidad.unidad : cp?.cantidad.unidad || "por estudiante";
  const numero = Number(m.cantidad?.numero) > 0 ? Number(m.cantidad.numero) : 1;
  const lista = (k) => (textos(m[k]).length ? textos(m[k]) : base[k]);
  const texto = (k) => (vacio(m[k]) ? base[k] : String(m[k]).trim());
  return {
    tipo,
    titulo: String(m.titulo || m.tipo || "Material").trim(),
    proposito: vacio(m.proposito) ? `Apoya el objetivo de la clase: ${objetivoClaseDe(cursos[curso === "todos" ? 0 : curso] || { oas: [] })}` : String(m.proposito).trim(),
    momento: MOMENTOS.includes(m.momento) ? m.momento : MOMENTO_DEFECTO[tipo] || "desarrollo",
    curso,
    cantidad: { unidad, numero, total: calcularTotal(unidad, numero, estudiantesDe(ctx, cursos, curso)) },
    preparacion: lista("preparacion"),
    instrucciones_uso: lista("instrucciones_uso"),
    contenido: String(contenido).trim(),
    solucionario: texto("solucionario"),
    adecuacion: texto("adecuacion"),
    alternativa_sin_tecnologia: texto("alternativa_sin_tecnologia"),
    referencias: normalizarReferencias(m.referencias, tipo, cursos[curso === "todos" ? 0 : curso]),
    link: esHttps(m.link) ? m.link : "",
  };
}

// Lista final: materiales de la API normalizados, sin genéricos sueltos, más los tipos mínimos que falten (por curso).
export function normalizarMateriales(lista, cursos, ctx) {
  const respaldo = materialesRespaldo(cursos, ctx);
  const genericos = /^(pizarra|cuadernos?|recursos propios)$/i;
  const api = (Array.isArray(lista) ? lista : [])
    .filter((m) => m && !genericos.test(String(m.titulo || m.tipo || "").trim()))
    .map((m) => normalizarMaterial(m, cursos, ctx, respaldo))
    .filter((m, i, a) => m && a.indexOf(m) === i);
  const falta = respaldo.filter((r) => !api.some((m) => m.tipo === r.tipo && (r.curso === "todos" || m.curso === r.curso)));
  const orden = (m) => (m.curso === "todos" ? 99 : m.curso) * 100 + (TIPOS_MINIMOS.includes(m.tipo) ? TIPOS_MINIMOS.indexOf(m.tipo) : 50);
  return [...api, ...falta].sort((a, b) => orden(a) - orden(b)).map((m, i) => ({ ...m, id: `m${i + 1}` }));
}

export function planRespaldo(cursos, bloques, ctx, multigrado) {
  const t = TIEMPOS[bloques];
  return {
    titulo: multigrado
      ? `Trabajo simultáneo: ${cursos.map((c) => `${c.asig.corto} en ${c.gradoNombre}`).join(", ")}`
      : `${cursos[0].asig.corto} en ${cursos[0].gradoNombre}`,
    objetivosClase: cursos.map(objetivoClaseDe),
    hilo: multigrado
      ? "Una misma situación de la vida de la escuela abre la clase para todos los cursos; después cada curso trabaja en su propia meta y al final comparten lo que descubrieron."
      : "La clase parte de una situación cercana a los estudiantes, se profundiza con una actividad guiada y cierra retomando el objetivo.",
    inicio: {
      min: t.inicio,
      estudiantes: [
        "Saludo y ronda breve: cada estudiante dice una palabra sobre cómo llega hoy.",
        "Responden la pregunta de activación desde lo que ya saben.",
      ],
      docente: [
        multigrado
          ? "Presenta la situación común y la escribe en la pizarra, una fila por curso con lo que va a aprender cada uno."
          : "Presenta el objetivo de la clase y lo escribe en la pizarra con sus palabras.",
        "Hace la pregunta de activación asegurando que todos puedan responder desde su nivel.",
      ],
      pregunta: "¿Qué sabemos ya sobre esto y qué queremos averiguar hoy?",
    },
    desarrollo: {
      min: t.desarrollo,
      comunEstudiantes: multigrado ? ["Observan el modelaje del docente hecho con el curso más avanzado."] : [],
      comunDocente: multigrado
        ? [
            "Modela el procedimiento frente a todos con el curso más avanzado y luego lo repite simplificado.",
            "Organiza turnos de atención directa por curso mientras el resto trabaja de forma autónoma con la pauta.",
          ]
        : [],
      porCurso: cursos.map((c, i) => ({
        estudiantes: [
          `Trabajan con material concreto sobre ${c.oas.map((o) => o.texto).join("; ")}.`,
          "Registran en el cuaderno con apoyo de un modelo pegado en la mesa.",
          i === 0
            ? "Verifican con el docente antes de pasar a la práctica independiente."
            : "Trabajan de forma autónoma con pauta escrita paso a paso, comparando en pareja con un compañero.",
        ],
        docente: [
          "Entrega el material concreto y explica la tarea con un ejemplo resuelto.",
          i === 0
            ? "Revisa el registro de cada estudiante antes de dar la práctica independiente."
            : "Circula por la sala para resolver dudas puntuales sin resolver la tarea por el estudiante.",
        ],
      })),
    },
    cierre: {
      min: t.cierre,
      estudiantes: [
        multigrado ? "Un estudiante de cada curso muestra su trabajo." : "Dos o tres estudiantes muestran su trabajo.",
        "Responden las preguntas de metacognición.",
      ],
      docente: [
        "Vuelve al objetivo escrito en la pizarra y marca lo logrado con el curso.",
        "Hace las preguntas de metacognición y recoge dos o tres respuestas.",
      ],
      metacognicion: [
        "¿Qué me resultó fácil y qué me costó?",
        multigrado ? "¿En qué momento ayudé o me ayudaron?" : "¿Qué aprendí hoy que no sabía antes?",
        "¿Qué necesito practicar la próxima clase?",
      ],
    },
    dua: {
      representacion: [
        "Los objetivos e instrucciones quedan escritos y también dibujados en la pizarra.",
        "Material concreto disponible para todos los cursos.",
        "Instrucciones dichas en voz alta y repetidas por un estudiante con sus palabras.",
      ],
      accion: [
        "La respuesta puede darse dibujando, hablando, escribiendo o manipulando material.",
        "Se acepta el registro con apoyo de plantilla para quien tiene dificultad grafomotora.",
        "Tiempos flexibles: quien necesita más tiempo continúa en el momento de trabajo autónomo.",
      ],
      motivacion: [
        "Elección entre dos alternativas de actividad dentro de la misma meta.",
        "Roles rotativos: monitor, encargado de materiales, encargado del tiempo.",
        "Reconocimiento explícito del esfuerzo y no solo del resultado.",
      ],
    },
    evaluacion: {
      instrumento: "Lista de cotejo con los indicadores de la clase (Logrado / Parcial / No logrado) y ticket de salida.",
      porCurso: cursos.map((c) => ({ criterios: criteriosDe(c) })),
    },
    materiales: normalizarMateriales([], cursos, ctx),
    tutoria: multigrado
      ? "Se forman parejas de apadrinamiento: un estudiante de un curso más avanzado acompaña a uno de un curso menor durante el trabajo autónomo, sin resolverle la tarea."
      : "",
    adecuaciones: [
      "Para estudiantes con NEE: reducir la cantidad de ítems, no la exigencia del objetivo.",
      "Ubicación cercana al docente y apoyo visual permanente.",
      "Anticipar los cambios de actividad con una señal acordada.",
    ],
  };
}

/* ============================================================
   EXPORTAR A TEXTO
   ============================================================ */

export function planTexto(p) {
  if (!p) return "";
  const L = [];
  L.push(`# ${p.titulo}`);
  L.push(`${p.meta.escuela || ""}  ${p.meta.docente ? "· " + p.meta.docente : ""}  ${p.meta.fecha ? "· " + p.meta.fecha : ""}`.trim());
  L.push(`${p.meta.multigrado ? "Aula multigrado" : "Clase"} · ${p.meta.cursos.map((c) => c.gradoNombre).join(" y ")} · ${p.meta.bloques} bloque(s) · ${p.meta.minutos} minutos`);
  L.push(`\nHilo articulador: ${p.hilo}`);
  if ((p.objetivosClase || []).length) {
    L.push(`\nObjetivo(s) de la clase:`);
    p.objetivosClase.forEach((o, i) => L.push(`- ${p.meta.cursos[i]?.gradoNombre || "Curso " + (i + 1)}: ${o}`));
  }
  p.meta.cursos.forEach((c) => {
    L.push(`\n## ${c.gradoNombre.toUpperCase()} — ${c.asig}`);
    (c.oas || []).forEach((o) => {
      L.push(`${o.cod} (${o.basal ? "basal" : "complementario"}): ${o.texto}`);
      if (o.fuente) L.push(`  Origen: ${o.fuente}${o.url ? ` · ${o.url}` : ""}`);
      (o.indicadores || []).forEach((x) => L.push(`  Indicador: ${x.i} (habilidad: ${x.h}; contenido: ${x.c}; actitud: ${x.a})`));
    });
  });
  if (p.alineacion?.length) {
    L.push(`\n## Alineación sugerida (revisar)`);
    p.alineacion.forEach((x) => L.push(`- ${p.meta.cursos[x.curso]?.gradoNombre || "Curso"} · ${x.oa}: actividad — ${x.actividad}; evidencia — ${x.evidencia}`));
  }
  L.push(`\n## Inicio (${p.inicio.min} min)`);
  L.push(`Estudiantes:`);
  (p.inicio.estudiantes || []).forEach((x) => L.push(`- ${x}`));
  L.push(`Docente:`);
  (p.inicio.docente || []).forEach((x) => L.push(`- ${x}`));
  if (p.inicio.pregunta) L.push(`Pregunta motivadora: ${p.inicio.pregunta}`);
  L.push(`\n## Desarrollo (${p.desarrollo.min} min)`);
  if ((p.desarrollo.comunEstudiantes || []).length || (p.desarrollo.comunDocente || []).length) {
    L.push(`Con todos los cursos:`);
    L.push(`Estudiantes:`);
    (p.desarrollo.comunEstudiantes || []).forEach((x) => L.push(`- ${x}`));
    L.push(`Docente:`);
    (p.desarrollo.comunDocente || []).forEach((x) => L.push(`- ${x}`));
  }
  (p.desarrollo.porCurso || []).forEach((pc, i) => {
    L.push(`${p.meta.cursos[i]?.gradoNombre || "Curso " + (i + 1)}:`);
    L.push(`Estudiantes:`);
    (pc.estudiantes || []).forEach((x) => L.push(`- ${x}`));
    L.push(`Docente:`);
    (pc.docente || []).forEach((x) => L.push(`- ${x}`));
  });
  (p.desarrollo.rotaciones || []).forEach((r) => L.push(`- Rotación ${r.desde}–${r.hasta} min · ${r.curso}: docente — ${r.docente}; demás cursos — ${r.otros}`));
  L.push(`\n## Cierre (${p.cierre.min} min)`);
  L.push(`Estudiantes:`);
  (p.cierre.estudiantes || []).forEach((x) => L.push(`- ${x}`));
  L.push(`Docente:`);
  (p.cierre.docente || []).forEach((x) => L.push(`- ${x}`));
  (p.cierre.metacognicion || []).forEach((x) => L.push(`- Pregunta: ${x}`));
  L.push(`\n## Diversificación (DUA)`);
  L.push(`Representación:`);
  (p.dua.representacion || []).forEach((x) => L.push(`- ${x}`));
  L.push(`Acción y expresión:`);
  (p.dua.accion || []).forEach((x) => L.push(`- ${x}`));
  L.push(`Motivación:`);
  (p.dua.motivacion || []).forEach((x) => L.push(`- ${x}`));
  L.push(`\n## Evaluación formativa`);
  L.push(`Instrumento: ${p.evaluacion.instrumento}`);
  (p.evaluacion.porCurso || []).forEach((pc, i) => {
    L.push(`Criterios ${p.meta.cursos[i]?.gradoNombre || "curso " + (i + 1)}:`);
    (pc.criterios || []).forEach((x) => L.push(`- ${x}`));
  });
  if (p.tutoria) L.push(`\n## Tutoría entre pares\n${p.tutoria}`);
  L.push(`\n## Adecuaciones`);
  (p.adecuaciones || []).forEach((x) => L.push(`- ${x}`));
  L.push(`\n## Materiales`);
  (p.materiales || []).forEach((m) => L.push(`\n${materialTexto(m, p.meta.cursos)}`));
  return L.join("\n");
}

// Un material en texto (copiar, descargar o imprimir). Acepta también el formato antiguo {tipo, descripcion, contenido, link}.
export function materialTexto(m, cursosMeta) {
  const L = [`### ${m.titulo || m.tipo}${m.proposito || m.descripcion ? ": " + (m.proposito || m.descripcion) : ""}`];
  const curso = m.curso === "todos" ? "todos los cursos" : cursosMeta?.[m.curso]?.gradoNombre;
  const datos = [m.momento && `Momento: ${m.momento}`, curso && (cursosMeta || []).length > 1 && `Curso: ${curso}`, m.cantidad?.total && `Cantidad: ${m.cantidad.total}`].filter(Boolean);
  if (datos.length) L.push(datos.join(" · "));
  const lista = (t, xs) => (xs || []).length && L.push(`${t}:`, ...xs.map((x) => `- ${x}`));
  const bloque = (t, x) => x && L.push(`${t}:`, x);
  lista("Preparación previa", m.preparacion);
  lista("Cómo se usa en la sala", m.instrucciones_uso);
  bloque("Contenido", m.contenido);
  bloque("Para el docente, solucionario (revisar antes de imprimir)", m.solucionario);
  bloque("Adecuación NEE", m.adecuacion);
  bloque("Alternativa sin tecnología", m.alternativa_sin_tecnologia);
  lista("Referencias", (m.referencias || []).map((r) => `[${ETIQUETA_LINK[r.tipo_link] || r.tipo_link}] ${r.titulo}: ${r.url}`));
  if (m.link) L.push(`Link del docente: ${m.link}`);
  return L.join("\n");
}
