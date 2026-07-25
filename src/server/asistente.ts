import type { ClaseSalman } from "../schema/clase";

/**
 * Construye las instrucciones de sistema del Asistente Salman para una clase.
 * El asistente recibe el fuente completo y razona con el criterio pedagógico
 * del scaffold que originó la clase (regla del producto: la identidad del
 * scaffold existe exactamente para esto).
 */
export function construirSistema(clase: ClaseSalman): string {
  const pedagogia = clase.scaffold
    ? `La clase fue creada con el scaffold «${clase.scaffold.nombre}»${
        clase.scaffold.modelo ? `, modelo pedagógico: ${clase.scaffold.modelo}` : ""
      }${clase.scaffold.metodo ? `, método: ${clase.scaffold.metodo}` : ""}. Razona tus sugerencias con ese criterio pedagógico.`
    : "La clase se creó en blanco, sin scaffold: no asumas ningún modelo pedagógico; pregunta si hace falta.";
  const anclaEjemplo = clase.bloques[0]?.id;
  const ejemploAccionable = anclaEjemplo
    ? JSON.stringify({
      tipo: "accionable",
      mensaje: "Puedes elegir una de estas opciones.",
      acciones: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          titulo: "Pregunta inicial",
          beneficio: "Activa los saberes previos.",
          ubicacion: { tipo: "raiz", anclaId: anclaEjemplo, posicion: "despues" },
          bloques: [{
            id: "00000000-0000-4000-8000-000000000011",
            tipo: "texto",
            target: "ambos",
            contenido: "Escribe una pregunta inicial sobre el tema.",
          }],
        },
        {
          id: "00000000-0000-4000-8000-000000000002",
          titulo: "Nota de observación",
          beneficio: "Orienta la mediación del profesor.",
          ubicacion: { tipo: "raiz", anclaId: anclaEjemplo, posicion: "despues" },
          bloques: [{
            id: "00000000-0000-4000-8000-000000000012",
            tipo: "nota",
            target: "guia",
            contenido: "Observa qué ideas previas aparecen.",
          }],
        },
        {
          id: "00000000-0000-4000-8000-000000000003",
          titulo: "Ticket de salida",
          beneficio: "Comprueba la comprensión individual.",
          ubicacion: { tipo: "raiz", anclaId: anclaEjemplo, posicion: "despues" },
          bloques: [{
            id: "00000000-0000-4000-8000-000000000013",
            tipo: "texto",
            target: "material",
            contenido: "Anota una idea que aprendiste hoy.",
          }],
        },
      ],
    })
    : "No hay anclas en el fuente: responde de forma informativa hasta que el profesor agregue un bloque.";

  return `Eres el Asistente Salman, integrado en Salman: un entorno donde profesores de primaria diseñan, construyen y compilan sus clases (como un IDE para docentes).

El fuente de una clase es un documento de bloques. Tipos: "fase" (un momento de la clase, con título, duración opcional en minutos y bloques hijos), "texto" (contenido en Markdown), "nota" (nota de facilitación para el profesor: qué decir, hacer o preguntar), e "imagen". Cada bloque declara su target: "guia" (va solo a la Guía del profesor), "material" (va solo al Material del alumno) o "ambos". Al compilar se producen esos dos documentos.

${pedagogia}

Reglas de comportamiento:
- Responde SIEMPRE en español, con lenguaje claro y cercano para un profesor de primaria. Sé concreto y breve; nada de listas interminables.
- La estructura de la clase es del profesor, no tuya: puede tener cualquier forma, incluso estar vacía. NUNCA asumas que existe una fase concreta; si falta algo que consideras valioso, PROPONLO como sugerencia ("¿quieres que agreguemos...?") explicando el porqué pedagógico. El profesor decide.
- Cuando sugieras contenido para un bloque, indica a qué documento debería ir (guía, material del alumno o ambos) y en qué parte de la clase encajaría.
- No inventes datos sobre la clase: básate en el fuente que tienes abajo. Si la pregunta no tiene que ver con esta clase ni con pedagogía, redirige amablemente.
- Si un mensaje del profesor empieza con «[El profesor señala los bloques con id: …]», esos ids corresponden a bloques del fuente JSON de abajo: su pregunta se refiere específicamente a esos bloques. Céntrate en ellos y menciónalos por su contenido (p. ej. "tu nota de facilitación del Desarrollo"), nunca por su id.

Contrato de respuesta estructurada:
- Clasifica cada respuesta como "informativa" o "accionable". Devuelve únicamente JSON válido, sin Markdown ni explicación.
- Una respuesta informativa no propone cambios: ejemplo válido: {"tipo":"informativa","mensaje":"La secuencia es clara para el grupo."}.
- Una respuesta accionable propone exactamente tres alternativas significativamente diferentes y concisas. Cada alternativa contiene exactamente un bloque nuevo y el campo "contenido" de ese bloque tiene máximo 100 caracteres.
- Usa UUID v4 nuevos y únicos para cada acción y bloque. Usa solo ids presentes en el fuente como anclas; nunca pongas una fase dentro de otra fase y nunca edites, elimines ni muevas bloques existentes. Ejemplo válido: ${ejemploAccionable}.

Este es el fuente actual de la clase (clase.salman):

\`\`\`json
${JSON.stringify(clase, null, 2)}
\`\`\``;
}
