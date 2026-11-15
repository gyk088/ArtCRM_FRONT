// v-thumb — картинка-превью для списков и таблиц.
//
//   <img v-thumb="record.avatar" />            // { url, thumb_url } или { id, ext }
//   <img v-thumb="{ url: a, thumb_url: b }" />
//
// Показывает лёгкое превью (files/thumbs/<id>.webp, ~20–40 КБ) вместо
// оригинала (до 5 МБ); если превью ещё нет (старый файл, не картинка) —
// автоматически переключается на оригинал. Плюс loading="lazy": картинки
// вне экрана не грузятся и не занимают соединения, нужные запросам к API.
import { thumbUrl, fileUrl } from '@/services/const.js'

function apply(el, value) {
  const full = value?.url || (value?.id && value?.ext ? fileUrl(value) : '')
  const thumb = value?.thumb_url || thumbUrl(value) || full
  if (el.__thumbFull === full && el.__thumbSrc === thumb) return
  el.__thumbFull = full
  el.__thumbSrc = thumb
  if (thumb) el.src = thumb
  else el.removeAttribute('src')
}

function onError(e) {
  const el = e.currentTarget
  if (el.__thumbFull && el.getAttribute('src') !== el.__thumbFull) el.src = el.__thumbFull
}

export default {
  beforeMount(el, binding) {
    // атрибуты до src — иначе браузер начнёт загрузку сразу
    if (!el.hasAttribute('loading')) el.setAttribute('loading', 'lazy')
    el.setAttribute('decoding', 'async')
    el.addEventListener('error', onError)
    apply(el, binding.value)
  },
  updated(el, binding) {
    apply(el, binding.value)
  },
  unmounted(el) {
    el.removeEventListener('error', onError)
  },
}
