// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock BlockNote — useCreateBlockNote is a heavy React hook; we isolate our logic
vi.mock('@blocknote/react', () => ({
  useCreateBlockNote: () => ({
    document: [],
    replaceBlocks: vi.fn(),
    setTextCursorPosition: vi.fn(),
    updateBlock: vi.fn(),
  }),
}))

vi.mock('../ui/bloques', () => ({
  esquemaEditor: { PartialBlock: {} },
}))

vi.mock('../mapping/mapeo', () => ({
  editorDesdeClase: () => [],
  claseDesdeEditor: () => [],
}))

import { useEditorDocument } from './useEditorDocument'

const claseInicial = {
  formato: 'salman' as const,
  version: 1 as const,
  id: 'test-id',
  titulo: 'Test',
  metadatos: { materia: '', grado: '', objetivos: [] },
  scaffold: null,
  creado: '2026-01-01T00:00:00.000Z',
  modificado: '2026-01-01T00:00:00.000Z',
  bloques: [],
}

describe('useEditorDocument — attachments', () => {
  it('starts with empty attachments', () => {
    const { result } = renderHook(() => useEditorDocument({ claseInicial }))
    expect(result.current.attachments).toEqual([])
  })

  it('attach adds a block', () => {
    const { result } = renderHook(() => useEditorDocument({ claseInicial }))
    act(() => result.current.attach({ id: 'b1', etiqueta: 'Bloque 1' }))
    expect(result.current.attachments).toHaveLength(1)
    expect(result.current.attachments[0].id).toBe('b1')
  })

  it('attach ignores duplicates', () => {
    const { result } = renderHook(() => useEditorDocument({ claseInicial }))
    act(() => result.current.attach({ id: 'b1', etiqueta: 'Bloque 1' }))
    act(() => result.current.attach({ id: 'b1', etiqueta: 'Bloque 1' }))
    expect(result.current.attachments).toHaveLength(1)
  })

  it('attach ignores beyond max 6', () => {
    const { result } = renderHook(() => useEditorDocument({ claseInicial }))
    for (let i = 1; i <= 7; i++) {
      act(() => result.current.attach({ id: `b${i}`, etiqueta: `B${i}` }))
    }
    expect(result.current.attachments).toHaveLength(6)
  })

  it('removeAttachment removes by id', () => {
    const { result } = renderHook(() => useEditorDocument({ claseInicial }))
    act(() => result.current.attach({ id: 'b1', etiqueta: 'B1' }))
    act(() => result.current.attach({ id: 'b2', etiqueta: 'B2' }))
    act(() => result.current.removeAttachment('b1'))
    expect(result.current.attachments.map(a => a.id)).toEqual(['b2'])
  })

  it('clearAttachments empties the list', () => {
    const { result } = renderHook(() => useEditorDocument({ claseInicial }))
    act(() => result.current.attach({ id: 'b1', etiqueta: 'B1' }))
    act(() => result.current.clearAttachments())
    expect(result.current.attachments).toEqual([])
  })
})

describe('useEditorDocument — handleChange increments changeCount', () => {
  it('changeCount starts at 0', () => {
    const { result } = renderHook(() => useEditorDocument({ claseInicial }))
    expect(result.current.changeCount).toBe(0)
  })

  it('handleChange increments changeCount', () => {
    const { result } = renderHook(() => useEditorDocument({ claseInicial }))
    act(() => result.current.handleChange())
    expect(result.current.changeCount).toBe(1)
    act(() => result.current.handleChange())
    expect(result.current.changeCount).toBe(2)
  })
})
