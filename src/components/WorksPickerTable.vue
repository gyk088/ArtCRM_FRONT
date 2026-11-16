<template>
  <div class="wpt-wrap">
    <!-- Панель: выбрать все, сортировка (для плитки), переключатель вида.
         На телефоне — всегда плитка, переключателя нет. -->
    <div class="wpt-toolbar">
      <a-checkbox
        v-if="isTiles"
        :checked="allSelected"
        :indeterminate="someSelected"
        @change="e => toggleSelectAll(e.target.checked)"
      >Выбрать все</a-checkbox>
      <div v-if="isTiles" class="wpt-sort">
        <a-select
          :value="sortState.key"
          :options="sortOptions"
          placeholder="Сортировка"
          allow-clear
          size="small"
          class="wpt-sort-select"
          @change="setSortKey"
        />
        <a-button
          size="small"
          :disabled="!sortState.key"
          :title="sortState.order === 'descend' ? 'По убыванию' : 'По возрастанию'"
          @click="toggleSortOrder"
        >
          <CaretDownOutlined v-if="sortState.order === 'descend'" />
          <CaretUpOutlined v-else />
        </a-button>
      </div>
      <a-radio-group v-if="!isMobile" v-model:value="viewMode" size="small" button-style="solid" class="wpt-view-switch">
        <a-radio-button value="table" title="Таблица"><UnorderedListOutlined /></a-radio-button>
        <a-radio-button value="tiles" title="Плитка"><AppstoreOutlined /></a-radio-button>
      </a-radio-group>
    </div>

    <!-- Плитка: клик по плитке — выбрать/снять. Виртуализация по рядам. -->
    <div v-if="isTiles" ref="tilesScrollRef" class="wpt-body wpt-tiles-body">
      <div v-if="!loading && sortedData.length === 0" class="wpt-empty">Работы не найдены</div>

      <div v-else :style="{ height: tilesTotalSize + 'px', position: 'relative' }">
        <div
          v-for="vRow in tileRows"
          :key="vRow.key"
          :ref="el => el && tileVirtualizer.measureElement(el)"
          :data-index="vRow.index"
          class="wpt-tiles-row"
          :style="{ gridTemplateColumns: `repeat(${tileCols}, minmax(0, 1fr))`, transform: `translateY(${vRow.start}px)` }"
        >
          <div
            v-for="record in rowItems(vRow.index)"
            :key="record.id"
            class="wpt-tile"
            :class="{ 'wpt-tile-selected': selectedRowKeys.includes(record.id) }"
            @click="toggleRow(record.id, !selectedRowKeys.includes(record.id))"
          >
            <span class="wpt-tile-check" @click.stop>
              <a-checkbox
                :checked="selectedRowKeys.includes(record.id)"
                @change="e => toggleRow(record.id, e.target.checked)"
              />
            </span>
            <div class="wpt-tile-image">
              <img v-if="record.avatar && record.avatar.url" v-thumb="record.avatar" loading="lazy" alt="" />
              <div v-else class="wpt-tile-placeholder"><PictureOutlined /></div>
            </div>
            <div class="wpt-tile-body">
              <slot name="tile" :record="record">
                <div class="wpt-tile-name">{{ record.name || 'Без названия' }}</div>
              </slot>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
    <div class="wpt-header" :style="{ gridTemplateColumns }">
      <div class="wpt-th wpt-th-select">
        <a-checkbox
          :checked="allSelected"
          :indeterminate="someSelected"
          @change="e => toggleSelectAll(e.target.checked)"
        />
      </div>
      <div
        v-for="col in columns"
        :key="col.key"
        class="wpt-th"
        :class="{ 'wpt-th-sortable': col.sorter }"
        @click="col.sorter && toggleSort(col.key)"
      >
        {{ col.title }}
        <span v-if="col.sorter" class="wpt-sort-icons">
          <CaretUpOutlined :class="{ 'wpt-sort-icon-active': sortState.key === col.key && sortState.order === 'ascend' }" />
          <CaretDownOutlined :class="{ 'wpt-sort-icon-active': sortState.key === col.key && sortState.order === 'descend' }" />
        </span>
      </div>
    </div>

    <div ref="scrollContainerRef" class="wpt-body">
      <div v-if="!loading && sortedData.length === 0" class="wpt-empty">Работы не найдены</div>

      <div v-else :style="{ height: totalSize + 'px', position: 'relative' }">
        <div
          v-for="virtualRow in virtualItems"
          :key="sortedData[virtualRow.index].id"
          class="wpt-row"
          :class="{ 'wpt-row-selected': selectedRowKeys.includes(sortedData[virtualRow.index].id) }"
          :style="{ gridTemplateColumns, height: virtualRow.size + 'px', transform: `translateY(${virtualRow.start}px)` }"
        >
          <div class="wpt-td wpt-td-select">
            <a-checkbox
              :checked="selectedRowKeys.includes(sortedData[virtualRow.index].id)"
              @change="e => toggleRow(sortedData[virtualRow.index].id, e.target.checked)"
            />
          </div>

          <div v-for="col in columns" :key="col.key" class="wpt-td">
            <slot name="cell" :column="col" :record="sortedData[virtualRow.index]">
              {{ sortedData[virtualRow.index][col.dataIndex] }}
            </slot>
          </div>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { CaretUpOutlined, CaretDownOutlined, UnorderedListOutlined, AppstoreOutlined, PictureOutlined } from '@ant-design/icons-vue'
import { useIsMobile } from '@/composables/useIsMobile.js'

// Переиспользуемая виртуализированная таблица выбора работ — используется
// в модалках "Выберите работы" на страницах Ссылки и Выставки. a-table в
// ant-design-vue не умеет виртуальный скролл (проверено — нет ни в одной
// версии), а без пагинации сотни/тысячи работ в обычной таблице рендерятся
// в DOM разом и тормозят. Здесь в DOM всегда только видимые строки.
const props = defineProps({
  data: { type: Array, default: () => [] },
  columns: { type: Array, required: true },
  selectedRowKeys: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  rowHeight: { type: Number, default: 64 },
  // Работы, которые уже входят в ссылку/выставку: при смене фильтра их выбор
  // не снимается (иначе при сохранении они пропали бы из ссылки)
  lockedKeys: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:selectedRowKeys'])

// Поменяли фильтр — новые отметки, которые теперь не видны, снимаются
// (уже входящие в ссылку работы — lockedKeys — остаются)
watch(() => props.data, (list) => {
  if (!props.selectedRowKeys.length) return
  const visible = new Set(list.map(r => r.id))
  const locked = new Set(props.lockedKeys)
  const kept = props.selectedRowKeys.filter(id => visible.has(id) || locked.has(id))
  if (kept.length !== props.selectedRowKeys.length) emit('update:selectedRowKeys', kept)
})

// === Сортировка по клику на заголовок — 3 состояния: ascend -> descend -> сброс ===
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
  if (!key || !order) return props.data

  const col = props.columns.find(c => c.key === key)
  if (!col?.sorter) return props.data

  const sorted = [...props.data].sort(col.sorter)
  return order === 'descend' ? sorted.reverse() : sorted
})

// === Выбор строк — выбор хранится по id, переживает фильтрацию/сортировку
// (аналог preserveSelectedRowKeys у прежнего a-table) ===
const allSelected = computed(() => sortedData.value.length > 0 && sortedData.value.every(r => props.selectedRowKeys.includes(r.id)))
const someSelected = computed(() => !allSelected.value && sortedData.value.some(r => props.selectedRowKeys.includes(r.id)))

function toggleRow(id, checked) {
  const set = new Set(props.selectedRowKeys)
  if (checked) {
    set.add(id)
  } else {
    set.delete(id)
  }
  emit('update:selectedRowKeys', [...set])
}

function toggleSelectAll(checked) {
  const idsInView = sortedData.value.map(r => r.id)
  if (checked) {
    emit('update:selectedRowKeys', [...new Set([...props.selectedRowKeys, ...idsInView])])
  } else {
    emit('update:selectedRowKeys', props.selectedRowKeys.filter(id => !idsInView.includes(id)))
  }
}

// === Виртуализация строк (@tanstack/vue-virtual) ===
// Ширины колонок в px там, где заданы явно, иначе 1fr — делят оставшееся
// место поровну (примерно повторяет авто-раскладку колонок a-table).
const scrollContainerRef = ref(null)

const gridTemplateColumns = computed(() => {
  const tracks = props.columns.map(c => (c.width ? `${parseInt(c.width, 10)}px` : '1fr')).join(' ')
  return `40px ${tracks}`
})

const rowVirtualizer = useVirtualizer(computed(() => ({
  count: sortedData.value.length,
  getScrollElement: () => scrollContainerRef.value,
  estimateSize: () => props.rowHeight,
  overscan: 10,
})))

const virtualItems = computed(() => rowVirtualizer.value.getVirtualItems())
const totalSize = computed(() => rowVirtualizer.value.getTotalSize())

// === Вид: таблица или плитка. На телефоне — всегда плитка; на десктопе
// выбор запоминается (общий для ссылок и выставок) ===
const { isMobile } = useIsMobile()
const VIEW_KEY = 'ATR_PICKER_VIEW'
const readView = () => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'tiles' ? 'tiles' : 'table'
  } catch {
    return 'table'
  }
}
const viewMode = ref(readView())
watch(viewMode, (v) => {
  try { localStorage.setItem(VIEW_KEY, v) } catch { /* приватный режим — не страшно */ }
})
const isTiles = computed(() => isMobile.value || viewMode.value === 'tiles')

// Сортировка в плитке — те же сортировки, что у колонок таблицы
const sortOptions = computed(() => props.columns.filter(c => c.sorter).map(c => ({ value: c.key, label: c.title })))
function setSortKey(key) {
  sortState.value = key ? { key, order: sortState.value.order || 'ascend' } : { key: null, order: null }
}
function toggleSortOrder() {
  if (!sortState.value.key) return
  sortState.value = { ...sortState.value, order: sortState.value.order === 'descend' ? 'ascend' : 'descend' }
}

// Плиток в ряду — от ширины контейнера
const TILE_GAP = 12
const tileMin = computed(() => (isMobile.value ? 140 : 170))
const tilesScrollRef = ref(null)
const tilesWidth = ref(0)
let resizeObserver = null
watch(tilesScrollRef, (el) => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (!el) return
  tilesWidth.value = el.clientWidth
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => { tilesWidth.value = el.clientWidth })
    resizeObserver.observe(el)
  }
})
onBeforeUnmount(() => resizeObserver?.disconnect())

const tileCols = computed(() => {
  const inner = Math.max(0, tilesWidth.value - TILE_GAP * 2)
  return Math.max(2, Math.floor((inner + TILE_GAP) / (tileMin.value + TILE_GAP)))
})
const rowItems = (rowIndex) => sortedData.value.slice(rowIndex * tileCols.value, (rowIndex + 1) * tileCols.value)

const tileVirtualizer = useVirtualizer(computed(() => ({
  count: Math.ceil(sortedData.value.length / tileCols.value),
  getScrollElement: () => tilesScrollRef.value,
  // Квадратная картинка + подпись; точную высоту ряда измерит виртуализатор
  estimateSize: () => {
    const inner = Math.max(0, tilesWidth.value - TILE_GAP * 2)
    return Math.round((inner - TILE_GAP * (tileCols.value - 1)) / tileCols.value + 70 + TILE_GAP)
  },
  paddingEnd: TILE_GAP,
  overscan: 3,
})))
const tileRows = computed(() => tileVirtualizer.value.getVirtualItems())
const tilesTotalSize = computed(() => tileVirtualizer.value.getTotalSize())
watch(tileCols, () => nextTick(() => tileVirtualizer.value.measure()))
</script>

<style scoped>
.wpt-wrap {
  background: var(--bg-elevated);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.wpt-header {
  display: grid;
  align-items: center;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
}

.wpt-th {
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

.wpt-th-select {
  display: flex;
  align-items: center;
  justify-content: center;
}

.wpt-th-sortable {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.wpt-sort-icons {
  display: inline-flex;
  flex-direction: column;
  font-size: 9px;
  line-height: 0.7;
  color: var(--text-faint);
}

.wpt-sort-icon-active {
  color: var(--accent);
}

.wpt-body {
  height: 50vh;
  min-height: 320px;
  overflow-y: auto;
}

.wpt-row {
  display: grid;
  align-items: center;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  border-bottom: 1px solid var(--border-soft);
}

.wpt-row:hover {
  background: rgba(200, 183, 137, 0.06);
}

.wpt-row-selected {
  background: rgba(138, 109, 47, 0.1);
}

.wpt-row-selected:hover {
  background: rgba(138, 109, 47, 0.16);
}

.wpt-td {
  padding: 4px 8px;
  overflow: hidden;
  color: var(--text-body);
}

.wpt-td-select {
  display: flex;
  align-items: center;
  justify-content: center;
}

.wpt-empty {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-faint);
}

/* === Панель и плитка === */
.wpt-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  min-height: 44px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border);
}

.wpt-sort {
  display: flex;
  align-items: center;
  gap: 6px;
}

.wpt-sort-select {
  width: 160px;
}

.wpt-view-switch {
  margin-left: auto;
}

.wpt-view-switch :deep(.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)) {
  background: var(--accent);
  border-color: var(--accent);
}

.wpt-tiles-body {
  background: var(--card-bg, transparent);
}

.wpt-tiles-row {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  display: grid;
  gap: 12px;
  padding: 12px 12px 0;
  box-sizing: border-box;
}

.wpt-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.wpt-tile:hover {
  border-color: var(--accent);
}

.wpt-tile-selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent);
}

.wpt-tile-check {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  display: flex;
  padding: 2px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 6px;
}

.wpt-tile-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--card-bg);
  overflow: hidden;
}

.wpt-tile-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.wpt-tile-selected .wpt-tile-image img {
  opacity: 0.85;
}

.wpt-tile-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--text-dim);
}

.wpt-tile-body {
  padding: 6px 8px 8px;
  min-width: 0;
}

.wpt-tile-name,
.wpt-tile-body :deep(.wpt-tile-name) {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 15px;
  color: var(--text-title);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wpt-tile-body :deep(.wpt-tile-sub) {
  font-size: 11px;
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wpt-wrap :deep(.ant-checkbox-inner) {
  background: var(--bg-elevated);
  border-color: var(--text-faint);
}

.wpt-wrap :deep(.ant-checkbox-checked .ant-checkbox-inner) {
  background: var(--accent);
  border-color: var(--accent);
}

.wpt-wrap :deep(.ant-checkbox-wrapper:hover .ant-checkbox-inner),
.wpt-wrap :deep(.ant-checkbox:hover .ant-checkbox-inner),
.wpt-wrap :deep(.ant-checkbox-input:focus + .ant-checkbox-inner) {
  border-color: var(--accent);
}

.wpt-wrap :deep(.ant-checkbox-checked::after) {
  border-color: var(--accent);
}

.wpt-wrap :deep(.ant-checkbox-indeterminate .ant-checkbox-inner) {
  background: var(--bg-elevated);
  border-color: var(--accent);
}

.wpt-wrap :deep(.ant-checkbox-indeterminate .ant-checkbox-inner::after) {
  background-color: var(--accent);
}
</style>
