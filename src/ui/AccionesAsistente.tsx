import { useState, type JSX } from "react";
import type { AccionAsistente, BloqueInsertable } from "../asistente/acciones";

type ResultadoAplicacion = { ok: true } | { ok: false; error: string };

export function AccionesAsistente(props: {
  acciones: readonly AccionAsistente[];
  describir: (accion: AccionAsistente) => string | null;
  aplicar: (accion: AccionAsistente) => ResultadoAplicacion;
}): JSX.Element {
  const [accionSeleccionadaId, setAccionSeleccionadaId] = useState<string | null>(null);
  const [accionAplicadaId, setAccionAplicadaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accionSeleccionada = props.acciones.find(
    (accion) => accion.id === accionSeleccionadaId,
  );
  const ubicacion = accionSeleccionada ? props.describir(accionSeleccionada) : null;
  const ubicacionVencida = accionSeleccionada !== undefined && ubicacion === null;

  function verPropuesta(accion: AccionAsistente) {
    if (accionAplicadaId && accion.id !== accionAplicadaId) return;
    setAccionSeleccionadaId(accion.id);
    setError(null);
  }

  function cancelar() {
    setAccionSeleccionadaId(null);
    setError(null);
  }

  function confirmar() {
    if (!accionSeleccionada || ubicacionVencida) return;

    const resultado = props.aplicar(accionSeleccionada);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }

    setAccionAplicadaId(accionSeleccionada.id);
    setError(null);
  }

  return (
    <section aria-label="Propuestas del asistente">
      {props.acciones.map((accion) => {
        const deshabilitada = accionAplicadaId !== null && accion.id !== accionAplicadaId;
        const seleccionada = accion.id === accionSeleccionadaId;

        return (
          <article key={accion.id} aria-label={accion.titulo}>
            <h3>{accion.titulo}</h3>
            <p>{accion.beneficio}</p>
            {accionAplicadaId === accion.id && <p>Agregada</p>}
            <button
              type="button"
              disabled={deshabilitada}
              onClick={() => verPropuesta(accion)}
            >
              Ver propuesta
            </button>

            {seleccionada && (
              <section aria-label={`Vista previa: ${accion.titulo}`}>
                <h4>Vista previa</h4>
                {ubicacionVencida ? (
                  <p role="alert">La ubicación de esta propuesta ya no existe.</p>
                ) : (
                  <>
                    <p>{ubicacion}</p>
                    <ul>
                      {accion.bloques.map((bloque) => (
                        <VistaBloque key={bloque.id} bloque={bloque} />
                      ))}
                    </ul>
                  </>
                )}
                {error && <p role="alert">{error}</p>}
                <button type="button" onClick={cancelar}>
                  Cancelar
                </button>
                {!ubicacionVencida && accionAplicadaId !== accion.id && (
                  <button type="button" onClick={confirmar}>
                    Agregar al documento
                  </button>
                )}
              </section>
            )}
          </article>
        );
      })}
    </section>
  );
}

function VistaBloque({ bloque }: { bloque: BloqueInsertable }): JSX.Element {
  if (bloque.tipo === "fase") {
    return (
      <li>
        <p>{`${bloque.tipo} · ${bloque.target}`}</p>
        <p>{bloque.titulo}</p>
        {bloque.duracionMinutos && <p>{`${bloque.duracionMinutos} min`}</p>}
        {bloque.bloques.length > 0 && (
          <ul>
            {bloque.bloques.map((hijo) => <VistaBloque key={hijo.id} bloque={hijo} />)}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <p>{`${bloque.tipo} · ${bloque.target}`}</p>
      <p>{bloque.contenido}</p>
    </li>
  );
}
