export interface ContextoObjetivos {
  materia: string;
  grado?: string;
  titulo?: string;
}

export interface CatalogoMetadatosClase {
  listarMaterias(): readonly string[];
  listarGrados(): readonly string[];
  listarObjetivos(contexto: ContextoObjetivos): readonly string[] | undefined;
}
