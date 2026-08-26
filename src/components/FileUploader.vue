<template>
  <div class="file-uploader">

    <!-- 🧭 Панель: путь / новая папка + поиск -->
    <div class="toolbar">
      <div class="path">
        <a-button v-if="currentFolder" type="text" size="small" class="back-btn" @click="goBack">
          <ArrowLeftOutlined />
        </a-button>

        <span
          class="path-crumb"
          :class="{ 'drag-over': dragOverTarget === 'root' }"
          @click="openFolder(null)"
          @dragover.prevent="handleDragOverFolder('root')"
          @dragleave="handleDragLeaveFolder('root')"
          @drop="handleDropOnFolder('root')"
        >Все файлы</span>

        <template v-for="(crumb, idx) in folderPath" :key="crumb.id">
          <span class="path-sep">/</span>
          <span
            v-if="idx < folderPath.length - 1"
            class="path-crumb"
            :class="{ 'drag-over': dragOverTarget === crumb.id }"
            @click="openFolder(crumb.id)"
            @dragover.prevent="handleDragOverFolder(crumb.id)"
            @dragleave="handleDragLeaveFolder(crumb.id)"
            @drop="handleDropOnFolder(crumb.id)"
          >{{ crumb.name }}</span>
          <span v-else class="path-current">{{ crumb.name }}</span>
        </template>
      </div>

      <a-button type="dashed" class="new-folder-btn" @click="showNewFolderForm = true">
        <FolderAddOutlined /> Новая папка
      </a-button>

      <a-input
        v-model:value="search"
        placeholder="Поиск файлов"
        allow-clear
        class="search-input"
      >
        <template #prefix><SearchOutlined /></template>
      </a-input>
    </div>

    <!-- 📁 Форма создания папки -->
    <div v-if="showNewFolderForm" class="new-folder-form">
      <FolderAddOutlined class="new-folder-icon" />
      <a-input
        v-model:value="newFolderName"
        placeholder="Название папки"
        @keyup.enter="handleCreateFolder"
      />
      <a-button type="primary" @click="handleCreateFolder">Создать</a-button>
      <a-button @click="cancelNewFolder">Отмена</a-button>
    </div>

    <!-- Drag & Drop -->
    <a-upload-dragger
      :before-upload="handleBeforeUpload"
      :show-upload-list="false"
      multiple
      class="dropzone"
    >
      <InboxOutlined class="dropzone-icon" />
      <p class="dropzone-text">Перетащите файлы сюда или нажмите для выбора</p>
      <p v-if="currentFolder" class="dropzone-hint">
        Файлы будут загружены в папку «{{ currentFolder.name }}»
      </p>
    </a-upload-dragger>

    <!-- 🟡 Новые файлы -->
    <template v-if="pendingFiles.length">
      <div class="section-title">Новые файлы <a-tag>{{ pendingFiles.length }}</a-tag></div>

      <div class="pending-list">
        <div v-for="item in pendingFiles" :key="item.id" class="pending-card">
          <div class="pending-name">{{ item.originalName }}</div>

          <a-input
            v-model:value="item.title"
            placeholder="Введите название"
            class="pending-input"
          />

          <a-textarea
            v-model:value="item.comment"
            placeholder="Комментарий"
            :rows="2"
            class="pending-input"
          />

          <div class="pending-actions">
            <a-button danger @click="removePending(item.id)">Удалить</a-button>
            <a-button type="primary" :loading="item.loading" @click="saveFile(item)">
              Сохранить
            </a-button>
          </div>
        </div>
      </div>
    </template>

    <!-- 📁 Папки -->
    <template v-if="childFolders.length">
      <div class="section-title">Папки</div>

      <div class="folders-grid">
        <div
          v-for="folder in childFolders"
          :key="folder.id"
          class="folder-card"
          :class="{ 'drag-over': dragOverTarget === folder.id }"
          @click="openFolder(folder.id)"
          @dragover.prevent="handleDragOverFolder(folder.id)"
          @dragleave="handleDragLeaveFolder(folder.id)"
          @drop="handleDropOnFolder(folder.id)"
        >
          <div class="folder-card-actions">
            <a-tooltip title="Переименовать">
              <button class="folder-action-btn" @click.stop="startRenameFolder(folder)">
                <EditOutlined />
              </button>
            </a-tooltip>
            <a-tooltip title="Удалить папку">
              <button class="folder-action-btn danger" @click.stop="handleDeleteFolder(folder)">
                <DeleteOutlined />
              </button>
            </a-tooltip>
          </div>

          <FolderFilled class="folder-icon" />

          <a-input
            v-if="renamingFolderId === folder.id"
            ref="folderRenameInputRef"
            v-model:value="renameFolderValue"
            size="small"
            class="folder-rename-input"
            @click.stop
            @keyup.enter="confirmRenameFolder(folder)"
            @keyup.esc="cancelRenameFolder"
            @blur="confirmRenameFolder(folder)"
          />
          <div v-else class="folder-name" :title="folder.name">{{ folder.name }}</div>
        </div>
      </div>
    </template>

    <!-- 🟢 Файлы -->
    <div class="section-title">{{ currentFolder ? "Файлы в папке" : "Файлы" }}</div>

    <div v-if="filteredFiles.length" class="files-grid">
      <div
        v-for="item in filteredFiles"
        :key="item.id"
        class="file-card"
        :class="{ dragging: draggingFileId === item.id }"
        draggable="true"
        @dragstart="handleDragStart($event, item)"
        @dragend="handleDragEnd"
      >
        <div class="file-thumb" @click.stop>
          <FileView :file="item" />
        </div>

        <div class="file-info">
          <div class="file-title" :title="item.title || item.name">
            {{ item.title || item.name }}
          </div>
          <div v-if="item.comment" class="file-comment" :title="item.comment">
            {{ item.comment }}
          </div>
        </div>

        <div class="file-actions">
          <a-tooltip v-if="select" title="Выбрать">
            <button class="file-action-btn primary" @click.stop="handleSelectFile(item)">
              <CheckOutlined />
            </button>
          </a-tooltip>

          <a-tooltip title="Переименовать">
            <button class="file-action-btn" @click.stop="startRenameFile(item)">
              <EditOutlined />
            </button>
          </a-tooltip>

          <a-tooltip v-if="currentFolder" title="Убрать из папки">
            <button class="file-action-btn" @click.stop="handleRemoveFromFolder(item)">
              <RollbackOutlined />
            </button>
          </a-tooltip>

          <a-tooltip title="Скачать">
            <button class="file-action-btn" @click.stop="handleDownload(item)">
              <DownloadOutlined />
            </button>
          </a-tooltip>

          <a-tooltip v-if="remove" title="Удалить">
            <button
              class="file-action-btn danger"
              :disabled="item.loading"
              @click.stop="removeFile(item)"
            >
              <LoadingOutlined v-if="item.loading" spin />
              <DeleteOutlined v-else />
            </button>
          </a-tooltip>
        </div>
      </div>
    </div>

    <a-empty
      v-else
      class="empty-state"
      :description="search
        ? 'Ничего не найдено'
        : (currentFolder ? 'В папке пока нет файлов' : 'Файлов пока нет')"
    />

    <!-- ✏️ Редактирование файла — отдельное окно, как и при открытии файла -->
    <a-drawer
      v-model:open="editDrawerVisible"
      title="Редактировать файл"
      placement="right"
      width="420"
      destroyOnClose
      @close="cancelRenameFile"
    >
      <div v-if="editingFile" class="file-edit-drawer">
        <div class="file-edit-preview">
          <FileView :file="editingFile" />
        </div>

        <div class="file-edit-field">
          <label class="file-edit-label">Название</label>
          <a-input v-model:value="renameFileValue" placeholder="Введите название" />
        </div>

        <div class="file-edit-field">
          <label class="file-edit-label">Комментарий</label>
          <a-textarea v-model:value="renameCommentValue" placeholder="Комментарий" :rows="4" />
        </div>
      </div>

      <template #footer>
        <div class="file-edit-footer">
          <a-button @click="cancelRenameFile">Отмена</a-button>
          <a-button type="primary" @click="confirmRenameFile">Сохранить</a-button>
        </div>
      </template>
    </a-drawer>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, defineProps, defineEmits, h } from "vue"
import { message, Modal } from "ant-design-vue"
import {
  FolderFilled,
  FolderAddOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  SearchOutlined,
  InboxOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  RollbackOutlined,
  DownloadOutlined,
  EditOutlined,
  LoadingOutlined
} from "@ant-design/icons-vue"
import { useFile } from "@/stores/file.js"
import FileView from "./FileView.vue"
import { downloadFile } from "@/utils/downloadFile.js"

const emit = defineEmits(["select"])


const props = defineProps({
  select: {
    type: Boolean
  },
  remove: {
    type: Boolean
  }
})


const search = ref("")
const fileStore = useFile()

onMounted(() => {
  fileStore.getAllFiles()
  fileStore.getFolders()
})

const pendingFiles = ref([])

const generateId = () => Date.now() + Math.random()

const files = computed(() => {
  return fileStore.files
})

// 📁 Папки
const newFolderName = ref("")
const showNewFolderForm = ref(false)

const folders = computed(() => fileStore.folders)
const currentFolder = computed(() =>
  folders.value.find(f => f.id === fileStore.currentFolderId) || null
)

// Дочерние папки текущего уровня (null — корень)
const childFolders = computed(() =>
  folders.value.filter(f => (f.parent_id || null) === fileStore.currentFolderId)
)

// Цепочка папок от корня до текущей — для хлебных крошек
const folderPath = computed(() => {
  const path = []
  let node = currentFolder.value
  while (node) {
    path.unshift(node)
    node = node.parent_id ? folders.value.find(f => f.id === node.parent_id) : null
  }
  return path
})

const filteredFiles = computed(() => {
  const inCurrentFolder = files.value.filter(
    f => (f.folder_id || null) === fileStore.currentFolderId
  )

  if (!search.value) return inCurrentFolder

  const q = search.value.toLowerCase()

  return inCurrentFolder.filter(f =>
    (f.title || "").toLowerCase().includes(q) ||
    (f.name || "").toLowerCase().includes(q) ||
    (f.comment || "").toLowerCase().includes(q)
  )
})

const openFolder = (folderId) => {
  fileStore.setCurrentFolder(folderId)
}

const goBack = () => {
  openFolder(currentFolder.value?.parent_id || null)
}

const handleCreateFolder = async () => {
  const name = newFolderName.value.trim()

  if (!name) {
    message.warning("Введите название папки")
    return
  }

  const folder = await fileStore.createFolder(name, fileStore.currentFolderId)
  if (!folder) return

  newFolderName.value = ""
  showNewFolderForm.value = false
  fileStore.setCurrentFolder(folder.id) // сразу открываем новую папку для загрузки файлов
}

const cancelNewFolder = () => {
  newFolderName.value = ""
  showNewFolderForm.value = false
}

const handleDeleteFolder = (folder) => {
  Modal.confirm({
    title: "Удалить папку?",
    icon: () => h(ExclamationCircleOutlined),
    content: `Папка «${folder.name}» и все вложенные папки будут удалены. Файлы внутри останутся, но окажутся вне папок.`,
    okText: "Удалить",
    okType: "danger",
    cancelText: "Отмена",
    onOk: () => fileStore.deleteFolder(folder.id)
  })
}

// ✏️ Переименование папки
const renamingFolderId = ref(null)
const renameFolderValue = ref("")
const folderRenameInputRef = ref(null)

const startRenameFolder = (folder) => {
  renamingFolderId.value = folder.id
  renameFolderValue.value = folder.name
  nextTick(() => folderRenameInputRef.value?.[0]?.focus?.())
}

const cancelRenameFolder = () => {
  renamingFolderId.value = null
  renameFolderValue.value = ""
}

const confirmRenameFolder = async (folder) => {
  if (renamingFolderId.value !== folder.id) return

  const name = renameFolderValue.value.trim()
  if (!name || name === folder.name) {
    cancelRenameFolder()
    return
  }

  try {
    await fileStore.renameFolder(folder.id, name)
    message.success("Папка переименована")
  } catch {
    // ошибка уже показана через notifyServerError в сторе
  } finally {
    cancelRenameFolder()
  }
}

// ✏️ Редактирование файла (название + комментарий) — открывается в отдельном окне (drawer)
const editDrawerVisible = ref(false)
const editingFile = ref(null)
const renameFileValue = ref("")
const renameCommentValue = ref("")

const startRenameFile = (item) => {
  editingFile.value = item
  renameFileValue.value = item.title || item.name
  renameCommentValue.value = item.comment || ""
  editDrawerVisible.value = true
}

const cancelRenameFile = () => {
  editDrawerVisible.value = false
  editingFile.value = null
  renameFileValue.value = ""
  renameCommentValue.value = ""
}

const confirmRenameFile = async () => {
  const item = editingFile.value
  if (!item) return

  const name = renameFileValue.value.trim()
  const comment = renameCommentValue.value.trim()

  if (!name) {
    message.warning("Введите название")
    return
  }

  if (name === (item.title || item.name) && comment === (item.comment || "")) {
    cancelRenameFile()
    return
  }

  try {
    await fileStore.renameFile(item.id, { name, comment })
    message.success("Файл обновлён")
  } catch {
    // ошибка уже показана через notifyServerError в сторе
  } finally {
    cancelRenameFile()
  }
}

// 🖱 Перетаскивание файлов в папки
const draggingFileId = ref(null)
const dragOverTarget = ref(null) // id папки или "root"

const handleDragStart = (event, item) => {
  draggingFileId.value = item.id
  event.dataTransfer.effectAllowed = "move"
  event.dataTransfer.setData("text/plain", item.id)
}

const handleDragEnd = () => {
  draggingFileId.value = null
  dragOverTarget.value = null
}

const handleDragOverFolder = (target) => {
  dragOverTarget.value = target
}

const handleDragLeaveFolder = (target) => {
  if (dragOverTarget.value === target) {
    dragOverTarget.value = null
  }
}

const handleRemoveFromFolder = async (item) => {
  try {
    await fileStore.moveFileToFolder(item.id, null)
    message.success("Файл убран из папки")
  } catch {
    // ошибка уже показана через notifyServerError в сторе
  }
}

const handleDownload = async (item) => {
  try {
    await downloadFile(item)
  } catch (error) {
    console.error("Ошибка скачивания файла:", error)
    message.error("Не удалось скачать файл")
  }
}

const handleDropOnFolder = async (target) => {
  const fileId = draggingFileId.value
  draggingFileId.value = null
  dragOverTarget.value = null

  if (!fileId) return

  try {
    await fileStore.moveFileToFolder(fileId, target === "root" ? null : target)
    message.success(target === "root" ? "Файл перемещён в «Все файлы»" : "Файл перемещён в папку")
  } catch {
    // ошибка уже показана через notifyServerError в сторе
  }
}

// 📥 добавление во временные
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 МБ

const handleBeforeUpload = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    message.error(`Файл «${file.name}» превышает максимальный размер 5 МБ`)
    return false
  }

  pendingFiles.value.unshift({
    id: generateId(),
    originalName: file.name,
    title: file.name, // автоподстановка
    comment: "",
    raw: file
  })

  return false
}

const handleSelectFile = (file) => {
  // 👉 эмитим событие с выбранным файлом
  emit("select", file)
}

// 💾 сохранить
const saveFile = async(item) => {

  if (!item.title) {
    message.warning("Введите название")
    return
  }
  item.loading = true

  const success = await fileStore.uploadFile(item.raw, {
    name: item.title,
    comment: item.comment
  })

  item.loading = false

  if (!success) return

  pendingFiles.value = pendingFiles.value.filter(f => f.id !== item.id)

  message.success("Файл сохранён")
}

// ❌ удалить из pending
const removePending = (id) => {
  pendingFiles.value = pendingFiles.value.filter(f => f.id !== id)
}

// ❌ удалить сохранённый
const removeFile = async (item) => {
  // Кнопка сразу показывает индикатор загрузки, чтобы клик не выглядел «зависшим»,
  // пока идёт проверка использования файла.
  item.loading = true

  let works = []
  let collections = []
  try {
    const usage = await fileStore.checkFileUsage(item.id)
    works = usage.works
    collections = usage.collections
  } catch (e) {
    console.error("Ошибка проверки использования файла:", e)
  }

  const usageLines = [
    ...works.map(w => `Используется в работе «${w.name}»`),
    ...collections.map(c => `Используется в ссылке «${c.name}»`)
  ]

  // Файл нигде не используется — удаляем сразу, без подтверждения
  if (!usageLines.length) {
    await fileStore.deleteFile(item.id)
    item.loading = false
    return
  }

  item.loading = false

  // Файл привязан к работе или ссылке — на сервере это защищено внешним ключом
  // (my_art_object_image_file_id_fkey и т.п.), удаление всегда завершится ошибкой БД.
  // Поэтому вместо подтверждения удаления показываем блокирующее предупреждение.
  Modal.warning({
    title: "Нельзя удалить файл",
    content: h("div", [
      h("p", { style: "margin-bottom: 8px;" },
        `Файл «${item.title || item.name}» используется и не может быть удалён:`),
      h("ul", { style: "margin: 0; padding-left: 20px;" },
        usageLines.map(line => h("li", line))),
      h("p", { style: "margin-top: 8px;" },
        "Сначала отвяжите файл от работы или ссылки, затем повторите удаление.")
    ]),
    okText: "Понятно"
  })
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

.file-uploader {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --text-dim: #a29c8c;
  --text-label: #8a8474;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --accent-tint: rgba(138, 109, 47, 0.1);
  --border: rgba(0, 0, 0, 0.08);
  --border-soft: rgba(0, 0, 0, 0.07);
  --shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  --shadow-hover: 0 14px 32px rgba(0, 0, 0, 0.16);
  --danger: #b43c3c;
  --danger-tint: rgba(180, 60, 60, 0.1);

  max-width: 640px;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: var(--bg);
  border-radius: 14px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text-body);
}

/* Панель инструментов */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.path {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.back-btn {
  padding: 0 4px;
  color: var(--text-muted);
}

.path-crumb {
  color: var(--accent);
  cursor: pointer;
}

.path-crumb:hover {
  text-decoration: underline;
}

.path-sep {
  color: var(--text-dim);
}

.path-current {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 600;
  font-size: 17px;
  color: var(--text-title);
}

.new-folder-btn {
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  min-width: 160px;
}

/* Форма новой папки */
.new-folder-form {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.new-folder-icon {
  font-size: 18px;
  color: var(--accent);
  flex-shrink: 0;
}

/* Дропзона */
.dropzone {
  margin-bottom: 18px;
}

.dropzone :deep(.ant-upload-drag) {
  border-radius: 12px;
  border-color: var(--border) !important;
  background: var(--bg-elevated) !important;
  transition: border-color 0.2s ease;
}

.dropzone :deep(.ant-upload-drag:hover) {
  border-color: var(--accent) !important;
}

.dropzone-icon {
  font-size: 32px;
  color: var(--accent);
}

.dropzone-text {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--text-muted);
}

.dropzone-hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-dim);
}

/* Заголовки секций */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 10px;
}

/* Новые файлы */
.pending-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.pending-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  background: var(--bg-elevated);
  box-shadow: var(--shadow);
}

.pending-name {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 8px;
  word-break: break-all;
  color: var(--text-title);
}

.pending-input {
  margin-bottom: 8px;
}

.pending-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Сетки папок и файлов */
.folders-grid,
.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.folder-card,
.file-card {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  background: var(--bg-elevated);
  cursor: pointer;
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.folder-card:hover,
.file-card:hover {
  border-color: var(--border-soft);
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.folder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 96px;
}

.folder-icon {
  font-size: 34px;
  color: var(--accent);
}

.folder-name {
  max-width: 100%;
  font-family: 'Cormorant Garamond', serif;
  font-weight: 600;
  font-size: 14px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-title);
}

.folder-card-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.folder-card:hover .folder-card-actions {
  opacity: 1;
}

.folder-action-btn {
  border: none;
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease, background 0.15s ease;
}

.folder-action-btn:hover {
  color: var(--accent);
  background: var(--accent-tint);
}

.folder-action-btn.danger:hover {
  color: var(--danger);
  background: var(--danger-tint);
}

.folder-rename-input {
  width: 100%;
}

.folder-rename-input :deep(.ant-input) {
  text-align: center;
}

.file-edit-drawer {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.file-edit-preview {
  width: 120px;
  height: 120px;
  margin: 0 auto;
  border-radius: 8px;
  overflow: hidden;
  background: var(--card-bg);
}

.file-edit-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-edit-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-label);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.file-edit-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.folder-card.drag-over {
  border-color: var(--accent);
  background: var(--accent-tint);
  box-shadow: 0 0 0 2px rgba(138, 109, 47, 0.25);
}

.path-crumb.drag-over {
  background: var(--accent-tint);
  border-radius: 4px;
  padding: 0 4px;
}

/* Карточка файла */
.file-card.dragging {
  opacity: 0.4;
}

/* Превью растягивается на всю ширину карточки (не выходя за её пределы)
   и центрируется, оставаясь квадратным */
.file-thumb {
  width: 100%;
  aspect-ratio: 1 / 1;
  margin: 0 0 5px 0;
  border-radius: 6px;
  overflow: hidden;
  background: var(--card-bg);
}

.file-info {
  min-height: 32px;
}

.file-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-title);
}

.file-comment {
  font-size: 11px;
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 6px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.file-card:hover .file-actions {
  opacity: 1;
}

.file-action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--text-muted);
  cursor: pointer;
}

.file-action-btn.primary:hover {
  background: var(--accent-tint);
  color: var(--accent-strong);
}

.file-action-btn.danger:hover {
  background: var(--danger-tint);
  color: var(--danger);
}

.empty-state {
  margin: 28px 0;
}

.empty-state :deep(.ant-empty-description) {
  color: var(--text-faint);
}

/* Переопределение акцентных цветов Ant Design под тёплую палитру лендинга */
.file-uploader :deep(.ant-btn-primary) {
  background: var(--accent);
  border-color: var(--accent);
}

.file-uploader :deep(.ant-btn-primary:not(:disabled):hover) {
  background: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

.file-uploader :deep(.ant-btn-dashed) {
  border-color: var(--accent);
  color: var(--accent);
}

.file-uploader :deep(.ant-btn-dashed:not(:disabled):hover) {
  border-color: var(--accent-strong) !important;
  color: var(--accent-strong) !important;
}

.file-uploader :deep(.ant-input:focus),
.file-uploader :deep(.ant-input-affix-wrapper:focus-within) {
  border-color: var(--accent) !important;
  box-shadow: 0 0 0 2px var(--accent-tint) !important;
}

.file-uploader :deep(.ant-tag) {
  background: var(--card-bg);
  border-color: var(--border);
  color: var(--text-label);
}
</style>
