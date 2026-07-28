<template>
  <div class="collection-page">
    <div class="collection-header">
      <div class="header-heading">
        <h3 class="page-title">Мои Ссылки</h3>
        <p class="page-subtitle">
          {{ collectionList.length ? `Ссылок: ${collectionList.length}` : 'Здесь появятся ваши ссылки' }}
        </p>
      </div>
      <div class="header-actions">
        <a-button class="import-toggle-btn" @click="isImportOpen = !isImportOpen">
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

    <div v-if="isImportOpen" class="import-wrapper">
      <a-input
        v-model:value="importLink"
        placeholder="Вставьте ссылку"
        class="import-link-input"
        autofocus
        @pressEnter="importCollection"
      />
      <a-button type="primary" class="import-link-btn" @click="importCollection">Добавить</a-button>
      <a-button class="import-cancel-btn" @click="isImportOpen = false">Отмена</a-button>
    </div>

    <div class="filters-panel">
      <a-input
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
        v-model:value="filterArtist"
        placeholder="Художник"
        allow-clear
        style="width: 220px"
        :options="artistOptions"
        class="artist-filter"
      />
    </div>

    <div v-if="filteredCollectionList.length" class="collection-grid">
      <a-card v-for="(collection, index) in filteredCollectionList" :key="collection.imported ? `imported-${collection.id}-${index}` : collection.id" class="collection-card"
        :class="{ 'collection-card--imported': collection.imported }"
        hoverable @click="openEditPage(collection)">
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

        <h4 class="card-title">{{ collection.name || 'Без названия' }}</h4>

        <p class="collection-text" :class="{ 'collection-text--empty': !collection.description }">
          {{ descriptionPreview(collection.description) || 'Без описания' }}
        </p>

        <div class="card-meta">
          <PictureOutlined />
          {{ (collection.works || []).length }} {{ pluralizeWorks((collection.works || []).length) }}
        </div>

        <div class="collection-actions">
          <a-button type="default" @click.stop="copyCollectionLink(collection)" class="copy-link-btn">
            <template #icon>
              <CopyOutlined />
            </template>
            Копировать ссылку
          </a-button>
          <a-popconfirm title="Удалить ссылку?" ok-text="Да" cancel-text="Нет"
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

    <div v-else-if="collectionList.length" class="empty-state">
      <FolderOpenOutlined class="empty-icon" />
      <p class="empty-title">Ничего не найдено</p>
      <p class="empty-hint">Попробуйте изменить поиск или фильтр по художнику</p>
      <a-button class="import-toggle-btn" @click="filterArtist = null; searchQuery = ''">Сбросить фильтр</a-button>
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
import { ref, watch, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ImportOutlined, CopyOutlined, DeleteOutlined, PlusOutlined, FolderOpenOutlined, PictureOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { htmlToPlainText } from '@/utils/richText.js'
import { useArtWork } from '@/stores/artWork.js'
import { useArtist } from '@/stores/artist.js'
import { getUser } from '@/services/auth.js'

// === 1. Загружаем из localStorage при старте ===
const collectionList = ref([]);
const router = useRouter()
const importLink = ref('')
const isImportOpen = ref(false)

const artWorkStore = useArtWork()
const artistStore = useArtist()
const filterArtist = ref(null)
const searchQuery = ref('')

onMounted(async () => {
  const saved = localStorage.getItem('collectionList');
  if (saved) collectionList.value = JSON.parse(saved);

  try {
    await Promise.all([
      artWorkStore.getListArtWorks(),
      artistStore.getListArtists()
    ])
  } catch (error) {
    console.error('Error loading directories:', error)
  }
});

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
const filteredCollectionList = computed(() => {
  let result = collectionList.value

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

// Копируем работы из импортированной ссылки в собственный каталог работ
// (POST на бэкенд), чтобы они реально появились в «Мои работы», и запоминаем
// их id в localStorage — по этому списку UserPictures подсвечивает импортированные строки.
async function importWorksFromCollection(workIds) {
  const importedIds = JSON.parse(localStorage.getItem('importedWorkIds') || '[]')
  let addedCount = 0

  for (const workId of workIds) {
    const sourceWork = artWorkStore.listArtWorks.find(w => w.id === workId)
    if (!sourceWork) continue

    const created = await artWorkStore.createArtWork({
      user_id: getUser()?.id,
      name: sourceWork.name,
      technique: sourceWork.technique,
      size: sourceWork.size,
      year: sourceWork.year,
      description: sourceWork.description,
      location: sourceWork.location,
      seria: sourceWork.seria,
      media: sourceWork.media,
      status: sourceWork.status,
      artist: sourceWork.artist,
      price: sourceWork.price,
      avatar_id: sourceWork.avatar?.id || null,
    })

    if (created?.id) {
      importedIds.push(created.id)
      addedCount++
    }
  }

  localStorage.setItem('importedWorkIds', JSON.stringify(importedIds))
  return addedCount
}

// Импорт ссылки по ссылке — добавляем её карточку в "Мои Ссылки"
const importCollection = async () => {
  if (!importLink.value.trim()) {
    message.warning('Пожалуйста, введите ссылку')
    return
  }

  const collectionId = Number(extractCollectionId(importLink.value))
  if (!collectionId) {
    message.error('Не удалось распознать ссылку')
    return
  }

  const stored = JSON.parse(localStorage.getItem('collectionList') || '[]')
  const found = stored.find(c => c.id === collectionId)

  if (!found) {
    message.error('Коллекция по этой ссылке не найдена')
    return
  }

  collectionList.value.push({ ...found, imported: true })
  isImportOpen.value = false
  importLink.value = ''

  const addedCount = await importWorksFromCollection(found.works || [])
  if (addedCount > 0) {
    message.success(`Коллекция добавлена, работ добавлено в «Мои работы»: ${addedCount}`)
  } else {
    message.success('Коллекция добавлена в список')
  }
}

// Функция копирования ссылки на коллекцию
const copyCollectionLink = async (collection) => {
  // Формируем ссылку
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

// === 2. Следим за изменениями и сохраняем ===
watch(collectionList, (newList) => {
  localStorage.setItem('collectionList', JSON.stringify(newList));
}, { deep: true });

const openEditPage = (collection) => {
  if (collection && collection.id) {
    router.push({ name: 'edit-collection', params: { id: collection.id } })
  } else {
    router.push({ name: 'edit-collection', params: { id: 'new' } })
  }
}

function deleteСollection(id) {
  collectionList.value = collectionList.value.filter(b => b.id !== id);
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
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

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

.name-search :deep(.ant-input) {
  background: var(--bg-elevated) !important;
  color: var(--text-body) !important;
}

.name-search :deep(.ant-input-affix-wrapper) {
  background: var(--bg-elevated) !important;
  border-color: var(--border) !important;
  border-radius: 20px !important;
}

.name-search :deep(.ant-input-affix-wrapper):hover,
.name-search :deep(.ant-input-affix-wrapper):focus-within {
  border-color: var(--accent) !important;
}

.name-search :deep(.ant-input-prefix) {
  color: var(--text-faint) !important;
  margin-right: 6px;
}

.name-search :deep(.ant-input-clear-icon) {
  color: var(--text-faint) !important;
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
  gap: 6px;
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--text-faint);
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
}
</style>
