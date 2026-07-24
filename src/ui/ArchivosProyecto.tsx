import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/** Ícono según extensión, al estilo de un explorador de archivos. */
function icono(archivo: string): string {
  const ext = archivo.slice(archivo.lastIndexOf(".") + 1).toLowerCase();
  if (ext === "html") return "🌐";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "🖼";
  if (ext === "pdf") return "📕";
  return "📄";
}

/**
 * Barra lateral izquierda: el sistema de archivos de la clase.
 *
 *   📁 <carpeta>
 *   ├── 📄 clase.salman   ← el fuente (abierto en el editor)
 *   └── 📁 recursos/      ← artefactos compilados e imágenes
 */
export function ArchivosProyecto({
  carpeta,
  version,
}: {
  carpeta: string;
  /** Al cambiar (p. ej. tras compilar) se recarga el listado. */
  version: number;
}) {
  const [archivos, setArchivos] = useState<string[]>([]);
  const [abierto, setAbierto] = useState(true);

  const recargar = useCallback(() => {
    api.listarRecursos(carpeta).then(setArchivos, () => setArchivos([]));
  }, [carpeta]);

  useEffect(recargar, [recargar, version]);

  return (
    <nav className="archivos" aria-label="Archivos de la clase">
      <div className="archivos-cabecera">
        <span className="archivos-titulo" title={carpeta}>
          📁 {carpeta}
        </span>
        <button
          type="button"
          className="archivos-recargar"
          onClick={recargar}
          title="Actualizar listado"
        >
          ⟳
        </button>
      </div>
      <ul className="archivos-lista">
        <li className="archivo archivo-activo">
          <span className="archivo-icono">📄</span> clase.salman
        </li>
        <li>
          <button
            type="button"
            className="archivo archivo-carpeta"
            onClick={() => setAbierto(!abierto)}
          >
            <span className="archivo-icono">{abierto ? "📂" : "📁"}</span> recursos/
          </button>
          {abierto && (
            <ul className="archivos-lista archivos-anidados">
              {archivos.length === 0 && (
                <li className="archivos-vacio">(vacío — compila para generar)</li>
              )}
              {archivos.map((archivo) => (
                <li key={archivo}>
                  <a
                    className="archivo"
                    href={api.urlRecurso(carpeta, archivo)}
                    target="_blank"
                    rel="noreferrer"
                    title={`Abrir ${archivo}`}
                  >
                    <span className="archivo-icono">{icono(archivo)}</span>
                    <span className="archivo-nombre">{archivo}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </li>
      </ul>
    </nav>
  );
}
