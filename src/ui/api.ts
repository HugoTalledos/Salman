import type { RespuestaAsistente } from "../server/asistencia/domain/entity/RespuestaAsistente";
import type { ClaseSalman, MetadatosClase } from "../server/clases/domain/entity/Clase";

/** Cliente de la API local. La UI nunca toca el filesystem: todo pasa por aquí. */

export interface ResumenProyecto {
  carpeta: string;
  titulo: string;
  modificado: string;
  scaffold: string | null;
}

export interface MensajeAsistente {
  rol: "usuario" | "asistente";
  contenido: string;
  /** IDs de bloques del fuente señalados en este mensaje. */
  bloques?: string[];
}

export interface InfoScaffold {
  id: string;
  nombre: string;
  version: number;
  descripcion: string;
  modelo?: string;
  metodo?: string;
}

export interface CatalogosClase {
  materias: string[];
  grados: string[];
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const cuerpo = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(cuerpo.error ?? `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const enc = encodeURIComponent;

export const api = {
  async listarProyectos(): Promise<ResumenProyecto[]> {
    const r = await fetch("/api/proyectos");
    return (await json<{ proyectos: ResumenProyecto[] }>(r)).proyectos;
  },

  async listarScaffolds(): Promise<InfoScaffold[]> {
    const r = await fetch("/api/scaffolds");
    return (await json<{ scaffolds: InfoScaffold[] }>(r)).scaffolds;
  },

  async listarCatalogosClase(): Promise<CatalogosClase> {
    const r = await fetch("/api/catalogos/clase");
    return json<CatalogosClase>(r);
  },

  async listarObjetivos(contexto: {
    materia: string;
    grado?: string;
    titulo?: string;
  }): Promise<string[]> {
    const parametros = new URLSearchParams({ materia: contexto.materia });
    if (contexto.grado) parametros.set("grado", contexto.grado);
    if (contexto.titulo) parametros.set("titulo", contexto.titulo);
    const r = await fetch(`/api/objetivos?${parametros}`);
    return (await json<{ objetivos: string[] }>(r)).objetivos;
  },

  async leerProyecto(carpeta: string): Promise<ClaseSalman> {
    const r = await fetch(`/api/proyectos/${enc(carpeta)}`);
    return (await json<{ clase: ClaseSalman }>(r)).clase;
  },

  async crearProyecto(
    titulo: string,
    scaffoldId: string | null,
    metadatos: MetadatosClase,
  ): Promise<{ carpeta: string; clase: ClaseSalman }> {
    const r = await fetch("/api/proyectos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ titulo, scaffoldId, metadatos }),
    });
    return json(r);
  },

  async borrarProyecto(carpeta: string): Promise<void> {
    const r = await fetch(`/api/proyectos/${enc(carpeta)}`, { method: "DELETE" });
    if (!r.ok) await json<never>(r);
  },

  async compilar(carpeta: string): Promise<{ guia: string; material: string }> {
    const r = await fetch(`/api/proyectos/${enc(carpeta)}/compilar`, { method: "POST" });
    return (await json<{ archivos: { guia: string; material: string } }>(r)).archivos;
  },

  async subirImagen(carpeta: string, archivo: File): Promise<{ recurso: string }> {
    const forma = new FormData();
    forma.append("archivo", archivo);
    const r = await fetch(`/api/proyectos/${enc(carpeta)}/recursos`, {
      method: "POST",
      body: forma,
    });
    return json(r);
  },

  urlRecurso(carpeta: string, archivo: string): string {
    return `/api/proyectos/${enc(carpeta)}/recursos/${enc(archivo)}`;
  },

  async listarRecursos(carpeta: string): Promise<string[]> {
    const r = await fetch(`/api/proyectos/${enc(carpeta)}/recursos`);
    return (await json<{ archivos: string[] }>(r)).archivos;
  },

  async asistente(
    carpeta: string,
    mensajes: MensajeAsistente[],
  ): Promise<RespuestaAsistente> {
    const r = await fetch(`/api/proyectos/${enc(carpeta)}/asistente`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mensajes }),
    });
    return json<RespuestaAsistente>(r);
  },

  async guardarProyecto(carpeta: string, clase: ClaseSalman): Promise<ClaseSalman> {
    const r = await fetch(`/api/proyectos/${enc(carpeta)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(clase),
    });
    return (await json<{ clase: ClaseSalman }>(r)).clase;
  },
};
