import { useEffect, useRef, useState } from "react";
import { BaseInput } from "../../atom/input";
import { BaseSelect } from "../../atom/select";
import { BaseChip } from "../../atom/BaseChip/chip";
import { BaseButton } from "../../atom/BaseButton/button";
import { BaseMessage } from "../../atom/BaseMessage/BaseMessage";
import { api, type CatalogosClase, type InfoScaffold } from "../../../api";
import { LoadingMessage } from "../../atom/BaseMessage/LoadingMessage";
import { BaseCard } from "../../atom/Card/card";

export function CreateSubjectForm({ alAbrir }: { alAbrir: (carpeta: string) => void }) {
  const [scaffolds, setScaffolds] = useState<InfoScaffold[]>([]);
  const [catalogos, setCatalogos] = useState<CatalogosClase>({ materias: [], grados: [] });
  const [titulo, setTitulo] = useState("");
  const [materia, setMateria] = useState("");
  const [grado, setGrado] = useState("");
  const [objetivosSugeridos, setObjetivosSugeridos] = useState<string[]>([]);
  const [objetivosSeleccionados, setObjetivosSeleccionados] = useState<string[]>([]);
  const [objetivosPersonalizados, setObjetivosPersonalizados] = useState<string[]>([]);
  const [objetivoPersonalizado, setObjetivoPersonalizado] = useState("");
  const [cargandoObjetivos, setCargandoObjetivos] = useState(false);
  const [errorObjetivos, setErrorObjetivos] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const solicitudObjetivosRef = useRef(0);

  useEffect(() => {
    api.listarScaffolds().then(setScaffolds, () => {});
    api.listarCatalogosClase().then(setCatalogos, () => {});
  }, []);

  const objetivosMostrados = [...new Set([...objetivosSugeridos, ...objetivosPersonalizados])];
  const formularioValido = Boolean(titulo.trim() && materia && grado);

  const cambiarMateria = async (nuevaMateria: string) => {
    const solicitud = ++solicitudObjetivosRef.current;
    setMateria(nuevaMateria);
    setObjetivosSugeridos([]);
    setObjetivosSeleccionados([]);
    setObjetivosPersonalizados([]);
    setObjetivoPersonalizado("");
    setErrorObjetivos(null);

    if (!nuevaMateria) {
      setCargandoObjetivos(false);
      return;
    }

    setCargandoObjetivos(true);
    try {
      const objetivos = await api.listarObjetivos({ materia: nuevaMateria, grado, titulo: titulo.trim() });
      if (solicitud === solicitudObjetivosRef.current) setObjetivosSugeridos(objetivos);
    } catch (e) {
      if (solicitud === solicitudObjetivosRef.current) setErrorObjetivos((e as Error).message);
    } finally {
      if (solicitud === solicitudObjetivosRef.current) setCargandoObjetivos(false);
    }
  };

  const alternarObjetivo = (objetivo: string) => {
    setObjetivosSeleccionados((actuales) =>
      actuales.includes(objetivo)
        ? actuales.filter((s) => s !== objetivo)
        : [...actuales, objetivo]
    );
  };

  const agregarObjetivoPersonalizado = () => {
    const objetivo = objetivoPersonalizado.trim();
    if (!objetivo || objetivosSugeridos.includes(objetivo) || objetivosPersonalizados.includes(objetivo)) return;
    setObjetivosPersonalizados((actuales) => [...actuales, objetivo]);
    setObjetivosSeleccionados((actuales) => [...actuales, objetivo]);
    setObjetivoPersonalizado("");
  };

  const crear = async (scaffoldId: string | null) => {
    if (!formularioValido || creando) return;
    setCreando(true);
    setError(null);
    try {
      const { carpeta } = await api.crearProyecto(titulo.trim(), scaffoldId, {
        materia,
        grado,
        objetivos: objetivosMostrados.filter((o) => objetivosSeleccionados.includes(o)),
      });
      alAbrir(carpeta);
    } catch (e) {
      setError((e as Error).message);
      setCreando(false);
    }
  };

  return (
    <section className="inicio-crear">
      <h2>Nueva clase</h2>
      <div className="crear-campos">
        <BaseInput
          label="Título"
          placeholder="Título de la clase, p. ej. «Los estados del agua»"
          value={titulo}
          onChange={(text) => setTitulo(text)}
        />
        <BaseSelect
          label="Materia"
          placeholder="Selecciona una materia"
          options={catalogos.materias}
          value={materia}
          onSelect={(subject) => void cambiarMateria(subject)}
        />
        <BaseSelect
          label="Grado"
          placeholder="Selecciona un grado"
          options={catalogos.grados}
          value={grado}
          onSelect={(grade) => void setGrado(grade)}
        />
      </div>
      { cargandoObjetivos && <LoadingMessage text="Cargando objetivos…" /> }
      {objetivosMostrados.length > 0 && (
        <div className="objetivos-chips">
          {objetivosMostrados.map((objetivo) => (
            <BaseChip
              key={objetivo}
              label={objetivo}
              ariaPressed={objetivosSeleccionados.includes(objetivo)}
              onChipSelected={() => alternarObjetivo(objetivo)}
            />
          ))}
        </div>
      )}
      {materia && (
        <div className="objetivo-personalizado">
          <BaseInput
            label="Objetivo personalizado"
            value={objetivoPersonalizado}
            onChange={(objetivo) => setObjetivoPersonalizado(objetivo)}
          />
          <BaseButton label="Agregar objetivo" onClickBtn={agregarObjetivoPersonalizado} />
        </div>
      )}
      {errorObjetivos && <BaseMessage type="error" message={errorObjetivos} />}
      <div className="crear-opciones">
        {scaffolds.map((s) => (
          <BaseCard
            key={s.id}
            nombre={s.nombre}
            descripcion={s.descripcion}
            etiqueta={[s.modelo, s.metodo].filter(Boolean).join(' · ') || undefined}
            disabled={!formularioValido || creando}
            onClick={() => crear(s.id)}
          />
        ))}
        <BaseCard
          nombre="Clase en blanco"
          descripcion="Empieza de cero, sin fases ni contenido sugerido."
          variante="blanca"
          disabled={!formularioValido || creando}
          onClick={() => crear(null)}
        />
      </div>
      {!formularioValido && (
        <BaseMessage
          message="Completa el título, la materia y el grado para habilitar las opciones."
          type="warning"
        />
      )}
      {error && <BaseMessage type="error" message={error} />}
    </section>
  );
}
