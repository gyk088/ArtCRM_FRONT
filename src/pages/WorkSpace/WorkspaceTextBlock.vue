<template>
  <div class="rich-editor-wrap">
    <div v-if="editor" class="editor-toolbar">
      <button
        type="button"
        class="toolbar-btn"
        :class="{ active: editor.isActive('bold') }"
        title="Жирный"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <BoldOutlined />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        :class="{ active: editor.isActive('italic') }"
        title="Курсив"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <ItalicOutlined />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        :class="{ active: editor.isActive('underline') }"
        title="Подчёркнутый"
        @click="editor.chain().focus().toggleUnderline().run()"
      >
        <UnderlineOutlined />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        :class="{ active: editor.isActive('strike') }"
        title="Зачёркнутый"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <StrikethroughOutlined />
      </button>

      <span class="toolbar-divider" />

      <button
        type="button"
        class="toolbar-btn"
        :class="{ active: editor.isActive('bulletList') }"
        title="Маркированный список"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        <UnorderedListOutlined />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        :class="{ active: editor.isActive('orderedList') }"
        title="Нумерованный список"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        <OrderedListOutlined />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        :class="{ active: editor.isActive('blockquote') }"
        title="Цитата"
        @click="editor.chain().focus().toggleBlockquote().run()"
      >
        <BlockOutlined />
      </button>

      <span class="toolbar-divider" />

      <button
        type="button"
        class="toolbar-btn"
        title="Отменить"
        :disabled="!editor.can().undo()"
        @click="editor.chain().focus().undo().run()"
      >
        <UndoOutlined />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="Повторить"
        :disabled="!editor.can().redo()"
        @click="editor.chain().focus().redo().run()"
      >
        <RedoOutlined />
      </button>
    </div>

    <EditorContent :editor="editor" class="rich-editor" />
  </div>
</template>

<script setup>
import { onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  BlockOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons-vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Введите текст...' }
})
const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Underline,
    Placeholder.configure({ placeholder: props.placeholder }),
  ],
  onUpdate: ({ editor: instance }) => {
    emit('update:modelValue', instance.getHTML())
  },
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.rich-editor-wrap {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
  overflow: hidden;
}

.rich-editor-wrap:focus-within {
  border-color: var(--accent);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-soft);
  background: var(--card-bg);
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background: var(--border);
  margin: 0 4px;
}

.toolbar-btn {
  border: none;
  background: none;
  color: var(--text-muted);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.15s ease;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--bg-elevated);
  color: var(--accent);
}

.toolbar-btn.active {
  background: var(--accent);
  color: #fff;
}

.toolbar-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.rich-editor {
  padding: 10px 12px;
  min-height: 140px;
  max-height: 360px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
}

.rich-editor :deep(.ProseMirror) {
  outline: none;
  min-height: 120px;
}

.rich-editor :deep(p) {
  margin: 0 0 10px;
}

.rich-editor :deep(ul),
.rich-editor :deep(ol) {
  margin: 0 0 10px;
  padding-left: 22px;
}

.rich-editor :deep(blockquote) {
  margin: 0 0 10px;
  padding-left: 12px;
  border-left: 3px solid var(--accent);
  color: var(--text-muted);
}

.rich-editor :deep(p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  color: var(--text-faint);
  pointer-events: none;
}
</style>
