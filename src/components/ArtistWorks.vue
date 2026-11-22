<template>
  <div class="aw">
    <!-- Поиск и фильтры (на телефоне фильтры свёрнуты) -->
    <div class="aw-filters">
      <div class="aw-search-row">
        <a-input v-model:value="search" placeholder="Поиск по названию" allow-clear class="aw-search">
          <template #prefix><SearchOutlined /></template>
        </a-input>
        <a-button
          v-if="isMobile"
          class="aw-filters-toggle"
          :class="{ 'aw-filters-toggle-active': activeFiltersCount }"
          @click="filtersOpen = !filtersOpen"
        >
          <FilterOutlined />
          <span v-if="activeFiltersCount" class="aw-filters-count">{{ activeFiltersCount }}</span>
        </a-button>
      </div>
      <template v-if="!isMobile || filtersOpen">
        <a-select v-model:value="fSeria" mode="multiple" option-filter-prop="label" placeholder="Серия" allow-clear max-tag-count="responsive" :options="seriaOptions" class="aw-select" />
        <a-select v-model:value="fMedia" mode="multiple" option-filter-prop="label" placeholder="Медиа" allow-clear max-tag-count="responsive" :options="mediaOptions" class="aw-select" />
        <a-select v-model:value="fStatus" mode="multiple" option-filter-prop="label" placeholder="Статус" allow-clear max-tag-count="responsive" :options="statusOptions" class="aw-select" />
        <a-select v-model:value="fLocation" mode="multiple" option-filter-prop="label" placeholder="Локация" allow-clear max-tag-count="responsive" :options="locationOptions" class="aw-select" />
        <a-select v-model:value="fTags" mode="multiple" option-filter-prop="label" placeholder="Теги" allow-clear max-tag-count="responsive" :options="tagOptions" class="aw-select" />
        <a-input-number v-model:value="fPriceFrom" placeholder="Цена от" :min="0" class="aw-price" />
        <a-input-number v-model:value="fPriceTo" placeholder="Цена до" :min="0" class="aw-price" />
        <a-select v-model:value="fSold" placeholder="Наличие" allow-clear :options="SOLD_OPTIONS" class="aw-select aw-select-sm" />
        <a-button v-if="activeFiltersCount" type="link" class="aw-reset" @click="resetFilters">Сбросить</a-button>
      </template>
    </div>

    <!-- Выбор и сортировка -->
    <div class="aw-toolbar">
      <a-checkbox
        :checked="allSelected"
        :indeterminate="someSelected"
        :disabled="!sorted.length"
        @change="e => toggleAll(e.target.checked)"
      >Выбрать все</a-checkbox>
      <span class="aw-count">
        {{ sorted.length }} из {{ works.length }}
      </span>
      <div class="aw-sort">
        <a-select v-model:value="sortKey" :options="SORT_OPTIONS" size="small" class="aw-sort-select" />
        <a-button size="small" :title="sortDesc ? 'По убыванию' : 'По возрастанию'" @click="sortDesc = !sortDesc">
          <SortDescendingOutlined v-if="sortDesc" />
          <SortAscendingOutlined v-else />
        </a-button>
      </div>
      <a-button size="small" type="dashed" class="aw-add" @click="addWork"><PlusOutlined /> Добавить работу</a-button>
    </div>

    <!-- Действия с выбранными — как в «Моих работах» -->
    <div v-if="selected.length" class="aw-selection">
      <span class="aw-selection-count">Выбрано: {{ selected.length }}</span>
      <a-button type="primary" size="small" @click="createCollection"><LinkOutlined /> Создать ссылку</a-button>
      <a-button size="small" @click="createExhibition"><BankOutlined /> Создать выставку</a-button>
      <a-button size="small" @click="isBulkOpen = true"><EditOutlined /> Изменить</a-button>
      <a-button size="small" type="link" @click="selected = []">Снять выбор</a-button>
    </div>

    <a-spin :spinning="loading && !works.length">
      <div v-if="!loading && !works.length" class="aw-empty">Работ этого художника пока нет</div>
      <div v-else-if="!sorted.length" class="aw-empty">По фильтрам ничего не найдено</div>

      <div v-else class="aw-grid">
        <div
          v-for="w in sorted"
          :key="w.id"
          class="aw-tile"
          :class="{ 'aw-tile-selected': selected.includes(w.id) }"
          @click="openWork(w)"
        >
          <span class="aw-check" @click.stop>
            <a-checkbox :checked="selected.includes(w.id)" @change="e => toggle(w.id, e.target.checked)" />
          </span>
          <div class="aw-img">
            <img v-if="w.avatar && w.avatar.url" v-thumb="w.avatar" loading="lazy" alt="" />
            <PictureOutlined v-else class="aw-img-empty" />
            <span v-if="w.sale" class="aw-sold">{{ (w.quantity ?? 1) > 1 ? `продано ${w.sold_count ?? 0} из ${w.quantity}` : 'продано' }}</span>
          </div>
          <div class="aw-body">
            <div class="aw-name" :title="w.name">{{ w.name || 'Без названия' }}</div>
            <div class="aw-sub">{{ metaLine(w) }}</div>
            <div class="aw-line">
              <span v-if="statusOf(w)" class="aw-status" :style="chipStyle(statusOf(w).color)">{{ statusOf(w).name }}</span>
            </div>
            <div class="aw-price-line">
              <template v-if="w.price">{{ formatMoney(w.price, w.currency) }}</template>
              <template v-else>&nbsp;</template>
            </div>
          </div>
          <div class="aw-actions" @click.stop>
            <button class="aw-btn" title="Редактировать" @click="openWork(w)"><EditOutlined /></button>
            <button class="aw-btn" title="Сертификат" @click="openCertificate(w)"><SafetyCertificateOutlined /></button>
            <button
              class="aw-btn aw-btn-sale"
              :class="{ 'aw-btn-sale-done': w.sale }"
              :title="!w.sale ? 'Отметить как проданную' : availableOf(w) > 0 ? `Оформить продажу ещё (осталось ${availableOf(w)})` : 'Продажа — изменить'"
              @click="openSale(w)"
            ><DollarOutlined /></button>
          </div>
        </div>
      </div>
    </a-spin>

    <BulkEditModal v-model:open="isBulkOpen" :ids="selected" hide-artist @done="onBulkDone" />
    <SaleModal
      v-model:open="saleOpen"
      :art-id="saleWork?.id"
      :work-name="saleWork?.name"
      :price="saleWork?.price"
      :currency="saleWork?.currency"
      @saved="emit('changed')"
      @cancelled="emit('changed')"
    />
    <CertificatePreviewModal
      v-model:open="certOpen"
      :work="certWork"
      :artist-name="artistName"
      :seria-name="certWork ? seriaName(certWork.seria) : ''"
    />
  </div>
</template>

<script setup>
// Вкладка «Работы» в карточке художника: плитка с фильтрами и сортировкой,
// выбор работ → ссылка / выставка / массовое изменение (как в «Моих работах»).
// Данные — общий список работ (artWork store), отфильтрованный по художнику.
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  SearchOutlined, FilterOutlined, PictureOutlined, EditOutlined, DollarOutlined, SafetyCertificateOutlined,
  LinkOutlined, BankOutlined, PlusOutlined, SortAscendingOutlined, SortDescendingOutlined,
} from '@ant-design/icons-vue'
import BulkEditModal from '@/components/BulkEditModal.vue'
import SaleModal from '@/components/SaleModal.vue'
import CertificatePreviewModal from '@/components/CertificatePreviewModal.vue'
import { useArtWork } from '@/stores/artWork.js'
import { useSerias } from '@/stores/seria.js'
import { useMedia } from '@/stores/media.js'
import { useStatuses } from '@/stores/statuses.js'
import { useLocations } from '@/stores/locations.js'
import { useTags } from '@/stores/tags.js'
import { useIsMobile } from '@/composables/useIsMobile.js'
import { formatMoney } from '@/utils/money.js'

const props = defineProps({
  artistId: { type: String, required: true },
  artistName: { type: String, default: '' },
})
// changed — продажа/массовое изменение: карточке нужно обновить сводку и продажи
const emit = defineEmits(['changed'])

const router = useRouter()
const { isMobile } = useIsMobile()
const artWorkStore = useArtWork()
const seriasStore = useSerias()
const mediaStore = useMedia()
const statusesStore = useStatuses()
const locationsStore = useLocations()
const tagsStore = useTags()

const loading = ref(false)
onMounted(async () => {
  loading.value = !artWorkStore.listArtWorks.length
  try {
    await Promise.all([
      artWorkStore.getListArtWorks(),
      seriasStore.listSerias?.length ? null : seriasStore.getListSerias(),
      mediaStore.listMedia?.length ? null : mediaStore.getListMedia(),
      statusesStore.listStatuses?.length ? null : statusesStore.getListStatuses(),
      locationsStore.listLocations?.length ? null : locationsStore.getListLocations(),
      tagsStore.listTags?.length ? null : tagsStore.getListTags(),
    ])
  } finally {
    loading.value = false
  }
})

const works = computed(() => artWorkStore.listArtWorks.filter(w => w.artist === props.artistId))

// === Фильтры ===
const search = ref('')
const fSeria = ref([])
const fMedia = ref([])
const fStatus = ref([])
const fLocation = ref([])
const fTags = ref([])
const fPriceFrom = ref(null)
const fPriceTo = ref(null)
const fSold = ref(null)
// осталось экземпляров (тираж); уникальная работа — 1
function availableOf(w) { return w?.available ?? (w?.sale ? 0 : (w?.quantity ?? 1)) }
const filtersOpen = ref(false)
const SOLD_OPTIONS = [
  { label: 'В наличии', value: 'available' },
  { label: 'Проданные', value: 'sold' },
]

// В списках фильтров — только то, что реально есть у работ художника
const usedIds = (key) => new Set(works.value.flatMap(w => (Array.isArray(w[key]) ? w[key] : [w[key]])).filter(Boolean))
const toOptions = (list, key) => {
  const used = usedIds(key)
  return (list || []).filter(i => used.has(i.id)).map(i => ({ label: i.name, value: i.id }))
}
const seriaOptions = computed(() => toOptions(seriasStore.listSerias, 'seria'))
const mediaOptions = computed(() => toOptions(mediaStore.listMedia, 'media'))
const statusOptions = computed(() => toOptions(statusesStore.listStatuses, 'status'))
const locationOptions = computed(() => toOptions(locationsStore.listLocations, 'location'))
const tagOptions = computed(() => toOptions(tagsStore.listTags, 'tags'))

const activeFiltersCount = computed(() =>
  [fSeria, fMedia, fStatus, fLocation, fTags].filter(r => r.value.length).length
  + [fPriceFrom, fPriceTo, fSold].filter(r => r.value !== null && r.value !== undefined && r.value !== '').length)

function resetFilters() {
  fSeria.value = []
  fMedia.value = []
  fStatus.value = []
  fLocation.value = []
  fTags.value = []
  fPriceFrom.value = null
  fPriceTo.value = null
  fSold.value = null
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return works.value.filter(w => {
    if (q && !(w.name || '').toLowerCase().includes(q)) return false
    if (fSeria.value.length && !fSeria.value.includes(w.seria)) return false
    if (fMedia.value.length && !fMedia.value.includes(w.media)) return false
    if (fStatus.value.length && !fStatus.value.includes(w.status)) return false
    if (fLocation.value.length && !fLocation.value.includes(w.location)) return false
    if (fTags.value.length && !(w.tags || []).some(id => fTags.value.includes(id))) return false
    if (fPriceFrom.value != null && !(Number(w.price) >= fPriceFrom.value)) return false
    if (fPriceTo.value != null && !(Number(w.price) <= fPriceTo.value)) return false
    if (fSold.value === 'sold' && !w.sale) return false
    // в наличии — остались экземпляры (у тиража часть может быть продана)
    if (fSold.value === 'available' && availableOf(w) <= 0) return false
    return true
  })
})

// === Сортировка ===
const SORT_OPTIONS = [
  { label: 'По дате добавления', value: 'ctime' },
  { label: 'По названию', value: 'name' },
  { label: 'По году', value: 'year' },
  { label: 'По цене', value: 'price' },
  { label: 'По статусу', value: 'status' },
]
const sortKey = ref('ctime')
const sortDesc = ref(true)
watch(sortKey, (k) => { sortDesc.value = k === 'ctime' })

const statusById = computed(() => new Map((statusesStore.listStatuses || []).map(s => [s.id, s])))
const statusOf = (w) => statusById.value.get(w.status) || null
const seriaName = (id) => (seriasStore.listSerias || []).find(s => s.id === id)?.name || ''

const sorted = computed(() => {
  const k = sortKey.value
  const val = (w) => {
    if (k === 'name') return (w.name || '').toLowerCase()
    if (k === 'year') return Number(w.year) || 0
    if (k === 'price') return Number(w.price) || 0
    if (k === 'status') return (statusOf(w)?.name || '').toLowerCase()
    return w.ctime ? new Date(w.ctime).getTime() : 0
  }
  const list = [...filtered.value].sort((a, b) => {
    const x = val(a)
    const y = val(b)
    if (typeof x === 'string') return x.localeCompare(y, 'ru')
    return x - y
  })
  return sortDesc.value ? list.reverse() : list
})

// === Выбор ===
const selected = ref([])
const allSelected = computed(() => sorted.value.length > 0 && sorted.value.every(w => selected.value.includes(w.id)))
const someSelected = computed(() => !allSelected.value && sorted.value.some(w => selected.value.includes(w.id)))
function toggle(id, on) {
  selected.value = on ? [...new Set([...selected.value, id])] : selected.value.filter(x => x !== id)
}
function toggleAll(on) {
  const ids = sorted.value.map(w => w.id)
  selected.value = on ? [...new Set([...selected.value, ...ids])] : selected.value.filter(id => !ids.includes(id))
}
// Выбраны только видимые работы: поменяли фильтр/поиск, удалили работу или
// сменили ей художника — скрытые снимаются с выбора
watch(filtered, (list) => {
  if (!selected.value.length) return
  const visible = new Set(list.map(w => w.id))
  const kept = selected.value.filter(id => visible.has(id))
  if (kept.length !== selected.value.length) selected.value = kept
})

const createCollection = () => router.push({ name: 'edit-collection', params: { id: 'new' }, query: { works: selected.value.join(',') } })
const createExhibition = () => router.push({ name: 'edit-exhibition', params: { id: 'new' }, query: { works: selected.value.join(',') } })
const addWork = () => router.push({ name: 'edit-work', params: { id: 'new' }, query: { artist: props.artistId } })
const openWork = (w) => router.push({ name: 'edit-work', params: { id: w.id } })

const isBulkOpen = ref(false)
function onBulkDone() {
  selected.value = []
  emit('changed')
}

const saleOpen = ref(false)
const saleWork = ref(null)
function openSale(w) {
  saleWork.value = w
  saleOpen.value = true
}

const certOpen = ref(false)
const certWork = ref(null)
function openCertificate(w) {
  certWork.value = w
  certOpen.value = true
}

// техника · размер · год; неразрывный пробел держит высоту строки
const metaLine = (w) => [w.technique, w.size, w.year].filter(Boolean).join(' · ') || '\u00a0'
const chipStyle = (color) => (color ? { background: `${color}22`, color, borderColor: `${color}55` } : {})
</script>

<style scoped>
.aw-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.aw-search-row {
  display: flex;
  gap: 8px;
}

.aw-search {
  width: 220px;
}

.aw-select {
  width: 170px;
}

.aw-select-sm {
  width: 140px;
}

.aw-price {
  width: 110px;
}

.aw-reset {
  padding: 0 4px;
}

.aw-filters-toggle {
  position: relative;
}

.aw-filters-toggle-active {
  border-color: var(--accent, #8a6d2f);
  color: var(--accent, #8a6d2f);
}

.aw-filters-count {
  margin-left: 4px;
  font-size: 12px;
  font-weight: 600;
}

.aw-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: var(--bg-elevated, #fff);
  border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
  border-radius: 10px;
}

.aw-count {
  font-size: 13px;
  color: var(--text-faint, #7c7669);
}

.aw-sort {
  display: flex;
  align-items: center;
  gap: 6px;
}

.aw-sort-select {
  width: 180px;
}

.aw-add {
  margin-left: auto;
}

.aw-selection {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: rgba(138, 109, 47, 0.1);
  border: 1px solid rgba(138, 109, 47, 0.3);
  border-radius: 10px;
  backdrop-filter: blur(6px);
}

.aw-selection-count {
  font-weight: 600;
  color: var(--accent-strong, #6f581f);
  margin-right: 4px;
}

.aw-empty {
  padding: 40px 0;
  text-align: center;
  color: var(--text-faint, #7c7669);
}

.aw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
}

.aw-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated, #fff);
  border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.aw-tile:hover {
  border-color: var(--accent, #8a6d2f);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.aw-tile-selected {
  border-color: var(--accent, #8a6d2f);
  box-shadow: 0 0 0 2px var(--accent, #8a6d2f);
}

.aw-check {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  display: flex;
  padding: 2px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 6px;
}

.aw-img {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--card-bg, #efece4);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.aw-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.aw-img-empty {
  font-size: 28px;
  color: var(--text-dim, #a29c8c);
}

.aw-sold {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: rgba(180, 60, 60, 0.9);
  border-radius: 999px;
}

.aw-body {
  padding: 8px 10px 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.aw-name {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 16px;
  color: var(--text-title, #211f1a);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aw-sub {
  font-size: 12px;
  color: var(--text-faint, #7c7669);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aw-line {
  min-height: 22px;
  display: flex;
  align-items: center;
}

.aw-status {
  max-width: 100%;
  padding: 1px 8px;
  font-size: 11px;
  border: 1px solid transparent;
  border-radius: 999px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgba(138, 109, 47, 0.1);
  color: var(--accent, #8a6d2f);
}

.aw-price-line {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent, #8a6d2f);
}

.aw-actions {
  display: flex;
  gap: 6px;
  padding: 6px 10px 10px;
  margin-top: 4px;
  border-top: 1px solid var(--border-soft, rgba(0, 0, 0, 0.06));
}

.aw-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
  border-radius: 8px;
  background: transparent;
  color: var(--accent, #8a6d2f);
  cursor: pointer;
}

.aw-btn:hover {
  border-color: var(--accent, #8a6d2f);
}

.aw-btn-sale-done {
  color: #fff;
  background: #2f8a35;
  border-color: #2f8a35;
}

.aw :deep(.ant-checkbox-checked .ant-checkbox-inner) {
  background: var(--accent, #8a6d2f);
  border-color: var(--accent, #8a6d2f);
}

.aw :deep(.ant-checkbox-indeterminate .ant-checkbox-inner::after) {
  background-color: var(--accent, #8a6d2f);
}

@media (max-width: 768px) {
  .aw-search-row {
    width: 100%;
  }

  .aw-search {
    flex: 1;
    width: auto;
  }

  .aw-select,
  .aw-select-sm {
    width: calc(50% - 4px);
  }

  .aw-price {
    width: calc(50% - 4px);
  }

  .aw-add {
    margin-left: 0;
  }

  .aw-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .aw-name {
    font-size: 14px;
  }
}
</style>
