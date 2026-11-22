<template>
  <ul v-if="lines.length" class="hc">
    <li v-for="l in lines" :key="l.field" class="hc-row">
      <span class="hc-label">{{ l.label }}:</span>
      <span class="hc-from">{{ l.from }}</span>
      <span class="hc-arrow">→</span>
      <span class="hc-to">{{ l.to }}</span>
    </li>
  </ul>
</template>

<script setup>
// «Было → стало» для ключевых полей работы в истории изменений
// (meta.changes, см. ChangeLogService на бэкенде)
import { computed } from 'vue'
import { formatMoney } from '@/utils/money.js'

const props = defineProps({
  changes: { type: Array, default: () => [] },
})

const LABELS = { price: 'Цена', currency: 'Валюта', status: 'Статус', artist: 'Художник', quantity: 'Экземпляров', edition: 'Тираж' }
const EMPTY = 'не указан'

const lines = computed(() => (props.changes || []).map((c) => {
  if (c.field === 'price') {
    return {
      field: c.field,
      label: LABELS.price,
      from: c.from === null || c.from === undefined ? 'не указана' : formatMoney(c.from, c.from_currency),
      to: c.to === null || c.to === undefined ? 'не указана' : formatMoney(c.to, c.to_currency),
    }
  }
  if (c.field === 'quantity') {
    // пусто — уникальная работа (1 экземпляр)
    return { field: c.field, label: LABELS.quantity, from: c.from ?? '1 (уникальная)', to: c.to ?? '1 (уникальная)' }
  }
  return {
    field: c.field,
    label: LABELS[c.field] || c.field,
    from: c.from ?? (c.field === 'currency' ? 'не указана' : EMPTY),
    to: c.to ?? (c.field === 'currency' ? 'не указана' : EMPTY),
  }
}))
</script>

<style scoped>
.hc {
  width: fit-content;
  max-width: 100%;
  list-style: none;
  margin: 4px 0 0;
  padding: 6px 8px;
  background: #faf8f3;
  border: 1px solid #ece6d8;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
}

.hc-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
}

.hc-label {
  color: #7c7669;
}

.hc-from {
  color: #8a8478;
  text-decoration: line-through;
  text-decoration-color: rgba(138, 132, 120, 0.5);
}

.hc-arrow {
  color: #a29c8c;
}

.hc-to {
  font-weight: 600;
  color: #211f1a;
}
</style>
