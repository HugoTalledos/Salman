# Salman — especificación de producto (v1)

> Contrato de diseño original del proyecto. Las decisiones aquí no se rediseñan:
> se implementan. Cuando algo no esté especificado, se pregunta antes de decidir.

## Qué es Salman

Salman es para los profesores lo que un IDE es para los desarrolladores: un entorno donde el profesor **diseña, construye y compila** sus clases.

La distinción central del producto es la de **fuente vs. artefacto compilado**:

- `clase.salman` es el **fuente**: la clase como dato estructurado y editable.
- **Compilar** produce documentos que ya no necesitan a Salman para existir (PDF/HTML imprimible).

Todo lo demás en el producto existe para servir a esa distinción.

## Alcance de esta versión

**Dentro:**
- Un solo usuario local (profesor de primaria). Sin cuentas, sin login, sin backend multiusuario.
- Crear un proyecto de clase a partir de un scaffold.
- Editar el fuente en un editor de bloques.
- Compilar a los dos targets: **Guía del profesor** y **Materiales del alumno**.
- Persistencia local del proyecto y sus recursos.

**Fuera (no construirlo, ni siquiera "por si acaso"):**
- Ejecución en aula, calificaciones, asistencia.
- Colaboración, compartición, marketplace de scaffolds.
- Agentes y skills funcionando (ver "Extensibilidad" abajo).

## Modelo de datos — el contrato

Esta es la parte donde no hay margen de interpretación. Todo lo demás depende de que esto quede bien.

### 1. Todo es un bloque, incluida la fase

No existen dos tipos de documento (uno libre y uno validado contra plantilla). Existe **un solo documento, siempre editable**, tipo Notion. Una "fase" es un bloque más — se puede renombrar, mover o borrar como cualquier otro.

### 2. El scaffold actúa una sola vez

Al crear el proyecto, el scaffold genera una **semilla**: bloques iniciales de fases, contenido placeholder y notas guía. Después de ese instante **nunca vuelve a validarse contra el documento**.

El scaffold deja dos rastros, ninguno estructural:
- **Metadato de identidad** — qué scaffold originó la clase, para que después los agentes razonen con el criterio pedagógico correcto.
- **El contenido inicial** — sugerencia editable, jamás regla de validación.

### 3. Cada bloque declara su target

`guia` | `material` | `ambos`. Las notas de facilitación van solo a la guía; las instrucciones al alumno solo al material. **El editor debe hacer esa distinción visible mientras se escribe** — no es un campo escondido en un panel de propiedades.

### 4. El contenido de bloque se guarda como Markdown

No como árbol de ProseMirror. La razón: el compilador y los futuros agentes tienen que poder leerlo y manipularlo sin cargar el motor del editor.

### 5. El documento del editor NO es `clase.salman`

El editor es una **vista**. Hay una capa de mapeo explícita entre el esquema del editor y el esquema propio de Salman, en ambas direcciones. Esa capa es código aparte y con pruebas propias.

### 6. Estructura en disco

```
📁 Nombre de la clase
├── 📄 clase.salman      ← el fuente
└── 📁 recursos/          ← materiales generados o subidos
```

## El compilador

Dos targets:

1. **Guía del profesor** — documento operativo para usar *durante* la clase: secuencia de fases, tiempos, qué decir/hacer/preguntar, cuándo repartir cada material. Es un **script de aula**, no una planeación descriptiva.
2. **Materiales del alumno** — imprimibles limpios (hojas de trabajo, fichas, rúbricas), sin rastro de notas del profesor.

**Regla dura:** el compilador asume **estructura arbitraria**. Lee lo que hay. No espera que exista una fase llamada "Cierre" ni ninguna otra. Si algo falta, produce lo que puede; nunca falla por estructura inesperada.

## Extensibilidad (preparar, no construir)

Agentes y skills son configuración **global de Salman**, no por proyecto — no hay carpeta `.agent` dentro del proyecto.

- **Agente** = actúa proactivamente sobre la clase.
- **Skill** = capacidad invocable bajo demanda.

En esta versión: dejar el punto de extensión definido en el código (interfaz, dónde se registran, cómo reciben el documento) y **no implementar ninguno**. Si más adelante un agente no encuentra la fase que busca, su comportamiento correcto será *proponer insertar un bloque* — nunca fallar ni asumir que existe.

## Criterios de aceptación

De principio a fin y sin tocar código, el profesor puede:

- [ ] Crear una clase eligiendo un scaffold y ver la semilla de bloques ya poblada.
- [ ] Editar libremente: renombrar una fase, borrarla, insertar un bloque nuevo entre dos existentes.
- [ ] Ver y cambiar el target de cada bloque desde el editor, sin abrir menús escondidos.
- [ ] Cerrar la app, volver a abrirla y encontrar la clase tal como la dejó.
- [ ] Compilar y obtener dos documentos distintos, donde las notas de facilitación aparecen **solo** en la guía.
- [ ] Borrar todas las fases del scaffold y aun así compilar sin errores.

## Qué no hacer

- No convertir el documento del editor en el formato de guardado.
- No meter validación de estructura en ningún punto posterior a la creación del proyecto.
- No implementar agentes ni skills.
- No asumir: preguntar.

---

## Decisiones aprobadas durante la construcción (2026-07-23)

- **Plataforma:** app web local — servidor Node (Hono, `:8787`) que es el único que toca disco + UI Vite/React con proxy `/api`. Migrable a Tauri/Electron sin rehacer.
- **Stack:** React 19 + TypeScript + Vite, BlockNote como editor de bloques, Zod para el esquema, Vitest para pruebas.
- **Ubicación de proyectos:** `~/Documents/Salman/<nombre de la clase>/` (configurable con `SALMAN_DIR`).
- **Formato de `clase.salman`:** JSON con pretty-print. Contenido de bloques en Markdown (CommonMark + tablas GFM).
- **Estructura:** árbol de un solo nivel — la fase contiene sus bloques; las fases no se anidan; puede haber bloques sueltos fuera de fases. Sin herencia de target en lectura: cada bloque guarda el suyo explícito.
- **Tipos de bloque:** `fase`, `texto`, `nota` (target fijo `guia` a nivel de tipo), `imagen`.
- **Modelo y método pedagógicos** (`modelo`, `metodo`) viven en la identidad del scaffold, no en los metadatos: los define el scaffold (creado por nosotros) y el profesor no los edita.
- **Scaffolds de esta versión:** "Inicio / Desarrollo / Cierre" + clase en blanco (`scaffold: null`).
- **Compilación:** HTML imprimible para ambos targets (PDF vía diálogo de impresión); PDF programático queda para después.
- **Recursos:** imágenes básicas copiadas a `recursos/`, referenciadas por ruta relativa.
- **Idioma:** UI y documentos en español.

### Ampliación aprobada (2026-07-23): layout IDE y Asistente Salman

El editor pasó a un layout de tres columnas tipo IDE: barra izquierda con el sistema de archivos de la clase (`clase.salman` + `recursos/`, los artefactos se abren en pestaña nueva), centro con el editor de bloques, y barra derecha con el **Asistente Salman** — un agente real conversacional que recibe el fuente completo de la clase y el criterio pedagógico del scaffold como contexto, y solo **propone** (nunca asume estructura ni aplica cambios), consistente con el punto de extensión.

- **Proveedor LLM intercambiable** (`src/server/llm/`): interfaz `ProveedorLLM` + implementaciones. Configuración por entorno:
  - `SALMAN_LLM=anthropic` (default) — SDK oficial, modelo `claude-opus-4-8` (cambiable con `SALMAN_LLM_MODELO`), credencial en `ANTHROPIC_API_KEY`.
  - `SALMAN_LLM=openai` — cualquier API compatible con chat/completions (OpenAI, Ollama, LM Studio): `SALMAN_LLM_MODELO` obligatorio, `SALMAN_LLM_URL` opcional, `OPENAI_API_KEY` si aplica.
- Endpoint `POST /api/proyectos/:carpeta/asistente` (historial completo por petición, servidor sin estado). Sin credencial configurada el servidor arranca igual y el asistente responde 503/502 con instrucciones.
- **Barras redimensionables:** divisores arrastrables entre las tres columnas; el ancho de cada panel se recuerda en `localStorage`.
- **Señalar bloques al chat:** cada bloque tiene un botón 💬 que lo adjunta al próximo mensaje del asistente (chips con etiqueta y ✕ para quitar). El mensaje viaja con los `bloques: [id...]` señalados; el servidor los anota dentro del turno del profesor (`[El profesor señala los bloques con id: …]`) para que el modelo sepa la parte exacta de la clase de la que se habla y la referencia sobreviva en el historial.
