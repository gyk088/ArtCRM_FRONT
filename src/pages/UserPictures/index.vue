<template>
  <div class="pictures-page">
    <div class="header-content">
      <MobileMenuButton />
      <h3>Мои работы</h3>
      <span v-if="isBackgroundRefreshing" class="refreshing-badge">
        <LoadingOutlined spin />
        Обновление списка…
      </span>

      <div class="header-actions">
        <a-button class="buttons" type="primary" v-if="selectedRowKeys.length > 0" @click="createCollection">
          Создать ссылку
        </a-button>
        <a-button class="buttons" type="primary" @click="openEditPage()">Добавить</a-button>
      </div>
    </div>

    <div class="filters-panel">
      <div class="filters-left">
        <a-input v-model:value="filterNameSearch" placeholder="Поиск по названию" allowClear class="name-search"
          style="width: 220px">
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-select v-model:value="filterArtist" mode="multiple" placeholder="Художник" allowClear style="width: 200px"
          max-tag-count="responsive" :options="artistOptions" />
        <a-select v-model:value="filterLocation" mode="multiple" placeholder="Локация" allowClear style="width: 200px"
          max-tag-count="responsive" :options="locationOptions" />
        <a-select v-model:value="filterSeria" mode="multiple" placeholder="Серия" allowClear style="width: 200px"
          max-tag-count="responsive" :options="seriaOptions" />
        <a-select v-model:value="filterMedia" mode="multiple" placeholder="Медиа" allowClear style="width: 200px"
          max-tag-count="responsive" :options="mediaFilterOptions" />
        <a-select v-model:value="filterStatus" mode="multiple" placeholder="Статус" allowClear style="width: 200px"
          max-tag-count="responsive" :options="statusOptions" />
        <a-input-number v-model:value="filterPriceFrom" placeholder="Цена от" :min="0" style="width: 120px" />
        <a-input-number v-model:value="filterPriceTo" placeholder="Цена до" :min="0" style="width: 120px" />
      </div>
    </div>

    <div class="selected-count">Выбрано работ: {{ selectedRowKeys.length }}</div>

    <!-- Первая загрузка (кэша ещё нет) — явный, понятный лоадер вместо
         пустой таблицы/сетки, особенно заметно на больших каталогах. -->
    <div v-if="isFirstLoad" class="first-load-state">
      <LoadingOutlined class="first-load-spinner" spin />
      <p class="first-load-text">Загружаем ваши работы…</p>
      <p class="first-load-hint">Это может занять немного времени, если работ много</p>
    </div>

    <!-- Мобильная сетка карточек вместо таблицы -->
    <a-spin v-else-if="isMobile" :spinning="loading">
      <div class="cards-grid">
        <div v-for="record in filteredData" :key="record.id" class="work-card" @click="openPreview(record)">
          <label class="work-card-select" @click.stop>
            <a-checkbox
              :checked="selectedRowKeys.includes(record.id)"
              @change="(e) => toggleCardSelect(record.id, e.target.checked)"
            />
          </label>

          <div class="work-card-image">
            <img v-if="record.avatar && record.avatar.url" :src="record.avatar.url" />
            <div v-else class="img-placeholder">
              <PictureOutlined />
            </div>
          </div>

          <div class="work-card-body">
            <div class="work-card-name">{{ record.name || 'Без названия' }}</div>
            <div class="work-card-artist">{{ getArtistName(record.artist) || 'Не указан' }}</div>
            <div v-if="record.price" class="work-card-price">{{ record.price }} {{ getCurrencySymbol(record.currency) }}</div>
          </div>

          <div class="work-card-actions" @click.stop>
            <button class="icon-btn icon-btn-edit" title="Редактировать" @click="openEditPage(record)">
              <EditOutlined />
            </button>
            <button class="icon-btn icon-btn-certificate" title="Сгенерировать сертификат" @click="openCertificatePreview(record)">
              <SafetyCertificateOutlined />
            </button>
            <button class="icon-btn icon-btn-danger" title="Удалить" @click="deleteRow(record.id)">
              <DeleteOutlined />
            </button>
          </div>
        </div>

        <div v-if="!loading && filteredData.length === 0" class="cards-empty">Работы не найдены</div>
      </div>
    </a-spin>

    <!-- Таблица (десктоп) — без пагинации и без a-table: своя вёрстка на CSS
         Grid + виртуализация строк (@tanstack/vue-virtual), т.к. a-table в
         ant-design-vue не умеет виртуальный скролл ни в одной версии —
         при сотнях/тысячах работ рендерить все строки в DOM разом слишком
         дорого. В DOM всегда только видимые строки + небольшой overscan. -->
    <div v-else class="virtual-table-wrap">
      <div class="vt-header" :style="{ gridTemplateColumns }">
        <div class="vt-th vt-th-select">
          <a-checkbox
            :checked="allSelected"
            :indeterminate="someSelected"
            @change="e => toggleSelectAll(e.target.checked)"
          />
        </div>
        <div
          v-for="col in columns"
          :key="col.key"
          class="vt-th"
          :class="{ 'vt-th-sortable': col.sorter }"
          @click="col.sorter && toggleSort(col.key)"
        >
          {{ col.title }}
          <span v-if="col.sorter" class="vt-sort-icons">
            <CaretUpOutlined :class="{ 'vt-sort-icon-active': sortState.key === col.key && sortState.order === 'ascend' }" />
            <CaretDownOutlined :class="{ 'vt-sort-icon-active': sortState.key === col.key && sortState.order === 'descend' }" />
          </span>
        </div>
      </div>

      <div ref="scrollContainerRef" class="vt-body">
        <div v-if="!loading && sortedData.length === 0" class="vt-empty">Работы не найдены</div>

        <div v-else :style="{ height: totalSize + 'px', position: 'relative' }">
          <div
            v-for="virtualRow in virtualItems"
            :key="sortedData[virtualRow.index].id"
            class="vt-row clickable-row"
            :class="{ 'vt-row-selected': selectedRowKeys.includes(sortedData[virtualRow.index].id) }"
            :style="{ gridTemplateColumns, height: virtualRow.size + 'px', transform: `translateY(${virtualRow.start}px)` }"
            @click="handleRowClick($event, sortedData[virtualRow.index])"
          >
            <div class="vt-td vt-td-select" @click.stop>
              <a-checkbox
                :checked="selectedRowKeys.includes(sortedData[virtualRow.index].id)"
                @change="e => toggleCardSelect(sortedData[virtualRow.index].id, e.target.checked)"
              />
            </div>

            <div v-for="col in columns" :key="col.key" class="vt-td">
              <template v-if="col.dataIndex === 'avatar'">
                <img v-if="sortedData[virtualRow.index].avatar && sortedData[virtualRow.index].avatar.url" :src="sortedData[virtualRow.index].avatar.url" class="preview-img clickable-cell" @click.stop="openPreview(sortedData[virtualRow.index])" />
                <div v-else class="img-placeholder clickable-cell" @click.stop="openPreview(sortedData[virtualRow.index])">
                  <PictureOutlined />
                </div>
              </template>
              <template v-else-if="col.dataIndex === 'name'">
                <span class="name-cell clickable-cell cell-clamp" @click.stop="openPreview(sortedData[virtualRow.index])">{{ sortedData[virtualRow.index].name }}</span>
                <span v-if="sortedData[virtualRow.index].imported" class="imported-pill" title="Добавлено из импортированной ссылки">
                  <ImportOutlined />
                  Импорт
                </span>
              </template>
              <template v-else-if="col.dataIndex === 'artist'">
                <a-dropdown :trigger="['click']" @click.stop>
                  <span
                    class="editable-cell cell-clamp"
                    :class="{ 'editable-cell-updating': isCellUpdating(sortedData[virtualRow.index], 'artist') }"
                    @click.stop
                  >
                    {{ getArtistName(sortedData[virtualRow.index].artist) || 'Не указан' }}
                  </span>
                  <template #overlay>
                    <a-menu @click="({ key }) => handleFieldChange(sortedData[virtualRow.index], 'artist', key)">
                      <a-menu-item v-for="artist in artistOptions" :key="artist.value">
                        {{ artist.label }}
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </template>
              <template v-else-if="col.dataIndex === 'seria'">
                <a-dropdown :trigger="['click']" @click.stop>
                  <span
                    class="editable-cell cell-clamp"
                    :class="{ 'editable-cell-updating': isCellUpdating(sortedData[virtualRow.index], 'seria') }"
                    @click.stop
                  >
                    {{ getSeriaName(sortedData[virtualRow.index].seria) || 'Не указана' }}
                  </span>
                  <template #overlay>
                    <a-menu @click="({ key }) => handleFieldChange(sortedData[virtualRow.index], 'seria', key)">
                      <a-menu-item v-for="seria in seriaOptions" :key="seria.value">
                        {{ seria.label }}
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </template>
              <template v-else-if="col.dataIndex === 'media'">
                <a-dropdown :trigger="['click']" @click.stop>
                  <span
                    class="editable-cell cell-clamp"
                    :class="{ 'editable-cell-updating': isCellUpdating(sortedData[virtualRow.index], 'media') }"
                    @click.stop
                  >
                    {{ getMediaName(sortedData[virtualRow.index].media) || 'Не указано' }}
                  </span>
                  <template #overlay>
                    <a-menu @click="({ key }) => handleFieldChange(sortedData[virtualRow.index], 'media', key)">
                      <a-menu-item v-for="media in mediaFilterOptions" :key="media.value">
                        {{ media.label }}
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </template>
              <template v-else-if="col.dataIndex === 'status'">
                <a-dropdown :trigger="['click']" @click.stop>
                  <span
                    class="status-pill status-pill-editable"
                    :class="[statusPillClass(sortedData[virtualRow.index].status), { 'status-pill-updating': isCellUpdating(sortedData[virtualRow.index], 'status') }]"
                    :style="getStatusColorStyle(sortedData[virtualRow.index].status)"
                    @click.stop
                  >
                    {{ getStatusName(sortedData[virtualRow.index].status) || 'Не указан' }}
                  </span>
                  <template #overlay>
                    <a-menu @click="({ key }) => handleFieldChange(sortedData[virtualRow.index], 'status', key)">
                      <a-menu-item v-for="status in statusOptions" :key="status.value">
                        {{ status.label }}
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </template>
              <template v-else-if="col.dataIndex === 'location'">
                <a-dropdown :trigger="['click']" @click.stop>
                  <span
                    class="editable-cell cell-clamp"
                    :class="{ 'editable-cell-updating': isCellUpdating(sortedData[virtualRow.index], 'location') }"
                    @click.stop
                  >
                    {{ getLocationName(sortedData[virtualRow.index].location) || 'Не указана' }}
                  </span>
                  <template #overlay>
                    <a-menu @click="({ key }) => handleFieldChange(sortedData[virtualRow.index], 'location', key)">
                      <a-menu-item v-for="location in locationOptions" :key="location.value">
                        {{ location.label }}
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </template>
              <template v-else-if="col.dataIndex === 'price'">
                <span v-if="sortedData[virtualRow.index].price" class="cell-clamp">{{ sortedData[virtualRow.index].price }} {{ getCurrencySymbol(sortedData[virtualRow.index].currency) }}</span>
              </template>
              <template v-else-if="col.dataIndex === 'actions'">
                <button class="icon-btn icon-btn-edit" title="Редактировать" @click.stop="openEditPage(sortedData[virtualRow.index])">
                  <EditOutlined />
                </button>
                <button
                  class="icon-btn icon-btn-certificate"
                  title="Сгенерировать сертификат"
                  @click.stop="openCertificatePreview(sortedData[virtualRow.index])"
                >
                  <SafetyCertificateOutlined />
                </button>
                <button class="icon-btn icon-btn-danger" title="Удалить" @click.stop="deleteRow(sortedData[virtualRow.index].id)">
                  <DeleteOutlined />
                </button>
              </template>
              <template v-else>
                <span class="cell-clamp">{{ sortedData[virtualRow.index][col.dataIndex] }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Быстрый просмотр работы (без редактирования) -->
    <a-drawer v-model:open="isPreviewOpen" placement="right" :width="isMobile ? '100%' : '700px'" destroyOnClose root-class-name="preview-drawer">
      <div v-if="previewWork" class="work-preview">
        <div class="preview-cover">
          <img v-if="previewWork.avatar && previewWork.avatar.url" :src="previewWork.avatar.url" />
          <div v-else class="preview-cover-placeholder">
            <PictureOutlined />
          </div>
        </div>

        <div class="preview-info">
          <div class="preview-artist">{{ getArtistName(previewWork.artist) || 'Не указан' }}</div>
          <div class="preview-title">
            {{ previewWork.name || 'Без названия' }}<template v-if="previewWork.year">, {{ previewWork.year }}</template>
          </div>

          <p v-if="previewWork.description" class="preview-description">{{ previewWork.description }}</p>

          <div class="preview-meta">
            <div v-if="previewWork.technique" class="preview-meta-line">{{ previewWork.technique }}</div>
            <div v-if="previewWork.size" class="preview-meta-line">{{ previewWork.size }}</div>
            <div v-if="getMediaName(previewWork.media)" class="preview-meta-line">{{ getMediaName(previewWork.media) }}</div>
            <div v-if="getSeriaName(previewWork.seria)" class="preview-meta-line">Серия: {{ getSeriaName(previewWork.seria) }}</div>
            <div v-if="getLocationName(previewWork.location)" class="preview-meta-line">Локация: {{ getLocationName(previewWork.location) }}</div>
          </div>

          <div
            v-if="getStatusName(previewWork.status)"
            class="preview-status"
            :style="{ color: getStatusTextColor(previewWork.status) }"
          >
            {{ getStatusName(previewWork.status) }}
          </div>

          <div v-if="previewWork.price" class="preview-price">
            {{ formatPrice(previewWork.price) }} {{ getCurrencySymbol(previewWork.currency) }}
          </div>

          <div v-if="showAuthorInfo" class="preview-authors">
            <div v-if="previewWork.createdBy" class="preview-meta-line">
              Создал: {{ formatPersonName(previewWork.createdBy) }}
            </div>
            <div v-if="previewWork.updatedBy && previewWork.updatedBy.id !== previewWork.createdBy?.id" class="preview-meta-line">
              Изменил: {{ formatPersonName(previewWork.updatedBy) }}
            </div>
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
import { storeToRefs } from 'pinia'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { PictureOutlined, EditOutlined, DeleteOutlined, ImportOutlined, SafetyCertificateOutlined, SearchOutlined, LoadingOutlined, CaretUpOutlined, CaretDownOutlined } from '@ant-design/icons-vue'
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
import { useUserPicturesFilters } from '@/stores/userPicturesFilters.js'
import { getUser } from '@/services/auth.js'
import { ROLES } from '@/services/const'
import { useIsMobile } from '@/composables/useIsMobile.js'
import MobileMenuButton from '@/components/MobileMenuButton.vue'

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

function formatPersonName(person) {
  if (!person) return ''
  return [person.name, person.surname].filter(Boolean).join(' ') || 'Пользователь'
}

// Показываем "Создал/Изменил" только там, где это действительно полезно —
// у своих собственных работ создатель и редактор всегда совпадают с самим
// собой, лишняя строка была бы просто шумом. Видно, когда работа пришла из
// общей галереи (см. AuthorizationService.gallerySharingScope на бэкенде)
// или когда её редактировал кто-то другой.
const showAuthorInfo = computed(() => {
  const w = previewWork.value
  if (!w) return false
  const viewerIsCreator = w.createdBy?.id === getUser()?.id
  const editedBySomeoneElse = w.updatedBy && w.createdBy && w.updatedBy.id !== w.createdBy.id
  return !viewerIsCreator || editedBySomeoneElse
})
// Фильтры хранятся в Pinia-сторе, а не в локальных ref, чтобы их значения
// сохранялись при уходе со страницы и возврате обратно (компонент
// пересоздаётся при каждой навигации, а стор — нет).
const filtersStore = useUserPicturesFilters()
const {
  artist: filterArtist,
  location: filterLocation,
  seria: filterSeria,
  media: filterMedia,
  status: filterStatus,
  priceFrom: filterPriceFrom,
  priceTo: filterPriceTo,
  nameSearch: filterNameSearch,
} = storeToRefs(filtersStore)


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
  // Если у статуса задан явный цвет — им и рулит getStatusColorStyle() через
  // инлайн-стиль; этот класс тогда нужен только как фолбэк для старых
  // статусов без цвета (эвристика по названию).
  const name = getStatusName(statusId).toLowerCase()
  if (name.includes('прода')) return 'status-sold'
  if (name.includes('налич') || name.includes('доступ')) return 'status-available'
  return 'status-default'
}

function hexToRgba(hex, alpha) {
  const clean = (hex || '').replace('#', '')
  if (clean.length !== 6) return null
  const bigint = parseInt(clean, 16)
  if (Number.isNaN(bigint)) return null
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Явный цвет статуса (задаётся в Справочнике) перекрывает эвристику по названию
function getStatusColorStyle(statusId) {
  const status = statusesStore.listStatuses.find(s => s.id === statusId)
  const color = status?.color
  if (!color) return {}

  return {
    background: hexToRgba(color, 0.12),
    color,
    borderColor: color,
  }
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
const formatPrice = (price) => Number(price).toLocaleString('ru-RU')

// Цвет статуса для текстового (не pill) отображения в детальном просмотре
function getStatusTextColor(statusId) {
  const status = statusesStore.listStatuses.find(s => s.id === statusId)
  if (status?.color) return status.color

  const cls = statusPillClass(statusId)
  if (cls === 'status-available') return 'var(--status-available-fg)'
  if (cls === 'status-sold') return 'var(--status-sold-fg)'
  return 'var(--status-default-fg)'
}

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
// Показываем крупный лоадер только когда данных ещё нет вообще (кэш пуст,
// т.е. самый первый визит) — если что-то уже есть (из localStorage-кэша),
// пока идёт фоновое обновление, достаточно небольшого индикатора в шапке.
const isFirstLoad = computed(() => loading.value && artWorkStore.listArtWorks.length === 0)
const isBackgroundRefreshing = computed(() => loading.value && artWorkStore.listArtWorks.length > 0)

const filteredData = computed(() => {
  let result = [...artWorkStore.listArtWorks]

  if (filterNameSearch.value.trim()) {
    const query = filterNameSearch.value.trim().toLowerCase()
    result = result.filter(item => (item.name || '').toLowerCase().includes(query))
  }

  if (filterArtist.value?.length) {
    result = result.filter(item => filterArtist.value.includes(item.artist))
  }

  if (filterLocation.value?.length) {
    result = result.filter(item => filterLocation.value.includes(item.location))
  }

  if (filterSeria.value?.length) {
    result = result.filter(item => filterSeria.value.includes(item.seria))
  }

  if (filterMedia.value?.length) {
    result = result.filter(item => filterMedia.value.includes(item.media))
  }

  if (filterStatus.value?.length) {
    result = result.filter(item => filterStatus.value.includes(item.status))
  }

  if (filterPriceFrom.value != null) {
    result = result.filter(item => Number(item.price) >= filterPriceFrom.value)
  }

  if (filterPriceTo.value != null) {
    result = result.filter(item => Number(item.price) <= filterPriceTo.value)
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
  { title: 'Название', dataIndex: 'name', key: 'name', width: isArtistRole.value ? '24%' : '16%', sorter: (a, b) => (a.name || '').localeCompare(b.name || '', 'ru') },
  ...(isArtistRole.value ? [] : [
    { title: 'Художник', dataIndex: 'artist', key: 'artist', width: '9%', sorter: (a, b) => getArtistName(a.artist).localeCompare(getArtistName(b.artist), 'ru') },
  ]),
  { title: 'Техника', dataIndex: 'technique', key: 'technique', width: '8%', sorter: (a, b) => (a.technique || '').localeCompare(b.technique || '', 'ru') },
  { title: 'Размер', dataIndex: 'size', key: 'size', width: '8%', sorter: (a, b) => (a.size || '').localeCompare(b.size || '', 'ru') },
  { title: 'Год', dataIndex: 'year', key: 'year', width: '5%', sorter: (a, b) => a.year - b.year },
  { title: 'Медиа', dataIndex: 'media', key: 'media', width: '8%', sorter: (a, b) => getMediaName(a.media).localeCompare(getMediaName(b.media), 'ru') },
  { title: 'Серия', dataIndex: 'seria', key: 'seria', width: '7%', sorter: (a, b) => getSeriaName(a.seria).localeCompare(getSeriaName(b.seria), 'ru') },
  { title: 'Локация', dataIndex: 'location', key: 'location', width: '8%', sorter: (a, b) => getLocationName(a.location).localeCompare(getLocationName(b.location), 'ru') },
  { title: 'Статус', dataIndex: 'status', key: 'status', width: '9%', sorter: (a, b) => getStatusName(a.status).localeCompare(getStatusName(b.status), 'ru') },
  { title: 'Стоимость', dataIndex: 'price', key: 'price', width: '9%', sorter: (a, b) => a.price - b.price },
  { title: 'Действия', dataIndex: 'actions', key: 'actions', width: '8%' },
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
const handleRowClick = (event, record) => {
  if (event.target.closest('.ant-checkbox-wrapper') || event.target.closest('button') || event.target.closest('.ant-dropdown-trigger')) return
  openPreview(record)
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

// Смена справочного поля (статус, художник, серия, медиа, локация) прямо из таблицы
const updatingCell = ref({ id: null, field: null })

const isCellUpdating = (record, field) => updatingCell.value.id === record.id && updatingCell.value.field === field

const handleFieldChange = async (record, field, value) => {
  if (value === record[field] || isCellUpdating(record, field)) return

  updatingCell.value = { id: record.id, field }
  try {
    await artWorkStore.patchArtWork(record.id, { [field]: value })
  } finally {
    updatingCell.value = { id: null, field: null }
  }
}

// Выбранные строки — выбор всегда хранится по id (а не по индексу/ссылке),
// поэтому переживает фильтрацию/сортировку, пока пользователь сам не снимет
// галочку (аналог preserveSelectedRowKeys у прежнего a-table).
const allSelected = computed(() => sortedData.value.length > 0 && sortedData.value.every(r => selectedRowKeys.value.includes(r.id)))
const someSelected = computed(() => !allSelected.value && sortedData.value.some(r => selectedRowKeys.value.includes(r.id)))

function toggleSelectAll(checked) {
  const idsInView = sortedData.value.map(r => r.id)
  if (checked) {
    selectedRowKeys.value = [...new Set([...selectedRowKeys.value, ...idsInView])]
  } else {
    selectedRowKeys.value = selectedRowKeys.value.filter(id => !idsInView.includes(id))
  }
}

const { isMobile } = useIsMobile()

// === Сортировка по клику на заголовок колонки (замена сортировки a-table) ===
// 3 состояния по клику на одну и ту же колонку: ascend -> descend -> сброс.
// Клик по другой колонке сразу выставляет ей ascend.
const sortState = ref({ key: null, order: null })

function toggleSort(key) {
  if (sortState.value.key !== key) {
    sortState.value = { key, order: 'ascend' }
    return
  }
  if (sortState.value.order === 'ascend') {
    sortState.value = { key, order: 'descend' }
  } else if (sortState.value.order === 'descend') {
    sortState.value = { key: null, order: null }
  } else {
    sortState.value = { key, order: 'ascend' }
  }
}

const sortedData = computed(() => {
  const { key, order } = sortState.value
  if (!key || !order) return filteredData.value

  const col = columns.value.find(c => c.key === key)
  if (!col?.sorter) return filteredData.value

  const sorted = [...filteredData.value].sort(col.sorter)
  return order === 'descend' ? sorted.reverse() : sorted
})

// === Виртуализация строк таблицы (@tanstack/vue-virtual) ===
// Ширины колонок в fr вместо % — так первая (фиксированная 40px) колонка
// чекбокса не ломает раскладку остальных: они просто делят оставшееся
// место пропорционально прежним процентным весам.
const ROW_HEIGHT = 68
const scrollContainerRef = ref(null)

const gridTemplateColumns = computed(() => {
  const fr = columns.value.map(c => `${parseFloat(c.width) || 1}fr`).join(' ')
  return `40px ${fr}`
})

const rowVirtualizer = useVirtualizer(computed(() => ({
  count: sortedData.value.length,
  getScrollElement: () => scrollContainerRef.value,
  estimateSize: () => ROW_HEIGHT,
  overscan: 10,
})))

const virtualItems = computed(() => rowVirtualizer.value.getVirtualItems())
const totalSize = computed(() => rowVirtualizer.value.getTotalSize())

function toggleCardSelect(id, checked) {
  if (checked) {
    if (!selectedRowKeys.value.includes(id)) selectedRowKeys.value = [...selectedRowKeys.value, id]
  } else {
    selectedRowKeys.value = selectedRowKeys.value.filter(key => key !== id)
  }
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
  padding: 24px 20px 8px;
  margin-left: -16px;
  margin-right: -16px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 10px;
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

.refreshing-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--accent-strong);
  background: rgba(138, 109, 47, 0.1);
  border-radius: 999px;
}

.header-actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
  flex-shrink: 0;
}

.first-load-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 80px 20px;
  text-align: center;
}

.first-load-spinner {
  font-size: 36px;
  color: var(--accent);
  margin-bottom: 8px;
}

.first-load-text {
  margin: 0;
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-title);
}

.first-load-hint {
  margin: 0;
  font-size: 13px;
  color: var(--text-faint);
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

.selected-count {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
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

.filters-left :deep(.ant-input-number) {
  background: var(--bg-elevated) !important;
  border-color: var(--border) !important;
  border-radius: 20px !important;
  overflow: hidden;
}

.filters-left :deep(.ant-input-number-input) {
  color: var(--text-body) !important;
}

.filters-left :deep(.ant-input-number-handler-wrap) {
  border-radius: 0 20px 20px 0;
}

.filters-left :deep(.ant-input-number:hover) {
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

/* === Таблица (собственная вёрстка на CSS Grid + виртуализация строк) === */
.virtual-table-wrap {
  background: var(--bg-elevated);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.vt-header {
  display: grid;
  align-items: center;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
}

.vt-th {
  padding: 10px 8px;
  font-family: 'Cormorant Garamond', serif;
  color: var(--accent);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.03em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: none;
}

.vt-th-select {
  display: flex;
  align-items: center;
  justify-content: center;
}

.vt-th-sortable {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.vt-sort-icons {
  display: inline-flex;
  flex-direction: column;
  font-size: 9px;
  line-height: 0.7;
  color: var(--text-dim);
}

.vt-sort-icon-active {
  color: var(--accent);
}

.vt-body {
  height: 65vh;
  min-height: 420px;
  overflow-y: auto;
}

.vt-row {
  display: grid;
  align-items: center;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  border-bottom: 1px solid var(--border-soft);
  cursor: pointer;
}

.vt-row:hover {
  background: rgba(200, 183, 137, 0.06);
}

.vt-row-selected {
  background: rgba(138, 109, 47, 0.1);
}

.vt-row-selected:hover {
  background: rgba(138, 109, 47, 0.16);
}

.vt-td {
  padding: 4px 8px;
  overflow: hidden;
}

.vt-td-select {
  display: flex;
  align-items: center;
  justify-content: center;
}

.vt-empty {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-faint);
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

.virtual-table-wrap :deep(.ant-checkbox-inner) {
  background: var(--bg-elevated);
  border-color: var(--text-faint);
}

.virtual-table-wrap :deep(.ant-checkbox-checked .ant-checkbox-inner) {
  background: var(--accent);
  border-color: var(--accent);
}

.virtual-table-wrap :deep(.ant-checkbox-wrapper:hover .ant-checkbox-inner),
.virtual-table-wrap :deep(.ant-checkbox:hover .ant-checkbox-inner),
.virtual-table-wrap :deep(.ant-checkbox-input:focus + .ant-checkbox-inner) {
  border-color: var(--accent);
}

.virtual-table-wrap :deep(.ant-checkbox-checked::after) {
  border-color: var(--accent);
}

.virtual-table-wrap :deep(.ant-checkbox-indeterminate .ant-checkbox-inner) {
  background: var(--bg-elevated);
  border-color: var(--accent);
}

.virtual-table-wrap :deep(.ant-checkbox-indeterminate .ant-checkbox-inner::after) {
  background-color: var(--accent);
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

/* === Редактируемые справочные поля (художник/серия/медиа/локация) === */
.editable-cell {
  cursor: pointer;
  border-radius: 6px;
  padding: 2px 4px;
  margin: -2px -4px;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.editable-cell:hover {
  background: var(--card-bg);
  color: var(--accent);
}

.editable-cell-updating {
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
  margin-left: 2px;
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
  max-width: 460px;
  aspect-ratio: 1 / 1;
  margin: 0 auto 24px;
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

.preview-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 6px;
}

.preview-artist {
  font-family: 'Cormorant Garamond', serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-title);
  margin-bottom: 2px;
}

.preview-title {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 18px;
  font-weight: 500;
  color: var(--text-title);
  margin-bottom: 8px;
}

.preview-description {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text-muted);
  margin: 0 0 8px;
}

.preview-meta {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 8px;
}

.preview-meta-line {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 15px;
  line-height: 1.3;
  color: var(--text-muted);
}

.preview-status {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 15px;
  margin-bottom: 6px;
}

.preview-price {
  display: inline-block;
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 17px;
  color: var(--text-title);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.preview-authors {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 10px;
  font-size: 12px;
}

.preview-authors .preview-meta-line {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-style: normal;
  font-size: 12px;
  color: var(--text-faint);
}

.preview-edit-btn {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: none;
}

.preview-edit-btn:hover,
.preview-edit-btn:focus {
  background: var(--accent-strong) !important;
  border-color: var(--accent-strong) !important;
  box-shadow: none !important;
}

/* === Мобильная сетка карточек (вместо таблицы) === */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.work-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
}

.work-card-select {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  display: flex;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 6px;
  padding: 2px;
}

.work-card-image {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--card-bg);
  overflow: hidden;
}

.work-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.work-card-image .img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: var(--text-dim);
}

.work-card-body {
  padding: 8px 10px 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.work-card-name {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 14px;
  color: var(--text-title);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-card-artist {
  font-size: 11px;
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-card-price {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
}

.work-card-actions {
  display: flex;
  gap: 6px;
  padding: 6px 10px 10px;
  border-top: 1px solid var(--border-soft);
  margin-top: 4px;
}

.cards-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px 0;
  color: var(--text-faint);
  font-size: 13px;
}

/* === Мобильная адаптация === */
@media (max-width: 768px) {
  .header-content {
    flex-wrap: wrap;
  }

  .header-content h3 {
    font-size: 22px;
  }

  .header-actions {
    margin-left: 0;
    flex-basis: 100%;
    flex-direction: column;
  }

  .header-actions .buttons {
    width: 100%;
  }

  .filters-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .filters-left {
    flex-direction: column;
  }

  .filters-left :deep(.ant-select),
  .filters-left :deep(.ant-input-number),
  .name-search {
    width: 100% !important;
  }
}
</style>

<style>
/* Не scoped: a-drawer телепортируется в body, поэтому scoped-стили
   (даже с :deep()) до его шапки не достают — data-v-атрибут на
   корневой узел drawer'а не попадает. Изолируем через свой класс,
   переданный в root-class-name. */
.preview-drawer .ant-drawer-header {
  padding: 8px 16px;
  border-bottom: none;
}

.preview-drawer .ant-drawer-close {
  margin-top: 6px;
}

.preview-drawer .ant-drawer-body {
  padding-top: 4px;
}

/* .name-search: тоже не scoped — ant-design-vue вешает наш класс прямо
   на сам .ant-input-affix-wrapper (это один и тот же элемент, не предок и
   потомок), так что "scoped .name-search :deep(.ant-input-affix-wrapper)"
   (с пробелом) никогда не совпадал ни с чем — отсюда синяя рамка при
   наведении/фокусе и отсутствие скругления. */
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
