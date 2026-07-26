import type { CatalogoMetadatosClase } from "../../application/port/CatalogoMetadatosClase";

const MATERIAS = [
  "Matemáticas",
  "Lengua Castellana",
  "Ciencias Naturales",
  "Ciencias Sociales",
  "Inglés",
  "Tecnología e Informática",
  "Educación Artística",
  "Educación Física",
  "Ética y Valores",
] as const;

const GRADOS = [
  "Preescolar", "1.º", "2.º", "3.º", "4.º", "5.º", "6.º",
  "7.º", "8.º", "9.º", "10.º", "11.º",
] as const;

const OBJETIVOS_POR_MATERIA: Record<string, readonly string[]> = {
  "Matemáticas": [
    "Resolver problemas aplicando conceptos matemáticos",
    "Explicar procedimientos y justificar resultados",
    "Representar relaciones usando lenguaje matemático",
  ],
  "Lengua Castellana": [
    "Comprender e interpretar diferentes tipos de texto",
    "Producir textos claros y coherentes",
    "Expresar ideas oralmente con claridad",
  ],
  "Ciencias Naturales": [
    "Explicar fenómenos naturales a partir de evidencias",
    "Formular preguntas e hipótesis investigables",
    "Reconocer relaciones entre ciencia, ambiente y sociedad",
  ],
  "Ciencias Sociales": [
    "Analizar procesos históricos y sociales",
    "Interpretar información geográfica y cultural",
    "Participar responsablemente en su comunidad",
  ],
  "Inglés": [
    "Comprender mensajes orales y escritos en inglés",
    "Comunicar ideas en situaciones cotidianas",
    "Ampliar el vocabulario en contextos significativos",
  ],
  "Tecnología e Informática": [
    "Resolver problemas mediante herramientas tecnológicas",
    "Crear productos digitales de forma responsable",
    "Comprender el funcionamiento básico de sistemas tecnológicos",
  ],
  "Educación Artística": [
    "Explorar técnicas y lenguajes artísticos",
    "Expresar ideas y emociones mediante creaciones propias",
    "Apreciar manifestaciones artísticas y culturales",
  ],
  "Educación Física": [
    "Desarrollar habilidades motrices y coordinación",
    "Aplicar hábitos de vida activa y saludable",
    "Participar con respeto y cooperación en actividades físicas",
  ],
  "Ética y Valores": [
    "Reflexionar sobre decisiones y sus consecuencias",
    "Resolver conflictos mediante el diálogo",
    "Actuar con respeto, empatía y responsabilidad",
  ],
};

export const catalogoMetadatosClase: CatalogoMetadatosClase = {
  listarMaterias: () => MATERIAS,
  listarGrados: () => GRADOS,
  listarObjetivos: ({ materia }) => OBJETIVOS_POR_MATERIA[materia],
};
