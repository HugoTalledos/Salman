import { useEffect, useState } from "react";
import { api, type InfoScaffold, type ResumenProyecto } from "./api";

export function Inicio({ alAbrir }: { alAbrir: (carpeta: string) => void }) {
  const [proyectos, setProyectos] = useState<ResumenProyecto[] | null>(null);
  const [scaffolds, setScaffolds] = useState<InfoScaffold[]>([]);
  const [titulo, setTitulo] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listarProyectos().then(setProyectos, (e: Error) => setError(e.message));
    api.listarScaffolds().then(setScaffolds, () => {});
  }, []);

  const crear = async (scaffoldId: string | null) => {
    if (!titulo.trim() || creando) return;
    setCreando(true);
    setError(null);
    try {
      const { carpeta } = await api.crearProyecto(titulo.trim(), scaffoldId);
      alAbrir(carpeta);
    } catch (e) {
      setError((e as Error).message);
      setCreando(false);
    }
  };

  return (
    <div className="pantalla-inicio">
      <header className="inicio-cabecera">
        <h1>Salman</h1>
        <p>Diseña, construye y compila tus clases.</p>
      </header>

      <section className="inicio-crear">
        <h2>Nueva clase</h2>
        <input
          className="crear-titulo"
          placeholder="Título de la clase, p. ej. «Los estados del agua»"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <div className="crear-opciones">
          {scaffolds.map((s) => (
            <button
              type="button"
              key={s.id}
              className="tarjeta-scaffold"
              disabled={!titulo.trim() || creando}
              onClick={() => crear(s.id)}
            >
              <strong>{s.nombre}</strong>
              <span className="tarjeta-descripcion">{s.descripcion}</span>
              {(s.modelo || s.metodo) && (
                <span className="tarjeta-pedagogia">
                  {[s.modelo, s.metodo].filter(Boolean).join(" · ")}
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            className="tarjeta-scaffold tarjeta-blanca"
            disabled={!titulo.trim() || creando}
            onClick={() => crear(null)}
          >
            <strong>Clase en blanco</strong>
            <span className="tarjeta-descripcion">
              Empieza de cero, sin fases ni contenido sugerido.
            </span>
          </button>
        </div>
        {!titulo.trim() && (
          <p className="crear-pista">Escribe un título para habilitar las opciones.</p>
        )}
        {error && <p className="mensaje-error">{error}</p>}
      </section>

      <section className="inicio-lista">
        <h2>Mis clases</h2>
        {proyectos === null && <p>Cargando…</p>}
        {proyectos?.length === 0 && <p>Aún no hay clases. Crea la primera arriba.</p>}
        <ul>
          {proyectos?.map((p) => (
            <li key={p.carpeta}>
              <button
                type="button"
                className="fila-proyecto"
                onClick={() => alAbrir(p.carpeta)}
              >
                <span className="fila-titulo">{p.titulo}</span>
                <span className="fila-detalle">
                  {p.scaffold ?? "Clase en blanco"} ·{" "}
                  {new Date(p.modificado).toLocaleString("es-MX", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
