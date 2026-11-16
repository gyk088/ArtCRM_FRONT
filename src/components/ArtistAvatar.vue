<template>
  <span class="artist-avatar" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.38)}px`, background: photo ? 'transparent' : color }">
    <img v-if="photo" v-thumb="artist.avatar" alt="" @error="onImgError" />
    <template v-else>{{ initials }}</template>
  </span>
</template>

<script setup>
// Фото художника (превью) или инициалы на цветном круге
import { computed, ref, watch } from 'vue'

const props = defineProps({
  artist: { type: Object, required: true },
  size: { type: Number, default: 36 },
})

// v-thumb при ошибке превью сам переключается на оригинал; если не
// загрузился и он — показываем инициалы вместо «битой» картинки
const failed = ref(false)
watch(() => props.artist?.avatar?.id, () => { failed.value = false })
function onImgError(e) {
  const original = props.artist?.avatar?.url
  if (!props.artist?.avatar?.thumb_url || e.target.src === original || e.target.src.endsWith(original)) failed.value = true
}
const photo = computed(() => !!props.artist?.avatar?.url && !failed.value)
const initials = computed(() => String(props.artist?.name || '?')
  .split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?')

const PALETTE = ['#8a6d2f', '#5b7a8c', '#7a5c8c', '#5c8c6a', '#8c5c5c', '#6d6a5b']
const color = computed(() => {
  const s = String(props.artist?.id || props.artist?.name || '')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
})
</script>

<style scoped>
.artist-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.artist-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
