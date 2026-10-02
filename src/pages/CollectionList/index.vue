<template>
  <div class="collection-page">
    <div class="collection-header">
      <div class="header-heading">
        <div class="header-heading-top">
          <MobileMenuButton />
          <h3 class="page-title">Мои Ссылки</h3>
        </div>
        <p class="page-subtitle">
          {{ collectionList.length ? `Ссылок: ${collectionList.length}` : 'Здесь появятся ваши ссылки' }}
        </p>
      </div>
      <div class="header-actions">
        <a-button v-if="!isArtistRole" class="import-toggle-btn" @click="isImportOpen = !isImportOpen">
          <template #icon>
            <ImportOutlined />
          </template>
          Импорт по ссылке
        </a-button>
        <a-button type="primary" class="create-btn" @click="openEditPage">
          <template #icon>
            <PlusOutlined />
          </template>
          Создать ссылку
        </a-button>
      </div>
    </div>

    <div v-if="isImportOpen && !isArtistRole" class="import-wrapper">
      <a-input
        id="collectionImportLink"
        name="collectionImportLink"
        v-model:value="importLink"
        placeholder="Вставьте ссылку"
        class="import-link-input"
        autofocus
        @pressEnter="fetchImportPreview"
      />
      <a-button type="primary" class="import-link-btn" :loading="importing" @click="fetchImportPreview">Добавить</a-button>
      <a-button class="import-cancel-btn" :disabled="importing" @click="isImportOpen = false">Отмена</a-button>
    </div>

    <a-modal
      v-model:open="isImportModalOpen"
      title="Выберите работы для импорта"
      :width="isMobile ? '94%' : '720px'"
      ok-text="Импортировать выбранное"
      cancel-text="Отмена"
      :confirm-loading="importing"
      :ok-button-props="{ disabled: !selectedImportKeys.length }"
      @ok="confirmImport"
      @cancel="closeImportModal"
    >
      <p class="import-modal-hint">
        Работы, отмеченные меткой «Уже есть в каталоге», совпадают по названию и художнику с одной из ваших
        работ — по умолчанию они не выбраны, чтобы не создавать дубликаты, но их можно выбрать вручную.
      </p>
      <a-table
        class="import-preview-table"
        :columns="importPreviewColumns"
        :data-source="importCandidates"
        :row-selection="importRowSelection"
        row-key="id"
        :pagination="false"
        size="small"
        :scroll="{ y: 360 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'cover'">
            <img v-if="record.avatar?.url" :src="record.avatar.url" class="import-preview-thumb" />
            <div v-else class="import-preview-thumb import-preview-thumb--empty">
              <PictureOutlined />
            </div>
          </template>
          <template v-else-if="column.key === 'name'">
            {{ record.name || 'Без названия' }}
            <a-tag v-if="record.isDuplicate" color="gold" class="duplicate-tag">Уже есть в каталоге</a-tag>
          </template>
          <template v-else-if="column.key === 'artist'">
            {{ record.artist_name || record.artistName || '—' }}
          </template>
        </template>
      </a-table>
    </a-modal>

    <div class="folder-toolbar">
      <div class="folder-path">
        <a-button v-if="currentFolder" type="text" size="small" class="folder-back-btn" @click="openFolder(currentFolder.parent_id || null)">
          <ArrowLeftOutlined />
        </a-button>

        <span
          class="folder-crumb"
          :class="{ 'drag-over': folderDragOverTarget === 'root' }"
          @click="openFolder(null)"
          @dragover.prevent="handleDragOverFolder('root')"
          @dragleave="handleDragLeaveFolder('root')"
          @drop="handleDropOnFolder('root')"
        >Все ссылки</span>

        <template v-for="(crumb, idx) in folderPath" :key="crumb.id">
          <span class="folder-crumb-sep">/</span>
          <span
            v-if="idx < folderPath.length - 1"
            class="folder-crumb"
            :class="{ 'drag-over': folderDragOverTarget === crumb.id }"
            @click="openFolder(crumb.id)"
            @dragover.prevent="handleDragOverFolder(crumb.id)"
            @dragleave="handleDragLeaveFolder(crumb.id)"
            @drop="handleDropOnFolder(crumb.id)"
          >{{ crumb.name }}</span>
          <span v-else class="folder-crumb-current">{{ crumb.name }}</span>
        </template>
      </div>

      <a-button type="dashed" class="new-folder-btn" @click="showNewFolderForm = true">
        <FolderAddOutlined /> Новая папка
      </a-button>
    </div>

    <div v-if="showNewFolderForm" class="new-folder-form">
      <FolderAddOutlined class="new-folder-icon" />
      <a-input
        id="collectionNewFolderName"
        name="collectionNewFolderName"
        v-model:value="newFolderName"
        placeholder="Название папки"
        @keyup.enter="handleCreateFolder"
      />
      <a-button type="primary" @click="handleCreateFolder">Создать</a-button>
      <a-button @click="cancelNewFolder">Отмена</a-button>
    </div>

    <div v-if="childFolders.length" class="folders-grid">
      <div
        v-for="folder in childFolders"
        :key="folder.id"
        class="folder-card"
        :class="{ 'drag-over': folderDragOverTarget === folder.id, dragging: draggingFolderId === folder.id }"
        draggable="true"
        @click="openFolder(folder.id)"
        @dragstart="handleFolderDragStart($event, folder)"
        @dragend="handleFolderDragEnd"
        @dragover.prevent="folderDragOverTarget = folder.id"
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

    <div class="filters-panel">
      <a-input
        id="collectionSearchQuery"
        name="collectionSearchQuery"
        v-model:value="searchQuery"
        placeholder="Поиск по названию"
        allow-clear
        style="width: 240px"
        class="name-search"
      >
        <template #prefix>
          <SearchOutlined />
        </template>
      </a-input>
      <a-select
        v-if="!isArtistRole"
        id="collectionListFilterArtist"
        v-model:value="filterArtist"
        placeholder="Художник"
        allow-clear
        style="width: 220px"
        :options="artistOptions"
        class="artist-filter"
      />
    </div>

    <div v-if="filteredCollectionList.length" class="collection-grid">
      <a-card v-for="collection in filteredCollectionList" :key="collection.id" class="collection-card"
        :class="{ 'collection-card--imported': collection.imported, dragging: draggingCollectionId === collection.id, 'reorder-over': reorderOverCollectionId === collection.id }"
        hoverable draggable="true"
        @click="openEditPage(collection)"
        @dragstart="handleCollectionDragStart($event, collection)"
        @dragend="handleCollectionDragEnd"
        @dragover.prevent.stop="handleCollectionReorderDragOver(collection.id)"
        @dragleave="handleCollectionReorderDragLeave(collection.id)"
        @drop.stop="handleCollectionReorderDrop(collection.id)">
        <template #cover>
          <div class="card-cover">
            <img v-if="collection.avatar?.url" :src="collection.avatar.url" :alt="collection.name" class="cover-img" />
            <div v-else class="cover-placeholder">
              <PictureOutlined />
            </div>
            <span v-if="collection.imported" class="imported-badge">
              <ImportOutlined />
              Импортировано
            </span>
          </div>
        </template>

        <div v-if="!isOwnCollection(collection)" class="shared-author-badge">
          <UserOutlined />
          {{ formatCreatorName(collection.createdBy) }}
        </div>

        <h4 class="card-title">{{ collection.name || 'Без названия' }}</h4>

        <p class="collection-text" :class="{ 'collection-text--empty': !collection.description }">
          {{ descriptionPreview(collection.description) || 'Без описания' }}
        </p>

        <div class="card-meta">
          <span class="meta-works">
            <PictureOutlined />
            {{ (collection.works || []).length }} {{ pluralizeWorks((collection.works || []).length) }}
          </span>

          <span class="meta-views">
            <a-tooltip title="Сколько раз всего открывали публичную страницу этой ссылки — каждое открытие считается, даже повторное от одного человека">
              <span class="meta-view-stat" @click.stop>
                <EyeOutlined />
                {{ collection.viewStats?.total || 0 }}
              </span>
            </a-tooltip>
            <a-tooltip title="Сколько разных людей открывали публичную страницу этой ссылки — повторные открытия одним и тем же человеком считаются один раз">
              <span class="meta-view-stat" @click.stop>
                <TeamOutlined />
                {{ collection.viewStats?.unique || 0 }}
              </span>
            </a-tooltip>
          </span>
        </div>

        <div class="collection-actions">
          <a-button type="default" @click.stop="copyCollectionLink(collection)" class="copy-link-btn">
            <template #icon>
              <CopyOutlined />
            </template>
            Копировать ссылку
          </a-button>
          <a-popconfirm v-if="canDeleteCollection(collection)" title="Удалить ссылку?" ok-text="Да" cancel-text="Нет"
            @confirm.stop="deleteСollection(collection.id)">
            <a-tooltip title="Удалить">
              <a-button type="text" danger class="delete-btn" @click.stop>
                <template #icon>
                  <DeleteOutlined />
                </template>
              </a-button>
            </a-tooltip>
          </a-popconfirm>
        </div>
      </a-card>
    </div>

    <div v-else-if="collectionsInCurrentFolder.length" class="empty-state">
      <FolderOpenOutlined class="empty-icon" />
      <p class="empty-title">Ничего не найдено</p>
      <p class="empty-hint">Попробуйте изменить поиск или фильтр по художнику</p>
      <a-button class="import-toggle-btn" @click="filterArtist = null; searchQuery = ''">Сбросить фильтр</a-button>
    </div>

    <div v-else-if="currentFolder" class="empty-state">
      <FolderOpenOutlined class="empty-icon" />
      <p class="empty-title">В папке «{{ currentFolder.name }}» пока нет ссылок</p>
      <p class="empty-hint">Перетащите сюда ссылку из другой папки или создайте новую</p>
      <a-button type="primary" class="create-btn" @click="openEditPage">
        <template #icon>
          <PlusOutlined />
        </template>
        Создать ссылку
      </a-button>
    </div>

    <div v-else class="empty-state">
      <FolderOpenOutlined class="empty-icon" />
      <p class="empty-title">Пока нет ни одной ссылки</p>
      <p class="empty-hint">Создайте первую ссылку или импортируйте её по ссылке</p>
      <a-button type="primary" class="create-btn" @click="openEditPage">
        <template #icon>
          <PlusOutlined />
        </template>
        Создать ссылку
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, h } from 'vue';
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { ImportOutlined, CopyOutlined, DeleteOutlined, PlusOutlined, FolderOpenOutlined, FolderFilled, FolderAddOutlined, ArrowLeftOutlined, EditOutlined, ExclamationCircleOutlined, PictureOutlined, SearchOutlined, EyeOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons-vue'
import { htmlToPlainText } from '@/utils/richText.js'
import { useArtWork } from '@/stores/artWork.js'
import { useArtist } from '@/stores/artist.js'
import { useSerias } from '@/stores/seria.js'
import { useMedia } from '@/stores/media.js'
import { useLocations } from '@/stores/locations.js'
import { useStatuses } from '@/stores/statuses.js'
import { useCollection } from '@/stores/collection.js'
import { useFile, showStorageLimitModal } from '@/stores/file.js'
import { getUser } from '@/services/auth.js'
import { ROLES } from '@/services/const'
import { useIsMobile } from '@/composables/useIsMobile.js'
import MobileMenuButton from '@/components/MobileMenuButton.vue'

const router = useRouter()
const importLink = ref('')
const isImportOpen = ref(false)
const importing = ref(false)

// Предпросмотр импорта: сначала показываем модалку со списком работ из
// чужой ссылки и даём выбрать, какие из них реально нужно затянуть к себе,
// а не копируем всё скопом.
const isImportModalOpen = ref(false)
const importCandidates = ref([]) // [{...work, isDuplicate}]
const selectedImportKeys = ref([])
const importedCollectionMeta = ref(null) // name/description/avatar/visibleFields найденной ссылки

const importPreviewColumns = [
  { title: '', key: 'cover', width: 56 },
  { title: 'Название', key: 'name', dataIndex: 'name' },
  { title: 'Художник', key: 'artist', width: 180 },
]

const importRowSelection = computed(() => ({
  selectedRowKeys: selectedImportKeys.value,
  onChange: (keys) => { selectedImportKeys.value = keys },
}))

// Для роли "художник" импорт ссылки и фильтр по художнику убраны — у
// художника все работы и так только свои.
const isArtistRole = computed(() => getUser()?.role === ROLES.ARTIST)
const { isMobile } = useIsMobile()

// Ссылки коллег по галерее (Gallery видит ссылки всех своих менеджеров, и
// наоборот) — показываем бейдж с автором и прячем удаление у тех, кому оно
// не положено (сам автор или сама галерея, см. AuthorizationService.
// canDeleteWorkOwner на бэкенде — здесь только UX-подсказка, реальная
// проверка всё равно на сервере).
const isOwnCollection = (collection) => collection.user_id === getUser()?.id
const canDeleteCollection = (collection) => isOwnCollection(collection) || getUser()?.role === ROLES.GALLERY
function formatCreatorName(createdBy) {
  if (!createdBy) return 'Коллега'
  return [createdBy.name, createdBy.surname].filter(Boolean).join(' ') || 'Коллега'
}

const artWorkStore = useArtWork()
const artistStore = useArtist()
const seriaStore = useSerias()
const mediaStore = useMedia()
const locationStore = useLocations()
const statusStore = useStatuses()
const collectionStore = useCollection()
const fileStore = useFile()
const filterArtist = ref(null)
const searchQuery = ref('')

const collectionList = computed(() => collectionStore.listCollections)

onMounted(async () => {
  try {
    await Promise.all([
      collectionStore.getAllCollections(),
      collectionStore.getFolders(),
      artWorkStore.getListArtWorks(),
      artistStore.getListArtists(),
      seriaStore.getListSerias(),
      mediaStore.getListMedia(),
      locationStore.getListLocations(),
      statusStore.getListStatuses()
    ])
  } catch (error) {
    console.error('Error loading directories:', error)
  }
});

// ==================== ПАПКИ ====================
const folders = computed(() => collectionStore.folders)
const currentFolder = computed(() =>
  folders.value.find(f => f.id === collectionStore.currentFolderId) || null
)

// Дочерние папки текущего уровня (null — корень)
const childFolders = computed(() =>
  folders.value.filter(f => (f.parent_id || null) === collectionStore.currentFolderId)
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

const openFolder = (folderId) => {
  collectionStore.setCurrentFolder(folderId)
}

const showNewFolderForm = ref(false)
const newFolderName = ref('')

const handleCreateFolder = async () => {
  const name = newFolderName.value.trim()
  if (!name) {
    message.warning('Введите название папки')
    return
  }

  const folder = await collectionStore.createFolder(name, collectionStore.currentFolderId)
  if (!folder) return

  newFolderName.value = ''
  showNewFolderForm.value = false
  collectionStore.setCurrentFolder(folder.id)
}

const cancelNewFolder = () => {
  newFolderName.value = ''
  showNewFolderForm.value = false
}

const handleDeleteFolder = (folder) => {
  Modal.confirm({
    title: 'Удалить папку?',
    icon: () => h(ExclamationCircleOutlined),
    content: `Папка «${folder.name}» и все вложенные папки будут удалены. Ссылки внутри останутся, но окажутся вне папок.`,
    okText: 'Удалить',
    okType: 'danger',
    cancelText: 'Отмена',
    onOk: () => collectionStore.deleteFolder(folder.id)
  })
}

// ✏️ Переименование папки
const renamingFolderId = ref(null)
const renameFolderValue = ref('')
const folderRenameInputRef = ref(null)

const startRenameFolder = (folder) => {
  renamingFolderId.value = folder.id
  renameFolderValue.value = folder.name
  nextTick(() => folderRenameInputRef.value?.[0]?.focus?.())
}

const cancelRenameFolder = () => {
  renamingFolderId.value = null
  renameFolderValue.value = ''
}

const confirmRenameFolder = async (folder) => {
  if (renamingFolderId.value !== folder.id) return

  const name = renameFolderValue.value.trim()
  if (!name || name === folder.name) {
    cancelRenameFolder()
    return
  }

  try {
    await collectionStore.renameFolder(folder.id, name)
    message.success('Папка переименована')
  } catch {
    // ошибка уже показана через notifyServerError в сторе
  } finally {
    cancelRenameFolder()
  }
}

// 🖱 Перетаскивание ссылок в папки + пересортировка папок/ссылок между собой
const draggingCollectionId = ref(null)
const draggingFolderId = ref(null)
const folderDragOverTarget = ref(null) // id папки или "root" — подсветка папки-цели
const reorderOverCollectionId = ref(null)

const handleCollectionDragStart = (event, collection) => {
  draggingCollectionId.value = collection.id
  draggingFolderId.value = null
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', collection.id)
}

const handleCollectionDragEnd = () => {
  draggingCollectionId.value = null
  folderDragOverTarget.value = null
  reorderOverCollectionId.value = null
}

const handleFolderDragStart = (event, folder) => {
  draggingFolderId.value = folder.id
  draggingCollectionId.value = null
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', folder.id)
}

const handleFolderDragEnd = () => {
  draggingFolderId.value = null
  folderDragOverTarget.value = null
}

const handleDragOverFolder = (target) => {
  folderDragOverTarget.value = target
}

const handleDragLeaveFolder = (target) => {
  if (folderDragOverTarget.value === target) {
    folderDragOverTarget.value = null
  }
}

// Перетаскивание одной ссылки на другую — меняет их местами в общем
// порядке (в пределах текущей папки/поиска, как они сейчас показаны).
const handleCollectionReorderDragOver = (targetId) => {
  if (!draggingCollectionId.value || draggingCollectionId.value === targetId) return
  reorderOverCollectionId.value = targetId
}

const handleCollectionReorderDragLeave = (targetId) => {
  if (reorderOverCollectionId.value === targetId) {
    reorderOverCollectionId.value = null
  }
}

const handleCollectionReorderDrop = async (targetId) => {
  const sourceId = draggingCollectionId.value
  reorderOverCollectionId.value = null
  draggingCollectionId.value = null
  folderDragOverTarget.value = null

  if (!sourceId || sourceId === targetId) return

  const ids = filteredCollectionList.value.map(c => c.id)
  const from = ids.indexOf(sourceId)
  const to = ids.indexOf(targetId)
  if (from === -1 || to === -1) return

  ids.splice(from, 1)
  ids.splice(to, 0, sourceId)

  await collectionStore.reorderCollections(ids)
}

// Бросили ссылку или папку на папку/хлебную крошку/«Все ссылки»
const handleDropOnFolder = async (target) => {
  const collectionId = draggingCollectionId.value
  const folderId = draggingFolderId.value
  draggingCollectionId.value = null
  draggingFolderId.value = null
  folderDragOverTarget.value = null

  // Перетащили папку — переставляем местами среди папок одного уровня
  // (вложение через drag&drop не поддерживаем — папки создаются вложенными
  // явно, кнопкой «Новая папка» уже находясь внутри нужной папки).
  if (folderId) {
    if (folderId === target || target === 'root') return

    const ids = childFolders.value.map(f => f.id)
    const from = ids.indexOf(folderId)
    const to = ids.indexOf(target)
    if (from === -1 || to === -1) return

    ids.splice(from, 1)
    ids.splice(to, 0, folderId)
    await collectionStore.reorderFolders(ids)
    return
  }

  if (!collectionId) return

  try {
    await collectionStore.moveCollectionToFolder(collectionId, target === 'root' ? null : target)
    message.success(target === 'root' ? 'Ссылка перемещена в «Все ссылки»' : 'Ссылка перемещена в папку')
  } catch {
    // ошибка уже показана через notifyServerError в сторе
  }
}

// Опции фильтра — художники
const artistOptions = computed(() => {
  return artistStore.listArtists.map(artist => ({
    label: artist.name,
    value: artist.id
  }))
})

// Ссылки, отфильтрованные по названию и художнику: у коллекции нет своего
// поля «художник» — она группирует работы, поэтому смотрим, есть ли среди
// её работ хотя бы одна принадлежащая выбранному художнику.
// Ссылки текущей папки без учёта поиска/фильтра — нужно, чтобы отличать
// "в папке пусто" от "ничего не найдено по текущему поиску/фильтру".
const collectionsInCurrentFolder = computed(() =>
  collectionList.value.filter(c => (c.folder_id || null) === collectionStore.currentFolderId)
)

const filteredCollectionList = computed(() => {
  let result = collectionsInCurrentFolder.value

  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    result = result.filter(collection => (collection.name || '').toLowerCase().includes(query))
  }

  if (filterArtist.value) {
    result = result.filter(collection => {
      const workIds = collection.works || []
      return workIds.some(workId => {
        const work = artWorkStore.listArtWorks.find(w => w.id === workId)
        return work && work.artist === filterArtist.value
      })
    })
  }

  return result
})

function descriptionPreview(description) {
  return htmlToPlainText(description)
}

// Достаём ID ссылки из вставленной ссылки (или принимаем чистый id)
function extractCollectionId(link) {
  const trimmed = link.trim()
  try {
    const url = new URL(trimmed)
    const segments = url.pathname.split('/').filter(Boolean)
    return segments[segments.length - 1] || ''
  } catch {
    // это не полноценный URL — считаем, что вставили сам id
    return trimmed
  }
}

// id справочника (художник/локация/медиа/серия/статус) в чужой ссылке
// принадлежит каталогу другого пользователя и у нас бессмысленен — поэтому
// связанные справочники сопоставляются по имени: если у пользователя уже
// есть запись с таким именем, используется она, иначе создаётся новая.
// cache нужен, чтобы за один импорт не создать несколько одинаковых записей
// (например, если у художника все работы — одной и той же серии).
async function resolveReferenceId({ cache, ownList, createAction, name, extra }) {
  const trimmed = (name || '').trim()
  if (!trimmed) return null

  const key = trimmed.toLowerCase()
  if (cache.has(key)) return cache.get(key)

  const existing = ownList.find(item => (item.name || '').trim().toLowerCase() === key)
  if (existing) {
    cache.set(key, existing.id)
    return existing.id
  }

  const created = await createAction({ user_id: getUser()?.id, name: trimmed, ...extra })
  const id = created?.id || null
  cache.set(key, id)
  return id
}

// Копируем файл (по id) в свои файлы — используется для обложки и доп.
// изображений импортируемой работы, чтобы у себя иметь настоящую копию
// байтов, а не ссылку на чужой файл (тот может позже удалиться у исходного
// владельца — см. историю с "битыми ссылками" в my_file). При нехватке
// места бросаем исключение дальше, чтобы прервать весь импорт — для любых
// других ошибок (например, файл уже отсутствует на диске у владельца)
// просто пропускаем эту картинку и продолжаем.
async function copyWorkImage(fileId) {
  if (!fileId) return null
  try {
    return await fileStore.copyFile(fileId)
  } catch (e) {
    if (e.quotaExceeded) throw e
    console.error('Не удалось скопировать изображение при импорте:', fileId, e)
    return null
  }
}

// Копируем работы из импортированной (чужой) публичной ссылки в собственный
// каталог работ — публичная ссылка отдаёт работы уже полностью резолвленными
// (включая доп. изображения и имена связанных справочников), поэтому лишних
// запросов не требуется. Обложка и доп. изображения при этом физически
// копируются в свои файлы (см. copyWorkImage), а не просто ссылаются на
// чужой file id. Возвращает { newWorkIds, stoppedByQuota } — из newWorkIds
// соберётся works новой ссылки. Копии помечаются imported: true на бэкенде —
// по этому полю UserPictures подсвечивает импортированные строки.
async function importWorksFromCollection(sourceWorks) {
  const newWorkIds = []

  const artistCache = new Map()
  const locationCache = new Map()
  const mediaCache = new Map()
  const seriaCache = new Map()
  const statusCache = new Map()

  for (const sourceWork of sourceWorks) {
    const [artistId, locationId, mediaId, seriaId, statusId] = await Promise.all([
      resolveReferenceId({ cache: artistCache, ownList: artistStore.listArtists, createAction: artistStore.createArtist, name: sourceWork.artist_name }),
      resolveReferenceId({ cache: locationCache, ownList: locationStore.listLocations, createAction: locationStore.createLocation, name: sourceWork.location_name }),
      resolveReferenceId({ cache: mediaCache, ownList: mediaStore.listMedia, createAction: mediaStore.createMedia, name: sourceWork.media_name }),
      resolveReferenceId({ cache: seriaCache, ownList: seriaStore.listSerias, createAction: seriaStore.createSeria, name: sourceWork.seria_name }),
      resolveReferenceId({
        cache: statusCache,
        ownList: statusStore.listStatuses,
        createAction: statusStore.createStatus,
        name: sourceWork.status_name,
        extra: sourceWork.status_color ? { color: sourceWork.status_color } : undefined,
      }),
    ])

    let copiedAvatar
    let copiedImages
    try {
      [copiedAvatar, copiedImages] = await Promise.all([
        copyWorkImage(sourceWork.avatar?.id),
        Promise.all((sourceWork.images || []).map(img => copyWorkImage(typeof img === 'string' ? img : img?.id))),
      ])
    } catch (e) {
      if (e.quotaExceeded) {
        showStorageLimitModal(e.used, e.limit)
        return { newWorkIds, stoppedByQuota: true }
      }
      throw e
    }

    const created = await artWorkStore.createArtWork({
      user_id: getUser()?.id,
      name: sourceWork.name,
      technique: sourceWork.technique,
      size: sourceWork.size,
      year: sourceWork.year,
      description: sourceWork.description,
      location: locationId,
      seria: seriaId,
      media: mediaId,
      status: statusId,
      artist: artistId,
      price: sourceWork.price,
      avatar_id: copiedAvatar?.id || null,
      images: copiedImages.filter(Boolean),
      imported: true,
    })

    if (created?.id) {
      newWorkIds.push(created.id)
    }
  }

  return { newWorkIds, stoppedByQuota: false }
}

// Работа считается уже существующей у пользователя, если у него уже есть
// своя работа с тем же названием и тем же художником (сравнение без учёта
// регистра/пробелов) — id художника не подходит для сравнения, т.к. это id
// из каталога художника чужой ссылки, а не наш собственный.
function duplicateKey(name, artistName) {
  return `${(name || '').trim().toLowerCase()}|${(artistName || '').trim().toLowerCase()}`
}

const ownWorksDuplicateKeys = computed(() => {
  const keys = new Set()
  for (const work of artWorkStore.listArtWorks) {
    const artistName = artistStore.findArtistById(work.artist)?.name
    keys.add(duplicateKey(work.name, artistName))
  }
  return keys
})

// Тянем чужую публичную ссылку с бэкенда и показываем модалку с её
// работами — импорт (копирование к себе) происходит только после того,
// как пользователь выберет нужные работы и подтвердит через confirmImport.
const fetchImportPreview = async () => {
  if (!importLink.value.trim()) {
    message.warning('Пожалуйста, введите ссылку')
    return
  }

  const collectionId = extractCollectionId(importLink.value)
  if (!collectionId) {
    message.error('Не удалось распознать ссылку')
    return
  }

  importing.value = true
  try {
    const found = await collectionStore.getPublicCollection(collectionId)
    if (!found) {
      message.error('Ссылка не найдена')
      return
    }

    if (found.user_id && found.user_id === getUser()?.id) {
      message.warning('Нельзя импортировать свою же ссылку')
      return
    }

    if (!found.works?.length) {
      message.warning('В этой ссылке нет работ')
      return
    }

    importedCollectionMeta.value = {
      name: found.name,
      artistOrGallery: found.artistOrGallery,
      description: found.description,
      avatar: found.avatar,
      visibleFields: found.visibleFields,
    }

    importCandidates.value = found.works.map(work => ({
      ...work,
      isDuplicate: ownWorksDuplicateKeys.value.has(duplicateKey(work.name, work.artist_name)),
    }))

    // По умолчанию выбраны все работы, кроме уже существующих у пользователя.
    selectedImportKeys.value = importCandidates.value
      .filter(work => !work.isDuplicate)
      .map(work => work.id)

    isImportModalOpen.value = true
  } finally {
    importing.value = false
  }
}

function closeImportModal() {
  isImportModalOpen.value = false
  importCandidates.value = []
  selectedImportKeys.value = []
  importedCollectionMeta.value = null
}

// Копируем к себе только те работы, что пользователь отметил в модалке,
// и создаём свою ссылку уже из этих копий.
const confirmImport = async () => {
  if (!selectedImportKeys.value.length) {
    message.warning('Выберите хотя бы одну работу')
    return
  }

  importing.value = true
  try {
    const selectedSourceWorks = importCandidates.value.filter(work => selectedImportKeys.value.includes(work.id))
    const { newWorkIds, stoppedByQuota } = await importWorksFromCollection(selectedSourceWorks)

    if (!newWorkIds.length) return

    const created = await collectionStore.createCollection({
      ...importedCollectionMeta.value,
      works: newWorkIds,
      imported: true,
    })

    if (!created) return

    isImportOpen.value = false
    importLink.value = ''
    closeImportModal()

    if (stoppedByQuota) {
      message.warning(`Место на диске закончилось — импортировано только ${newWorkIds.length} из ${selectedSourceWorks.length} работ`)
    } else {
      message.success(`Ссылка добавлена, работ добавлено в «Мои работы»: ${newWorkIds.length}`)
    }
  } finally {
    importing.value = false
  }
}

// Функция копирования ссылки на коллекцию
const copyCollectionLink = async (collection) => {
  // Страница ссылки теперь рендерится сервером на бэкенде, но nginx проксирует
  // /collection/* и /static/* на том же домене, что и сам фронтенд (art.myoffer.life) —
  // поэтому просто origin текущей страницы, без отдельного домена API.
  const link = `${window.location.origin}/collection/${collection.id}`

  try {
    await navigator.clipboard.writeText(link)
    message.success('Ссылка на коллекцию скопирована!')
  } catch (err) {
    console.error('Ошибка копирования:', err)
    // fallback
    const textarea = document.createElement('textarea')
    textarea.value = link
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    message.success('Ссылка скопирована!')
  }
}

const openEditPage = (collection) => {
  if (collection && collection.id) {
    router.push({ name: 'edit-collection', params: { id: collection.id } })
  } else {
    router.push({ name: 'edit-collection', params: { id: 'new' } })
  }
}

async function deleteСollection(id) {
  await collectionStore.deleteCollection(id)
}

function pluralizeWorks(count) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'работа'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'работы'
  return 'работ'
}
</script>

<style scoped>

.collection-page {
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

  padding: 20px 24px;
  background: var(--bg);
  color: var(--text-body);
  border-radius: 14px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.collection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  font-size: 18px;
}

.header-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-heading-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0;
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-faint);
}

.filters-panel {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.artist-filter :deep(.ant-select-selector) {
  background: var(--bg-elevated) !important;
  border-color: var(--border) !important;
  color: var(--text-body) !important;
  border-radius: 20px !important;
}

.artist-filter :deep(.ant-select-selection-placeholder),
.artist-filter :deep(.ant-select-selection-item) {
  color: var(--text-muted) !important;
}

.artist-filter :deep(.ant-select-arrow) {
  color: var(--text-faint) !important;
}

.artist-filter :deep(.ant-select-clear) {
  background: var(--bg-elevated) !important;
  color: var(--text-faint) !important;
}

.artist-filter:hover :deep(.ant-select-selector) {
  border-color: var(--accent) !important;
}

/* === Папки === */
.folder-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.folder-path {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  flex-wrap: wrap;
}

.folder-back-btn {
  padding: 0 4px;
  color: var(--text-faint);
}

.folder-crumb {
  color: var(--accent);
  cursor: pointer;
}

.folder-crumb:hover {
  text-decoration: underline;
}

.folder-crumb.drag-over {
  background: rgba(138, 109, 47, 0.1);
  border-radius: 4px;
  padding: 0 4px;
}

.folder-crumb-sep {
  color: var(--text-faint);
}

.folder-crumb-current {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 600;
  font-size: 17px;
  color: var(--text-title);
}

.new-folder-btn {
  flex-shrink: 0;
  border-color: var(--accent);
  color: var(--accent);
}

.new-folder-btn:hover {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}

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

.folders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.folder-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 96px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  background: var(--bg-elevated);
  cursor: pointer;
  transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.folder-card:hover {
  border-color: var(--accent);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.folder-card.drag-over {
  border-color: var(--accent);
  background: rgba(138, 109, 47, 0.08);
  box-shadow: 0 0 0 2px rgba(138, 109, 47, 0.25);
}

.folder-card.dragging {
  opacity: 0.4;
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
  color: var(--text-faint);
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
  background: rgba(138, 109, 47, 0.1);
}

.folder-action-btn.danger:hover {
  color: #b43c3c;
  background: rgba(180, 60, 60, 0.1);
}

.folder-rename-input {
  width: 100%;
}

.folder-rename-input :deep(.ant-input) {
  text-align: center;
}

.collection-card.dragging {
  opacity: 0.4;
}

.collection-card.reorder-over {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.collection-card {
  width: 100%;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  background: var(--bg-elevated) !important;
  border: 1px solid var(--border) !important;
  border-radius: 10px;
}

.collection-card :deep(.ant-card-body) {
  padding: 14px 16px 16px;
}

.collection-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent) !important;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.collection-card--imported {
  border: 1px solid var(--accent) !important;
  box-shadow: 0 0 0 1px rgba(138, 109, 47, 0.25);
}

.collection-card:hover .cover-img {
  transform: scale(1.05);
}

/* === Обложка ссылки === */
.card-cover {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-soft);
}

.imported-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #fff;
  background: var(--accent);
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: var(--text-faint);
}

.card-title {
  margin: 0 0 4px;
  font-family: 'Cormorant Garamond', serif;
  font-size: 19px;
  font-weight: 600;
  color: var(--text-title);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shared-author-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--accent);
  font-size: 11px;
  font-weight: 500;
}

.collection-text {
  display: -webkit-box;
  -webkit-line-clamp: 2; /* stylelint-disable-line */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  margin-bottom: 10px;
  line-height: 1.5;
  font-size: 13px !important;
  min-height: 42px; /* 2 строки * 1.5 * 14px = 42px */
  color: var(--text-muted);
}

.collection-text--empty {
  font-style: italic;
  color: var(--text-faint);
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--text-faint);
}

.meta-works {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.meta-views {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.meta-view-stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: default;
}

.collection-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-soft);
  padding-top: 12px;
}

.copy-link-btn {
  border: 1px solid var(--accent) !important;
  color: var(--accent) !important;
  background: transparent !important;
  border-radius: 20px !important;
  padding: 4px 12px !important;
  height: auto !important;
  font-size: 12px !important;
}

.copy-link-btn:hover {
  background-color: var(--accent) !important;
  color: #fff !important;
  border-color: var(--accent-strong) !important;
}

.delete-btn {
  color: #b43c3c !important;
}

.delete-btn:hover {
  color: #fff !important;
  background-color: #b43c3c !important;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* Вторичное действие — визуально легче, чем основной CTA */
.import-toggle-btn {
  border-radius: 20px;
  border-color: var(--border) !important;
  color: var(--text-muted) !important;
  background: transparent !important;
}

.import-toggle-btn:hover {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}

/* Основной CTA — самый заметный элемент в хедере */
.create-btn {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  border-radius: 20px !important;
  font-weight: 500;
}

.create-btn:hover {
  background-color: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

/* Панель импорта — раскрывается по клику, не конкурирует с основным CTA по умолчанию */
.import-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px 12px;
  background: var(--card-bg);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
}

.import-link-input {
  width: 320px;
  max-width: 100%;
}

.import-link-input :deep(.ant-input) {
  border-radius: 20px;
  background: var(--bg-elevated);
  border-color: var(--border);
  color: var(--text-body);
}

.import-link-input :deep(.ant-input:hover),
.import-link-input :deep(.ant-input:focus) {
  border-color: var(--accent);
}

.import-link-btn {
  background-color: var(--accent);
  border-color: var(--accent);
  border-radius: 20px;
}

.import-link-btn:hover {
  background-color: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}

.import-cancel-btn {
  border-radius: 20px;
  border-color: var(--border);
  color: var(--text-muted);
  background: transparent;
}

.import-cancel-btn:hover {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}

.import-modal-hint {
  color: var(--text-muted);
  font-size: 13px;
  margin-bottom: 12px;
}

.import-preview-thumb {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  display: block;
}

.import-preview-thumb--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg, #f2f0ea);
  color: var(--text-faint, #aaa);
  font-size: 16px;
}

.duplicate-tag {
  margin-left: 8px;
}

/* Пустое состояние — направляет пользователя к первому действию */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 64px 24px;
  background: var(--bg-elevated);
  border: 1px dashed var(--border);
  border-radius: 14px;
  text-align: center;
}

.empty-icon {
  font-size: 36px;
  color: var(--text-faint);
  margin-bottom: 8px;
}

.empty-title {
  margin: 0;
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-title);
}

.empty-hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--text-faint);
}

@media (max-width: 640px) {
  .collection-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .ant-btn {
    flex: 1;
  }

  .import-link-input {
    width: 100%;
  }

  .import-wrapper {
    flex-wrap: wrap;
  }

  .import-link-btn,
  .import-cancel-btn {
    flex: 1;
  }

  .filters-panel {
    flex-direction: column;
  }

  .name-search,
  .artist-filter {
    width: 100% !important;
  }
}
</style>

<!--
  Не scoped: ant-design-vue вешает наш класс "name-search" прямо на сам
  .ant-input-affix-wrapper (это один и тот же элемент, а не предок и
  потомок), поэтому scoped-селектор ".name-search :deep(.ant-input-affix-wrapper)"
  (с пробелом) никогда ни с чем не совпадал — отсюда синяя рамка вместо
  акцентной при наведении/фокусе и отсутствие скругления.
-->
<style>
.name-search.ant-input-affix-wrapper {
  background: var(--bg-elevated) !important;
  border-color: var(--border) !important;
  border-radius: 20px !important;
}

.name-search.ant-input-affix-wrapper:hover,
.name-search.ant-input-affix-wrapper:focus-within {
  border-color: var(--accent) !important;
}

.name-search .ant-input {
  background: var(--bg-elevated) !important;
  color: var(--text-body) !important;
}

.name-search .ant-input-prefix {
  color: var(--text-faint) !important;
  margin-right: 6px;
}

.name-search .ant-input-clear-icon {
  color: var(--text-faint) !important;
}
</style>
