<template>
  <span v-if="tags.length" class="tag-chips" :class="{ 'tag-chips-small': small }">
    <span
      v-for="tag in shown"
      :key="tag.id"
      class="tag-chip"
      :style="chipStyle(tag.color)"
      :title="tag.name"
    >
      {{ tag.name }}
    </span>
    <span v-if="hiddenCount" class="tag-chip tag-chip-more" :title="hiddenTitle">+{{ hiddenCount }}</span>
  </span>
</template>

<script setup>
// Цветные плашки тегов работы. ids — work.tags (массив id); названия и цвета
// берутся из справочника (stores/tags.js), неизвестные id не показываются.
import { computed } from 'vue'
import { useTags } from '@/stores/tags.js'

const props = defineProps({
  ids: { type: Array, default: () => [] },
  small: { type: Boolean, default: false },
  // Сколько плашек показать; остальные — «+N» с подсказкой (0 — все)
  max: { type: Number, default: 0 },
})

const tagsStore = useTags()

const tags = computed(() =>
  (props.ids || []).map(id => tagsStore.getTagById(id)).filter(Boolean)
)

const shown = computed(() => (props.max ? tags.value.slice(0, props.max) : tags.value))
const hiddenCount = computed(() => tags.value.length - shown.value.length)
const hiddenTitle = computed(() => tags.value.slice(shown.value.length).map(t => t.name).join(', '))

function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

function chipStyle(color) {
  if (!color) return {}
  return { background: hexToRgba(color, 0.12), color, borderColor: hexToRgba(color, 0.45) }
}
</script>

<style scoped>
.tag-chips {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.tag-chip {
  display: inline-block;
  max-width: 160px;
  padding: 1px 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  background: #efece4;
  color: #5a564c;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag-chip-more {
  cursor: default;
  font-weight: 600;
}

.tag-chips-small .tag-chip {
  font-size: 11px;
  line-height: 16px;
  padding: 0 6px;
}
</style>
