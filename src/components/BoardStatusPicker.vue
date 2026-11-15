<template>
  <div class="status-picker">
    <label v-for="s in statuses" :key="s.id" class="status-item" :class="{ checked: value.includes(s.id) }">
      <a-checkbox :checked="value.includes(s.id)" @change="(e) => toggle(s.id, e.target.checked)" />
      <span class="status-dot" :style="{ background: s.color || '#c9c3b6' }" />
      <span class="status-name">{{ s.name }}</span>
      <span v-if="s.is_final" class="status-final" title="Закрывает задачу"><CheckCircleOutlined /> закрывает</span>
    </label>
    <div class="picker-hint">
      Порядок колонок и сами статусы настраиваются в
      <router-link :to="{ name: 'reference', query: { tab: 'task-statuses' } }">Справочнике → Статусы задач</router-link>.
      <template v-if="!hasFinal"> Без закрывающего статуса задачи на доске нельзя будет завершить.</template>
    </div>
  </div>
</template>

<script setup>
// Выбор колонок (статусов) доски — при создании доски и в её настройках
import { computed } from 'vue'
import { CheckCircleOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  value: { type: Array, default: () => [] },
  statuses: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:value'])

function toggle(id, checked) {
  const next = checked ? [...props.value, id] : props.value.filter(x => x !== id)
  // храним в порядке справочника
  emit('update:value', props.statuses.map(s => s.id).filter(x => next.includes(x)))
}

const hasFinal = computed(() => props.statuses.some(s => s.is_final && props.value.includes(s.id)))
</script>

<style scoped>
.status-picker {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  cursor: pointer;
}

.status-item.checked {
  border-color: rgba(138, 109, 47, 0.45);
  background: #fffdf8;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-name {
  flex: 1;
}

.status-final {
  font-size: 12px;
  color: #1e7b45;
}

.picker-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #7c7669;
}
</style>
