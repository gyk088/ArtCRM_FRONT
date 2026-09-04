<template>
  <div class="edit-page">
    <div class="page-header">
      <h2 class="page-title">{{ isNewExhibition ? "Создать выставку" : "Редактировать выставку" }}</h2>
      <p class="page-subtitle">{{ form.name || "Без названия" }}</p>
    </div>

    <div class="edit-container">
      <!-- Левая колонка — ФОРМА (с обложкой внутри карточки) -->
      <div class="left-column">
        <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
          <section class="form-section">
            <div class="section-heading">Основная информация</div>

            <a-form-item :label-col="{ span: 24 }" :wrapper-col="{ span: 24 }" class="images-item">
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

            <a-form-item label="Название" name="name">
              <a-input id="exhibitionName" name="exhibitionName" v-model:value="form.name" placeholder="Например, «Осенний вернисаж»" class="fixed-input" />
            </a-form-item>

            <a-form-item label="Подзаголовок" name="subtitle">
              <a-input id="exhibitionSubtitle" name="exhibitionSubtitle" v-model:value="form.subtitle" placeholder="Короткая подпись под названием" class="fixed-input" />
            </a-form-item>

            <a-form-item label="Художник/Галерея" name="artistOrGallery">
              <a-input id="exhibitionArtistOrGallery" name="exhibitionArtistOrGallery" v-model:value="form.artistOrGallery" class="fixed-input" />
            </a-form-item>

            <a-form-item label="Место проведения" name="venue">
              <a-input id="exhibitionVenue" name="exhibitionVenue" v-model:value="form.venue" placeholder="Например, «Галерея XYZ, Москва»" class="fixed-input" />
            </a-form-item>

            <div class="date-range-row">
              <a-form-item label="Дата начала" name="startDate">
                <a-date-picker
                  id="exhibitionStartDate"
                  v-model:value="form.startDate"
                  value-format="YYYY-MM-DD"
                  format="DD.MM.YYYY"
                  placeholder="Не задана"
                  class="fixed-input"
                  style="width: 100%"
                />
              </a-form-item>

              <a-form-item label="Дата окончания" name="endDate">
                <a-date-picker
                  id="exhibitionEndDate"
                  v-model:value="form.endDate"
                  value-format="YYYY-MM-DD"
                  format="DD.MM.YYYY"
                  placeholder="По настоящее время"
                  class="fixed-input"
                  style="width: 100%"
                />
              </a-form-item>
            </div>

            <a-form-item label="Описание" class="description-item">
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

          <!-- Галерея фото события — требует сохранённой выставки, т.к. фото
               привязаны к её id (в отличие от обложки/списка работ, которые
               просто едут одним payload'ом при создании). -->
          <section class="form-section gallery-section">
            <div class="table-header">
              <div class="section-heading">Галерея (фото события)</div>
              <a-tooltip :title="isNewExhibition ? 'Сначала сохраните выставку' : ''">
                <a-button type="dashed" :disabled="isNewExhibition" @click="openPhotoFilesModal" class="add-more-btn">
                  <PlusOutlined /> Добавить фото
                </a-button>
              </a-tooltip>
            </div>

            <p v-if="isNewExhibition" class="settings-hint">
              Сохраните выставку — после этого можно будет добавить фото экспозиции, открытия и т.п.
            </p>
            <p v-else-if="!form.photos.length" class="settings-hint">
              Пока нет фото — добавьте виды экспозиции, открытие и т.п.
            </p>

            <div v-if="form.photos.length" class="photo-gallery-grid">
              <div
                v-for="photo in form.photos"
                :key="photo.id"
                class="photo-gallery-card"
                :class="{
                  dragging: draggingPhotoId === photo.id,
                  'reorder-over': reorderOverPhotoId === photo.id,
                }"
                draggable="true"
                @dragstart="handlePhotoDragStart($event, photo)"
                @dragend="handlePhotoDragEnd"
                @dragover.prevent="handlePhotoDragOver(photo.id)"
                @dragleave="handlePhotoDragLeave(photo.id)"
                @drop="handlePhotoDrop(photo.id)"
              >
                <img :src="photo.file.url" class="photo-gallery-img" />
                <a-input
                  :id="`exhibitionPhotoCaption-${photo.id}`"
                  :name="`exhibitionPhotoCaption-${photo.id}`"
                  v-model:value="photo.caption"
                  placeholder="Подпись (необязательно)"
                  size="small"
                  class="photo-caption-input"
                  @blur="savePhotoCaption(photo)"
                  @keyup.enter="savePhotoCaption(photo)"
                />
                <button type="button" class="photo-delete-btn" @click="handleDeletePhoto(photo.id)">×</button>
              </div>
            </div>
          </section>
        </a-form>
      </div>

      <!-- Правая колонка — НАСТРОЙКИ ОТОБРАЖЕНИЯ -->
      <div class="right-column">
        <section class="form-section settings-card" style="margin-top: 0px">
          <div class="section-heading">Отображение полей</div>
          <p class="settings-hint">Выключенные поля не будут показаны в карточке работы на странице выставки</p>

          <div v-for="field in fieldToggles" :key="field.key" class="field-toggle-row">
            <span class="field-toggle-label">{{ field.label }}</span>
            <a-switch v-model:checked="form.visibleFields[field.key]" />
          </div>
        </section>

        <section class="form-section settings-card">
          <div class="section-heading">Сортировка и фильтры</div>
          <p class="settings-hint">Дают посетителям возможность сортировать и фильтровать работы прямо на странице выставки</p>

          <div class="field-toggle-row">
            <span class="field-toggle-label">Сортировка по цене</span>
            <a-switch v-model:checked="form.visibleFields.priceSort" :disabled="!form.visibleFields.price" />
          </div>

          <div class="field-toggle-row">
            <span class="field-toggle-label">Фильтр по художникам</span>
            <a-switch v-model:checked="form.visibleFields.artistFilter" />
          </div>
        </section>

        <section class="form-section settings-card">
          <div class="section-heading">Валюта</div>
          <p class="settings-hint">
            По умолчанию цены показываются в своей валюте каждой работы. Можно задать
            валюту показа для этой выставки — цены будут пересчитаны по указанному курсу.
          </p>

          <a-form-item label="Показывать цены в валюте">
            <a-select
              id="exhibitionDisplayCurrency"
              v-model:value="form.displayCurrency"
              placeholder="Без переопределения (как у работы)"
              allow-clear
              :options="CURRENCY_OPTIONS"
              class="fixed-input"
            />
          </a-form-item>

          <template v-if="form.displayCurrency">
            <a-form-item label="Курс (умножается на цену работы)">
              <a-input-number
                id="exhibitionCurrencyRate"
                name="exhibitionCurrencyRate"
                v-model:value="form.currencyRate"
                :min="0.0001"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>

            <a-form-item label="Округление (до кратного)">
              <a-input-number
                id="exhibitionCurrencyRounding"
                name="exhibitionCurrencyRounding"
                v-model:value="form.currencyRounding"
                :min="0.01"
                :step="1"
                style="width: 100%"
              />
            </a-form-item>
          </template>
        </section>
      </div>
    </div>

    <!-- Таблица выбранных работ -->
    <section class="works-section">
      <div class="table-header">
        <div class="section-heading">Добавленные работы</div>
        <div class="table-header-actions">
          <a-button
            :disabled="!selectedWorksData.length"
            :loading="exportingPdf"
            @click="handleExportPdf"
            class="export-pdf-btn"
          >
            <FilePdfOutlined /> {{ exportingPdf && exportProgress ? `Выгрузка ${exportProgress}` : 'Выгрузить в PDF' }}
          </a-button>
          <a-button type="dashed" @click="openWorksModal" class="add-more-btn">
            <PlusOutlined /> Добавить ещё
          </a-button>
        </div>
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
          <template v-else-if="column.dataIndex === 'media'">
            {{ getMediaName(record.media) }}
          </template>
          <template v-else-if="column.dataIndex === 'location'">
            {{ getLocationName(record.location) }}
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
            <a-tooltip title="Сгенерировать сертификат">
              <a-button
                type="text"
                class="certificate-row-btn"
                @click.stop="openCertificatePreview(record)"
              >
                <template #icon>
                  <SafetyCertificateOutlined />
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
      width="1300px"
      centered
      ok-text="Добавить"
      cancel-text="Отмена"
      class="works-modal"
      :get-container="false"
      @ok="addSelectedWorks"
    >
      <div class="modal-filters-panel">
        <a-select id="exhibitionFilterArtist" v-model:value="filterArtist" placeholder="Художник" allowClear style="width: 180px" :options="artistOptions" />
        <a-select id="exhibitionFilterLocation" v-model:value="filterLocation" placeholder="Локация" allowClear style="width: 180px" :options="locationOptions" />
        <a-select id="exhibitionFilterSeria" v-model:value="filterSeria" placeholder="Серия" allowClear style="width: 180px" :options="seriaOptions" />
        <a-select id="exhibitionFilterMedia" v-model:value="filterMedia" placeholder="Медиа" allowClear style="width: 180px" :options="mediaFilterOptions" />
        <a-select id="exhibitionFilterStatus" v-model:value="filterStatus" placeholder="Статус" allowClear style="width: 180px" :options="statusFilterOptions" />
        <a-input-number id="exhibitionFilterPriceFrom" name="exhibitionFilterPriceFrom" v-model:value="filterPriceFrom" placeholder="Цена от" :min="0" style="width: 120px" />
        <a-input-number id="exhibitionFilterPriceTo" name="exhibitionFilterPriceTo" v-model:value="filterPriceTo" placeholder="Цена до" :min="0" style="width: 120px" />
      </div>

      <div class="modal-selected-count">Выбрано работ: {{ selectedRowKeys.length }}</div>

      <a-table
        :data-source="filteredWorksTable"
        :columns="columns"
        row-key="id"
        :loading="worksLoading"
        :row-selection="rowSelection"
        :scroll="{ x: 1100 }">

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
        <template v-else-if="column.dataIndex === 'media'">
          {{ getMediaName(record.media) }}
        </template>
        <template v-else-if="column.dataIndex === 'seria'">
          {{ getSeriaName(record.seria) }}
        </template>
        <template v-else-if="column.dataIndex === 'location'">
          {{ getLocationName(record.location) }}
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

    <!-- Файлы — выбор обложки или фото галереи (режим переключается fileSelectMode) -->
    <a-drawer v-model:open="isFilesModalOpen" title="Файлы" placement="right" width="700px" destroyOnClose>
      <FileUploader :remove="true" :select="true" @select="handleFileSelect" />
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
  SafetyCertificateOutlined,
  FilePdfOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import CertificatePreviewModal from '@/components/CertificatePreviewModal.vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { toEditableHtml } from '@/utils/richText.js'
import { useArtWork } from '@/stores/artWork.js'
import { useStatuses } from '@/stores/statuses.js'
import { useSerias } from '@/stores/seria.js'
import { useArtist } from '@/stores/artist.js'
import { useMedia } from '@/stores/media.js'
import { useLocations } from '@/stores/locations.js'
import { useExhibition } from '@/stores/exhibition.js'
import { downloadCatalogPdf } from '@/utils/catalogPdf.js'
import FileUploader from "@/components/FileUploader.vue"

const route = useRoute()
const router = useRouter()

const artWorkStore = useArtWork()
const statusesStore = useStatuses()
const seriasStore = useSerias()
const artistStore = useArtist()
const mediaStore = useMedia()
const locationsStore = useLocations()
const exhibitionStore = useExhibition()

const isWorksModalOpen = ref(false)
const worksTable = ref([])
const worksLoading = ref(false)
const isFilesModalOpen = ref(false)
const fileSelectMode = ref('avatar') // 'avatar' | 'photo' — что делать с выбранным файлом
const formRef = ref(null)
const isNewExhibition = computed(() => route.params.id === 'new')

// Фильтры в модалке выбора работ — как в ссылках/UserPictures
const filterArtist = ref(null)
const filterLocation = ref(null)
const filterSeria = ref(null)
const filterMedia = ref(null)
const filterStatus = ref(null)
const filterPriceFrom = ref(null)
const filterPriceTo = ref(null)

const artistOptions = computed(() => artistStore.listArtists.map(a => ({ label: a.name, value: a.id })))
const locationOptions = computed(() => locationsStore.listLocations.map(l => ({ label: l.name, value: l.id })))
const seriaOptions = computed(() => seriasStore.listSerias.map(s => ({ label: s.name, value: s.id })))
const mediaFilterOptions = computed(() => mediaStore.listMedia.map(m => ({ label: m.name, value: m.id })))
const statusFilterOptions = computed(() => statusesStore.listStatuses.map(s => ({ label: s.name, value: s.id })))

const filteredWorksTable = computed(() => {
  let result = worksTable.value

  if (filterArtist.value) result = result.filter(w => w.artist === filterArtist.value)
  if (filterLocation.value) result = result.filter(w => w.location === filterLocation.value)
  if (filterSeria.value) result = result.filter(w => w.seria === filterSeria.value)
  if (filterMedia.value) result = result.filter(w => w.media === filterMedia.value)
  if (filterStatus.value) result = result.filter(w => w.status === filterStatus.value)
  if (filterPriceFrom.value != null) result = result.filter(w => Number(w.price) >= filterPriceFrom.value)
  if (filterPriceTo.value != null) result = result.filter(w => Number(w.price) <= filterPriceTo.value)

  return result
})

const rules = {
  name: [{ required: true, message: 'Введите название выставки', trigger: 'blur' }]
}

const fieldToggles = [
  { key: 'technique', label: 'Техника' },
  { key: 'size', label: 'Размер' },
  { key: 'year', label: 'Год' },
  { key: 'seria', label: 'Серия' },
  { key: 'media', label: 'Медиа' },
  { key: 'location', label: 'Локация' },
  { key: 'status', label: 'Статус' },
  { key: 'price', label: 'Цена' },
]

const form = reactive({
  name: '',
  subtitle: '',
  artistOrGallery: '',
  venue: '',
  startDate: null,
  endDate: null,
  description: '',
  avatar: null,
  works: [],
  photos: [], // [{id, caption, file: {id, ext, name, url}}]
  visibleFields: {
    technique: true,
    size: true,
    year: true,
    seria: true,
    media: true,
    location: true,
    status: true,
    price: true,
    priceSort: true,
    artistFilter: true
  },
  displayCurrency: null,
  currencyRate: 1,
  currencyRounding: 1,
})

const CURRENCY_OPTIONS = [
  { value: 'RUB', label: 'RUB — ₽' },
  { value: 'BYN', label: 'BYN — Br' },
  { value: 'USD', label: 'USD — $' },
  { value: 'EUR', label: 'EUR — €' },
]

const descriptionEditor = useEditor({
  content: '',
  extensions: [
    StarterKit,
    Underline,
    Placeholder.configure({ placeholder: 'Коротко расскажите о выставке' }),
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
    artistStore.getListArtists(),
    mediaStore.getListMedia(),
    locationsStore.getListLocations()
  ])

  if (!isNewExhibition.value) {
    // === Редактирование существующей выставки — подгружаем её с бэкенда ===
    const existing = await exhibitionStore.getExhibitionById(route.params.id)
    if (existing) {
      Object.assign(form, existing, {
        visibleFields: { ...form.visibleFields, ...existing.visibleFields },
        photos: existing.photos || [],
      })
      form.description = toEditableHtml(form.description)
      descriptionEditor.value?.commands.setContent(form.description)
    }
  } else if (route.query.works) {
    // Работы переданы через query — например, кнопкой «Создать выставку» на UserPictures
    form.works = String(route.query.works).split(',').filter(Boolean)
  }

  selectedRowKeys.value = [...form.works]
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

function getMediaName(mediaId) {
  if (!mediaId) return ''
  const media = mediaStore.listMedia.find(m => m.id === mediaId)
  return media ? media.name : mediaId
}

function getLocationName(locationId) {
  if (!locationId) return ''
  const location = locationsStore.listLocations.find(l => l.id === locationId)
  return location ? location.name : locationId
}

// === Обложка выставки ===
function openFilesModal() {
  fileSelectMode.value = 'avatar'
  isFilesModalOpen.value = true
}

// === Галерея фото события ===
function openPhotoFilesModal() {
  fileSelectMode.value = 'photo'
  isFilesModalOpen.value = true
}

async function handleFileSelect(file) {
  if (fileSelectMode.value === 'photo') {
    isFilesModalOpen.value = false
    const updated = await exhibitionStore.addPhoto(route.params.id, { fileId: file.id })
    if (updated) {
      form.photos = updated
      message.success('Фото добавлено в галерею')
    }
    return
  }

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

async function savePhotoCaption(photo) {
  const updated = await exhibitionStore.updatePhotoCaption(route.params.id, photo.id, photo.caption || null)
  if (updated) form.photos = updated
}

async function handleDeletePhoto(photoId) {
  const updated = await exhibitionStore.deletePhoto(route.params.id, photoId)
  if (updated) form.photos = updated
}

// Перетаскивание фото друг на друга — переставляет местами в галерее
// (плоский список, без вложенности — в отличие от папок в файловом менеджере).
const draggingPhotoId = ref(null)
const reorderOverPhotoId = ref(null)

function handlePhotoDragStart(event, photo) {
  draggingPhotoId.value = photo.id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', photo.id)
}

function handlePhotoDragEnd() {
  draggingPhotoId.value = null
  reorderOverPhotoId.value = null
}

function handlePhotoDragOver(photoId) {
  if (!draggingPhotoId.value || draggingPhotoId.value === photoId) return
  reorderOverPhotoId.value = photoId
}

function handlePhotoDragLeave(photoId) {
  if (reorderOverPhotoId.value === photoId) reorderOverPhotoId.value = null
}

async function handlePhotoDrop(targetId) {
  const sourceId = draggingPhotoId.value
  reorderOverPhotoId.value = null
  draggingPhotoId.value = null

  if (!sourceId || sourceId === targetId) return

  const ids = form.photos.map(p => p.id)
  const from = ids.indexOf(sourceId)
  const to = ids.indexOf(targetId)
  if (from === -1 || to === -1) return

  ids.splice(from, 1)
  ids.splice(to, 0, sourceId)

  // Переставляем локально сразу, не дожидаясь ответа сервера
  const byId = new Map(form.photos.map(p => [p.id, p]))
  form.photos = ids.map(id => byId.get(id))

  const updated = await exhibitionStore.reorderPhotos(route.params.id, ids)
  if (updated) form.photos = updated
}

// колонки для модалки — те же, что и в таблице на UserPictures (без "Действия")
const columns = [
  { title: 'Картина', dataIndex: 'avatar', key: 'avatar', width: 70 },
  { title: 'Название', dataIndex: 'name', key: 'name', sorter: (a, b) => (a.name || '').localeCompare(b.name || '', 'ru') },
  { title: 'Художник', dataIndex: 'artist', key: 'artist', sorter: (a, b) => getArtistName(a.artist).localeCompare(getArtistName(b.artist), 'ru') },
  { title: 'Техника', dataIndex: 'technique', key: 'technique', sorter: (a, b) => (a.technique || '').localeCompare(b.technique || '', 'ru') },
  { title: 'Размер', dataIndex: 'size', key: 'size', sorter: (a, b) => (a.size || '').localeCompare(b.size || '', 'ru') },
  { title: 'Год', dataIndex: 'year', key: 'year', width: 80, sorter: (a, b) => a.year - b.year },
  { title: 'Медиа', dataIndex: 'media', key: 'media', sorter: (a, b) => getMediaName(a.media).localeCompare(getMediaName(b.media), 'ru') },
  { title: 'Серия', dataIndex: 'seria', key: 'seria', sorter: (a, b) => getSeriaName(a.seria).localeCompare(getSeriaName(b.seria), 'ru') },
  { title: 'Локация', dataIndex: 'location', key: 'location', sorter: (a, b) => getLocationName(a.location).localeCompare(getLocationName(b.location), 'ru') },
  { title: 'Статус', dataIndex: 'status', key: 'status', width: 120, sorter: (a, b) => getStatusName(a.status).localeCompare(getStatusName(b.status), 'ru') },
  { title: 'Стоимость', dataIndex: 'price', key: 'price', width: 100, sorter: (a, b) => a.price - b.price },
]

const toggleableColumnDefs = {
  technique: { title: 'Техника', dataIndex: 'technique', key: 'technique', width: 140 },
  size: { title: 'Размер', dataIndex: 'size', key: 'size', width: 120 },
  year: { title: 'Год', dataIndex: 'year', key: 'year', width: 90 },
  seria: { title: 'Серия', dataIndex: 'seria', key: 'seria', width: 160 },
  media: { title: 'Медиа', dataIndex: 'media', key: 'media', width: 140 },
  location: { title: 'Локация', dataIndex: 'location', key: 'location', width: 140 },
  status: { title: 'Статус', dataIndex: 'status', key: 'status', width: 160 },
  price: { title: 'Стоимость', dataIndex: 'price', key: 'price', width: 160 },
}

const selectedWorksColumns = computed(() => [
  { title: 'Картина', dataIndex: 'avatar', key: 'avatar', width: 100 },
  { title: "Название", dataIndex: "name", key: "name", width: 220 },
  { title: 'Художник', dataIndex: 'artist', key: 'artist', width: 160 },
  ...fieldToggles
    .filter(field => form.visibleFields[field.key])
    .map(field => toggleableColumnDefs[field.key]),
  { title: "Действия", dataIndex: "actions", key: "actions", width: 130 }
])

function openWorksModal() {
  loadWorks()
  selectedRowKeys.value = [...form.works];
  isWorksModalOpen.value = true
}

// выбранные ID в модалке
const selectedRowKeys = ref([])

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  preserveSelectedRowKeys: true,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  }
}))

const selectedWorksData = computed(() => {
  return worksTable.value.filter(work => form.works.includes(work.id))
})

function removeSelectedWork(id) {
  form.works = form.works.filter(w => w !== id)
}

// Выгрузка каталога — все добавленные работы, по одной на страницу PDF,
// с учётом тех же переключателей видимости полей, что и на публичной странице.
const exportingPdf = ref(false)
const exportProgress = ref('')

async function handleExportPdf() {
  exportingPdf.value = true
  exportProgress.value = ''
  try {
    await downloadCatalogPdf(form.name, selectedWorksData.value, {
      visibleFields: form.visibleFields,
      resolveNames: (work) => ({
        artist: getArtistName(work.artist),
        seria: getSeriaName(work.seria),
        media: getMediaName(work.media),
        location: getLocationName(work.location),
        status: getStatusName(work.status),
      }),
      onProgress: (current, total) => { exportProgress.value = `${current} / ${total}` },
    })
  } finally {
    exportingPdf.value = false
    exportProgress.value = ''
  }
}

function openEditWork(record) {
  router.push({ name: 'edit-work', params: { id: record.id } })
}

// Предпросмотр и генерация сертификата подлинности работы (PDF)
const isCertPreviewOpen = ref(false)
const certPreviewWork = ref(null)

function openCertificatePreview(record) {
  certPreviewWork.value = record
  isCertPreviewOpen.value = true
}

const addSelectedWorks = () => {
  form.works = [...selectedRowKeys.value]
  isWorksModalOpen.value = false
}

// сохраняем выставку
const saveChanges = async () => {
  try {
    await formRef.value.validate()
  } catch {
    message.warning('Проверьте обязательные поля')
    return
  }

  const payload = {
    name: form.name,
    subtitle: form.subtitle,
    artistOrGallery: form.artistOrGallery,
    venue: form.venue,
    startDate: form.startDate,
    endDate: form.endDate,
    description: form.description,
    avatar: form.avatar,
    works: form.works,
    visibleFields: form.visibleFields,
    displayCurrency: form.displayCurrency || null,
    currencyRate: form.currencyRate || 1,
    currencyRounding: form.currencyRounding || 1,
  }

  const result = isNewExhibition.value
    ? await exhibitionStore.createExhibition(payload)
    : await exhibitionStore.updateExhibition(route.params.id, payload)

  if (!result) return

  router.push('/home/exhibition')
}

function goBack() {
  router.push('/home/exhibition')
}
</script>

<style scoped>

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
  padding: 20px 10px;
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
  width: 60%;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.left-column :deep(.ant-form) {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.right-column {
  width: 40%;
  padding-left: 20px;
  border-left: 1px solid var(--border);
}

/* === Секции формы === */
.form-section {
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 14px 12px 2px;
  display: flex;
  flex-direction: column;
}

.left-column .form-section {
  flex: none;
  height: auto;
}

.date-range-row {
  display: flex;
  gap: 12px;
  max-width: 450px;
}

.date-range-row .ant-form-item {
  flex: 1;
  min-width: 0;
}

/* Поле "Описание" — фиксированная высота, не растягивается на карточку */
.left-column .description-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  flex: none;
  margin-bottom: 12px;
}

.left-column .description-item :deep(.ant-form-item-row) {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
}

.left-column .description-item :deep(.ant-form-item-control) {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100% !important;
  max-width: 100% !important;
}

.left-column .description-item :deep(.ant-form-item-control-input) {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
}

.left-column .description-item :deep(.ant-form-item-control-input-content) {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
}

.left-column .description-item .rich-editor-wrap {
  width: 100%;
  flex: none;
}

.section-heading {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}

:deep(.ant-form-item-label > label) {
  color: var(--text-muted);
}

/* Меньше отступы между полями — карточки становятся компактнее */
:deep(.ant-form-item) {
  margin-bottom: 12px;
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
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  min-height: 70px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
}

.left-column .description-item .rich-editor {
  flex: none;
  height: 150px;
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

/* === Карточка настроек отображения полей === */
.settings-card {
  margin-top: 12px;
  padding-bottom: 10px;
}

.settings-hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--text-faint);
  line-height: 1.5;
}

.field-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid var(--border-soft);
}

.field-toggle-row:last-child {
  border-bottom: none;
}

.field-toggle-label {
  font-size: 14px;
  color: var(--text-body);
}

/* === Обложка выставки === */
.images-item {
  display: block;
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

/* === Галерея фото события === */
.gallery-section {
  margin-top: 12px;
  padding-bottom: 12px;
}

.photo-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin-top: 4px;
  margin-bottom: 10px;
}

.photo-gallery-card {
  position: relative;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  overflow: hidden;
  background: var(--card-bg);
  cursor: grab;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.photo-gallery-card.dragging {
  opacity: 0.4;
}

.photo-gallery-card.reorder-over {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(138, 109, 47, 0.25);
}

.photo-gallery-img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
}

.photo-caption-input {
  width: 100%;
  border: none;
  border-top: 1px solid var(--border-soft);
  border-radius: 0;
  font-size: 12px;
}

.photo-delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  border: none;
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 8px;
  z-index: 1;
}

.photo-delete-btn:hover {
  background-color: #d9534f;
  color: #fff;
}

/* === Работы === */
.works-section {
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 16px 10px;
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.table-header-actions {
  display: flex;
  gap: 8px;
}

.add-more-btn {
  border-color: var(--accent);
  color: var(--accent);
}

.add-more-btn:hover {
  border-color: var(--accent-strong) !important;
  color: var(--accent-strong) !important;
}

.export-pdf-btn {
  border-color: var(--border);
  color: var(--text-muted);
}

.export-pdf-btn:hover:not(:disabled) {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
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

.works-section :deep(.ant-table-tbody > tr > td:has(.edit-row-btn)) {
  white-space: nowrap;
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

.certificate-row-btn {
  color: #2f8a35 !important;
}

.certificate-row-btn:hover {
  color: #fff !important;
  background-color: #2f8a35 !important;
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

.modal-filters-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.modal-selected-count {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
}
</style>
