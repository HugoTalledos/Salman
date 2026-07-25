import type { Bloque, BloqueHijo, Target } from "../../domain/entity/Clase";
import type { DefinicionScaffold } from "../../domain/entity/Scaffold";

const uuid = () => crypto.randomUUID();

function texto(target: Target, contenido: string): BloqueHijo {
  return { id: uuid(), tipo: "texto", target, contenido };
}

function nota(contenido: string): BloqueHijo {
  return { id: uuid(), tipo: "nota", target: "guia", contenido };
}

function fase(
  titulo: string,
  duracionMinutos: number,
  bloques: BloqueHijo[],
): Bloque {
  return { id: uuid(), tipo: "fase", target: "ambos", titulo, duracionMinutos, bloques };
}

export const inicioDesarrolloCierre: DefinicionScaffold = {
  id: "inicio-desarrollo-cierre",
  nombre: "Inicio / Desarrollo / Cierre",
  version: 1,
  descripcion:
    "Secuencia clásica de primaria en tres momentos, con un problema como eje (PBL). Trae tiempos sugeridos, notas guía y un material de alumno de ejemplo.",
  modelo: "socioconstructivista",
  metodo: "PBL (aprendizaje basado en problemas)",
  semilla: (): Bloque[] => [
    fase("Inicio", 10, [
      nota(
        "**Intención de este momento:** activar lo que el grupo ya sabe y presentar el problema que guiará la clase. Todavía no expliques contenido: deja que aparezcan las ideas previas, incluso las equivocadas.\n\n- Lanza el problema como pregunta abierta y anota las hipótesis en el pizarrón.\n- Pregunta guía: *¿qué necesitaríamos saber para resolverlo?*",
      ),
      texto(
        "ambos",
        "✏️ Escribe aquí el problema o situación que abre la clase. Debe ser cercano a la vida de los alumnos y no tener una única respuesta evidente.",
      ),
    ]),
    fase("Desarrollo", 35, [
      nota(
        "**Intención de este momento:** los equipos trabajan sobre el problema; tú circulas, observas y preguntas — no resuelvas por ellos.\n\n- Reparte el material del alumno al iniciar este momento.\n- Preguntas para destrabar sin dar la respuesta: *¿qué han intentado?, ¿qué pasaría si…?*\n- Atento a: equipos donde una sola persona hace todo.",
      ),
      texto(
        "material",
        "✏️ Escribe aquí las instrucciones de la actividad para el alumno: qué van a hacer en equipo, con qué materiales y qué deben entregar o mostrar al final.",
      ),
    ]),
    fase("Cierre", 15, [
      nota(
        "**Intención de este momento:** puesta en común — que el conocimiento construido en equipos se vuelva del grupo. Conecta lo que descubrieron con las hipótesis del inicio: ¿cuáles se confirmaron?, ¿cuáles no?\n\n- Cierra nombrando explícitamente el concepto trabajado con las palabras de los propios alumnos.",
      ),
      texto(
        "material",
        "✏️ Escribe aquí la reflexión final o ticket de salida del alumno. Por ejemplo: *Hoy descubrí que… / Todavía me pregunto…*",
      ),
    ]),
  ],
};
