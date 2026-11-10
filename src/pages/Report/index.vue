<template>
  <div class="report-page">
    <a-spin :spinning="!report && loadingReport">
      <template v-if="report">
        <!-- Шапка -->
        <div class="page-header">
          <div class="header-left">
            <div class="page-header-top">
              <MobileMenuButton />
              <a-button type="text" class="back-btn" @click="goBack"><ArrowLeftOutlined /></a-button>
              <a-input
                v-model:value="name"
                class="name-input"
                :bordered="false"
                :maxlength="200"
                @blur="saveName"
                @press-enter="(e) => e.target.blur()"
              />
            </div>
            <div class="save-state">
              <template v-if="saving"><LoadingOutlined spin /> Сохранение…</template>
              <template v-else-if="computing"><LoadingOutlined spin /> Пересчёт…</template>
              <template v-else>Изменения сохраняются автоматически</template>
            </div>
          </div>
          <div class="header-actions">
            <div class="currency-pick">
              <span class="currency-label">Валюта отчёта</span>
              <a-select :value="currency" :options="CURRENCY_OPTIONS" style="width: 120px" @change="changeCurrency" />
            </div>
            <a-button type="primary" :loading="exporting" @click="exportXlsx">
              <template #icon><DownloadOutlined /></template>
              Скачать Excel
            </a-button>
          </div>
        </div>

        <!-- Фильтры -->
        <section class="card">
          <!-- На телефоне фильтры свёрнуты, чтобы итоги были видны сразу -->
          <button v-if="isMobile" type="button" class="filters-toggle" @click="filtersOpen = !filtersOpen">
            <span class="card-heading">Фильтры</span>
            <span class="filters-summary">{{ filtersSummary }}</span>
            <DownOutlined class="filters-chevron" :class="{ open: filtersOpen }" />
          </button>
          <div v-else class="card-heading">Фильтры</div>
          <div v-show="!isMobile || filtersOpen">
          <div class="period-row">
            <a-radio-group :value="activePreset" button-style="solid" size="small" @change="(e) => applyPreset(e.target.value)">
              <a-radio-button v-for="p in PERIOD_PRESETS" :key="p.key" :value="p.key">{{ p.label }}</a-radio-button>
            </a-radio-group>
            <a-range-picker
              :value="[filters.date_from, filters.date_to]"
              format="DD.MM.YYYY"
              value-format="YYYY-MM-DD"
              :allow-empty="[true, true]"
              :placeholder="['с начала', 'по сегодня']"
              @change="onRangeChange"
            />
          </div>

          <div class="filters-grid">
            <a-select v-model:value="filters.artists" mode="multiple" allow-clear placeholder="Художники"
              max-tag-count="responsive" :options="artistOptions" :filter-option="filterByLabel" />
            <a-select v-model:value="filters.series" mode="multiple" allow-clear placeholder="Серии"
              max-tag-count="responsive" :options="seriaOptions" :filter-option="filterByLabel" />
            <a-select v-model:value="filters.media" mode="multiple" allow-clear placeholder="Медиа"
              max-tag-count="responsive" :options="mediaOptions" :filter-option="filterByLabel" />
            <a-select v-model:value="filters.contacts" mode="multiple" allow-clear placeholder="Покупатели"
              max-tag-count="responsive" :options="contactOptions" :filter-option="filterByLabel" />
            <a-select v-model:value="filters.sold_by" mode="multiple" allow-clear placeholder="Кто оформил"
              max-tag-count="responsive" :options="soldByOptions" :filter-option="filterByLabel" />
            <a-select v-model:value="filters.currencies" mode="multiple" allow-clear placeholder="Валюта сделки"
              max-tag-count="responsive" :options="CURRENCY_OPTIONS" />
          </div>

          <div class="filters-grid filters-grid-narrow">
            <div class="filter-group">
              <span class="filter-label">Скидка</span>
              <a-radio-group v-model:value="filters.discount" size="small">
                <a-radio-button value="any">Все</a-radio-button>
                <a-radio-button value="none">Без скидки</a-radio-button>
                <a-radio-button value="with">Со скидкой</a-radio-button>
              </a-radio-group>
            </div>
            <div class="filter-group">
              <span class="filter-label">Скидка, %</span>
              <a-input-number v-model:value="filters.discount_min" placeholder="от" :min="0" :max="100" style="width: 80px" />
              <a-input-number v-model:value="filters.discount_max" placeholder="до" :min="0" :max="100" style="width: 80px" />
            </div>
            <div class="filter-group">
              <span class="filter-label">Цена продажи, {{ currencySign }}</span>
              <a-input-number v-model:value="filters.price_min" placeholder="от" :min="0" style="width: 110px" />
              <a-input-number v-model:value="filters.price_max" placeholder="до" :min="0" style="width: 110px" />
            </div>
            <a-button v-if="hasActiveFilters" type="link" @click="resetFilters">Сбросить фильтры</a-button>
          </div>
          </div>
        </section>

        <!-- Курсы -->
        <section class="card">
          <div class="card-heading-row">
            <div class="card-heading">Курсы валют этого отчёта</div>
            <a-button size="small" :loading="suggesting" @click="suggestRates">Подставить из прошлого отчёта</a-button>
          </div>
          <div v-if="rateCurrencies.length" class="rates-grid">
            <div v-for="cur in rateCurrencies" :key="cur" class="rate-item" :class="{ 'rate-missing': !rates[cur] }">
              <span class="rate-label">1 {{ cur }} =</span>
              <a-input-number
                v-model:value="rates[cur]"
                :min="0"
                :step="0.01"
                :precision="6"
                :formatter="formatRate"
                placeholder="курс"
                style="width: 130px"
              />
              <span class="rate-label">{{ currency }}</span>
            </div>
          </div>
          <p v-else class="muted">В отчёт попали продажи только в {{ currency }} — курсы не нужны.</p>
        </section>

        <a-alert
          v-if="data?.summary?.missing_rates?.length"
          type="warning"
          show-icon
          class="missing-alert"
          :message="missingRatesText"
          description="Задайте курс выше — эти продажи войдут в итог. В таблице они показаны без пересчёта."
        />

        <!-- Сводка -->
        <a-spin :spinning="computing && !data">
          <div v-if="data" class="kpi-grid">
            <div class="kpi kpi-main">
              <div class="kpi-label">Выручка</div>
              <div class="kpi-value">{{ formatMoney(summary.total, currency) }}</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Продаж</div>
              <div class="kpi-value">{{ summary.count }}</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Средний чек</div>
              <div class="kpi-value">{{ formatMoney(summary.avg_check, currency) }}</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Средняя скидка</div>
              <div class="kpi-value">{{ formatPct(summary.avg_discount_pct) }}</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Сумма скидок</div>
              <div class="kpi-value">{{ formatMoney(summary.discount_amount, currency) }}</div>
            </div>
          </div>

          <section v-if="data" class="card">
            <a-tabs v-model:activeKey="tab">
              <a-tab-pane key="sales" :tab="`Продажи (${data.rows.length})`">
                <!-- Телефон: карточки продаж вместо широкой таблицы -->
                <div v-if="isMobile" class="m-sales">
                  <div v-if="!data.rows.length" class="m-sales-empty">Нет продаж под выбранные фильтры</div>
                  <div v-for="row in data.rows" :key="row.sale_id" class="m-sale" @click="openWork(row)">
                    <img v-if="row.avatar_url" :src="row.avatar_url" class="m-sale-img" />
                    <div v-else class="m-sale-img m-sale-img-empty"><PictureOutlined /></div>
                    <div class="m-sale-body">
                      <div class="m-sale-name">{{ row.art_name }}</div>
                      <div class="m-sale-sub">{{ formatDate(row.sale_date) }} · {{ row.artist?.name || 'Художник не указан' }}</div>
                      <div class="m-sale-prices">
                        <b v-if="row.sale_price_converted !== null">{{ formatMoney(row.sale_price_converted, currency) }}</b>
                        <span v-else class="no-rate">нет курса {{ row.currency }}</span>
                        <span v-if="row.currency !== currency" class="m-sale-orig">{{ formatMoney(row.sale_price, row.currency) }}</span>
                        <span v-if="row.discount_pct > 0" class="discount-pos">−{{ formatPct(row.discount_pct) }}</span>
                      </div>
                      <div v-if="row.contact" class="m-sale-sub">Покупатель: {{ row.contact.name }}</div>
                    </div>
                  </div>
                </div>
                <a-table
                  v-else
                  :columns="salesColumns"
                  :data-source="data.rows"
                  row-key="sale_id"
                  size="small"
                  :scroll="{ x: 1100 }"
                  :pagination="{ pageSize: 50, hideOnSinglePage: true, showSizeChanger: false }"
                  :custom-row="(row) => ({ onClick: () => openWork(row), class: 'clickable-row' })"
                  :locale="{ emptyText: 'Нет продаж под выбранные фильтры' }"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'date'">{{ formatDate(record.sale_date) }}</template>
                    <template v-else-if="column.key === 'work'">
                      <div class="work-cell">
                        <img v-if="record.avatar_url" :src="record.avatar_url" class="work-thumb" />
                        <div v-else class="work-thumb work-thumb-empty"><PictureOutlined /></div>
                        <div class="work-cell-text">
                          <div class="work-name">{{ record.art_name }}</div>
                          <div class="work-artist">{{ record.artist?.name || 'Художник не указан' }}</div>
                        </div>
                      </div>
                    </template>
                    <template v-else-if="column.key === 'list'">{{ formatMoney(record.list_price, record.currency) }}</template>
                    <template v-else-if="column.key === 'sale'">{{ formatMoney(record.sale_price, record.currency) }}</template>
                    <template v-else-if="column.key === 'discount'">
                      <template v-if="record.discount_pct > 0">
                        <div class="discount-pos">−{{ formatPct(record.discount_pct) }}</div>
                        <div class="discount-amount">{{ formatMoney(record.discount_amount, record.currency) }}</div>
                      </template>
                      <span v-else>—</span>
                    </template>
                    <template v-else-if="column.key === 'converted'">
                      <b v-if="record.sale_price_converted !== null">{{ formatMoney(record.sale_price_converted, currency) }}</b>
                      <span v-else class="no-rate">нет курса {{ record.currency }}</span>
                    </template>
                    <template v-else-if="column.key === 'buyer'">{{ record.contact?.name || '—' }}</template>
                    <template v-else-if="column.key === 'sold_by'">{{ personName(record.sold_by) }}</template>
                  </template>
                </a-table>
              </a-tab-pane>

              <a-tab-pane key="artists" tab="По художникам">
                <a-table :columns="groupColumns('Художник')" :data-source="artistRows" row-key="key" size="small" :pagination="false" />
              </a-tab-pane>

              <a-tab-pane key="months" tab="По месяцам">
                <div v-if="monthRows.length" class="month-bars">
                  <div v-for="m in monthRows" :key="m.key" class="month-bar-row">
                    <span class="month-bar-label">{{ m.name }}</span>
                    <div class="month-bar-track">
                      <div class="month-bar" :style="{ width: `${maxMonthTotal ? (m.totalRaw / maxMonthTotal) * 100 : 0}%` }" />
                    </div>
                    <span class="month-bar-value">{{ m.total }}</span>
                  </div>
                </div>
                <a-table :columns="groupColumns('Месяц')" :data-source="monthRows" row-key="key" size="small" :pagination="false" />
              </a-tab-pane>

              <a-tab-pane key="currencies" tab="По валютам">
                <a-table :columns="currencyColumns" :data-source="currencyRows" row-key="currency" size="small" :pagination="false" />
              </a-tab-pane>
            </a-tabs>
          </section>
        </a-spin>
      </template>
    </a-spin>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ArrowLeftOutlined, DownloadOutlined, LoadingOutlined, PictureOutlined, DownOutlined,
} from '@ant-design/icons-vue'
import { useIsMobile } from '@/composables/useIsMobile.js'
import MobileMenuButton from '@/components/MobileMenuButton.vue'
import apiClient from '@/services/api.js'
import { useReport } from '@/stores/report.js'
import { useArtist } from '@/stores/artist.js'
import { useSerias } from '@/stores/seria.js'
import { useMedia } from '@/stores/media.js'
import { useContact } from '@/stores/contact.js'
import {
  CURRENCIES, CURRENCY_OPTIONS, CURRENCY_SIGNS, formatDate, formatMoney, formatMonth, formatPct,
} from '@/utils/money.js'
import { PERIOD_PRESETS, presetRange, matchPreset } from '@/utils/reportPeriods.js'

const route = useRoute()
const router = useRouter()
const reportStore = useReport()
const artistStore = useArtist()
const seriaStore = useSerias()
const mediaStore = useMedia()
const contactStore = useContact()

const reportId = computed(() => route.params.id)

const EMPTY_FILTERS = () => ({
  date_from: null, date_to: null,
  artists: [], series: [], media: [], contacts: [], sold_by: [], currencies: [],
  discount: 'any', discount_min: null, discount_max: null, price_min: null, price_max: null,
})

const report = ref(null)
const name = ref('')
const currency = ref('BYN')
const filters = reactive(EMPTY_FILTERS())
const rates = reactive({})
const data = ref(null)

const loadingReport = ref(false)
const saving = ref(false)
const computing = ref(false)
const exporting = ref(false)
const suggesting = ref(false)
const tab = ref('sales')

// Пока применяем ответ сервера к локальному состоянию — вотчеры не должны
// принимать это за правку пользователя и отправлять сохранение обратно
let applyingServer = false

function applyReport(r) {
  applyingServer = true
  report.value = r
  name.value = r.name
  currency.value = r.currency
  Object.assign(filters, EMPTY_FILTERS(), r.filters || {})
  for (const key of Object.keys(rates)) delete rates[key]
  Object.assign(rates, r.rates || {})
  // снимаем флаг после того, как отработают вотчеры этого тика
  setTimeout(() => { applyingServer = false })
}

// ---------- загрузка ----------
let computeSeq = 0
async function loadData() {
  const seq = ++computeSeq
  computing.value = true
  try {
    const result = await reportStore.getReportData(reportId.value)
    if (seq !== computeSeq || !result) return
    data.value = result
    rememberSoldBy(result.rows)
  } finally {
    if (seq === computeSeq) computing.value = false
  }
}

onMounted(async () => {
  loadingReport.value = true
  const r = await reportStore.getReport(reportId.value)
  loadingReport.value = false
  if (!r) {
    router.push({ name: 'reports' })
    return
  }
  applyReport(r)
  loadData()

  // справочники для фильтров
  if (!artistStore.listArtists.length) artistStore.getListArtists()
  if (!seriaStore.listSerias.length) seriaStore.getListSerias()
  if (!mediaStore.listMedia.length) mediaStore.getListMedia()
  if (!contactStore.listContacts.length) contactStore.getListContacts()
})

// ---------- автосохранение ----------
let pendingPatch = {}
let saveTimer = null
let saveSeq = 0

function scheduleSave(patch, delay = 500) {
  Object.assign(pendingPatch, patch)
  clearTimeout(saveTimer)
  saveTimer = setTimeout(flushSave, delay)
}

async function flushSave() {
  clearTimeout(saveTimer)
  const patch = pendingPatch
  pendingPatch = {}
  if (!Object.keys(patch).length) return

  const seq = ++saveSeq
  saving.value = true
  try {
    const updated = await reportStore.updateReport(reportId.value, patch)
    if (seq !== saveSeq) return
    if (updated) {
      // валюта/курсы могли пересчитаться на сервере — берём их оттуда;
      // фильтры и название оставляем локальные (пользователь мог уже
      // продолжить ввод)
      applyingServer = true
      report.value = updated
      currency.value = updated.currency
      for (const key of Object.keys(rates)) delete rates[key]
      Object.assign(rates, updated.rates || {})
      setTimeout(() => { applyingServer = false })
      loadData()
    } else {
      // ошибка уже показана — возвращаем сохранённое состояние
      const fresh = await reportStore.getReport(reportId.value)
      if (fresh) applyReport(fresh)
    }
  } finally {
    if (seq === saveSeq) saving.value = false
  }
}

onBeforeUnmount(() => {
  // не теряем последнюю правку при уходе со страницы
  if (Object.keys(pendingPatch).length) flushSave()
})

const cleanFilters = () => JSON.parse(JSON.stringify(filters))

watch(filters, () => {
  if (applyingServer) return
  scheduleSave({ filters: cleanFilters() })
}, { deep: true })

watch(rates, () => {
  if (applyingServer) return
  const clean = {}
  for (const [cur, value] of Object.entries(rates)) {
    if (value !== null && value !== undefined && value !== '' && Number(value) > 0) clean[cur] = Number(value)
  }
  scheduleSave({ rates: clean }, 800)
}, { deep: true })

function saveName() {
  const trimmed = name.value.trim()
  if (!trimmed) {
    name.value = report.value.name
    message.warning('Название не может быть пустым')
    return
  }
  if (trimmed !== report.value.name) scheduleSave({ name: trimmed }, 0)
}

// Смена валюты — курсы пересчитывает сервер (кроме неотправленных правок курсов)
function changeCurrency(value) {
  if (value === currency.value) return
  delete pendingPatch.rates
  currency.value = value
  scheduleSave({ currency: value }, 0)
}

// ---------- период ----------
const activePreset = computed(() => matchPreset(filters.date_from, filters.date_to))

function applyPreset(key) {
  const [from, to] = presetRange(key)
  filters.date_from = from
  filters.date_to = to
}

function onRangeChange(value) {
  filters.date_from = value?.[0] || null
  filters.date_to = value?.[1] || null
}

const { isMobile } = useIsMobile()
const filtersOpen = ref(false)
// Подпись свёрнутых фильтров: период + отметка, что заданы другие фильтры
const filtersSummary = computed(() => {
  const preset = PERIOD_PRESETS.find(p => p.key === activePreset.value)
  const period = preset
    ? preset.label
    : `${filters.date_from ? formatDate(filters.date_from) : '…'} — ${filters.date_to ? formatDate(filters.date_to) : '…'}`
  return hasActiveFilters.value ? `${period} · есть фильтры` : period
})

const hasActiveFilters = computed(() => {
  const f = filters
  return f.artists.length || f.series.length || f.media.length || f.contacts.length || f.sold_by.length
    || f.currencies.length || f.discount !== 'any' || f.discount_min !== null || f.discount_max !== null
    || f.price_min !== null || f.price_max !== null
})

function resetFilters() {
  Object.assign(filters, { ...EMPTY_FILTERS(), date_from: filters.date_from, date_to: filters.date_to })
}

// ---------- опции фильтров ----------
const toOptions = (list) => list.map(x => ({ value: x.id, label: x.name || 'Без названия' }))
const artistOptions = computed(() => toOptions(artistStore.listArtists))
const seriaOptions = computed(() => toOptions(seriaStore.listSerias))
const mediaOptions = computed(() => toOptions(mediaStore.listMedia))
const contactOptions = computed(() => contactStore.listContacts.map(c => ({
  value: c.id,
  label: [c.name, c.company].filter(Boolean).join(' · ') || 'Без имени',
})))

// Кто оформлял продажи — отдельного справочника нет, собираем из уже
// виденных строк отчёта (и не теряем выбранных, когда фильтр их скрыл)
const soldByKnown = reactive({})
function rememberSoldBy(rows) {
  for (const row of rows || []) {
    if (row.sold_by) soldByKnown[row.sold_by.id] = personName(row.sold_by)
  }
}
const soldByOptions = computed(() => Object.entries(soldByKnown).map(([value, label]) => ({ value, label })))

const filterByLabel = (input, option) => String(option.label).toLowerCase().includes(input.toLowerCase())

// ---------- курсы ----------
// Валюты, для которых нужен курс: встречаются в данных отчёта или уже
// заданы в нём (валюта отчёта — всегда 1, её не показываем)
const rateCurrencies = computed(() => {
  const set = new Set([...(data.value?.currencies_in_data || []), ...Object.keys(rates)])
  set.delete(currency.value)
  return CURRENCIES.filter(c => set.has(c))
})

const formatRate = (value) => {
  if (value === null || value === undefined || value === '') return ''
  // без хвостовых нулей: 3.250000 -> 3.25
  return String(Number(value))
}

async function suggestRates() {
  suggesting.value = true
  try {
    const resp = await apiClient.get('/api/v1/reports/suggested-rates', {
      params: { currency: currency.value, exclude: reportId.value },
    })
    const { rates: suggested, from_report: from } = resp.data || {}
    if (!from || !Object.keys(suggested || {}).length) {
      message.info('В других ваших отчётах курсы ещё не заданы')
      return
    }
    for (const [cur, value] of Object.entries(suggested)) {
      if (cur !== currency.value) rates[cur] = value
    }
    message.success(`Курсы подставлены из отчёта «${from.name}»`)
  } catch {
    message.error('Не удалось получить курсы')
  } finally {
    suggesting.value = false
  }
}

// ---------- сводка и таблицы ----------
const summary = computed(() => data.value?.summary || {})
const currencySign = computed(() => CURRENCY_SIGNS[currency.value] || currency.value)

const missingRatesText = computed(() => {
  const list = summary.value.missing_rates || []
  const total = list.reduce((acc, m) => acc + m.count, 0)
  return `${total} ${pluralSales(total)} без курса (${list.map(m => `${m.currency} — ${m.count}`).join(', ')}) не вошли в итог`
})

function pluralSales(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'продажа'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'продажи'
  return 'продаж'
}

const salesColumns = computed(() => [
  { title: 'Дата', key: 'date', width: 100, sorter: (a, b) => a.sale_date.localeCompare(b.sale_date), defaultSortOrder: 'descend' },
  { title: 'Работа', key: 'work', width: 260 },
  { title: 'Цена работы', key: 'list', width: 120, align: 'right' },
  { title: 'Продажа', key: 'sale', width: 110, align: 'right', sorter: (a, b) => a.sale_price - b.sale_price },
  { title: 'Скидка', key: 'discount', width: 110, align: 'right', sorter: (a, b) => (a.discount_pct ?? -1e9) - (b.discount_pct ?? -1e9) },
  { title: `В ${currency.value}`, key: 'converted', width: 130, align: 'right', sorter: (a, b) => (a.sale_price_converted ?? -1) - (b.sale_price_converted ?? -1) },
  { title: 'Покупатель', key: 'buyer', width: 150 },
  { title: 'Оформил(а)', key: 'sold_by', width: 140 },
])

function groupColumns(firstTitle) {
  return [
    { title: firstTitle, dataIndex: 'name', key: 'name' },
    { title: 'Продаж', dataIndex: 'count', key: 'count', align: 'right', width: 90 },
    { title: `Сумма, ${currency.value}`, dataIndex: 'total', key: 'total', align: 'right', width: 160 },
    { title: 'Без курса', dataIndex: 'noRate', key: 'noRate', align: 'right', width: 100 },
  ]
}

const artistRows = computed(() => (summary.value.by_artist || []).map(g => ({
  key: g.artist?.id || 'none',
  name: g.artist?.name || 'Не указан',
  count: g.count,
  total: formatMoney(g.total, currency.value),
  noRate: g.count_without_rate || '',
})))

const monthRows = computed(() => (summary.value.by_month || []).map(g => ({
  key: g.month,
  name: formatMonth(g.month),
  count: g.count,
  totalRaw: g.total,
  total: formatMoney(g.total, currency.value),
  noRate: g.count_without_rate || '',
})))
const maxMonthTotal = computed(() => Math.max(0, ...monthRows.value.map(m => m.totalRaw)))

const currencyColumns = computed(() => [
  { title: 'Валюта сделки', dataIndex: 'currency', key: 'currency' },
  { title: 'Продаж', dataIndex: 'count', key: 'count', align: 'right', width: 90 },
  { title: 'Сумма в валюте', dataIndex: 'original', key: 'original', align: 'right' },
  { title: `Курс к ${currency.value}`, dataIndex: 'rate', key: 'rate', align: 'right' },
  { title: `Сумма, ${currency.value}`, dataIndex: 'total', key: 'total', align: 'right' },
])

const currencyRows = computed(() => (summary.value.by_currency || []).map(g => ({
  currency: g.currency,
  count: g.count,
  original: formatMoney(g.total_original, g.currency),
  rate: g.rate ? formatRate(g.rate) : 'нет курса',
  total: g.rate ? formatMoney(g.total, currency.value) : '—',
})))

function personName(p) {
  return p ? [p.name, p.surname].filter(Boolean).join(' ') || '—' : '—'
}

function openWork(row) {
  router.push({ name: 'edit-work', params: { id: row.art_id } })
}

function goBack() {
  router.push({ name: 'reports' })
}

async function exportXlsx() {
  // сначала дописываем несохранённые правки — файл должен совпасть с экраном
  if (Object.keys(pendingPatch).length) await flushSave()
  exporting.value = true
  try {
    await reportStore.exportReport(reportId.value, name.value)
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.report-page {
  --bg: #f7f5f0;
  --bg-elevated: #ffffff;
  --card-bg: #efece4;
  --text-title: #211f1a;
  --text-muted: #5a564c;
  --text-faint: #7c7669;
  --accent: #8a6d2f;
  --border-soft: rgba(0, 0, 0, 0.07);

  min-height: 100vh;
  background: var(--bg);
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.header-left {
  flex: 1;
  min-width: 260px;
}

.page-header-top {
  display: flex;
  align-items: center;
  gap: 4px;
}

.back-btn {
  color: var(--text-muted);
}

.name-input {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-title);
  padding-left: 4px;
}

.name-input:hover,
.name-input:focus {
  background: var(--bg-elevated);
}

.save-state {
  margin: 2px 0 0 44px;
  font-size: 12px;
  color: var(--text-faint);
}

.header-actions {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.currency-pick {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.currency-label,
.filter-label {
  font-size: 12px;
  color: var(--text-faint);
}

.card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 12px;
}

.card-heading {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}

.card-heading-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.period-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 12px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.filters-grid-narrow {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  margin-bottom: 0;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.rates-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
}

.rate-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 8px;
}

.rate-missing {
  background: #fdf3e7;
  outline: 1px dashed #d8a24a;
}

.rate-label {
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.muted {
  margin: 0;
  color: var(--text-faint);
}

.missing-alert {
  margin-bottom: 12px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.kpi {
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 12px 14px;
}

.kpi-main {
  background: var(--card-bg);
}

.kpi-label {
  font-size: 12px;
  color: var(--text-faint);
}

.kpi-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-title);
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}

.work-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.work-thumb {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.work-thumb-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg);
  color: var(--text-faint);
}

.work-cell-text {
  min-width: 0;
}

.work-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-artist {
  font-size: 12px;
  color: var(--text-faint);
}

.discount-amount {
  font-size: 12px;
  color: #7c7669;
}

.discount-pos {
  color: #b4441c;
}

.no-rate {
  color: #b4441c;
  font-size: 12px;
}

:deep(.clickable-row) {
  cursor: pointer;
}

.month-bars {
  display: grid;
  gap: 6px;
  margin-bottom: 16px;
}

.month-bar-row {
  display: grid;
  grid-template-columns: 130px 1fr 130px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.month-bar-track {
  height: 10px;
  background: var(--card-bg);
  border-radius: 5px;
  overflow: hidden;
}

.month-bar {
  height: 100%;
  background: var(--accent);
  border-radius: 5px;
}

.month-bar-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 600px) {
  .report-page {
    padding: 16px;
  }

  .month-bar-row {
    grid-template-columns: 90px 1fr 100px;
  }
}

/* === Телефон === */
.filters-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  background: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.filters-toggle .card-heading {
  margin: 0;
}

.filters-summary {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #5a564c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
}

.filters-chevron {
  color: #7c7669;
  transition: transform 0.2s;
}

.filters-chevron.open {
  transform: rotate(180deg);
}

.m-sales {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-sales-empty {
  padding: 16px 0;
  text-align: center;
  color: #7c7669;
}

.m-sale {
  display: flex;
  gap: 10px;
  padding: 10px;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 10px;
  background: #fff;
}

.m-sale-img {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.m-sale-img-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #efece4;
  color: #7c7669;
}

.m-sale-body {
  flex: 1;
  min-width: 0;
}

.m-sale-name {
  font-weight: 600;
  color: #211f1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.m-sale-sub {
  font-size: 12px;
  color: #7c7669;
}

.m-sale-prices {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-top: 2px;
}

.m-sale-orig {
  font-size: 12px;
  color: #7c7669;
}

@media (max-width: 768px) {
  /* Быстрые периоды — одной прокручиваемой строкой, а не «лесенкой» */
  .period-row :deep(.ant-radio-group) {
    display: flex;
    overflow-x: auto;
    max-width: 100%;
    padding-bottom: 4px;
  }

  .period-row :deep(.ant-radio-button-wrapper) {
    flex-shrink: 0;
  }

  .period-row :deep(.ant-picker) {
    width: 100%;
  }
}
</style>
