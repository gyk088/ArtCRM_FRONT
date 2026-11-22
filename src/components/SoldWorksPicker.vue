<template>
  <a-modal
    :open="open"
    title="Работы для отчёта — только проданные"
    :width="isMobile ? '96vw' : '1300px'"
    centered
    ok-text="Сохранить"
    cancel-text="Отмена"
    class="sold-picker"
    @ok="apply"
    @cancel="emit('update:open', false)"
  >
    <!-- Фильтры -->
    <div class="sp-filters">
      <a-input v-model:value="search" allow-clear placeholder="Поиск по названию" class="sp-search">
        <template #prefix><SearchOutlined /></template>
      </a-input>
      <a-select v-model:value="fArtists" mode="multiple" :options="artistOptions" placeholder="Художник" allow-clear max-tag-count="responsive" option-filter-prop="label" class="sp-select" />
      <a-select v-model:value="fSeries" mode="multiple" :options="seriaOptions" placeholder="Серия" allow-clear max-tag-count="responsive" option-filter-prop="label" class="sp-select" />
      <a-select v-model:value="fMedia" mode="multiple" :options="mediaOptions" placeholder="Медиа" allow-clear max-tag-count="responsive" option-filter-prop="label" class="sp-select" />
      <a-select v-model:value="fContacts" mode="multiple" :options="contactOptions" placeholder="Покупатель" allow-clear max-tag-count="responsive" option-filter-prop="label" class="sp-select" />
      <a-select v-model:value="fSoldBy" mode="multiple" :options="soldByOptions" placeholder="Кто продал" allow-clear max-tag-count="responsive" option-filter-prop="label" class="sp-select" />
      <a-range-picker v-model:value="fPeriod" format="DD.MM.YYYY" :placeholder="['Продано с', 'по']" class="sp-range" />
      <a-select v-model:value="fCurrencies" mode="multiple" :options="currencyOptions" placeholder="Валюта" allow-clear class="sp-select sp-select-sm" />
      <a-select v-model:value="fPaid" :options="PAID_OPTIONS" class="sp-select" />
      <a-button v-if="activeFilters" type="link" @click="resetFilters">Сбросить</a-button>
    </div>

    <div class="sp-count">
      Выбрано на экране: {{ visibleSelected }}
      <span v-if="visibleSelected !== selected.length" class="sp-count-total">
        · всего в отчёте будет {{ selected.length }} (часть скрыта фильтром)
      </span>
      <span class="sp-count-total"> · проданных работ: {{ works.length }}</span>
    </div>

    <WorksPickerTable
      v-model:selected-row-keys="selected"
      :data="filtered"
      :columns="columns"
      :locked-keys="initial"
      :loading="loading"
    >
      <template #cell="{ column, record }">
        <template v-if="column.dataIndex === 'avatar'">
          <img v-if="record.avatar" v-thumb="record.avatar" class="sp-img" alt="" />
          <span v-else class="sp-img sp-img-empty"><PictureOutlined /></span>
        </template>
        <template v-else-if="column.dataIndex === 'name'">{{ record.name || 'Без названия' }}</template>
        <template v-else-if="column.dataIndex === 'artist'">{{ record.artist?.name || '—' }}</template>
        <template v-else-if="column.dataIndex === 'sale_date'">{{ formatDate(record.sale_date) }}</template>
        <template v-else-if="column.dataIndex === 'sale_price'">
          {{ formatMoney(record.sale_price, record.currency) }}
          <div v-if="(record.sales_count || 1) > 1 || (record.quantity || 1) > 1" class="sp-qty">
            {{ record.quantity }} экз.<template v-if="record.sales_count > 1"> · {{ record.sales_count }} продаж</template>
          </div>
        </template>
        <template v-else-if="column.dataIndex === 'contact'">{{ record.contact?.name || '—' }}</template>
        <template v-else-if="column.dataIndex === 'artist_paid'">
          <span class="sp-paid" :class="{ on: record.artist_paid }">{{ record.artist_paid ? 'выплачено' : 'не выплачено' }}</span>
        </template>
        <template v-else>{{ record[column.dataIndex] }}</template>
      </template>
      <template #tile="{ record }">
        <div class="wpt-tile-name" :title="record.name">{{ record.name || 'Без названия' }}</div>
        <div class="wpt-tile-sub">{{ record.artist?.name || '—' }}</div>
        <div class="wpt-tile-sub">{{ formatDate(record.sale_date) }} · {{ formatMoney(record.sale_price, record.currency) }}</div>
      </template>
    </WorksPickerTable>
  </a-modal>
</template>

<script setup>
// Выбор проданных работ для отчёта «выбранные работы»: фильтры, плитка/таблица
import { computed, ref, watch } from 'vue'
import { SearchOutlined, PictureOutlined } from '@ant-design/icons-vue'
import WorksPickerTable from '@/components/WorksPickerTable.vue'
import { useReport } from '@/stores/report.js'
import { useIsMobile } from '@/composables/useIsMobile.js'
import { CURRENCY_OPTIONS, formatDate, formatMoney } from '@/utils/money.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  // id работ, уже входящих в отчёт
  value: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:open', 'save'])

const reportStore = useReport()
const { isMobile } = useIsMobile()

const works = ref([])
const loading = ref(false)
const selected = ref([])
const initial = ref([])

watch(() => props.open, async (isOpen) => {
  if (!isOpen) return
  selected.value = [...props.value]
  initial.value = [...props.value]
  loading.value = true
  try {
    works.value = (await reportStore.getSoldWorks()) || []
  } finally {
    loading.value = false
  }
})

// === Фильтры ===
const search = ref('')
const fArtists = ref([])
const fSeries = ref([])
const fMedia = ref([])
const fContacts = ref([])
const fSoldBy = ref([])
const fPeriod = ref(null)
const fCurrencies = ref([])
const fPaid = ref('any')
const PAID_OPTIONS = [
  { value: 'any', label: 'Выплата художнику: любая' },
  { value: 'paid', label: 'Выплачено художнику' },
  { value: 'unpaid', label: 'Не выплачено художнику' },
]
const activeFilters = computed(() => !!(search.value || fArtists.value.length || fSeries.value.length || fMedia.value.length
  || fContacts.value.length || fSoldBy.value.length || fPeriod.value || fCurrencies.value.length || fPaid.value !== 'any'))
function resetFilters() {
  search.value = ''
  fArtists.value = []
  fSeries.value = []
  fMedia.value = []
  fContacts.value = []
  fSoldBy.value = []
  fPeriod.value = null
  fCurrencies.value = []
  fPaid.value = 'any'
}

// варианты — только из проданных работ
const optionsOf = (get, label = (x) => x.name) => {
  const map = new Map()
  for (const w of works.value) {
    const x = get(w)
    if (x?.id && !map.has(x.id)) map.set(x.id, { value: x.id, label: label(x) || '—' })
  }
  return [...map.values()].sort((a, b) => String(a.label).localeCompare(String(b.label), 'ru'))
}
const personLabel = (p) => [p.name, p.surname].filter(Boolean).join(' ')
const artistOptions = computed(() => optionsOf(w => w.artist))
const seriaOptions = computed(() => optionsOf(w => w.seria))
const mediaOptions = computed(() => optionsOf(w => w.media))
const contactOptions = computed(() => optionsOf(w => w.contact))
const soldByOptions = computed(() => optionsOf(w => w.sold_by, personLabel))
const currencyOptions = computed(() => {
  const used = new Set(works.value.map(w => w.currency))
  return CURRENCY_OPTIONS.filter(o => used.has(o.value))
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const from = fPeriod.value?.[0]?.format('YYYY-MM-DD')
  const to = fPeriod.value?.[1]?.format('YYYY-MM-DD')
  const inList = (list, x) => !list.length || list.includes(x)
  return works.value.filter(w =>
    (!q || (w.name || '').toLowerCase().includes(q))
    && inList(fArtists.value, w.artist?.id)
    && inList(fSeries.value, w.seria?.id)
    && inList(fMedia.value, w.media?.id)
    && inList(fContacts.value, w.contact?.id)
    && inList(fSoldBy.value, w.sold_by?.id)
    && inList(fCurrencies.value, w.currency)
    && (!from || w.sale_date >= from)
    && (!to || w.sale_date <= to)
    && (fPaid.value === 'any' || (fPaid.value === 'paid') === w.artist_paid))
})

const visibleSelected = computed(() => {
  const picked = new Set(selected.value)
  return filtered.value.filter(w => picked.has(w.id)).length
})

const cmp = (get) => (a, b) => String(get(a) ?? '').localeCompare(String(get(b) ?? ''), 'ru')
const columns = [
  { title: ' ', dataIndex: 'avatar', key: 'avatar', width: '64px' },
  { title: 'Название', dataIndex: 'name', key: 'name', sorter: cmp(w => w.name) },
  { title: 'Художник', dataIndex: 'artist', key: 'artist', sorter: cmp(w => w.artist?.name) },
  { title: 'Дата продажи', dataIndex: 'sale_date', key: 'sale_date', width: '130px', sorter: cmp(w => w.sale_date) },
  { title: 'Цена продажи', dataIndex: 'sale_price', key: 'sale_price', width: '140px', sorter: (a, b) => (a.sale_price || 0) - (b.sale_price || 0) },
  { title: 'Покупатель', dataIndex: 'contact', key: 'contact', sorter: cmp(w => w.contact?.name) },
  { title: 'Художнику', dataIndex: 'artist_paid', key: 'artist_paid', width: '130px' },
]

function apply() {
  // порядок: как в списке проданных (свежие продажи сверху)
  const picked = new Set(selected.value)
  const ordered = works.value.filter(w => picked.has(w.id)).map(w => w.id)
  emit('save', ordered)
  emit('update:open', false)
}
</script>

<style scoped>
.sp-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.sp-search {
  width: 220px;
}

.sp-select {
  width: 180px;
}

.sp-select-sm {
  width: 130px;
}

.sp-range {
  width: 250px;
}

.sp-count {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #8a6d2f;
}

.sp-count-total {
  font-weight: 400;
  color: #7c7669;
}

.sp-img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #efece4;
  color: #a29c8c;
}

.sp-qty {
  font-size: 11px;
  color: #7c7669;
}

.sp-paid {
  font-size: 12px;
  color: #b4441c;
}

.sp-paid.on {
  color: #2f8a35;
}

@media (max-width: 768px) {
  .sp-search,
  .sp-select,
  .sp-select-sm,
  .sp-range {
    width: 100%;
  }
}
</style>

<style>
/* Модалка телепортируется в body — переменные страницы до неё не доходят;
   задаём их здесь (галочки, рамки, плитка в WorksPickerTable) */
.sold-picker {
  --accent: #8a6d2f;
  --accent-strong: #6f581f;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-body: #2c2a25;
  --text-faint: #7c7669;
  --text-dim: #a29c8c;
  --border: rgba(0, 0, 0, 0.08);
  --border-soft: rgba(0, 0, 0, 0.06);
}
</style>
