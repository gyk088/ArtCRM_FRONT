import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import childProcess from "child_process"
let { version } = require("./package.json");

/* Для отображения версии приложения + коммита при запуске приложения */
try {
  version = `${version} rev. ${childProcess
    .execSync("git rev-parse --short HEAD")
    .toString()
    .trim()}`;
} catch (e) {
  // Если не удалось узнать хэш текущей фиксации, игнорируем ошибку.
}


// https://vite.dev/config/
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '')
  console.log(mode)
  console.log(env.ARTCRM_BASE_URL)
  return {
    plugins: [
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    define: {
      __MY_BASE_URL__: JSON.stringify(env.ARTCRM_BASE_URL),
      __MY_VERSION__: JSON.stringify(version),
    },
    css: {
      preprocessorOptions: {
        less: {
          modifyVars: {
            'primary-color': '#0EA47A',
          },
          javascriptEnabled: true,
        },
      },
    },
  }
})

