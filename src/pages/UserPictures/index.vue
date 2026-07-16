<template>
  <div class="pictures-page">
    <div class="header-content">
      <h3>Мои работы</h3>
    </div>

    <div class="filters-panel">
      <div class="filters-left">
        <a-select v-model:value="filterLocation" placeholder="Локация" allowClear style="width: 200px"
          :options="locationOptions" />
        <a-select v-model:value="filterSeria" placeholder="Серия" allowClear style="width: 200px"
          :options="seriaOptions" />
        <a-select v-model:value="filterMedia" placeholder="Медиа" allowClear style="width: 200px"
          :options="mediaFilterOptions" />
        <a-select v-model:value="filterStatus" placeholder="Статус" allowClear style="width: 200px"
          :options="statusOptions" />
      </div>

      <div class="filters-right">
        <a-button class="buttons" type="primary" v-if="selectedRowKeys.length > 0" @click="createCollection">
          Создать коллекцию
        </a-button>
        <a-button class="buttons" type="primary" @click="openEditPage()">Добавить</a-button>
      </div>
    </div>

    <!-- Таблица -->
    <a-table class="custom-table" :columns="columns" :data-source="filteredData" row-key="id"
      :row-selection="rowSelection" :loading="loading">
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'avatar'">
          <img v-if="record.avatar && record.avatar.url" :src="record.avatar.url" class="preview-img" />
          <div v-else class="img-placeholder">
            <PictureOutlined />
          </div>
        </template>
        <template v-else-if="column.dataIndex === 'seria'">
          {{ getSeriaName(record.seria) }}
        </template>
        <template v-else-if="column.dataIndex === 'media'">
          {{ getMediaName(record.media) }}
        </template>
        <template v-else-if="column.dataIndex === 'status'">
          <span v-if="getStatusName(record.status)" class="status-pill" :class="statusPillClass(record.status)">
            {{ getStatusName(record.status) }}
          </span>
        </template>
        <template v-else-if="column.dataIndex === 'location'">
          {{ getLocationName(record.location) }}
        </template>
        <template v-else-if="column.dataIndex === 'actions'">
          <a-button type="text" class="edit-btn" @click="openEditPage(record)">
            Редактировать
          </a-button>
          <a-button type="text" danger @click="deleteRow(record.id)">
            Удалить
          </a-button>
        </template>
        <template v-else>
          {{ record[column.dataIndex] }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { PictureOutlined } from '@ant-design/icons-vue'
import { Modal, message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useArtWork } from '@/stores/artWork.js'
import { useMedia } from '@/stores/media.js'
import { useSerias } from '@/stores/seria.js'
import { useStatuses } from '@/stores/statuses.js'
import { useLocations } from '@/stores/locations.js'
import { useFile } from "@/stores/file.js"

const fileStore = useFile()
if (!fileStore.files.length) {
  fileStore.getAllFiles() // Загружаем файлы при открытии страницы
}

const artWorkStore = useArtWork()
const mediaStore = useMedia()
const seriasStore = useSerias()
const statusesStore = useStatuses()
const locationsStore = useLocations()

const router = useRouter()
const loading = ref(false)
const selectedRowKeys = ref([])
const filterLocation = ref(null)
const filterSeria = ref(null)
const filterMedia = ref(null)
const filterStatus = ref(null)

// Хранилища для маппинга ID -> название
const seriaMap = ref({})
const mediaMap = ref({})
const statusMap = ref({})
const locationMap = ref({})

// Функции для получения названий по ID (с кешированием)
const getSeriaName = (seriaId) => {
  if (!seriaId) return ''
  if (seriaMap.value[seriaId]) return seriaMap.value[seriaId]

  const seria = seriasStore.listSerias.find(s => s.id === seriaId)
  if (seria) {
    seriaMap.value[seriaId] = seria.name
    return seria.name
  }
  return seriaId
}

const getMediaName = (mediaId) => {
  if (!mediaId) return ''
  if (mediaMap.value[mediaId]) return mediaMap.value[mediaId]

  const media = mediaStore.listMedia.find(m => m.id === mediaId)
  if (media) {
    mediaMap.value[mediaId] = media.name
    return media.name
  }
  return mediaId
}

const getStatusName = (statusId) => {
  if (!statusId) return ''
  if (statusMap.value[statusId]) return statusMap.value[statusId]

  const status = statusesStore.listStatuses.find(s => s.id === statusId)
  if (status) {
    statusMap.value[statusId] = status.name
    return status.name
  }
  return statusId
}

function statusPillClass(statusId) {
  const name = getStatusName(statusId).toLowerCase()
  if (name.includes('прода')) return 'status-sold'
  if (name.includes('налич') || name.includes('доступ')) return 'status-available'
  return 'status-default'
}

const getLocationName = (locationId) => {
  if (!locationId) return ''
  if (locationMap.value[locationId]) return locationMap.value[locationId]

  const location = locationsStore.listLocations.find(l => l.id === locationId)
  if (location) {
    locationMap.value[locationId] = location.name
    return location.name
  }
  return locationId
}

// Загрузка всех справочников
const loadDirectories = async () => {
  try {
    await Promise.all([
      mediaStore.getListMedia(),
      seriasStore.getListSerias(),
      statusesStore.getListStatuses(),
      locationsStore.getListLocations()
    ])

    // Заполняем карты для быстрого доступа
    seriasStore.listSerias.forEach(s => { seriaMap.value[s.id] = s.name })
    mediaStore.listMedia.forEach(m => { mediaMap.value[m.id] = m.name })
    statusesStore.listStatuses.forEach(s => { statusMap.value[s.id] = s.name })
    locationsStore.listLocations.forEach(l => { locationMap.value[l.id] = l.name })

    console.log('Загружены серии:', seriaMap.value)
    console.log('Загружены медиа:', mediaMap.value)
    console.log('Загружены статусы:', statusMap.value)
    console.log('Загружены локации:', locationMap.value)
  } catch (error) {
    console.error('Error loading directories:', error)
    message.error('Ошибка загрузки справочников')
  }
}

// Загрузка работ из API
const loadArtWorks = async () => {
  loading.value = true
  try {
    await artWorkStore.getListArtWorks()
    console.log('ArtWorks loaded:', artWorkStore.listArtWorks)

    // Проверяем первую работу
    if (artWorkStore.listArtWorks.length > 0) {
      const firstWork = artWorkStore.listArtWorks[0]
      console.log('Пример работы:', {
        id: firstWork.id,
        name: firstWork.name,
        seria: firstWork.seria,
        seriaName: getSeriaName(firstWork.seria),
        media: firstWork.media,
        mediaName: getMediaName(firstWork.media),
        status: firstWork.status,
        statusName: getStatusName(firstWork.status),
        location: firstWork.location,
        locationName: getLocationName(firstWork.location)
      })
    }
  } catch (error) {
    console.error('Error loading artworks:', error)
    message.error('Ошибка загрузки работ')
  } finally {
    loading.value = false
  }
}

// Опции для фильтров
const locationOptions = computed(() => {
  return locationsStore.listLocations.map(loc => ({
    label: loc.name,
    value: loc.id
  }))
})

const seriaOptions = computed(() => {
  return seriasStore.listSerias.map(seria => ({
    label: seria.name,
    value: seria.id
  }))
})

const mediaFilterOptions = computed(() => {
  return mediaStore.listMedia.map(media => ({
    label: media.name,
    value: media.id
  }))
})

const statusOptions = computed(() => {
  return statusesStore.listStatuses.map(status => ({
    label: status.name,
    value: status.id
  }))
})

// Фильтрация данных
const filteredData = computed(() => {
  let result = [...artWorkStore.listArtWorks]

  if (filterLocation.value) {
    result = result.filter(item => item.location === filterLocation.value)
  }

  if (filterSeria.value) {
    result = result.filter(item => item.seria === filterSeria.value)
  }

  if (filterMedia.value) {
    result = result.filter(item => item.media === filterMedia.value)
  }

  if (filterStatus.value) {
    result = result.filter(item => item.status === filterStatus.value)
  }

  return result
})

// Колонки таблицы
const columns = computed(() => [
  { title: 'Картина', dataIndex: 'avatar', key: 'avatar', width: 90 },
  { title: 'Название', dataIndex: 'name', key: 'name' },
  { title: 'Техника', dataIndex: 'technique', key: 'technique', width: 140 },
  { title: 'Год', dataIndex: 'year', key: 'year', width: 90, sorter: (a, b) => a.year - b.year },
  { title: 'Описание', dataIndex: 'description', key: 'description', className: 'desc-col' },
  { title: 'Локация', dataIndex: 'location', key: 'location', width: 150 },
  { title: 'Серия', dataIndex: 'seria', key: 'seria', width: 120 },
  { title: 'Медиа', dataIndex: 'media', key: 'media', width: 120 },
  { title: 'Статус', dataIndex: 'status', key: 'status', width: 140 },
  { title: 'Стоимость', dataIndex: 'price', key: 'price', width: 100, sorter: (a, b) => a.price - b.price },
  { title: 'Действия', dataIndex: 'actions', key: 'actions', width: 100 },
])

// Открытие страницы редактирования
const openEditPage = (record) => {
  if (record && record.id) {
    router.push({ name: 'edit-work', params: { id: record.id } })
  } else {
    router.push({ name: 'edit-work', params: { id: 'new' } })
  }
}

// Удаление записи через API
const deleteRow = (id) => {
  Modal.confirm({
    title: 'Удалить запись?',
    content: 'Вы уверены, что хотите удалить эту работу?',
    okText: 'Удалить',
    okType: 'danger',
    cancelText: 'Отмена',
    onOk: async () => {
      try {
        const success = await artWorkStore.deleteArtWork(id)
        if (success) {
          message.success('Работа удалена')
          await loadArtWorks()
        } else {
          message.error('Ошибка при удалении')
        }
      } catch (error) {
        console.error('Error deleting artwork:', error)
        message.error('Ошибка при удалении')
      }
    }
  })
}

// Выбранные строки
const rowSelection = {
  onChange: (selectedKeys) => {
    selectedRowKeys.value = selectedKeys
    console.log('Выбранные строки:', selectedKeys)
  },
}

const createCollection = () => {
  const selectedItems = artWorkStore.listArtWorks.filter(item =>
    selectedRowKeys.value.includes(item.id)
  )
  console.log('Создаем коллекцию из выбранных работ:', selectedItems)
}

// Инициализация
onMounted(async () => {
  await loadDirectories()
  await loadArtWorks()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

.pictures-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --text-dim: #a29c8c;
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --border: rgba(0, 0, 0, 0.08);
  --border-soft: rgba(0, 0, 0, 0.06);
  --status-available-bg: rgba(58, 150, 62, 0.1);
  --status-available-fg: #2f8a35;
  --status-available-border: rgba(47, 138, 53, 0.3);
  --status-sold-bg: rgba(196, 62, 62, 0.1);
  --status-sold-fg: #b43c3c;
  --status-sold-border: rgba(180, 60, 60, 0.3);
  --status-default-bg: rgba(138, 109, 47, 0.1);
  --status-default-fg: #8a6d2f;
  --status-default-border: rgba(138, 109, 47, 0.3);

  background: var(--bg);
  color: var(--text-body);
  border-radius: 14px;
  padding: 24px 24px 8px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.header-content {
  display: flex;
  margin-bottom: 20px;
}

.header-content h3 {
  font-family: 'Cormorant Garamond', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0;
  letter-spacing: 0.01em;
}

.filters-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.filters-left {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filters-right {
  display: flex;
  gap: 12px;
}

/* === Селекты фильтров === */
.filters-left :deep(.ant-select-selector) {
  background: var(--bg-elevated) !important;
  border-color: var(--border) !important;
  color: var(--text-body) !important;
  border-radius: 20px !important;
}

.filters-left :deep(.ant-select-selection-placeholder),
.filters-left :deep(.ant-select-selection-item) {
  color: var(--text-muted) !important;
}

.filters-left :deep(.ant-select-arrow) {
  color: var(--text-faint) !important;
}

.filters-left :deep(.ant-select-clear) {
  background: var(--bg-elevated) !important;
  color: var(--text-faint) !important;
}

.filters-left :deep(.ant-select:hover .ant-select-selector) {
  border-color: var(--accent) !important;
}

/* === Кнопки === */
.buttons {
  width: 170px;
  background-color: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  transition: all 0.25s ease;
  border-radius: 20px;
  font-weight: 500;
}

.buttons:hover {
  border-color: var(--accent-strong);
  background-color: var(--accent);
  color: #16151a;
}

/* === Таблица === */
.custom-table :deep(.ant-table) {
  background: transparent;
  color: var(--text-body);
}

.custom-table :deep(.ant-table-thead > tr > th) {
  background: var(--bg-elevated) !important;
  color: var(--accent) !important;
  font-family: 'Cormorant Garamond', serif;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.03em;
  border-bottom: 1px solid var(--border) !important;
}

.custom-table :deep(.ant-table-thead > tr > th)::before {
  display: none;
}

.custom-table :deep(.ant-table-tbody > tr > td) {
  background: transparent;
  color: var(--text-body);
  border-bottom: 1px solid var(--border-soft) !important;
  height: 68px !important;
  padding: 4px 8px !important;
  vertical-align: middle !important;
}

.custom-table :deep(.ant-table-tbody > tr:hover > td) {
  background: rgba(200, 183, 137, 0.06) !important;
}

.custom-table :deep(.ant-table-placeholder .ant-table-cell) {
  background: transparent;
  color: var(--text-faint);
}

.custom-table :deep(.ant-empty-description) {
  color: var(--text-faint);
}

.custom-table :deep(.ant-checkbox-inner) {
  background: var(--bg-elevated);
  border-color: var(--text-faint);
}

.custom-table :deep(.ant-checkbox-checked .ant-checkbox-inner) {
  background: var(--accent);
  border-color: var(--accent);
}

.custom-table :deep(.ant-table-column-sorter) {
  color: var(--text-faint);
}

.custom-table :deep(.ant-spin-dot-item) {
  background: var(--accent);
}

.desc-col {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-muted);
}

/* === Превью === */
.preview-img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

.img-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  border: 1px dashed var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--text-dim);
  background: var(--card-bg);
}

/* === Статус-пилюли === */
.status-pill {
  display: inline-block;
  padding: 3px 10px;
  font-size: 11px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  border-radius: 20px;
  font-weight: 600;
}

.status-available {
  background: var(--status-available-bg);
  color: var(--status-available-fg);
  border: 1px solid var(--status-available-border);
}

.status-sold {
  background: var(--status-sold-bg);
  color: var(--status-sold-fg);
  border: 1px solid var(--status-sold-border);
}

.status-default {
  background: var(--status-default-bg);
  color: var(--status-default-fg);
  border: 1px solid var(--status-default-border);
}

/* === Действия === */
.edit-btn {
  color: var(--accent) !important;
}

.edit-btn:hover {
  color: var(--accent-strong) !important;
}

.custom-table :deep(.ant-btn-text.ant-btn-dangerous) {
  color: #f09090;
}

.custom-table :deep(.ant-btn-text.ant-btn-dangerous:hover) {
  color: #f5b3b3;
}
</style>
