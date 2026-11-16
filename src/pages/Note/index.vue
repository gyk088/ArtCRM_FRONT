<template>
  <div class="note-page">
    <a-spin :spinning="loading">
      <template v-if="note">
        <!-- Шапка: заголовок, состояние сохранения, PDF, удаление -->
        <div class="note-header">
          <MobileMenuButton />
          <a-button type="text" class="back-btn" title="К списку заметок" @click="goBack"><ArrowLeftOutlined /></a-button>
          <!-- Заголовок — явно поле ввода: подчёркивание, карандаш, подсказка -->
          <label class="note-title-field" title="Нажмите, чтобы изменить заголовок">
            <input
              ref="titleRef"
              v-model="title"
              class="note-title-input"
              :class="{ 'note-title-empty': titleTouched && !title.trim() }"
              maxlength="300"
              placeholder="Введите заголовок заметки"
              @blur="titleTouched = true"
              @keydown.enter.prevent="editor?.commands.focus('start')"
            />
            <EditOutlined class="note-title-pencil" />
          </label>
          <div class="note-header-actions">
            <span class="save-state" :class="{ 'save-state-error': saveError }">
              <template v-if="saving"><LoadingOutlined spin /> Сохранение…</template>
              <template v-else-if="saveError">Не сохранено</template>
              <template v-else-if="dirty">Изменения…</template>
              <template v-else>Сохранено</template>
            </span>
            <HistoryButton type="note" :id="String(route.params.id)" icon-only />
            <a-button :loading="exporting" @click="exportPdf">
              <template #icon><FilePdfOutlined /></template>
              <span class="hide-mobile">PDF</span>
            </a-button>
            <a-popconfirm
              v-if="canDelete"
              title="Удалить заметку?"
              ok-text="Удалить"
              ok-type="danger"
              cancel-text="Отмена"
              @confirm="removeNote"
            >
              <a-button danger title="Удалить заметку"><DeleteOutlined /></a-button>
            </a-popconfirm>
          </div>
        </div>

        <!-- Художник и авторы -->
        <div class="note-meta-row">
          <a-select
            v-model:value="artistId"
            :options="artistOptions"
            placeholder="Привязать к художнику"
            allow-clear
            show-search
            option-filter-prop="label"
            class="note-artist-select"
          >
            <template #suffixIcon><UserOutlined /></template>
          </a-select>
          <div class="note-authors">
            <span>Создал(а): <b>{{ personName(note.createdBy) }}</b>, {{ formatDateTime(note.ctime) }}</span>
            <span v-if="note.updatedBy">Изменил(а): <b>{{ personName(note.updatedBy) }}</b>, {{ formatDateTime(note.utime) }}</span>
          </div>
        </div>

        <!-- Панель форматирования -->
        <div v-if="editor" class="note-toolbar">
          <div class="tb-group">
            <button type="button" class="tb-btn" title="Отменить (Ctrl+Z)" :disabled="!editor.can().undo()" @click="editor.chain().focus().undo().run()"><UndoOutlined /></button>
            <button type="button" class="tb-btn" title="Повторить (Ctrl+Shift+Z)" :disabled="!editor.can().redo()" @click="editor.chain().focus().redo().run()"><RedoOutlined /></button>
          </div>

          <div class="tb-group">
            <a-select
              :value="blockType"
              :options="BLOCK_TYPES"
              size="small"
              class="tb-select tb-select-block"
              :dropdown-match-select-width="false"
              title="Стиль абзаца"
              @change="setBlockType"
            />
            <a-select
              :value="currentFont"
              :options="FONTS"
              size="small"
              class="tb-select tb-select-font"
              :dropdown-match-select-width="false"
              title="Шрифт"
              @change="setFont"
            >
              <template #option="{ label, value }">
                <span :style="{ fontFamily: value || 'inherit' }">{{ label }}</span>
              </template>
            </a-select>
            <a-select
              :value="currentSize"
              :options="SIZES"
              size="small"
              class="tb-select tb-select-size"
              :dropdown-match-select-width="false"
              title="Размер шрифта"
              @change="setSize"
            />
          </div>

          <div class="tb-group">
            <button type="button" class="tb-btn" :class="{ active: editor.isActive('bold') }" title="Жирный (Ctrl+B)" @click="editor.chain().focus().toggleBold().run()"><BoldOutlined /></button>
            <button type="button" class="tb-btn" :class="{ active: editor.isActive('italic') }" title="Курсив (Ctrl+I)" @click="editor.chain().focus().toggleItalic().run()"><ItalicOutlined /></button>
            <button type="button" class="tb-btn" :class="{ active: editor.isActive('underline') }" title="Подчёркнутый (Ctrl+U)" @click="editor.chain().focus().toggleUnderline().run()"><UnderlineOutlined /></button>
            <button type="button" class="tb-btn" :class="{ active: editor.isActive('strike') }" title="Зачёркнутый" @click="editor.chain().focus().toggleStrike().run()"><StrikethroughOutlined /></button>

            <!-- Цвет текста -->
            <a-dropdown :trigger="['click']" placement="bottom">
              <button type="button" class="tb-btn tb-color" title="Цвет текста">
                <FontColorsOutlined />
                <span class="tb-color-bar" :style="{ background: currentColor || '#2c2a25' }" />
              </button>
              <template #overlay>
                <div class="color-palette" @mousedown.prevent>
                  <button
                    v-for="c in TEXT_COLORS"
                    :key="c"
                    type="button"
                    class="color-swatch"
                    :style="{ background: c }"
                    :title="c"
                    @click="editor.chain().focus().setColor(c).run()"
                  />
                  <button type="button" class="color-reset" @click="editor.chain().focus().unsetColor().run()">Без цвета</button>
                </div>
              </template>
            </a-dropdown>

            <!-- Выделение маркером -->
            <a-dropdown :trigger="['click']" placement="bottom">
              <button type="button" class="tb-btn tb-color" :class="{ active: editor.isActive('highlight') }" title="Выделение маркером">
                <HighlightOutlined />
                <span class="tb-color-bar" :style="{ background: editor.getAttributes('highlight').color || '#fde68a' }" />
              </button>
              <template #overlay>
                <div class="color-palette" @mousedown.prevent>
                  <button
                    v-for="c in HIGHLIGHT_COLORS"
                    :key="c"
                    type="button"
                    class="color-swatch"
                    :style="{ background: c }"
                    :title="c"
                    @click="editor.chain().focus().setHighlight({ color: c }).run()"
                  />
                  <button type="button" class="color-reset" @click="editor.chain().focus().unsetHighlight().run()">Убрать выделение</button>
                </div>
              </template>
            </a-dropdown>
          </div>

          <div class="tb-group">
            <button
              v-for="a in ALIGNS"
              :key="a.value"
              type="button"
              class="tb-btn"
              :class="{ active: editor.isActive({ textAlign: a.value }) }"
              :title="a.title"
              @click="editor.chain().focus().setTextAlign(a.value).run()"
            >
              <component :is="a.icon" />
            </button>
          </div>

          <div class="tb-group">
            <button type="button" class="tb-btn" :class="{ active: editor.isActive('bulletList') }" title="Маркированный список" @click="editor.chain().focus().toggleBulletList().run()"><UnorderedListOutlined /></button>
            <button type="button" class="tb-btn" :class="{ active: editor.isActive('orderedList') }" title="Нумерованный список" @click="editor.chain().focus().toggleOrderedList().run()"><OrderedListOutlined /></button>
            <button type="button" class="tb-btn" :class="{ active: editor.isActive('blockquote') }" title="Цитата" @click="editor.chain().focus().toggleBlockquote().run()"><BlockOutlined /></button>
            <button type="button" class="tb-btn" title="Разделитель" @click="editor.chain().focus().setHorizontalRule().run()"><LineOutlined /></button>
            <button type="button" class="tb-btn" title="Очистить форматирование" @click="clearFormatting"><ClearOutlined /></button>
          </div>
        </div>

        <!-- Текст заметки -->
        <div class="note-sheet" @click.self="editor?.commands.focus('end')">
          <EditorContent :editor="editor" class="note-editor" />
        </div>
      </template>
    </a-spin>
  </div>
</template>

<script setup>
import HistoryButton from '@/components/HistoryButton.vue'
// Заметка: заголовок, художник, форматированный текст. Всё сохраняется само
// (через ~1 с после последней правки) и при уходе со страницы.
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { message } from 'ant-design-vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle, FontFamily, FontSize, Color } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import {
  ArrowLeftOutlined, LoadingOutlined, FilePdfOutlined, DeleteOutlined, UserOutlined, EditOutlined,
  UndoOutlined, RedoOutlined, BoldOutlined, ItalicOutlined, UnderlineOutlined, StrikethroughOutlined,
  FontColorsOutlined, HighlightOutlined, AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined,
  UnorderedListOutlined, OrderedListOutlined, BlockOutlined, LineOutlined, ClearOutlined, MenuOutlined,
} from '@ant-design/icons-vue'
import MobileMenuButton from '@/components/MobileMenuButton.vue'
import { useNotes } from '@/stores/notes.js'
import { useArtist } from '@/stores/artist.js'
import { getUser } from '@/services/auth.js'
import { downloadNotePdf } from '@/utils/notePdf.js'

const FONTS = [
  { label: 'По умолчанию', value: '' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Cormorant Garamond', value: '"Cormorant Garamond", serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
]
const SIZES = [
  { label: 'Размер: авто', value: '' },
  ...[10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map(n => ({ label: String(n), value: `${n}px` })),
]
const BLOCK_TYPES = [
  { label: 'Обычный текст', value: 'p' },
  { label: 'Заголовок 1', value: 'h1' },
  { label: 'Заголовок 2', value: 'h2' },
  { label: 'Заголовок 3', value: 'h3' },
]
const ALIGNS = [
  { value: 'left', title: 'По левому краю', icon: AlignLeftOutlined },
  { value: 'center', title: 'По центру', icon: AlignCenterOutlined },
  { value: 'right', title: 'По правому краю', icon: AlignRightOutlined },
  { value: 'justify', title: 'По ширине', icon: MenuOutlined },
]
const TEXT_COLORS = ['#211f1a', '#5a564c', '#8a6d2f', '#c0392b', '#d35400', '#27ae60', '#2e86de', '#8e44ad', '#7f8c8d', '#16a085']
const HIGHLIGHT_COLORS = ['#fde68a', '#fecaca', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fed7aa', '#e5e7eb']

const route = useRoute()
const router = useRouter()
const notesStore = useNotes()
const artistStore = useArtist()
const me = getUser()

const note = ref(null)
const loading = ref(false)
const title = ref('')
const artistId = ref(undefined)
const titleRef = ref(null)
// красное подчёркивание пустого заголовка — только после того, как из поля ушли
const titleTouched = ref(false)
const exporting = ref(false)

const artistOptions = computed(() => artistStore.listArtists.map(a => ({ label: a.name, value: a.id })))
const canDelete = computed(() => note.value && (note.value.createdBy?.id === me?.id || me?.role === 'gallery'))

// ---------- редактор ----------
const editor = useEditor({
  content: '',
  extensions: [
    StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
    Placeholder.configure({ placeholder: 'Начните писать…' }),
    TextStyle,
    FontFamily,
    FontSize,
    Color,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ],
  onUpdate: () => {
    if (!applying) markDirty()
  },
})

const currentFont = computed(() => editor.value?.getAttributes('textStyle').fontFamily || '')
const currentSize = computed(() => editor.value?.getAttributes('textStyle').fontSize || '')
const currentColor = computed(() => editor.value?.getAttributes('textStyle').color || '')
const blockType = computed(() => {
  for (const level of [1, 2, 3]) if (editor.value?.isActive('heading', { level })) return `h${level}`
  return 'p'
})

function setFont(value) {
  const chain = editor.value.chain().focus()
  if (value) chain.setFontFamily(value).run()
  else chain.unsetFontFamily().run()
}

function setSize(value) {
  const chain = editor.value.chain().focus()
  if (value) chain.setFontSize(value).run()
  else chain.unsetFontSize().run()
}

function setBlockType(value) {
  const chain = editor.value.chain().focus()
  if (value === 'p') chain.setParagraph().run()
  else chain.setHeading({ level: Number(value.slice(1)) }).run()
}

function clearFormatting() {
  editor.value.chain().focus().unsetAllMarks().clearNodes().unsetTextAlign().run()
}

// ---------- загрузка ----------
let applying = false

onMounted(async () => {
  if (!artistStore.listArtists.length) artistStore.getListArtists()
  loading.value = true
  const loaded = await notesStore.getNote(route.params.id)
  loading.value = false
  if (!loaded) {
    router.replace({ name: 'notes' })
    return
  }
  applying = true
  note.value = loaded
  title.value = loaded.title
  artistId.value = loaded.artist?.id || undefined
  await nextTick()
  editor.value?.commands.setContent(loaded.content || '', { emitUpdate: false })
  await nextTick()
  applying = false

  // только что созданная заметка: сразу правим черновой заголовок
  // только что созданная заметка: вместо чернового «Новая заметка» —
  // пустое поле с подсказкой и курсором в нём (на сервере черновой
  // заголовок остаётся, пока не введут свой)
  if (route.query.new) {
    if (title.value === 'Новая заметка') {
      applying = true
      title.value = ''
      await nextTick()
      applying = false
    }
    titleRef.value?.focus()
    router.replace({ query: {} })
  }
})

// ---------- автосохранение ----------
const dirty = ref(false)
const saving = ref(false)
const saveError = ref(false)
let saveTimer = null

function markDirty() {
  dirty.value = true
  saveError.value = false
  clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 1000)
}

watch(title, () => { if (!applying) markDirty() })
watch(artistId, () => { if (!applying) markDirty() })

async function save() {
  clearTimeout(saveTimer)
  saveTimer = null
  if (!note.value || !dirty.value) return true
  if (saving.value) {
    // идёт сохранение — повторим после него
    saveTimer = setTimeout(save, 500)
    return false
  }
  const patch = {
    content: editor.value?.getHTML() || '',
    artist_id: artistId.value || null,
  }
  // пустой заголовок не отправляем — сохраняем остальное, заголовок ждёт ввода
  if (title.value.trim()) patch.title = title.value.trim()

  dirty.value = false
  saving.value = true
  try {
    const updated = await notesStore.updateNote(note.value.id, patch)
    if (updated) {
      note.value = { ...note.value, ...updated }
      if (!title.value.trim()) dirty.value = true
      return true
    }
    dirty.value = true
    saveError.value = true
    return false
  } finally {
    saving.value = false
  }
}

function onBeforeUnload(e) {
  if (dirty.value || saving.value) {
    save()
    e.preventDefault()
    e.returnValue = ''
  }
}
window.addEventListener('beforeunload', onBeforeUnload)

onBeforeRouteLeave(async () => {
  if (dirty.value && title.value.trim()) await save()
  return true
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  editor.value?.destroy()
})

// ---------- действия ----------
function goBack() {
  router.push({ name: 'notes' })
}

async function removeNote() {
  dirty.value = false
  clearTimeout(saveTimer)
  if (await notesStore.deleteNote(note.value.id)) {
    message.success('Заметка удалена')
    router.push({ name: 'notes' })
  }
}

async function exportPdf() {
  exporting.value = true
  try {
    await downloadNotePdf({
      ...note.value,
      title: title.value.trim() || note.value.title,
      content: editor.value?.getHTML() || '',
      artist: artistStore.listArtists.find(a => a.id === artistId.value) || null,
    })
  } catch (e) {
    console.error('Error generating note PDF:', e)
    message.error('Не удалось создать PDF')
  } finally {
    exporting.value = false
  }
}

function personName(p) {
  return [p?.name, p?.surname].map(v => (v || '').trim()).filter(Boolean).join(' ') || '—'
}

function formatDateTime(value) {
  return value
    ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'
}
</script>

<style scoped>
.note-page {
  --bg: #f7f5f0;
  --sheet: #ffffff;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
  --border-soft: rgba(0, 0, 0, 0.08);

  min-height: 100vh;
  background: var(--bg);
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
}

.note-page > :deep(.ant-spin-nested-loading),
.note-page > :deep(.ant-spin-nested-loading > .ant-spin-container) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.note-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn {
  flex-shrink: 0;
}

.note-title-field {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px 2px 6px;
  border-radius: 8px;
  border-bottom: 1px dashed rgba(138, 109, 47, 0.45);
  cursor: text;
  transition: background 0.15s, border-color 0.15s;
}

.note-title-field:hover {
  background: rgba(138, 109, 47, 0.06);
  border-bottom-color: var(--accent);
}

.note-title-field:focus-within {
  background: #fff;
  border-bottom: 2px solid var(--accent);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
}

.note-title-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: 'Cormorant Garamond', serif;
  font-size: 30px;
  font-weight: 600;
  color: var(--text-title);
  padding: 2px 0;
}

.note-title-input::placeholder {
  color: #b5ae9f;
  font-weight: 500;
}

.note-title-pencil {
  flex-shrink: 0;
  font-size: 16px;
  color: var(--text-faint);
  opacity: 0.7;
}

.note-title-field:hover .note-title-pencil,
.note-title-field:focus-within .note-title-pencil {
  color: var(--accent);
  opacity: 1;
}

.note-title-field:has(.note-title-empty) {
  border-bottom: 2px solid #c45656;
}

.note-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.save-state {
  font-size: 12px;
  color: var(--text-faint);
  white-space: nowrap;
}

.save-state-error {
  color: #a33a3a;
}

.note-meta-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin: 8px 0 12px;
}

.note-artist-select {
  width: 260px;
}

.note-authors {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-faint);
}

.note-authors b {
  font-weight: 600;
  color: var(--text-muted);
}

/* --- панель форматирования (прилипает к верху при прокрутке) --- */
.note-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  padding: 6px 8px;
  background: var(--sheet);
  border: 1px solid var(--border-soft);
  border-radius: 10px 10px 0 0;
}

.tb-group {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-right: 10px;
  border-right: 1px solid var(--border-soft);
}

.tb-group:last-child {
  border-right: none;
}

.tb-btn {
  position: relative;
  border: none;
  background: none;
  width: 32px;
  height: 30px;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.tb-btn:hover:not(:disabled) {
  background: #f1ede4;
}

.tb-btn.active {
  background: #efe6d2;
  color: var(--accent);
}

.tb-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.tb-color {
  flex-direction: column;
  gap: 1px;
}

.tb-color-bar {
  width: 16px;
  height: 3px;
  border-radius: 2px;
}

.tb-select-block {
  width: 140px;
}

.tb-select-font {
  width: 160px;
}

.tb-select-size {
  width: 132px;
}

.color-palette {
  display: grid;
  grid-template-columns: repeat(5, 26px);
  gap: 6px;
  padding: 10px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.color-swatch {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  cursor: pointer;
}

.color-reset {
  grid-column: 1 / -1;
  border: none;
  background: #f4f1ea;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
}

/* --- лист с текстом: почти на весь экран --- */
.note-sheet {
  flex: 1;
  min-height: calc(100vh - 220px);
  background: var(--sheet);
  border: 1px solid var(--border-soft);
  border-top: none;
  border-radius: 0 0 10px 10px;
  padding: 28px 40px;
  cursor: text;
}

.note-editor :deep(.ProseMirror) {
  min-height: calc(100vh - 280px);
  outline: none;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-body);
}

.note-editor :deep(.ProseMirror > * + *) {
  margin-top: 0.6em;
}

.note-editor :deep(.ProseMirror p) {
  margin: 0;
}

.note-editor :deep(.ProseMirror h1) { font-size: 28px; line-height: 1.25; margin: 0.4em 0 0.2em; }
.note-editor :deep(.ProseMirror h2) { font-size: 22px; line-height: 1.3; margin: 0.4em 0 0.2em; }
.note-editor :deep(.ProseMirror h3) { font-size: 18px; line-height: 1.35; margin: 0.4em 0 0.2em; }

.note-editor :deep(.ProseMirror ul),
.note-editor :deep(.ProseMirror ol) {
  padding-left: 24px;
  margin: 0;
}

.note-editor :deep(.ProseMirror blockquote) {
  margin: 0;
  padding-left: 14px;
  border-left: 3px solid var(--accent);
  color: var(--text-muted);
}

.note-editor :deep(.ProseMirror hr) {
  border: none;
  border-top: 1px solid #d9d4c7;
  margin: 14px 0;
}

.note-editor :deep(.ProseMirror mark) {
  padding: 0 2px;
  border-radius: 2px;
}

.note-editor :deep(.ProseMirror a) {
  color: var(--accent);
}

.note-editor :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  color: #b5ae9f;
  pointer-events: none;
}

@media (max-width: 768px) {
  .note-page {
    padding: 12px;
  }

  .note-header {
    flex-wrap: wrap;
  }

  .note-title-field {
    order: 3;
    flex-basis: 100%;
  }

  .note-title-input {
    font-size: 24px;
  }

  .note-header-actions {
    margin-left: auto;
  }

  .hide-mobile {
    display: none;
  }

  .note-artist-select {
    width: 100%;
  }

  /* на телефоне панель — одной прокручиваемой строкой */
  .note-toolbar {
    flex-wrap: nowrap;
    overflow-x: auto;
  }

  .tb-group {
    flex-shrink: 0;
  }

  .note-sheet {
    padding: 16px;
  }
}
</style>
