import type { ClaseSalman } from "../server/clases/domain/entity/Clase";

/** Clase de ejemplo válida y completa, compartida por las pruebas. */
export const claseEjemplo: ClaseSalman = {
  formato: "salman",
  version: 1,
  id: "0b9f6c1e-3a7d-4e2b-9c8f-1d2e3f4a5b6c",
  titulo: "Los estados del agua",
  metadatos: {
    materia: "Ciencias Naturales",
    grado: "3° de primaria",
    duracionMinutos: 60,
    objetivos: ["Identificar los tres estados del agua"],
  },
  scaffold: {
    id: "inicio-desarrollo-cierre",
    nombre: "Inicio / Desarrollo / Cierre",
    version: 1,
    modelo: "socioconstructivista",
    metodo: "PBL (aprendizaje basado en proyectos)",
  },
  creado: "2026-07-23T10:00:00.000Z",
  modificado: "2026-07-23T10:00:00.000Z",
  bloques: [
    {
      id: "1a2b3c4d-0000-4000-8000-000000000001",
      tipo: "fase",
      target: "ambos",
      titulo: "Inicio",
      duracionMinutos: 10,
      bloques: [
        {
          id: "1a2b3c4d-0000-4000-8000-000000000002",
          tipo: "nota",
          target: "guia",
          contenido: "Pregunta al grupo: ¿dónde han visto hielo fuera del congelador?",
        },
        {
          id: "1a2b3c4d-0000-4000-8000-000000000003",
          tipo: "texto",
          target: "material",
          contenido: "Dibuja el agua en sus tres formas.",
        },
      ],
    },
    {
      id: "1a2b3c4d-0000-4000-8000-000000000004",
      tipo: "texto",
      target: "ambos",
      contenido: "Bloque suelto fuera de toda fase.",
    },
  ],
};
