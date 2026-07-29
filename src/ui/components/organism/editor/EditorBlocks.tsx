import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { SuggestionMenuController } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { useEditorDocumentCtx } from '../../../../context/EditorDocumentContext'
import { filterSuggestionItems, itemsMenuBloques } from '../../../bloques'

export function EditorBlocks() {
  const { editor, handleChange } = useEditorDocumentCtx()

  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      slashMenu={false}
      onChange={handleChange}
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(itemsMenuBloques(editor), query)
        }
      />
    </BlockNoteView>
  )
}
