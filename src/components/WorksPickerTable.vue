<template>
  <div class="wpt-wrap">
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { CaretUpOutlined, CaretDownOutlined } from '@ant-design/icons-vue'

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
})

const emit = defineEmits(['update:selectedRowKeys'])

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
