// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, it, expect, vi } from 'vitest'

afterEach(cleanup)

// Mock CSS imports
vi.mock('@blocknote/core/fonts/inter.css', () => ({}))
vi.mock('@blocknote/mantine/style.css', () => ({}))

// Mock BlockNote
vi.mock('@blocknote/react', () => ({
  useCreateBlockNote: () => ({
    document: [],
    replaceBlocks: vi.fn(),
    setTextCursorPosition: vi.fn(),
    updateBlock: vi.fn(),
  }),
}))

// Mock bloques (heavy BlockNote schema)
vi.mock('./bloques', () => ({
  esquemaEditor: { PartialBlock: {} },
  ContextoAdjuntar: { Provider: ({ children }: { children: React.ReactNode }) => children },
  ContextoCarpeta: { Provider: ({ children }: { children: React.ReactNode }) => children },
}))

vi.mock('../mapping/mapeo', () => ({
  editorDesdeClase: () => [],
  claseDesdeEditor: () => [],
}))

vi.mock('../ui/aplicarAccion', () => ({
  aplicarAccion: vi.fn(),
  validarAccion: vi.fn(),
  describirUbicacion: vi.fn(),
}))

// Mock API — clase must be inlined because vi.mock factories are hoisted
vi.mock('./api', () => {
  const clase = {
    formato: 'salman' as const,
    version: 1 as const,
    id: 'test-id',
    titulo: 'Clase de prueba',
    metadatos: { materia: '', grado: '', objetivos: [] },
    scaffold: null,
    creado: '2026-01-01T00:00:00.000Z',
    modificado: '2026-01-01T00:00:00.000Z',
    bloques: [],
  }
  return {
    api: {
      leerProyecto: vi.fn().mockResolvedValue(clase),
      guardarProyecto: vi.fn().mockResolvedValue(clase),
      compilar: vi.fn(),
      asistente: vi.fn(),
    },
  }
})

// Mock heavy child components
vi.mock('./components/organism/editor/EditorHeader', () => ({
  EditorHeader: () => <div data-testid="editor-header" />,
}))

vi.mock('./components/organism/editor/EditorBlocks', () => ({
  EditorBlocks: () => <div data-testid="editor-blocks" />,
}))

vi.mock('./ArchivosProyecto', () => ({
  ArchivosProyecto: () => <div data-testid="archivos-proyecto" />,
}))

vi.mock('./Asistente', () => ({
  Asistente: () => <div data-testid="asistente" />,
}))

// Mock context modules to avoid deep dependency chains
vi.mock('../context/EditorContext', () => ({
  EditorProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useEditorCtx: () => ({}),
}))

import { Editor } from './Editor'

it('EditorCargado mounts without throwing (provider-order regression)', async () => {
  const { container } = render(<Editor carpeta="test-carpeta" alVolver={() => {}} />)
  await waitFor(() => expect(container.querySelector('.pantalla-editor')).not.toBeNull())
})
