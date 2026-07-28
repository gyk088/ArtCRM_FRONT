<template>
  <div class="edit-page">
    <div class="page-header">
      <h2 class="page-title">{{ isNewCollection ? "Создать ссылку" : "Редактировать ссылку" }}</h2>
      <p class="page-subtitle">{{ form.name || "Без названия" }}</p>
    </div>

    <div class="edit-container">
      <!-- Левая колонка — ФОРМА -->
      <div class="left-column">
        <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
          <section class="form-section">
            <div class="section-heading">Основная информация</div>

            <a-form-item label="Название" name="name">
              <a-input v-model:value="form.name" placeholder="Например, «Осенняя ссылка" class="fixed-input" />
            </a-form-item>

            <a-form-item label="Описание">
              <div class="rich-editor-wrap">
                <div v-if="descriptionEditor" class="editor-toolbar">
                  <button
                    type="button"
                    class="toolbar-btn"
                    :class="{ active: descriptionEditor.isActive('bold') }"
                    title="Жирный"
                    @click="descriptionEditor.chain().focus().toggleBold().run()"
                  >
                    <BoldOutlined />
                  </button>
                  <button
                    type="button"
                    class="toolbar-btn"
                    :class="{ active: descriptionEditor.isActive('italic') }"
                    title="Курсив"
                    @click="descriptionEditor.chain().focus().toggleItalic().run()"
                  >
                    <ItalicOutlined />
                  </button>
                  <button
                    type="button"
                    class="toolbar-btn"
                    :class="{ active: descriptionEditor.isActive('underline') }"
                    title="Подчёркнутый"
                    @click="descriptionEditor.chain().focus().toggleUnderline().run()"
                  >
                    <UnderlineOutlined />
                  </button>
                  <button
                    type="button"
                    class="toolbar-btn"
                    :class="{ active: descriptionEditor.isActive('strike') }"
                    title="Зачёркнутый"
                    @click="descriptionEditor.chain().focus().toggleStrike().run()"
                  >
                    <StrikethroughOutlined />
                  </button>

                  <span class="toolbar-divider" />

                  <button
                    type="button"
                    class="toolbar-btn"
                    :class="{ active: descriptionEditor.isActive('bulletList') }"
                    title="Маркированный список"
                    @click="descriptionEditor.chain().focus().toggleBulletList().run()"
                  >
                    <UnorderedListOutlined />
                  </button>
                  <button
                    type="button"
                    class="toolbar-btn"
                    :class="{ active: descriptionEditor.isActive('orderedList') }"
                    title="Нумерованный список"
                    @click="descriptionEditor.chain().focus().toggleOrderedList().run()"
                  >
                    <OrderedListOutlined />
                  </button>
                  <button
                    type="button"
                    class="toolbar-btn"
                    :class="{ active: descriptionEditor.isActive('blockquote') }"
                    title="Цитата"
                    @click="descriptionEditor.chain().focus().toggleBlockquote().run()"
                  >
                    <BlockOutlined />
                  </button>

                  <span class="toolbar-divider" />

                  <button
                    type="button"
                    class="toolbar-btn"
                    title="Отменить"
                    :disabled="!descriptionEditor.can().undo()"
                    @click="descriptionEditor.chain().focus().undo().run()"
                  >
                    <UndoOutlined />
                  </button>
                  <button
                    type="button"
                    class="toolbar-btn"
                    title="Повторить"
                    :disabled="!descriptionEditor.can().redo()"
                    @click="descriptionEditor.chain().focus().redo().run()"
                  >
                    <RedoOutlined />
                  </button>
                </div>

                <EditorContent :editor="descriptionEditor" class="rich-editor" />
              </div>
            </a-form-item>
          </section>
        </a-form>
      </div>

      <!-- Правая колонка — ОБЛОЖКА -->
      <div class="right-column">
        <a-form-item label="Обложка ссылки" :label-col="{ span: 24 }" :wrapper-col="{ span: 24 }" class="images-item">
          <div v-if="!form.avatar" class="upload-trigger" @click="openFilesModal">
            <div class="upload-placeholder">
              <PlusOutlined />
              <div>Загрузить</div>
            </div>
          </div>

          <div v-else class="avatar-preview">
            <img :src="form.avatar.url" class="avatar-image" />
            <button class="delete-btn" @click="removeAvatar">×</button>
          </div>
        </a-form-item>
      </div>
    </div>

    <!-- Таблица выбранных работ -->
    <section class="works-section">
      <div class="table-header">
        <div class="section-heading">Добавленные работы</div>
        <a-button type="dashed" @click="openWorksModal" class="add-more-btn">
          <PlusOutlined /> Добавить ещё
        </a-button>
      </div>

      <a-table
        :data-source="selectedWorksData"
        :columns="selectedWorksColumns"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <!-- Колонка аватара -->
          <template v-if="column.dataIndex === 'avatar'">
            <img v-if="record.avatar && record.avatar.url" :src="record.avatar.url" class="preview-img" />
            <div v-else class="img-placeholder">
              <PictureOutlined />
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'artist'">
            {{ getArtistName(record.artist) }}
          </template>
          <template v-else-if="column.dataIndex === 'seria'">
            {{ getSeriaName(record.seria) }}
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            {{ getStatusName(record.status) }}
          </template>
          <template v-else-if="column.dataIndex === 'actions'">
            <a-tooltip title="Редактировать">
              <a-button type="text" class="edit-row-btn" @click.stop="openEditWork(record)">
                <template #icon>
                  <EditOutlined />
                </template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="Удалить">
              <a-button type="text" danger class="delete-row-btn" @click.stop="removeSelectedWork(record.id)">
                <template #icon>
                  <DeleteOutlined />
                </template>
              </a-button>
            </a-tooltip>
          </template>
          <template v-else>
            {{ record[column.dataIndex] }}
          </template>
        </template>
      </a-table>
    </section>

    <div class="buttons-wrapper">
      <a-button type="primary" @click="saveChanges" class="save-btn">
        Сохранить
      </a-button>

      <a-button @click="goBack" class="cancel-btn">Отмена</a-button>
    </div>

    <!-- ✅ Модалка с таблицей -->
    <a-modal
      v-model:open="isWorksModalOpen"
      title="Выберите работы"
      width="800px"
      centered
      ok-text="Добавить"
      cancel-text="Отмена"
      class="works-modal"
      :get-container="false"
      @ok="addSelectedWorks"
    >
      <a-table
        :data-source="worksTable"
        :columns="columns"
        row-key="id"
        :loading="worksLoading"
        :row-selection="rowSelection">

         <template #bodyCell="{ column, record }">
        <!-- Колонка аватара -->
        <template v-if="column.dataIndex === 'avatar'">
          <img v-if="record.avatar && record.avatar.url" :src="record.avatar.url" class="preview-img" />
          <div v-else class="img-placeholder">
            <PictureOutlined />
          </div>
        </template>
        <template v-else-if="column.dataIndex === 'status'">
          {{ getStatusName(record.status) }}
        </template>
        <!-- Остальные колонки -->
        <template v-else>
          {{ record[column.dataIndex] }}
        </template>
       </template>
       </a-table>

    </a-modal>

    <!-- Файлы — выбор обложки -->
    <a-drawer v-model:open="isFilesModalOpen" title="Файлы" placement="right" width="700px" destroyOnClose>
      <FileUploader :remove="true" :select="true" @select="handleFileSelect" />
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PictureOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
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
import { message } from 'ant-design-vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { toEditableHtml } from '@/utils/richText.js'
import { useArtWork } from '@/stores/artWork.js'
import { useStatuses } from '@/stores/statuses.js'
import { useSerias } from '@/stores/seria.js'
import { useArtist } from '@/stores/artist.js'
import FileUploader from "@/components/FileUploader.vue"

const route = useRoute()
const router = useRouter()

const artWorkStore = useArtWork()
const statusesStore = useStatuses()
const seriasStore = useSerias()
const artistStore = useArtist()

const isWorksModalOpen = ref(false)
const worksTable = ref([])
const worksLoading = ref(false)
const isFilesModalOpen = ref(false)
const formRef = ref(null)
const isNewCollection = computed(() => route.params.id === 'new')

const rules = {
  name: [{ required: true, message: 'Введите название ссылки', trigger: 'blur' }]
}

const form = reactive({
  id: route.params.id !== 'new' ? Number(route.params.id) : Date.now(),
  name: '',
  description: '',
  avatar: null,
  works: []
})

// === Инициализация формы (синхронно, чтобы редактор получил готовый контент) ===
if (route.params.id && route.params.id !== 'new') {
  const storedCollections = JSON.parse(localStorage.getItem('collectionList') || '[]')
  const collectionId = Number(route.params.id)
  const collection = storedCollections.find(c => c.id === collectionId)
  if (collection) {
    Object.assign(form, collection)
    form.description = toEditableHtml(form.description)
  }
} else {
  // Для новой ссылки сразу создаём id
  form.id = Date.now()
}

const descriptionEditor = useEditor({
  content: form.description,
  extensions: [
    StarterKit,
    Underline,
    Placeholder.configure({ placeholder: 'Коротко расскажите о ссылке' }),
  ],
  onUpdate: ({ editor: instance }) => {
    form.description = instance.getHTML()
  },
})

onBeforeUnmount(() => {
  descriptionEditor.value?.destroy()
})

onMounted(async () => {
  await Promise.all([
    loadWorks(),
    statusesStore.getListStatuses(),
    seriasStore.getListSerias(),
    artistStore.getListArtists()
  ])

  // Загружаем выбранные работы
  const savedSelectedWorks = JSON.parse(localStorage.getItem('selectedWorks') || '{}')
  if (savedSelectedWorks[form.id]) {
    form.works = [...savedSelectedWorks[form.id]]
    selectedRowKeys.value = [...form.works]
  }
})

async function loadWorks() {
  worksLoading.value = true
  try {
    await artWorkStore.getListArtWorks()
    worksTable.value = artWorkStore.listArtWorks
  } finally {
    worksLoading.value = false
  }
}

function getStatusName(statusId) {
  if (!statusId) return ''
  const status = statusesStore.listStatuses.find(s => s.id === statusId)
  return status ? status.name : statusId
}

function getArtistName(artistId) {
  if (!artistId) return ''
  const artist = artistStore.listArtists.find(a => a.id === artistId)
  return artist ? artist.name : artistId
}

function getSeriaName(seriaId) {
  if (!seriaId) return ''
  const seria = seriasStore.listSerias.find(s => s.id === seriaId)
  return seria ? seria.name : seriaId
}

// === Обложка ссылки ===
function openFilesModal() {
  isFilesModalOpen.value = true
}

function handleFileSelect(file) {
  const fileUrl = `https://dev.myoffer.life/files/${file.id}.${file.ext}`

  form.avatar = {
    uid: file.id,
    name: file.name || file.filename || 'image',
    url: fileUrl,
    comment: file.comment || '',
    filename: file.filename,
    size: file.size,
    mimetype: file.mimetype,
    ext: file.ext,
    id: file.id
  }

  isFilesModalOpen.value = false
  message.success('Обложка добавлена')
}

function removeAvatar() {
  form.avatar = null
}

// колонки для модалки
const columns = [
  { title: 'Картина', dataIndex: 'avatar', key: 'avatar' },
  { title: 'Название', dataIndex: 'name', key: 'name' },
  { title: 'Статус', dataIndex: 'status', key: 'status', width: 120 },
  { title: 'Стоимость', dataIndex: 'price', key: 'price', width: 100 },
]

// выбранные работы
const selectedWorksColumns = [
  { title: 'Картина', dataIndex: 'avatar', key: 'avatar', width: 100 },
  { title: "Название", dataIndex: "name", key: "name", width: 220 },
  { title: 'Художник', dataIndex: 'artist', key: 'artist', width: 160 },
  { title: 'Техника', dataIndex: 'technique', key: 'technique', width: 140 },
  { title: 'Год', dataIndex: 'year', key: 'year', width: 90 },
  { title: 'Серия', dataIndex: 'seria', key: 'seria', width: 160 },
  { title: 'Статус', dataIndex: 'status', key: 'status', width: 160 },
  { title: 'Стоимость', dataIndex: 'price', key: 'price', width: 160 },
  { title: "Действия", dataIndex: "actions", key: "actions", width: 70 }
]

function openWorksModal() {
  loadWorks()
  selectedRowKeys.value = [...form.works];
  isWorksModalOpen.value = true
}

// выбранные ID в модалке
const selectedRowKeys = ref([])

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  }
}))

const selectedWorksData = computed(() => {
  return worksTable.value.filter(work => form.works.includes(work.id))
})

function removeSelectedWork(id) {
  form.works = form.works.filter(w => w !== id)
  saveSelectedWorksToStorage()
}

function openEditWork(record) {
  router.push({ name: 'edit-work', params: { id: record.id } })
}

const addSelectedWorks = () => {
  form.works = [...selectedRowKeys.value]
  saveSelectedWorksToStorage()
  isWorksModalOpen.value = false
}

// сохраняем выбранные работы
function saveSelectedWorksToStorage() {
  const allSelected = JSON.parse(localStorage.getItem('selectedWorks') || '{}')
  allSelected[form.id] = [...form.works]
  localStorage.setItem('selectedWorks', JSON.stringify(allSelected))
}

// сохраняем ссылку
const saveChanges = async () => {
  try {
    await formRef.value.validate()
  } catch {
    message.warning('Проверьте обязательные поля')
    return
  }

  const storedCollections = JSON.parse(localStorage.getItem('collectionList') || '[]')

  const index = storedCollections.findIndex(c => c.id === form.id)
  if (index !== -1) {
    storedCollections[index] = { ...form }
  } else {
    storedCollections.push({ ...form })
  }

  localStorage.setItem('collectionList', JSON.stringify(storedCollections))
  saveSelectedWorksToStorage()
  router.push('/home/collection')
}

function goBack() {
  router.push('/home/collection')
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

.edit-page {
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

  min-height: 100vh;
  padding: 20px 24px;
  background: var(--bg);
  color: var(--text-body);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.page-header {
  margin-bottom: 20px;
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

/* === КОЛОНКИ === */
.edit-container {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
}

.left-column {
  width: 44%;
}

.right-column {
  width: 56%;
  padding-left: 20px;
  border-left: 1px solid var(--border);
}

/* === Секции формы === */
.form-section {
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 14px 16px 2px;
}

.section-heading {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}

:deep(.ant-form-item-label > label) {
  color: var(--text-muted);
}

.fixed-input {
  width: 100%;
  max-width: 450px;
  border-color: var(--border);
  background: var(--bg-elevated);
}
.fixed-input:hover {
  border-color: var(--accent);
}

/* === Панель форматирования описания === */
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
  min-height: 100px;
  max-height: 260px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
}

.rich-editor :deep(.ProseMirror) {
  outline: none;
  min-height: 80px;
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

/* === Обложка ссылки === */
.images-item {
  display: block;
}

.images-item :deep(.ant-form-item-label > label) {
  font-size: 20px;
  font-weight: 500;
  font-family: 'Cormorant Garamond', serif;
  color: var(--text-title);
}

.upload-trigger {
  cursor: pointer;
}

.upload-placeholder {
  width: 180px;
  height: 180px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  background-color: var(--card-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.upload-placeholder:hover {
  border-color: var(--accent);
  background-color: var(--bg-elevated);
}

.upload-placeholder .anticon {
  font-size: 20px;
  color: var(--text-faint);
  margin-bottom: 8px;
}

.upload-placeholder div {
  font-size: 12px;
  color: var(--text-faint);
}

.avatar-preview {
  position: relative;
  display: inline-block;
}

.avatar-image {
  width: 180px;
  height: 180px;
  object-fit: contain;
  background: var(--card-bg);
  border-radius: 8px;
  border: 1px solid var(--border);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
}

.avatar-image:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
  transition: all 0.2s ease;
}

.delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  border: none;
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 0 3px;
  border-radius: 8px;
  z-index: 1;
}

.delete-btn:hover {
  background-color: #d9534f;
  color: #fff;
}

.preview-img {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border);
}
.img-placeholder {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  border: 1px dashed var(--border);
  color: var(--text-faint);
  background: var(--card-bg);
}

/* === Работы === */
.works-section {
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.add-more-btn {
  border-color: var(--accent);
  color: var(--accent);
}

.add-more-btn:hover {
  border-color: var(--accent-strong) !important;
  color: var(--accent-strong) !important;
}

.works-section :deep(.ant-table) {
  background: transparent;
  color: var(--text-body);
}

.works-section :deep(.ant-table-thead > tr > th) {
  background: var(--card-bg) !important;
  color: var(--accent) !important;
  font-family: 'Cormorant Garamond', serif;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid var(--border) !important;
}

.works-section :deep(.ant-table-thead > tr > th)::before {
  display: none;
}

.works-section :deep(.ant-table-tbody > tr > td) {
  background: transparent;
  color: var(--text-body);
  border-bottom: 1px solid var(--border-soft) !important;
}

.works-section :deep(.ant-table-tbody > tr:hover > td) {
  background: rgba(138, 109, 47, 0.06) !important;
}

.works-section :deep(.ant-empty-description) {
  color: var(--text-faint);
}

.works-section :deep(.ant-pagination-item) {
  border-color: var(--border);
  background: var(--bg-elevated);
}

.works-section :deep(.ant-pagination-item a) {
  color: var(--text-body);
}

.works-section :deep(.ant-pagination-item-active) {
  border-color: var(--accent) !important;
  background: var(--bg-elevated);
}

.works-section :deep(.ant-pagination-item-active a) {
  color: var(--accent) !important;
}

.works-section :deep(.ant-pagination-item:hover) {
  border-color: var(--accent) !important;
}

.works-section :deep(.ant-pagination-item:hover a) {
  color: var(--accent) !important;
}

.works-section :deep(.ant-pagination-prev .ant-pagination-item-link),
.works-section :deep(.ant-pagination-next .ant-pagination-item-link) {
  color: var(--text-muted);
  border-color: var(--border);
  background: var(--bg-elevated);
}

.works-section :deep(.ant-pagination-prev:hover .ant-pagination-item-link),
.works-section :deep(.ant-pagination-next:hover .ant-pagination-item-link) {
  color: var(--accent);
  border-color: var(--accent);
}

.edit-row-btn {
  color: var(--accent) !important;
}

.edit-row-btn:hover {
  color: #fff !important;
  background-color: var(--accent) !important;
}

.delete-row-btn {
  color: #b43c3c !important;
}

.delete-row-btn:hover {
  color: #fff !important;
  background-color: #b43c3c !important;
}

/* Контейнер для кнопок */
.buttons-wrapper {
  display: flex;
  gap: 8px;
}

/* Стили кнопок */
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

.cancel-btn {
  border-color: var(--accent);
  color: var(--accent);
  background: transparent;
}

.cancel-btn:hover {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  color: #fff !important;
}

/* === Адаптация для маленьких экранов === */
@media (max-width: 900px) {
  .edit-container {
    flex-direction: column;
  }

  .left-column,
  .right-column {
    width: 100%;
  }

  .right-column {
    padding-left: 0;
    border-left: none;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }
}

</style>

<!--
  Ant Design Vue's a-modal renders its DOM from its own component template,
  not from this SFC's template — so even with get-container="false", the
  teleported/rendered modal nodes never receive this component's scoped
  data-v-* attribute. Scoped :deep() selectors can't match it, so the modal's
  overrides live in this separate, deliberately unscoped style block instead.
  CSS custom properties (--accent, --bg-elevated, etc.) still reach it because
  the modal is a normal DOM descendant of .edit-page.
-->
<style>
/* === Модалка выбора работ (глобальные стили, см. комментарий выше) === */
.works-modal .ant-modal-content {
  background: var(--bg-elevated);
  border-radius: 14px;
}

.works-modal .ant-modal-header {
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border-soft);
}

.works-modal .ant-modal-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-title);
}

.works-modal .ant-table {
  background: transparent;
  color: var(--text-body);
}

.works-modal .ant-table-container {
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  overflow: hidden;
}

.works-modal .ant-table-thead > tr > th {
  background: var(--card-bg) !important;
  color: var(--accent) !important;
  font-family: 'Cormorant Garamond', serif;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid var(--border) !important;
}

.works-modal .ant-table-thead > tr > th::before {
  display: none;
}

.works-modal .ant-table-tbody > tr > td {
  background: var(--bg-elevated);
  color: var(--text-body);
  border-bottom: 1px solid var(--border-soft) !important;
}

.works-modal .ant-table-tbody > tr:hover > td {
  background: rgba(138, 109, 47, 0.06) !important;
}

.works-modal .ant-table-tbody > tr.ant-table-row-selected > td {
  background: rgba(138, 109, 47, 0.1) !important;
}

.works-modal .ant-table-tbody > tr.ant-table-row-selected:hover > td {
  background: rgba(138, 109, 47, 0.14) !important;
}

.works-modal .ant-checkbox-inner {
  border-color: var(--border);
}

.works-modal .ant-checkbox-checked .ant-checkbox-inner {
  background-color: var(--accent);
  border-color: var(--accent);
}

.works-modal .ant-checkbox-indeterminate .ant-checkbox-inner {
  background-color: var(--accent);
  border-color: var(--accent);
}

.works-modal .ant-checkbox:hover .ant-checkbox-inner {
  border-color: var(--accent) !important;
}

.works-modal .ant-pagination {
  margin-top: 12px;
}

.works-modal .ant-pagination-item {
  border-color: var(--border);
}

.works-modal .ant-pagination-item a {
  color: var(--text-body);
}

.works-modal .ant-pagination-item-active {
  border-color: var(--accent) !important;
}

.works-modal .ant-pagination-item-active a {
  color: var(--accent) !important;
}

.works-modal .ant-pagination-item:hover {
  border-color: var(--accent) !important;
}

.works-modal .ant-pagination-item:hover a {
  color: var(--accent) !important;
}

.works-modal .ant-empty-description {
  color: var(--text-faint);
}

.works-modal .ant-btn-primary {
  background-color: var(--accent);
  border-color: var(--accent);
}

.works-modal .ant-btn-primary:hover {
  background-color: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

.works-modal .ant-btn-default:hover {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}
</style>
