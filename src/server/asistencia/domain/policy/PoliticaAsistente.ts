import type { ClaseSalman } from "../../../clases/domain/entity/Clase";

export interface PoliticaAsistente {
  idioma: "es";
  maximoCaracteresContenido: 100;
  cantidadAlternativas: 3;
  permiteEditar: false;
  permiteEliminar: false;
  permiteMover: false;
}

export const POLITICA_ASISTENTE: Readonly<PoliticaAsistente> = Object.freeze({
  idioma: "es",
  maximoCaracteresContenido: 100,
  cantidadAlternativas: 3,
  permiteEditar: false,
  permiteEliminar: false,
  permiteMover: false,
});

export type CriterioPedagogico =
  | {
    tipo: "scaffold";
    nombre: string;
    modelo?: string;
    metodo?: string;
  }
  | { tipo: "clase-en-blanco" };

export type EjemploPermitido =
  | { tipo: "accionable"; anclaId: string }
  | { tipo: "informativo-sin-ancla" };

export function obtenerCriterioPedagogico(
  clase: ClaseSalman,
): CriterioPedagogico {
  if (!clase.scaffold) {
    return { tipo: "clase-en-blanco" };
  }

  return {
    tipo: "scaffold",
    nombre: clase.scaffold.nombre,
    modelo: clase.scaffold.modelo,
    metodo: clase.scaffold.metodo,
  };
}

export function obtenerEjemploPermitido(
  clase: ClaseSalman,
): EjemploPermitido {
  const anclaId = clase.bloques[0]?.id;
  return anclaId
    ? { tipo: "accionable", anclaId }
    : { tipo: "informativo-sin-ancla" };
}
