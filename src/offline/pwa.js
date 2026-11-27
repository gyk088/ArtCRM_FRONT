// Регистрация service worker (PWA). Новая версия приложения не
// перезагружает страницу сама (можно потерять несохранённое) — показываем
// уведомление с кнопкой «Обновить».
import { h } from 'vue'
import { notification, Button } from 'ant-design-vue'
import { registerSW } from 'virtual:pwa-register'

export function setupPwa() {
  if (!('serviceWorker' in navigator)) return

  const updateSW = registerSW({
    onNeedRefresh() {
      const key = 'pwa-update'
      notification.info({
        key,
        message: 'Доступна новая версия ArtCRM',
        description: 'Сохраните изменения и обновите приложение.',
        duration: 0,
        btn: () => h(Button, { type: 'primary', size: 'small', onClick: () => { notification.close(key); updateSW(true) } }, () => 'Обновить'),
      })
    },
    onOfflineReady() {
      notification.success({
        message: 'ArtCRM готов к работе без интернета',
        description: 'Работы, ссылки и контакты будут доступны и без сети.',
        duration: 5,
      })
    },
    onRegisteredSW(_url, registration) {
      // проверять новую версию раз в час (приложение могут не закрывать неделями)
      if (registration) setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000)
    },
  })
}
