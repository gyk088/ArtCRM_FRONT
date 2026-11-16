// Боковая панель / модалка, которая закрывается кнопкой «Назад» браузера
// (и системной кнопкой «Назад» на телефоне), а не уводит со страницы.
//
// Открытие панели добавляет в историю тот же адрес с параметром ?<key>=<value>.
// «Назад» убирает параметр — панель закрывается. Закрытие крестиком/кликом
// мимо возвращает историю на шаг назад, чтобы не копились лишние записи.
//
// restore(value) — вызывается, если страница открылась уже с параметром
// (вернулись «Назад» со страницы, куда ушли из панели, или обновили
// страницу): должна открыть панель и вернуть true; иначе параметр убираем.
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export function useCloseOnBack(isOpen, { key = 'panel', value = () => '1', restore = null } = {}) {
  const route = useRoute()
  const router = useRouter()
  const routeName = route.name
  let pushed = false // запись в истории добавили мы — закрывать через back()
  let restoring = false

  const withoutKey = () => {
    const query = { ...route.query }
    delete query[key]
    return query
  }

  watch(isOpen, (open) => {
    if (route.name !== routeName) return
    if (open) {
      if (restoring) return
      const v = String(value() ?? '1')
      if (route.query[key] === v) return
      if (route.query[key]) {
        router.replace({ query: { ...route.query, [key]: v } })
      } else {
        router.push({ query: { ...route.query, [key]: v } })
        pushed = true
      }
    } else if (route.query[key]) {
      if (pushed) router.back()
      else router.replace({ query: withoutKey() })
      pushed = false
    }
  })

  // «Назад» убрал параметр — закрываем панель
  watch(() => route.query[key], (v) => {
    if (route.name !== routeName) return
    if (!v && isOpen.value) {
      pushed = false
      isOpen.value = false
    }
  })

  /** Вызвать, когда данные для restore загружены */
  async function restoreFromUrl() {
    const v = route.query[key]
    if (!v || isOpen.value) return
    restoring = true
    let ok = false
    try {
      ok = restore ? await restore(String(v)) : false
    } finally {
      // флаг снимаем после того, как отработает watch(isOpen)
      setTimeout(() => { restoring = false })
    }
    if (!ok) router.replace({ query: withoutKey() })
  }

  return { restoreFromUrl }
}
