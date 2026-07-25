import { useEffect, useRef, useState } from "react";
import type { AccionAsistente } from "../asistente/acciones";
import type { BloqueEditor } from "../mapping/mapeo";
import { AccionesAsistente } from "./AccionesAsistente";
import { describirUbicacion, validarAccion } from "./aplicarAccion";
import { api, type MensajeAsistente } from "./api";
import type { BloqueAdjunto } from "./bloques";

/** Un mensaje local: lo que viaja a la API más las etiquetas para mostrar. */
type MensajeLocal = MensajeAsistente & {
  etiquetas?: string[];
  acciones?: AccionAsistente[];
};

/**
 * Barra lateral derecha: conversación con el Asistente Salman.
 * El historial vive en la sesión de la UI; el servidor recibe la conversación
 * completa (con los ids de bloques señalados) y le entrega al modelo el
 * fuente de la clase como contexto.
 */
export function Asistente({
  carpeta,
  adjuntos,
  quitarAdjunto,
  limpiarAdjuntos,
  documentoActual,
  aplicarAccionDocumento,
}: {
  carpeta: string;
  /** Bloques señalados desde el editor, pendientes de enviar. */
  adjuntos: BloqueAdjunto[];
  quitarAdjunto: (id: string) => void;
  limpiarAdjuntos: () => void;
  documentoActual: () => BloqueEditor[];
  aplicarAccionDocumento: (
    accion: AccionAsistente,
  ) => { ok: true } | { ok: false; error: string };
}) {
  const [mensajes, setMensajes] = useState<MensajeLocal[]>([]);
  const [borrador, setBorrador] = useState("");
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, pensando]);

  const enviar = async () => {
    const contenido = borrador.trim();
    if (!contenido || pensando) return;
    const nuevo: MensajeLocal = {
      rol: "usuario",
      contenido,
      ...(adjuntos.length
        ? {
            bloques: adjuntos.map((a) => a.id),
            etiquetas: adjuntos.map((a) => a.etiqueta),
          }
        : {}),
    };
    const conversacion = [...mensajes, nuevo];
    setMensajes(conversacion);
    setBorrador("");
    setError(null);
    setPensando(true);
    try {
      const respuesta = await api.asistente(
        carpeta,
        conversacion.map(({ rol, contenido, bloques }) => ({
          rol,
          contenido,
          ...(bloques?.length ? { bloques } : {}),
        })),
      );
      setMensajes([
        ...conversacion,
        {
          rol: "asistente",
          contenido: respuesta.mensaje,
          ...(respuesta.tipo === "accionable" ? { acciones: respuesta.acciones } : {}),
        },
      ]);
      limpiarAdjuntos(); // solo cuando el mensaje llegó: si falla, se conservan
    } catch (e) {
      setError((e as Error).message);
      setMensajes(mensajes); // la pregunta vuelve al borrador
      setBorrador(contenido);
    } finally {
      setPensando(false);
    }
  };

  return (
    <aside className="asistente" aria-label="Asistente Salman">
      <header className="asistente-cabecera">
        <span className="asistente-avatar">🤖</span>
        <strong>Asistente Salman</strong>
      </header>

      <div className="asistente-mensajes">
        {mensajes.length === 0 && !pensando && (
          <p className="asistente-bienvenida">
            Conozco el fuente de esta clase. Pregúntame lo que quieras — y con el 💬 de
            cualquier bloque puedes señalarme la parte exacta de la que hablamos.
          </p>
        )}
        {mensajes.map((m, i) => (
          <div key={i} className={`burbuja burbuja-${m.rol}`}>
            {m.etiquetas && (
              <span className="burbuja-adjuntos">📎 {m.etiquetas.join(" · ")}</span>
            )}
            {m.contenido}
            {m.rol === "asistente" && m.acciones && (
              <AccionesAsistente
                acciones={m.acciones}
                validar={(accion) => validarAccion(documentoActual(), accion)}
                describir={(accion) => describirUbicacion(documentoActual(), accion)}
                aplicar={aplicarAccionDocumento}
              />
            )}
          </div>
        ))}
        {pensando && <div className="burbuja burbuja-asistente pensando">Pensando…</div>}
        {error && <p className="mensaje-error asistente-error">{error}</p>}
        <div ref={finRef} />
      </div>

      {adjuntos.length > 0 && (
        <div className="asistente-adjuntos">
          {adjuntos.map((a) => (
            <span key={a.id} className="adjunto">
              {a.etiqueta}
              <button
                type="button"
                onClick={() => quitarAdjunto(a.id)}
                title="Quitar"
                aria-label={`Quitar ${a.etiqueta}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <form
        className="asistente-entrada"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <input
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          placeholder={
            adjuntos.length ? "Pregunta sobre lo señalado…" : "Pregúntame algo…"
          }
          disabled={pensando}
          aria-label="Mensaje para el asistente"
        />
        <button type="submit" disabled={!borrador.trim() || pensando} title="Enviar">
          ➤
        </button>
      </form>
    </aside>
  );
}
