import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import App from './App.vue'
import router from './router'
import thumb from './directives/thumb.js'
import { setupPwa } from './offline/pwa.js'
import { startOfflinePrefetch } from './offline/prefetch.js'
import { startSync } from './offline/sync.js'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Antd)
app.directive('thumb', thumb)
app.mount('#app')

// PWA: установка на устройство, запуск и просмотр данных без интернета
setupPwa()
startOfflinePrefetch()
startSync() // отправка изменений, сделанных без интернета
