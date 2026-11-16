<template>
  <span class="artist-or-gallery" @keydown.capture="onKeydown">
  <a-auto-complete
    v-bind="$attrs"
    :value="shown"
    :options="options"
    :filter-option="false"
    allow-clear
    class="artist-or-gallery-input"
    placeholder="Выберите художника или галерею либо введите текст"
    @update:value="onUpdate"
  />
  </span>
</template>

<script setup>
// Поле «Художник/Галерея» в ссылках и выставках: текст, как и раньше, но с
// подсказками — название галереи (или своё имя) и художники из справочника.
// Крестик очищает поле.
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useArtist } from '@/stores/artist.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  // Для новой ссылки/выставки — подставить название галереи в пустое поле
  prefill: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
// id и прочие атрибуты — на само поле, а не на обёртку
defineOptions({ inheritAttrs: false })

const artistStore = useArtist()
const byline = ref(null)

onMounted(async () => {
  const [data] = await Promise.all([
    artistStore.getBylineOptions(),
    artistStore.listArtists.length ? null : artistStore.getListArtists(),
  ])
  byline.value = data
  const preset = data?.gallery || data?.own
  if (props.prefill && preset && !String(props.modelValue || '').trim()) emit('update:modelValue', preset)
})

// AutoComplete по Escape стирает поле — у нас Escape только закрывает список
let escPressed = false
function onKeydown(e) {
  if (e.key !== 'Escape') return
  escPressed = true
  setTimeout(() => { escPressed = false }, 50)
}
// shown — то, что показано в поле; обычно совпадает с modelValue
const shown = ref(props.modelValue)
watch(() => props.modelValue, v => { shown.value = v })
function onUpdate(v) {
  if (escPressed && !v) {
    // Поле уже очистилось внутри AutoComplete — возвращаем текст обратно
    shown.value = ''
    nextTick(() => { shown.value = props.modelValue })
    return
  }
  shown.value = v ?? ''
  emit('update:modelValue', v ?? '')
}

const options = computed(() => {
  const text = String(props.modelValue || '').trim().toLowerCase()
  const own = [byline.value?.gallery, byline.value?.own].filter(Boolean)
  const artists = [...new Set(artistStore.listArtists.map(a => a.name).filter(Boolean))]
  // Если в поле уже выбранное значение — показываем весь список, иначе фильтруем по введённому
  const all = [...own, ...artists]
  const exact = all.some(n => n.toLowerCase() === text)
  const match = (n) => !text || exact || n.toLowerCase().includes(text)
  const groups = []
  const gallery = byline.value?.gallery
  const self = byline.value?.own
  if (gallery && match(gallery)) groups.push({ label: 'Галерея', options: [{ value: gallery }] })
  if (self && self !== gallery && match(self)) groups.push({ label: 'Вы', options: [{ value: self }] })
  const artistsMatched = artists.filter(n => match(n) && !own.includes(n))
  if (artistsMatched.length) groups.push({ label: 'Художники', options: artistsMatched.map(v => ({ value: v })) })
  return groups
})
</script>

<style scoped>
.artist-or-gallery {
  display: block;
}

/* Как у соседних полей формы (.fixed-input) */
.artist-or-gallery-input {
  width: 100%;
  max-width: 450px;
}
</style>
