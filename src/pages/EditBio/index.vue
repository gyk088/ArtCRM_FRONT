<template>
  <div class="edit-bio-page">
    <div class="page-header">
      <div>
        <h2 class="page-title">{{ isNew ? 'Новая биография' : 'Редактировать биографию' }}</h2>
        <p class="page-subtitle">{{ form.title || 'Без названия' }}</p>
      </div>
      <div v-if="!isNew && bioRecord" class="header-meta">
        <span class="meta-chip">Обновлено {{ formatDate(bioRecord.updatedAt) }}</span>
      </div>
    </div>

    <div class="edit-container">
      <!-- Левая колонка — ФОРМА -->
      <div class="left-column">
        <section class="form-section">
          <div class="section-heading">Основная информация</div>

          <div class="form-item">
            <label class="field-label">Название</label>
            <a-input
              v-model:value="form.title"
              placeholder="Например, «Краткая биография»"
              class="fixed-input"
            />
          </div>

          <div class="form-item">
            <div class="field-label-row">
              <label class="field-label">Текст биографии</label>
              <span class="char-count">
                {{ plainLength }} символов · {{ wordCount }} слов · ~{{ readingTime }} мин чтения
              </span>
            </div>

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
          </div>
        </section>

        <div class="buttons-wrapper">
          <a-button type="primary" class="save-btn" @click="save">
            Сохранить
          </a-button>
          <a-button class="back-btn" @click="goBack">
            Отмена
          </a-button>
          <a-popconfirm
            v-if="!isNew"
            title="Удалить эту биографию?"
            ok-text="Да"
            cancel-text="Нет"
            @confirm="remove"
          >
            <a-button danger class="delete-btn">
              Удалить
            </a-button>
          </a-popconfirm>
        </div>
      </div>

      <!-- Правая колонка — ПРЕДПРОСМОТР -->
      <div class="right-column">
        <div class="section-heading">Предпросмотр</div>

        <div class="preview-card">
          <div class="preview-card-header">
            <div class="bio-icon">
              <FileTextOutlined />
            </div>
            <h3 class="preview-title">{{ form.title || 'Без названия' }}</h3>
          </div>
          <div v-if="plainLength" class="preview-text" v-html="form.text"></div>
          <p v-else class="preview-text preview-placeholder">Текст биографии появится здесь по мере ввода...</p>
        </div>

        <a-button
          class="pdf-btn"
          block
          :loading="pdfLoading"
          :disabled="!plainLength"
          @click="handleDownloadPdf"
        >
          <template #icon>
            <DownloadOutlined />
          </template>
          Скачать PDF
        </a-button>

        <p class="hint-text">
          PDF формируется на основе текущего текста в форме, даже если изменения ещё не сохранены.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  FileTextOutlined,
  DownloadOutlined,
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
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { useBio } from '@/stores/bio.js'
import { downloadBioPdf } from '@/utils/bioPdf.js'
import { toEditableHtml, htmlToPlainText } from '@/utils/richText.js'

const route = useRoute()
const router = useRouter()
const bioStore = useBio()

const isNew = computed(() => route.params.id === 'new')
const bioRecord = computed(() => (isNew.value ? null : bioStore.getBioById(route.params.id)))

const form = reactive({ title: '', text: '' })

if (!isNew.value && bioRecord.value) {
  form.title = bioRecord.value.title
  form.text = toEditableHtml(bioRecord.value.text)
}

const editor = useEditor({
  content: form.text,
  extensions: [
    StarterKit,
    Underline,
    Placeholder.configure({ placeholder: 'Расскажите о себе, своём пути и творчестве...' }),
  ],
  onUpdate: ({ editor: instance }) => {
    form.text = instance.getHTML()
  },
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

const plainLength = computed(() => htmlToPlainText(form.text).length)
const wordCount = computed(() => {
  const plain = htmlToPlainText(form.text).trim()
  return plain ? plain.split(/\s+/).length : 0
})
const readingTime = computed(() => Math.max(1, Math.round(wordCount.value / 200)))

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function save() {
  if (!form.title.trim() || !plainLength.value) {
    message.warning('Пожалуйста, заполните название и текст биографии.')
    return
  }
  if (isNew.value) {
    bioStore.addBio({ title: form.title.trim(), text: form.text })
    message.success('Биография добавлена')
  } else {
    bioStore.updateBio(route.params.id, { title: form.title.trim(), text: form.text })
    message.success('Биография обновлена')
  }
  router.push('/home/bio')
}

function remove() {
  bioStore.removeBio(route.params.id)
  message.success('Биография удалена')
  router.push('/home/bio')
}

function goBack() {
  router.push('/home/bio')
}

const pdfLoading = ref(false)
async function handleDownloadPdf() {
  pdfLoading.value = true
  try {
    await downloadBioPdf({ title: form.title, text: form.text })
  } finally {
    pdfLoading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

.edit-bio-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --border: rgba(0, 0, 0, 0.1);
  --border-soft: rgba(0, 0, 0, 0.07);

  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
  color: var(--text-body);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.page-header {
  flex-shrink: 0;
  padding: 20px 24px 10px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 26px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0 0 4px;
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-faint);
}

.meta-chip {
  font-size: 12px;
  color: var(--text-faint);
  background: var(--card-bg);
  padding: 4px 10px;
  border-radius: 20px;
}

.edit-container {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 20px;
  padding: 0 24px 24px;
  overflow: hidden;
}

.left-column {
  width: 56%;
  overflow-y: auto;
  height: 100%;
  padding-right: 8px;
  display: flex;
  flex-direction: column;
}

.right-column {
  width: 44%;
  padding-left: 20px;
  border-left: 1px solid var(--border);
  overflow-y: auto;
  height: 100%;
}

.left-column::-webkit-scrollbar,
.right-column::-webkit-scrollbar {
  width: 6px;
}

.left-column::-webkit-scrollbar-track,
.right-column::-webkit-scrollbar-track {
  background: var(--card-bg);
  border-radius: 4px;
}

.left-column::-webkit-scrollbar-thumb,
.right-column::-webkit-scrollbar-thumb {
  background: rgba(138, 109, 47, 0.35);
  border-radius: 4px;
}

.left-column::-webkit-scrollbar-thumb:hover,
.right-column::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}

/* === Форма === */
.form-section {
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.section-heading {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}

.form-item {
  margin-bottom: 16px;
}

.form-item:last-child {
  margin-bottom: 0;
}

.field-label {
  display: block;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.field-label-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.char-count {
  font-size: 12px;
  color: var(--text-faint);
  white-space: nowrap;
}

.fixed-input {
  width: 100%;
  border-color: var(--border);
  background: var(--bg-elevated);
}

.fixed-input:hover {
  border-color: var(--accent);
}

/* === Панель форматирования === */
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
  min-height: 320px;
  max-height: 480px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
}

.rich-editor :deep(.ProseMirror) {
  outline: none;
  min-height: 300px;
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

/* === Кнопки === */
.buttons-wrapper {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.save-btn {
  background-color: var(--accent);
  border-color: var(--accent);
  color: #fff;
  transition: all 0.3s ease;
}

.save-btn:hover {
  border-color: var(--accent-strong) !important;
  background-color: var(--accent-strong) !important;
  color: #fff !important;
}

.back-btn {
  border-color: var(--accent);
  color: var(--accent);
  background: transparent;
}

.back-btn:hover {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  color: #fff !important;
}

.delete-btn {
  margin-left: auto;
}

/* === Предпросмотр === */
.preview-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  min-height: 220px;
}

.preview-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--accent);
}

.bio-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.preview-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0;
}

.preview-text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-body);
  margin: 0;
}

.preview-text :deep(p) {
  margin: 0 0 10px;
}

.preview-text :deep(ul),
.preview-text :deep(ol) {
  margin: 0 0 10px;
  padding-left: 22px;
}

.preview-text :deep(blockquote) {
  margin: 0 0 10px;
  padding-left: 12px;
  border-left: 3px solid var(--accent);
  color: var(--text-muted);
}

.preview-placeholder {
  color: var(--text-faint);
}

.pdf-btn {
  border-color: var(--border);
  color: var(--text-muted);
  background: var(--bg-elevated);
}

.pdf-btn:hover:not(:disabled) {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}

.hint-text {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-faint);
  text-align: center;
}

/* === Адаптация для маленьких экранов === */
@media (max-width: 1000px) {
  .edit-container {
    flex-direction: column;
    overflow-y: auto;
  }

  .left-column,
  .right-column {
    width: 100%;
    overflow-y: visible;
    height: auto;
  }

  .right-column {
    padding-left: 0;
    border-left: none;
    border-top: 1px solid var(--border);
    padding-top: 20px;
  }
}

@media (max-width: 600px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .buttons-wrapper {
    flex-wrap: wrap;
  }

  .delete-btn {
    margin-left: 0;
  }
}
</style>
