import { useState, type JSX } from "react";
import type {
  AccionAsistente,
  BloqueInsertable,
} from "../server/asistencia/domain/entity/RespuestaAsistente";

type ResultadoAplicacion = { ok: true } | { ok: false; error: string };
type ResultadoValidacion = { ok: true } | { ok: false; error: string };

export function AccionesAsistente(props: {
  acciones: readonly AccionAsistente[];
  validar: (accion: AccionAsistente) => ResultadoValidacion;
  describir: (accion: AccionAsistente) => string | null;
  aplicar: (accion: AccionAsistente) => ResultadoAplicacion;
}): JSX.Element {
  const [accionSeleccionadaId, setAccionSeleccionadaId] = useState<string | null>(null);
  const [accionAplicadaId, setAccionAplicadaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accionSeleccionada = props.acciones.find(
    (accion) => accion.id === accionSeleccionadaId,
  );
  const validacion = accionSeleccionada ? props.validar(accionSeleccionada) : null;
  const ubicacion = accionSeleccionada && validacion?.ok
    ? props.describir(accionSeleccionada)
    : null;
  const errorPreview = validacion && !validacion.ok
    ? validacion.error
    : accionSeleccionada !== undefined && ubicacion === null
    ? "La ubicación de esta propuesta ya no existe."
    : null;

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
    if (!accionSeleccionada || errorPreview) return;

    const resultado = props.aplicar(accionSeleccionada);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }

    setAccionAplicadaId(accionSeleccionada.id);
    setError(null);
  }

  return (
    <section className="acciones-asistente" aria-label="Propuestas del asistente">
      {props.acciones.map((accion) => {
        const deshabilitada = accionAplicadaId !== null && accion.id !== accionAplicadaId;
        const seleccionada = accion.id === accionSeleccionadaId;
        const aplicada = accionAplicadaId === accion.id;

        return (
          <article
            key={accion.id}
            className={[
              "accion-tarjeta",
              aplicada ? "accion-aplicada" : "",
              deshabilitada ? "accion-deshabilitada" : "",
            ].filter(Boolean).join(" ")}
            aria-label={accion.titulo}
          >
            <h3>{accion.titulo}</h3>
            <p>{accion.beneficio}</p>
            {aplicada && <p className="accion-estado">Agregada</p>}
            <button
              type="button"
              disabled={deshabilitada}
              onClick={() => verPropuesta(accion)}
            >
              Ver propuesta
            </button>

            {seleccionada && (
              <section
                className="accion-vista-previa"
                aria-label={`Vista previa: ${accion.titulo}`}
              >
                <h4>Vista previa</h4>
                {errorPreview ? (
                  <p role="alert">{errorPreview}</p>
                ) : (
                  <p>{ubicacion}</p>
                )}
                <ul>
                  {accion.bloques.map((bloque, indice) => (
                    <VistaBloque key={`${bloque.id}-${indice}`} bloque={bloque} />
                  ))}
                </ul>
                {error && <p role="alert">{error}</p>}
                <div className="accion-botones">
                  <button type="button" onClick={cancelar}>
                    Cancelar
                  </button>
                  {!errorPreview && accionAplicadaId !== accion.id && (
                    <button type="button" onClick={confirmar}>
                      Agregar al documento
                    </button>
                  )}
                </div>
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
      <li className="accion-bloque">
        <p>{`${bloque.tipo} · ${bloque.target}`}</p>
        <p>{bloque.titulo}</p>
        {bloque.duracionMinutos && <p>{`${bloque.duracionMinutos} min`}</p>}
        {bloque.bloques.length > 0 && (
          <ul>
            {bloque.bloques.map((hijo, indice) => (
              <VistaBloque key={`${hijo.id}-${indice}`} bloque={hijo} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li className="accion-bloque">
      <p>{`${bloque.tipo} · ${bloque.target}`}</p>
      <p>{bloque.contenido}</p>
    </li>
  );
}
