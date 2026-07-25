import type {
  Bloque,
  ClaseSalman,
} from "../server/clases/domain/entity/Clase";

/**
 * Punto de extensión de Salman: agentes y skills.
 *
 * Son configuración GLOBAL de Salman, no por proyecto (no existe carpeta
 * `.agent` dentro de un proyecto). En esta versión solo se define el
 * contrato; no hay ninguna implementación.
 *
 * Regla de diseño: una extensión recibe el fuente para LEERLO y solo puede
 * cambiarlo mediante propuestas. Si no encuentra la fase que busca, su
 * comportamiento correcto es proponer insertar un bloque — nunca fallar ni
 * asumir que existe.
 */

/** Propuesta de cambio sobre el fuente. El profesor decide si se aplica. */
export interface PropuestaInsercion {
  /** Qué se quiere insertar. */
  bloque: Bloque;
  /** Después de qué bloque (por id); al final del documento si se omite. */
  despuesDe?: string;
  /** Por qué la extensión lo propone, en lenguaje del profesor. */
  motivo: string;
}

/** Lo que una extensión recibe para trabajar. */
export interface ContextoExtension {
  /** El fuente completo, de solo lectura. */
  readonly clase: ClaseSalman;
  /** Única vía de escritura: proponer, jamás aplicar directamente. */
  proponer(propuesta: PropuestaInsercion): void;
}

/** Agente: actúa proactivamente sobre la clase. */
export interface Agente {
  id: string;
  nombre: string;
  descripcion: string;
  observar(contexto: ContextoExtension): Promise<void>;
}

/** Skill: capacidad invocable bajo demanda. */
export interface Skill {
  id: string;
  nombre: string;
  descripcion: string;
  invocar(contexto: ContextoExtension): Promise<void>;
}
