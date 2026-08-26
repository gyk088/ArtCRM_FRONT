<template>
  <div class="pictures-page">
    <div class="header-content">
      <h3>Мои работы</h3>
    </div>

    <div class="filters-panel">
      <div class="filters-left">
        <a-select v-model:value="filterArtist" placeholder="Художник" allowClear style="width: 200px"
          :options="artistOptions" />
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
          Создать ссылку
        </a-button>
        <a-button class="buttons" type="primary" @click="openEditPage()">Добавить</a-button>
      </div>
    </div>

    <!-- Таблица -->
    <a-table class="custom-table" :columns="columns" :data-source="filteredData" row-key="id"
      :row-selection="rowSelection" :loading="loading" table-layout="fixed" :custom-row="customRow">
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'avatar'">
          <img v-if="record.avatar && record.avatar.url" :src="record.avatar.url" class="preview-img clickable-cell" @click.stop="openPreview(record)" />
          <div v-else class="img-placeholder clickable-cell" @click.stop="openPreview(record)">
            <PictureOutlined />
          </div>
        </template>
        <template v-else-if="column.dataIndex === 'name'">
          <span class="name-cell clickable-cell cell-clamp" @click.stop="openPreview(record)">{{ record.name }}</span>
          <span v-if="record.imported" class="imported-pill" title="Добавлено из импортированной ссылки">
            <ImportOutlined />
            Импорт
          </span>
        </template>
        <template v-else-if="column.dataIndex === 'artist'">
          <span class="cell-clamp">{{ getArtistName(record.artist) }}</span>
        </template>
        <template v-else-if="column.dataIndex === 'seria'">
          <span class="cell-clamp">{{ getSeriaName(record.seria) }}</span>
        </template>
        <template v-else-if="column.dataIndex === 'media'">
          <span class="cell-clamp">{{ getMediaName(record.media) }}</span>
        </template>
        <template v-else-if="column.dataIndex === 'status'">
          <a-dropdown :trigger="['click']" @click.stop>
            <span
              class="status-pill status-pill-editable"
              :class="[statusPillClass(record.status), { 'status-pill-updating': updatingStatusId === record.id }]"
              @click.stop
            >
              {{ getStatusName(record.status) || 'Не указан' }}
            </span>
            <template #overlay>
              <a-menu @click="({ key }) => handleStatusChange(record, key)">
                <a-menu-item v-for="status in statusOptions" :key="status.value">
                  {{ status.label }}
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </template>
        <template v-else-if="column.dataIndex === 'location'">
          <span class="cell-clamp">{{ getLocationName(record.location) }}</span>
        </template>
        <template v-else-if="column.dataIndex === 'price'">
          <span v-if="record.price" class="cell-clamp">{{ record.price }} {{ getCurrencySymbol(record.currency) }}</span>
        </template>
        <template v-else-if="column.dataIndex === 'actions'">
          <button class="icon-btn icon-btn-edit" title="Редактировать" @click.stop="openEditPage(record)">
            <EditOutlined />
          </button>
          <button
            class="icon-btn icon-btn-certificate"
            title="Сгенерировать сертификат"
            @click.stop="openCertificatePreview(record)"
          >
            <SafetyCertificateOutlined />
          </button>
          <button class="icon-btn icon-btn-danger" title="Удалить" @click.stop="deleteRow(record.id)">
            <DeleteOutlined />
          </button>
        </template>
        <template v-else>
          <span class="cell-clamp">{{ record[column.dataIndex] }}</span>
        </template>
      </template>
    </a-table>

    <!-- Быстрый просмотр работы (без редактирования) -->
    <a-drawer v-model:open="isPreviewOpen" title="Просмотр работы" placement="right" width="700px" destroyOnClose>
      <div v-if="previewWork" class="work-preview">
        <div class="preview-cover">
          <img v-if="previewWork.avatar && previewWork.avatar.url" :src="previewWork.avatar.url" />
          <div v-else class="preview-cover-placeholder">
            <PictureOutlined />
          </div>
        </div>

        <div class="preview-heading">
          <h3 class="preview-name">{{ previewWork.name || 'Без названия' }}</h3>
          <span v-if="getStatusName(previewWork.status)" class="status-pill" :class="statusPillClass(previewWork.status)">
            {{ getStatusName(previewWork.status) }}
          </span>
        </div>

        <p v-if="previewWork.description" class="preview-description">{{ previewWork.description }}</p>

        <div class="preview-fields">
          <div v-if="getArtistName(previewWork.artist)" class="preview-field">
            <span class="preview-field-label">Художник</span>
            <span class="preview-field-value">{{ getArtistName(previewWork.artist) }}</span>
          </div>
          <div v-if="previewWork.technique" class="preview-field">
            <span class="preview-field-label">Техника</span>
            <span class="preview-field-value">{{ previewWork.technique }}</span>
          </div>
          <div v-if="previewWork.size" class="preview-field">
            <span class="preview-field-label">Размер</span>
            <span class="preview-field-value">{{ previewWork.size }}</span>
          </div>
          <div v-if="previewWork.year" class="preview-field">
            <span class="preview-field-label">Год</span>
            <span class="preview-field-value">{{ previewWork.year }}</span>
          </div>
          <div v-if="getMediaName(previewWork.media)" class="preview-field">
            <span class="preview-field-label">Медиа</span>
            <span class="preview-field-value">{{ getMediaName(previewWork.media) }}</span>
          </div>
          <div v-if="getSeriaName(previewWork.seria)" class="preview-field">
            <span class="preview-field-label">Серия</span>
            <span class="preview-field-value">{{ getSeriaName(previewWork.seria) }}</span>
          </div>
          <div v-if="getLocationName(previewWork.location)" class="preview-field">
            <span class="preview-field-label">Локация</span>
            <span class="preview-field-value">{{ getLocationName(previewWork.location) }}</span>
          </div>
          <div v-if="previewWork.price" class="preview-field">
            <span class="preview-field-label">Стоимость</span>
            <span class="preview-field-value">{{ previewWork.price }} {{ getCurrencySymbol(previewWork.currency) }}</span>
          </div>
        </div>

        <a-button type="primary" block class="preview-edit-btn" @click="openEditPage(previewWork)">
          <template #icon><EditOutlined /></template>
          Редактировать
        </a-button>
      </div>
    </a-drawer>

    <CertificatePreviewModal
      v-model:open="isCertPreviewOpen"
      :work="certPreviewWork"
      :artist-name="certPreviewWork ? getArtistName(certPreviewWork.artist) : ''"
      :seria-name="certPreviewWork ? getSeriaName(certPreviewWork.seria) : ''"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { PictureOutlined, EditOutlined, DeleteOutlined, ImportOutlined, SafetyCertificateOutlined } from '@ant-design/icons-vue'
import { Modal, message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import CertificatePreviewModal from '@/components/CertificatePreviewModal.vue'
import { useArtWork } from '@/stores/artWork.js'
import { useMedia } from '@/stores/media.js'
import { useSerias } from '@/stores/seria.js'
import { useStatuses } from '@/stores/statuses.js'
import { useLocations } from '@/stores/locations.js'
import { useArtist } from '@/stores/artist.js'
import { useFile } from "@/stores/file.js"
import { getUser } from '@/services/auth.js'
import { ROLES } from '@/services/const'

const fileStore = useFile()
if (!fileStore.files.length) {
  fileStore.getAllFiles() // Загружаем файлы при открытии страницы
}

const artWorkStore = useArtWork()
const mediaStore = useMedia()
const seriasStore = useSerias()
const statusesStore = useStatuses()
const locationsStore = useLocations()
const artistStore = useArtist()

const router = useRouter()
const loading = ref(false)
const selectedRowKeys = ref([])

// Быстрый просмотр работы (drawer справа, без редактирования)
const isPreviewOpen = ref(false)
const previewWork = ref(null)

const openPreview = (record) => {
  previewWork.value = record
  isPreviewOpen.value = true
}
const filterArtist = ref(null)
const filterLocation = ref(null)
const filterSeria = ref(null)
const filterMedia = ref(null)
const filterStatus = ref(null)


// Хранилища для маппинга ID -> название
const artistMap = ref({})
const seriaMap = ref({})
const mediaMap = ref({})
const statusMap = ref({})
const locationMap = ref({})

// Функции для получения названий по ID (с кешированием)
const getArtistName = (artistId) => {
  if (!artistId) return ''
  if (artistMap.value[artistId]) return artistMap.value[artistId]

  const artist = artistStore.listArtists.find(a => a.id === artistId)
  if (artist) {
    artistMap.value[artistId] = artist.name
    return artist.name
  }
  return artistId
}

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

const CURRENCY_SYMBOLS = { RUB: '₽', BYN: 'Br', USD: '$', EUR: '€' }
const getCurrencySymbol = (currency) => CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS.RUB

// Загрузка всех справочников
const loadDirectories = async () => {
  try {
    await Promise.all([
      mediaStore.getListMedia(),
      seriasStore.getListSerias(),
      statusesStore.getListStatuses(),
      locationsStore.getListLocations(),
      artistStore.getListArtists()
    ])

    // Заполняем карты для быстрого доступа
    artistStore.listArtists.forEach(a => { artistMap.value[a.id] = a.name })
    seriasStore.listSerias.forEach(s => { seriaMap.value[s.id] = s.name })
    mediaStore.listMedia.forEach(m => { mediaMap.value[m.id] = m.name })
    statusesStore.listStatuses.forEach(s => { statusMap.value[s.id] = s.name })
    locationsStore.listLocations.forEach(l => { locationMap.value[l.id] = l.name })
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
const artistOptions = computed(() => {
  return artistStore.listArtists.map(artist => ({
    label: artist.name,
    value: artist.id
  }))
})

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

  if (filterArtist.value) {
    result = result.filter(item => item.artist === filterArtist.value)
  }

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

// Для роли "художник" колонка "Художник" избыточна — там всегда сам
// пользователь (см. EditWork/index.vue), поэтому в таблице её скрываем.
const isArtistRole = computed(() => getUser()?.role === ROLES.ARTIST)

// Колонки таблицы — порядок полей соответствует форме EditWork
// (Название → Художник → Техника/Год → Описание → Город/Серия → Медиа/Статус → Стоимость)
// Ширины в процентах в сумме дают 100%, чтобы таблица всегда помещалась
// по ширине контейнера без горизонтальной прокрутки (table-layout: fixed).
const columns = computed(() => [
  { title: ' ', dataIndex: 'avatar', key: 'avatar', width: '6%' },
  { title: 'Название', dataIndex: 'name', key: 'name', width: isArtistRole.value ? '21%' : '12%', sorter: (a, b) => (a.name || '').localeCompare(b.name || '', 'ru') },
  ...(isArtistRole.value ? [] : [
    { title: 'Художник', dataIndex: 'artist', key: 'artist', width: '9%', sorter: (a, b) => getArtistName(a.artist).localeCompare(getArtistName(b.artist), 'ru') },
  ]),
  { title: 'Техника', dataIndex: 'technique', key: 'technique', width: '8%', sorter: (a, b) => (a.technique || '').localeCompare(b.technique || '', 'ru') },
  { title: 'Размер', dataIndex: 'size', key: 'size', width: '8%', sorter: (a, b) => (a.size || '').localeCompare(b.size || '', 'ru') },
  { title: 'Год', dataIndex: 'year', key: 'year', width: '5%', sorter: (a, b) => a.year - b.year },
  { title: 'Медиа', dataIndex: 'media', key: 'media', width: '8%', sorter: (a, b) => getMediaName(a.media).localeCompare(getMediaName(b.media), 'ru') },
  { title: 'Серия', dataIndex: 'seria', key: 'seria', width: '7%', sorter: (a, b) => getSeriaName(a.seria).localeCompare(getSeriaName(b.seria), 'ru') },
  { title: 'Локация', dataIndex: 'location', key: 'location', width: '8%', sorter: (a, b) => getLocationName(a.location).localeCompare(getLocationName(b.location), 'ru') },
  { title: 'Статус', dataIndex: 'status', key: 'status', width: '10%', sorter: (a, b) => getStatusName(a.status).localeCompare(getStatusName(b.status), 'ru') },
  { title: 'Стоимость', dataIndex: 'price', key: 'price', width: '9%', sorter: (a, b) => a.price - b.price },
  { title: 'Действия', dataIndex: 'actions', key: 'actions', width: '11%' },
])

// Открытие страницы редактирования
const openEditPage = (record) => {
  if (record && record.id) {
    router.push({ name: 'edit-work', params: { id: record.id } })
  } else {
    router.push({ name: 'edit-work', params: { id: 'new' } })
  }
}

// Клик по строке таблицы целиком — открывает боковую панель просмотра,
// кроме кликов по чекбоксу выбора и кнопкам действий
const customRow = (record) => {
  return {
    class: 'clickable-row',
    onClick: (event) => {
      if (event.target.closest('.ant-checkbox-wrapper') || event.target.closest('button') || event.target.closest('.ant-dropdown-trigger')) return
      openPreview(record)
    }
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

// Предпросмотр и генерация сертификата подлинности работы (PDF)
const isCertPreviewOpen = ref(false)
const certPreviewWork = ref(null)

const openCertificatePreview = (record) => {
  certPreviewWork.value = record
  isCertPreviewOpen.value = true
}

// Смена статуса работы прямо из таблицы
const updatingStatusId = ref(null)

const handleStatusChange = async (record, statusId) => {
  if (statusId === record.status || updatingStatusId.value) return

  updatingStatusId.value = record.id
  try {
    await artWorkStore.patchArtWork(record.id, { status: statusId })
  } finally {
    updatingStatusId.value = null
  }
}

// Выбранные строки
const rowSelection = {
  onChange: (selectedKeys) => {
    selectedRowKeys.value = selectedKeys
    console.log('Выбранные строки:', selectedKeys)
  },
}

const createCollection = () => {
  router.push({
    name: 'edit-collection',
    params: { id: 'new' },
    query: { works: selectedRowKeys.value.join(',') }
  })
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
  padding: 24px 12px 8px;
  margin-left: -16px;
  margin-right: -16px;
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
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 12px;
}

.filters-left {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.filters-right {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
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
  min-height: 68px !important;
  padding: 4px 8px !important;
  vertical-align: middle !important;
}

/* Текст переносится максимум на 2 строки, дальше — многоточие */
.cell-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
  line-height: 1.3;
}

.custom-table :deep(.ant-table-tbody > tr:hover > td) {
  background: rgba(200, 183, 137, 0.06) !important;
}

.custom-table :deep(.clickable-row) {
  cursor: pointer;
}

.imported-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--text-faint);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 20px;
  vertical-align: middle;
}

.custom-table :deep(.ant-table-placeholder .ant-table-cell) {
  background: transparent;
  color: var(--text-faint);
}

.custom-table :deep(.ant-empty-description) {
  color: var(--text-faint);
}

.custom-table :deep(.ant-pagination-item) {
  border-color: var(--border);
  background: var(--bg-elevated);
}

.custom-table :deep(.ant-pagination-item a) {
  color: var(--text-body);
}

.custom-table :deep(.ant-pagination-item-active) {
  border-color: var(--accent) !important;
  background: var(--bg-elevated);
}

.custom-table :deep(.ant-pagination-item-active a) {
  color: var(--accent) !important;
}

.custom-table :deep(.ant-pagination-item:hover) {
  border-color: var(--accent) !important;
}

.custom-table :deep(.ant-pagination-item:hover a) {
  color: var(--accent) !important;
}

.custom-table :deep(.ant-pagination-prev .ant-pagination-item-link),
.custom-table :deep(.ant-pagination-next .ant-pagination-item-link) {
  color: var(--text-muted);
  border-color: var(--border);
  background: var(--bg-elevated);
}

.custom-table :deep(.ant-pagination-prev:hover .ant-pagination-item-link),
.custom-table :deep(.ant-pagination-next:hover .ant-pagination-item-link) {
  color: var(--accent);
  border-color: var(--accent);
}

.custom-table :deep(.ant-checkbox-inner) {
  background: var(--bg-elevated);
  border-color: var(--text-faint);
}

.custom-table :deep(.ant-checkbox-checked .ant-checkbox-inner) {
  background: var(--accent);
  border-color: var(--accent);
}

.custom-table :deep(.ant-checkbox-wrapper:hover .ant-checkbox-inner),
.custom-table :deep(.ant-checkbox:hover .ant-checkbox-inner),
.custom-table :deep(.ant-checkbox-input:focus + .ant-checkbox-inner) {
  border-color: var(--accent);
}

.custom-table :deep(.ant-checkbox-checked::after) {
  border-color: var(--accent);
}

.custom-table :deep(.ant-checkbox-indeterminate .ant-checkbox-inner) {
  background: var(--bg-elevated);
  border-color: var(--accent);
}

.custom-table :deep(.ant-checkbox-indeterminate .ant-checkbox-inner::after) {
  background-color: var(--accent);
}

.custom-table :deep(.ant-table-tbody > tr.ant-table-row-selected > td) {
  background: rgba(138, 109, 47, 0.1);
}

.custom-table :deep(.ant-table-tbody > tr.ant-table-row-selected:hover > td) {
  background: rgba(138, 109, 47, 0.16);
}

.custom-table :deep(.ant-table-column-sorter) {
  color: var(--text-faint);
}

.custom-table :deep(.ant-spin-dot-item) {
  background: var(--accent);
}

.desc-col {
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

.status-pill-editable {
  cursor: pointer;
  transition: opacity 0.15s ease, box-shadow 0.15s ease;
}

.status-pill-editable:hover {
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.06);
}

.status-pill-updating {
  opacity: 0.5;
  pointer-events: none;
}

/* Меню статуса рендерится в body (teleport), поэтому :global(), а не :deep() */
:global(.ant-dropdown-menu-item:hover) {
  background: rgba(138, 109, 47, 0.1) !important;
  color: #6f581f !important;
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
.icon-btn {
  border: none;
  background: none;
  color: var(--text-faint);
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  transition: all 0.15s ease;
}

.icon-btn + .icon-btn {
  margin-left: 4px;
}

.icon-btn:hover {
  background: var(--card-bg);
}

.icon-btn-edit {
  color: var(--accent);
}

.icon-btn-edit:hover {
  background: var(--status-default-bg);
  color: var(--accent-strong);
}

.icon-btn-danger {
  color: var(--status-sold-fg);
}

.icon-btn-danger:hover {
  background: var(--status-sold-bg);
  color: #8f2c2c;
}

.icon-btn-certificate {
  color: var(--text-muted);
}

.icon-btn-certificate:hover {
  background: var(--status-available-bg);
  color: var(--status-available-fg);
}

.icon-btn:disabled {
  cursor: default;
  opacity: 0.6;
}

/* === Клик по названию/картинке — открывает превью === */
.clickable-cell {
  cursor: pointer;
}

.name-cell:hover {
  color: var(--accent);
  text-decoration: underline;
}

/* === Быстрый просмотр работы === */
.work-preview {
  display: flex;
  flex-direction: column;
}

.preview-cover {
  width: 100%;
  max-width: 320px;
  aspect-ratio: 1 / 1;
  margin: 0 auto 20px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--card-bg);
  border: 1px solid var(--border);
}

.preview-cover img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.preview-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: var(--text-dim);
}

.preview-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.preview-name {
  font-family: 'Cormorant Garamond', serif;
  font-size: 22px;
  font-weight: 600;
  color: var(--text-title);
  margin: 0;
}

.preview-description {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-muted);
  margin: 0 0 20px;
}

.preview-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

.preview-field {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-soft);
  font-size: 13px;
}

.preview-field-label {
  color: var(--text-faint);
}

.preview-field-value {
  color: var(--text-body);
  font-weight: 500;
  text-align: right;
}

.preview-edit-btn {
  background: var(--accent);
  border-color: var(--accent);
}

.preview-edit-btn:hover {
  background: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
}
</style>
