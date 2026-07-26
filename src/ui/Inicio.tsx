import { useCallback, useEffect, useRef, useState } from "react";
import { api, type InfoScaffold, type ResumenProyecto } from "./api";

export function Inicio({ alAbrir }: { alAbrir: (carpeta: string) => void }) {
  const [proyectos, setProyectos] = useState<ResumenProyecto[] | null>(null);
  const [scaffolds, setScaffolds] = useState<InfoScaffold[]>([]);
  const [titulo, setTitulo] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proyectoABorrar, setProyectoABorrar] = useState<ResumenProyecto | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const botonInvocadorRef = useRef<HTMLButtonElement | null>(null);
  const tituloListaRef = useRef<HTMLHeadingElement>(null);
  const destinoFocoRef = useRef<HTMLElement | null>(null);

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

  const abrirDialogo = (proyecto: ResumenProyecto, invocador: HTMLButtonElement) => {
    if (proyectoABorrar) return;
    botonInvocadorRef.current = invocador;
    setErrorBorrado(null);
    setProyectoABorrar(proyecto);
  };

  const cerrarDialogo = useCallback(() => {
    if (borrando) return;
    destinoFocoRef.current = botonInvocadorRef.current;
    setErrorBorrado(null);
    setProyectoABorrar(null);
  }, [borrando]);

  const confirmarBorrado = async () => {
    if (!proyectoABorrar || borrando) return;
    setBorrando(true);
    setErrorBorrado(null);
    try {
      await api.borrarProyecto(proyectoABorrar.carpeta);
      destinoFocoRef.current = tituloListaRef.current;
      botonInvocadorRef.current = null;
      setProyectos((actuales) =>
        actuales?.filter((p) => p.carpeta !== proyectoABorrar.carpeta) ?? null
      );
      setProyectoABorrar(null);
    } catch (e) {
      setErrorBorrado((e as Error).message);
    } finally {
      setBorrando(false);
    }
  };

  useEffect(() => {
    if (proyectoABorrar) {
      dialogoRef.current?.focus();
      return;
    }

    const destino = destinoFocoRef.current;
    destinoFocoRef.current = null;
    if (destino?.isConnected) destino.focus();
  }, [proyectoABorrar, borrando]);

  useEffect(() => {
    if (!proyectoABorrar) return;

    const manejarTeclado = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!borrando) cerrarDialogo();
        return;
      }

      if (event.key !== "Tab") return;
      const dialogo = dialogoRef.current;
      if (!dialogo) return;

      const enfocables = Array.from(dialogo.querySelectorAll<HTMLElement>(
        "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), " +
        "textarea:not(:disabled), [tabindex]:not([tabindex=\"-1\"])",
      ));
      const primero = enfocables[0];
      const ultimo = enfocables.at(-1);

      if (!primero || !ultimo) {
        event.preventDefault();
        dialogo.focus();
      } else if (event.shiftKey &&
        (document.activeElement === primero || !dialogo.contains(document.activeElement))) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey &&
        (document.activeElement === ultimo || !dialogo.contains(document.activeElement) ||
          document.activeElement === dialogo)) {
        event.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", manejarTeclado);
    return () => document.removeEventListener("keydown", manejarTeclado);
  }, [borrando, cerrarDialogo, proyectoABorrar]);

  return (
    <div className="pantalla-inicio">
      <div
        inert={proyectoABorrar ? true : undefined}
        aria-hidden={proyectoABorrar ? true : undefined}
        onClickCapture={(event) => {
          if (!proyectoABorrar) return;
          event.preventDefault();
          event.stopPropagation();
          dialogoRef.current?.focus();
        }}
        onFocusCapture={(event) => {
          if (!proyectoABorrar) return;
          event.stopPropagation();
          dialogoRef.current?.focus();
        }}
      >
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
          <h2 ref={tituloListaRef} tabIndex={-1}>Mis clases</h2>
          {proyectos === null && <p>Cargando…</p>}
          {proyectos?.length === 0 && <p>Aún no hay clases. Crea la primera arriba.</p>}
          <ul>
            {proyectos?.map((p) => (
              <li key={p.carpeta}>
                <div className="fila-proyecto-con-acciones">
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
                  <button
                    type="button"
                    className="borrar-proyecto"
                    aria-label={`Borrar clase ${p.titulo}`}
                    onClick={(event) => abrirDialogo(p, event.currentTarget)}
                  >
                    <span aria-hidden="true">🗑️</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {proyectoABorrar && (
        <div
          className="dialogo-fondo"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !borrando) cerrarDialogo();
          }}
        >
          <div
            ref={dialogoRef}
            className="dialogo-borrar"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialogo-borrar-titulo"
            aria-describedby="dialogo-borrar-descripcion"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !borrando) cerrarDialogo();
            }}
          >
            <h2 id="dialogo-borrar-titulo">¿Borrar “{proyectoABorrar.titulo}”?</h2>
            <p id="dialogo-borrar-descripcion">
              Esta acción eliminará la clase y sus recursos asociados, y no se puede deshacer.
            </p>
            {errorBorrado && <p className="mensaje-error" role="alert">{errorBorrado}</p>}
            <div className="dialogo-acciones">
              <button type="button" disabled={borrando} onClick={cerrarDialogo}>
                Cancelar
              </button>
              <button
                type="button"
                className="boton-borrar"
                disabled={borrando}
                onClick={confirmarBorrado}
              >
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
