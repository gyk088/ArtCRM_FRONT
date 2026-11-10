<template>
  <div class="edit-page">
    <div class="page-header">
      <div class="page-header-top">
        <MobileMenuButton />
        <h2 class="page-title">{{ isNewCollection ? "Создать ссылку" : "Редактировать ссылку" }}</h2>
      </div>
      <p class="page-subtitle">{{ form.name || "Без названия" }}</p>

      <div v-if="!isNewCollection" class="view-stats">
        <a-tooltip title="Сколько раз всего открывали публичную страницу этой ссылки — каждое открытие считается, даже повторное от одного человека">
          <span class="view-stat">
            <EyeOutlined />
            {{ form.viewStats.total }}
          </span>
        </a-tooltip>
        <a-tooltip title="Сколько разных людей открывали публичную страницу этой ссылки — повторные открытия одним и тем же человеком считаются один раз">
          <span class="view-stat">
            <TeamOutlined />
            {{ form.viewStats.unique }}
          </span>
        </a-tooltip>
      </div>
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
              <a-input id="collectionName" name="collectionName" v-model:value="form.name" placeholder="Например, «Осенняя ссылка" class="fixed-input" />
            </a-form-item>

            <a-form-item label="Подзаголовок" name="subtitle">
              <a-input id="collectionSubtitle" name="collectionSubtitle" v-model:value="form.subtitle" placeholder="Короткая подпись под названием" class="fixed-input" />
            </a-form-item>

            <a-form-item label="Художник/Галерея" name="artistOrGallery">
              <a-input id="collectionArtistOrGallery" name="collectionArtistOrGallery" v-model:value="form.artistOrGallery" class="fixed-input" />
            </a-form-item>

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
        </a-form>
      </div>

      <!-- Правая колонка — НАСТРОЙКИ ОТОБРАЖЕНИЯ -->
      <div class="right-column">
        <section class="form-section settings-card" style="margin-top: 0px">
          <div class="section-heading">Отображение полей</div>
          <p class="settings-hint">Выключенные поля не будут показаны в карточке работы на странице коллекции</p>

          <div v-for="field in fieldToggles" :key="field.key" class="field-toggle-row">
            <span class="field-toggle-label">{{ field.label }}</span>
            <a-switch v-model:checked="form.visibleFields[field.key]" />
          </div>
        </section>

        <section class="form-section settings-card">
          <div class="section-heading">Сортировка и фильтры</div>
          <p class="settings-hint">Дают посетителям возможность сортировать и фильтровать работы прямо на странице ссылки</p>

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
            валюту показа для этой ссылки — цены будут пересчитаны по указанному курсу.
          </p>

          <a-form-item label="Показывать цены в валюте">
            <a-select
              id="collectionDisplayCurrency"
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
                id="collectionCurrencyRate"
                name="collectionCurrencyRate"
                v-model:value="form.currencyRate"
                :min="0.0001"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>

            <a-form-item label="Округление (до кратного)">
              <a-input-number
                id="collectionCurrencyRounding"
                name="collectionCurrencyRounding"
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
        <div>
          <div class="section-heading">Добавленные работы</div>
          <div v-if="selectedWorksData.length > 1 && isMobile" class="order-hint">
            Меняйте порядок стрелками или номером позиции{{ isNewCollection ? '' : ' — сохраняется сразу' }}
          </div>
          <div v-else-if="selectedWorksData.length > 1" class="order-hint">
            Перетащите строку за <HolderOutlined />, введите номер позиции или используйте стрелки — в этом порядке работы
            покажутся на странице ссылки и в PDF{{ isNewCollection ? '' : '. Порядок сохраняется сразу' }}
          </div>
        </div>
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
            <PlusOutlined /> Выберите работы
          </a-button>
        </div>
      </div>

      <!-- Телефон: список карточек вместо широкой таблицы -->
      <div v-if="isMobile" class="m-works">
        <div v-if="!selectedWorksData.length" class="m-works-empty">Работы ещё не добавлены</div>
        <div v-for="(record, index) in selectedWorksData" :key="record.id" class="m-work">
          <div class="m-work-order">
            <button
              type="button"
              class="m-order-btn"
              aria-label="Выше"
              :disabled="index === 0"
              @click="moveWorkBy(record.id, -1)"
            >
              <ArrowUpOutlined />
            </button>
            <a-input-number
              :key="`${record.id}-${index}`"
              :value="index + 1"
              :min="1"
              :max="selectedWorksData.length"
              :controls="false"
              size="small"
              class="m-order-input"
              inputmode="numeric"
              @press-enter="(e) => { moveWorkTo(record.id, e.target.value); e.target.blur() }"
              @blur="(e) => moveWorkTo(record.id, e.target.value)"
            />
            <button
              type="button"
              class="m-order-btn"
              aria-label="Ниже"
              :disabled="index === selectedWorksData.length - 1"
              @click="moveWorkBy(record.id, 1)"
            >
              <ArrowDownOutlined />
            </button>
          </div>
          <img v-if="record.avatar && record.avatar.url" :src="record.avatar.url" class="m-work-img" />
          <div v-else class="m-work-img img-placeholder"><PictureOutlined /></div>
          <div class="m-work-info">
            <div class="m-work-name">{{ record.name || 'Без названия' }}</div>
            <div class="m-work-artist">{{ getArtistName(record.artist) }}</div>
          </div>
          <div class="m-work-actions">
            <button type="button" class="m-icon-btn" aria-label="Редактировать" @click="openEditWork(record)">
              <EditOutlined />
            </button>
            <button type="button" class="m-icon-btn" aria-label="Сертификат" @click="openCertificatePreview(record)">
              <SafetyCertificateOutlined />
            </button>
            <a-popconfirm title="Убрать работу из ссылки?" ok-text="Да" cancel-text="Нет" @confirm="removeSelectedWork(record.id)">
              <button type="button" class="m-icon-btn m-icon-danger" aria-label="Удалить"><DeleteOutlined /></button>
            </a-popconfirm>
          </div>
        </div>
      </div>

      <a-table
        v-else
        :data-source="selectedWorksData"
        :columns="selectedWorksColumns"
        row-key="id"
        size="small"
        :pagination="false"
        :custom-row="dragRowProps"
      >
        <template #bodyCell="{ column, record, index }">
          <!-- Порядок: ручка для перетаскивания + стрелки (на телефоне drag&drop не работает) -->
          <template v-if="column.dataIndex === 'order'">
            <div class="order-cell">
              <span
                class="drag-handle"
                title="Перетащите, чтобы изменить порядок"
                @mousedown="armDrag(record.id)"
              >
                <HolderOutlined />
              </span>
              <a-input-number
                :key="`${record.id}-${index}`"
                :value="index + 1"
                :min="1"
                :max="selectedWorksData.length"
                :controls="false"
                size="small"
                class="order-input"
                title="Введите номер позиции и нажмите Enter"
                @press-enter="(e) => { moveWorkTo(record.id, e.target.value); e.target.blur() }"
                @blur="(e) => moveWorkTo(record.id, e.target.value)"
                @click.stop
              />
              <div class="order-arrows">
                <button
                  type="button"
                  class="order-arrow"
                  title="Выше"
                  :disabled="index === 0"
                  @click.stop="moveWorkBy(record.id, -1)"
                >
                  <ArrowUpOutlined />
                </button>
                <button
                  type="button"
                  class="order-arrow"
                  title="Ниже"
                  :disabled="index === selectedWorksData.length - 1"
                  @click.stop="moveWorkBy(record.id, 1)"
                >
                  <ArrowDownOutlined />
                </button>
              </div>
            </div>
          </template>
          <!-- Колонка аватара -->
          <template v-else-if="column.dataIndex === 'avatar'">
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
      :width="isMobile ? '96vw' : '1300px'"
      centered
      ok-text="Сохранить"
      cancel-text="Отмена"
      class="works-modal"
      :get-container="false"
      :confirm-loading="savingWorks"
      @ok="addSelectedWorks"
    >
      <div class="modal-filters-panel">
        <a-select id="collectionFilterArtist" v-model:value="filterArtist" mode="multiple" placeholder="Художник" allowClear style="width: 180px" max-tag-count="responsive" :options="artistOptions" />
        <a-select id="collectionFilterLocation" v-model:value="filterLocation" mode="multiple" placeholder="Локация" allowClear style="width: 180px" max-tag-count="responsive" :options="locationOptions" />
        <a-select id="collectionFilterSeria" v-model:value="filterSeria" mode="multiple" placeholder="Серия" allowClear style="width: 180px" max-tag-count="responsive" :options="seriaOptions" />
        <a-select id="collectionFilterMedia" v-model:value="filterMedia" mode="multiple" placeholder="Медиа" allowClear style="width: 180px" max-tag-count="responsive" :options="mediaFilterOptions" />
        <a-select id="collectionFilterStatus" v-model:value="filterStatus" mode="multiple" placeholder="Статус" allowClear style="width: 180px" max-tag-count="responsive" :options="statusFilterOptions" />
        <a-input-number id="collectionFilterPriceFrom" name="collectionFilterPriceFrom" v-model:value="filterPriceFrom" placeholder="Цена от" :min="0" style="width: 120px" />
        <a-input-number id="collectionFilterPriceTo" name="collectionFilterPriceTo" v-model:value="filterPriceTo" placeholder="Цена до" :min="0" style="width: 120px" />
      </div>

      <div class="modal-selected-count">Выбрано работ: {{ selectedRowKeys.length }}</div>

      <WorksPickerTable
        :data="filteredWorksTable"
        :columns="columns"
        v-model:selected-row-keys="selectedRowKeys"
        :loading="worksLoading"
      >
        <template #cell="{ column, record }">
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
          <template v-else>
            {{ record[column.dataIndex] }}
          </template>
        </template>
      </WorksPickerTable>
    </a-modal>

    <!-- Файлы — выбор обложки -->
    <a-drawer v-model:open="isFilesModalOpen" title="Файлы" placement="right" :width="isMobile ? '100%' : '700px'" destroyOnClose>
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
import { fileUrl as buildFileUrl } from '@/services/const.js'
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
  EyeOutlined,
  TeamOutlined,
  HolderOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
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
import { useCollection } from '@/stores/collection.js'
import { downloadCatalogPdf } from '@/utils/catalogPdf.js'
import FileUploader from "@/components/FileUploader.vue"
import WorksPickerTable from "@/components/WorksPickerTable.vue"
import { useIsMobile } from '@/composables/useIsMobile.js'
import MobileMenuButton from '@/components/MobileMenuButton.vue'

const route = useRoute()
const router = useRouter()

const artWorkStore = useArtWork()
const statusesStore = useStatuses()
const seriasStore = useSerias()
const artistStore = useArtist()
const mediaStore = useMedia()
const locationsStore = useLocations()
const collectionStore = useCollection()

const isWorksModalOpen = ref(false)
const worksTable = ref([])
const worksLoading = ref(false)
const isFilesModalOpen = ref(false)
const formRef = ref(null)
const isNewCollection = computed(() => route.params.id === 'new')
const { isMobile } = useIsMobile()

// Фильтры в модалке выбора работ — как на UserPictures
const filterArtist = ref([])
const filterLocation = ref([])
const filterSeria = ref([])
const filterMedia = ref([])
const filterStatus = ref([])
const filterPriceFrom = ref(null)
const filterPriceTo = ref(null)

const artistOptions = computed(() => artistStore.listArtists.map(a => ({ label: a.name, value: a.id })))
const locationOptions = computed(() => locationsStore.listLocations.map(l => ({ label: l.name, value: l.id })))
const seriaOptions = computed(() => seriasStore.listSerias.map(s => ({ label: s.name, value: s.id })))
const mediaFilterOptions = computed(() => mediaStore.listMedia.map(m => ({ label: m.name, value: m.id })))
const statusFilterOptions = computed(() => statusesStore.listStatuses.map(s => ({ label: s.name, value: s.id })))

const filteredWorksTable = computed(() => {
  let result = worksTable.value

  if (filterArtist.value?.length) result = result.filter(w => filterArtist.value.includes(w.artist))
  if (filterLocation.value?.length) result = result.filter(w => filterLocation.value.includes(w.location))
  if (filterSeria.value?.length) result = result.filter(w => filterSeria.value.includes(w.seria))
  if (filterMedia.value?.length) result = result.filter(w => filterMedia.value.includes(w.media))
  if (filterStatus.value?.length) result = result.filter(w => filterStatus.value.includes(w.status))
  if (filterPriceFrom.value != null) result = result.filter(w => Number(w.price) >= filterPriceFrom.value)
  if (filterPriceTo.value != null) result = result.filter(w => Number(w.price) <= filterPriceTo.value)

  return result
})

const rules = {
  name: [{ required: true, message: 'Введите название ссылки', trigger: 'blur' }]
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
  description: '',
  avatar: null,
  works: [],
  viewStats: { total: 0, unique: 0 },
  visibleFields: {
    technique: true,
    size: true,
    year: true,
    seria: true,
    media: true,
    location: true,
    status: true,
    price: true,
    // Инструменты публичной страницы (не поля работы, но переиспользуем
    // тот же visibleFields — так проще мёрджится при загрузке существующей
    // ссылки и не нужен отдельный payload на бэкенде).
    priceSort: true,
    artistFilter: true
  },
  // Переопределение валюты показа цен на публичной странице ссылки —
  // работы заведены в своей валюте, но, например, в конкретной ссылке
  // цены нужно показать в евро по заданному вручную курсу.
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
    artistStore.getListArtists(),
    mediaStore.getListMedia(),
    locationsStore.getListLocations()
  ])

  if (!isNewCollection.value) {
    // === Редактирование существующей ссылки — подгружаем её с бэкенда ===
    const existing = await collectionStore.getCollectionById(route.params.id)
    if (existing) {
      // Мёрджим, а не затираем visibleFields — иначе у ссылок, сохранённых
      // до добавления новых полей (размер/статус), переключатели показывались бы
      // выключенными, хотя на публичной странице отсутствующий ключ считается видимым.
      Object.assign(form, existing, {
        visibleFields: { ...form.visibleFields, ...existing.visibleFields }
      })
      form.description = toEditableHtml(form.description)
      descriptionEditor.value?.commands.setContent(form.description)
    }
  } else if (route.query.works) {
    // Работы переданы через query — например, кнопкой «Создать ссылку» на UserPictures
    form.works = String(route.query.works).split(',').filter(Boolean)
  }

  selectedRowKeys.value = [...form.works]
})

async function loadWorks() {
  // Мгновенно показываем то, что уже есть в кэше (см. stores/artWork.js —
  // гидрируется из localStorage при создании стора), не дожидаясь сети.
  worksTable.value = artWorkStore.listArtWorks
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

// === Обложка ссылки ===
function openFilesModal() {
  isFilesModalOpen.value = true
}

function handleFileSelect(file) {
  const fileUrl = buildFileUrl(file)

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

// выбранные работы — колонки собираются из toggle'ов "Отображение полей"
// выше, чтобы таблица показывала ровно те поля, что включены для карточек
// на публичной странице коллекции
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
  { title: '№', dataIndex: 'order', key: 'order', width: 110 },
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

// выбранные ID в модалке — WorksPickerTable сам хранит выбор по id, поэтому
// он переживает фильтрацию/сортировку без отдельной preserveSelectedRowKeys
const selectedRowKeys = ref([])

// Строго в порядке form.works — это и есть порядок работ в ссылке
const selectedWorksData = computed(() => {
  const byId = new Map(worksTable.value.map(work => [work.id, work]))
  return form.works.map(id => byId.get(id)).filter(Boolean)
})

function removeSelectedWork(id) {
  form.works = form.works.filter(w => w !== id)
}

// === Порядок работ ===
// Меняем местами по id (не по индексу строки): в form.works могут быть id
// работ, которых ещё нет в загруженном списке и которые таблица не показывает.
function moveWork(dragId, targetId, placeAfter) {
  if (!dragId || dragId === targetId) return
  const ids = form.works.filter(id => id !== dragId)
  const targetIndex = ids.indexOf(targetId)
  if (targetIndex === -1) return
  ids.splice(placeAfter ? targetIndex + 1 : targetIndex, 0, dragId)
  if (ids.join() === form.works.join()) return
  form.works = ids
  scheduleOrderSave()
}

// Сдвиг на одну видимую строку вверх/вниз
function moveWorkBy(id, delta) {
  const rows = selectedWorksData.value
  const index = rows.findIndex(w => w.id === id)
  const neighbour = rows[index + delta]
  if (neighbour) moveWork(id, neighbour.id, delta > 0)
}

// Drag&drop строк таблицы (HTML5). Тянуть можно только за ручку: нажатие на
// неё «взводит» строку, а drag, начатый в другом месте строки, отменяется.
//
// Всё состояние перетаскивания — НЕ реактивное, подсветка места вставки
// ставится классами прямо на <tr>: любая перерисовка таблицы посреди drag
// (а реактивное состояние её вызывает) обрывает перетаскивание в браузере,
// и строку удавалось сдвинуть только на одну позицию.
let armedDragId = null
let draggingId = null
let dropTarget = null // { id, after, el }

function setDropMarker(el, after) {
  if (dropTarget?.el && dropTarget.el !== el) {
    dropTarget.el.classList.remove('row-drop-before', 'row-drop-after')
  }
  el.classList.toggle('row-drop-before', !after)
  el.classList.toggle('row-drop-after', after)
}

function dragRowProps(record) {
  return {
    draggable: true,
    onDragstart: (e) => {
      if (armedDragId !== record.id) {
        e.preventDefault()
        return
      }
      draggingId = record.id
      e.currentTarget.classList.add('row-dragging')
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', record.id) // без данных Firefox не начинает drag
    },
    onDragover: (e) => {
      if (!draggingId) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      const el = e.currentTarget
      const rect = el.getBoundingClientRect()
      const after = e.clientY > rect.top + rect.height / 2
      if (dropTarget?.el !== el || dropTarget.after !== after) {
        setDropMarker(el, after)
        dropTarget = { id: record.id, after, el }
      }
    },
    onDrop: (e) => {
      e.preventDefault()
      const from = draggingId
      const target = dropTarget
      clearDrag()
      if (from && target) moveWork(from, target.id, target.after)
    },
    onDragend: clearDrag,
  }
}

// Кнопку мыши могут отпустить где угодно — снимаем «взвод» глобально
function disarmDrag() {
  armedDragId = null
}

function armDrag(id) {
  armedDragId = id
  window.addEventListener('mouseup', disarmDrag, { once: true })
}

function clearDrag() {
  document.querySelectorAll('.row-dragging, .row-drop-before, .row-drop-after').forEach(el => {
    el.classList.remove('row-dragging', 'row-drop-before', 'row-drop-after')
  })
  draggingId = null
  dropTarget = null
  armedDragId = null
}

// Перенос на позицию, введённую в поле номера (1..N)
function moveWorkTo(id, position) {
  const rows = selectedWorksData.value
  const from = rows.findIndex(w => w.id === id)
  const to = Math.min(Math.max(Math.round(Number(position)) || 1, 1), rows.length) - 1
  if (from === -1 || from === to) return
  moveWork(id, rows[to].id, to > from)
}

// У существующей ссылки порядок сохраняем сразу (с задержкой, чтобы серия
// перестановок ушла одним запросом); новая ссылка сохранит его при создании.
let orderSaveTimer = null
function scheduleOrderSave() {
  if (isNewCollection.value) return
  clearTimeout(orderSaveTimer)
  orderSaveTimer = setTimeout(saveOrder, 700)
}

async function saveOrder() {
  orderSaveTimer = null
  const result = await collectionStore.updateCollection(route.params.id, { works: [...form.works] }, { silent: true })
  if (result) message.success({ content: 'Порядок работ сохранён', key: 'works-order', duration: 1.5 })
}

onBeforeUnmount(() => {
  // уходим со страницы, не дождавшись таймера — сохраняем сразу
  if (orderSaveTimer) {
    clearTimeout(orderSaveTimer)
    saveOrder()
  }
})

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

// Состав работ сохраняется сразу по кнопке "Сохранить" в модалке, не
// дожидаясь общего сохранения страницы — для новой (ещё не созданной)
// ссылки сохранить работы отдельно невозможно (нет id), там это по-прежнему
// применяется только локально и уйдёт вместе с первым созданием ссылки.
const savingWorks = ref(false)

const addSelectedWorks = async () => {
  // Уже добавленные работы сохраняют свой порядок, новые — в конец списка
  const picked = new Set(selectedRowKeys.value)
  const kept = form.works.filter(id => picked.has(id))
  const keptSet = new Set(kept)
  const newWorks = [...kept, ...selectedRowKeys.value.filter(id => !keptSet.has(id))]

  if (isNewCollection.value) {
    form.works = newWorks
    isWorksModalOpen.value = false
    return
  }

  savingWorks.value = true
  try {
    const result = await collectionStore.updateCollection(route.params.id, { works: newWorks })
    if (!result) return // ошибка уже показана в сторе — модалку оставляем открытой для повтора

    form.works = newWorks
    isWorksModalOpen.value = false
  } finally {
    savingWorks.value = false
  }
}

// сохраняем ссылку
const saveChanges = async () => {
  try {
    await formRef.value.validate()
  } catch {
    message.warning('Проверьте обязательные поля')
    return
  }

  // общее сохранение и так отправит works — отложенное сохранение порядка не нужно
  clearTimeout(orderSaveTimer)
  orderSaveTimer = null

  const payload = {
    name: form.name,
    subtitle: form.subtitle,
    artistOrGallery: form.artistOrGallery,
    description: form.description,
    avatar: form.avatar,
    works: form.works,
    visibleFields: form.visibleFields,
    displayCurrency: form.displayCurrency || null,
    currencyRate: form.currencyRate || 1,
    currencyRounding: form.currencyRounding || 1,
  }

  const result = isNewCollection.value
    ? await collectionStore.createCollection(payload)
    : await collectionStore.updateCollection(route.params.id, payload)

  if (!result) return

  router.push('/home/collection')
}

function goBack() {
  router.push('/home/collection')
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

.page-header-top {
  display: flex;
  align-items: center;
  gap: 10px;
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

.view-stats {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.view-stat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 14px;
  background: var(--card-bg);
  color: var(--text-muted);
  font-size: 13px;
  cursor: default;
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

/* === Обложка ссылки === */
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

/* === Порядок работ в ссылке === */
.order-hint {
  margin-top: 2px;
  font-size: 12px;
  color: #7c7669;
}

.order-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.drag-handle {
  cursor: grab;
  color: #7c7669;
  padding: 4px 2px;
  font-size: 16px;
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.order-input {
  width: 48px;
}

.order-input :deep(input) {
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.order-arrows {
  display: flex;
  flex-direction: column;
}

.order-arrow {
  border: none;
  background: none;
  padding: 0 4px;
  line-height: 1;
  font-size: 11px;
  color: #7c7669;
  cursor: pointer;
}

.order-arrow:hover:not(:disabled) {
  color: #8a6d2f;
}

.order-arrow:disabled {
  opacity: 0.3;
  cursor: default;
}

.works-section :deep(.row-dragging > td) {
  opacity: 0.4;
}

.works-section :deep(.row-drop-before > td) {
  box-shadow: inset 0 2px 0 #8a6d2f;
}

.works-section :deep(.row-drop-after > td) {
  box-shadow: inset 0 -2px 0 #8a6d2f;
}

/* === Телефон: список работ ссылки === */
.m-works {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-works-empty {
  padding: 16px 0;
  color: #7c7669;
  text-align: center;
}

.m-work {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 10px;
}

.m-work-order {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.m-order-btn {
  border: none;
  background: #efece4;
  color: #5a564c;
  width: 40px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.m-order-btn:disabled {
  opacity: 0.35;
}

.m-order-input {
  width: 40px;
}

.m-order-input :deep(input) {
  text-align: center;
  padding: 0 2px !important;
}

.m-work-img {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.m-work-info {
  flex: 1;
  min-width: 0;
}

.m-work-name {
  font-weight: 500;
  color: #211f1a;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.m-work-artist {
  font-size: 12px;
  color: #7c7669;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.m-work-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

.m-icon-btn {
  border: none;
  background: none;
  width: 36px;
  height: 30px;
  border-radius: 6px;
  color: #7c7669;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.m-icon-danger {
  color: #8f2c2c;
}

@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    align-items: stretch !important;
    gap: 10px;
  }

  .table-header-actions {
    flex-direction: column;
  }

  .table-header-actions .ant-btn {
    width: 100%;
    height: 40px;
  }
}
</style>
