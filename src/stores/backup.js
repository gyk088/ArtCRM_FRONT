// Бекап данных пользователя (см. бэкенд BackupService):
//  • «Данные» — ZIP (данные.xlsx + data.json) скачивается сразу;
//  • «Файлы» — архив собирается на сервере в фоне, по готовности приходит
//    уведомление, скачивается по ссылке в течение 24 часов.
// userId — чужой бекап (только Super Admin); без него — свой.
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError } from '@/services/notify.js'
import { API_BASE_URL } from '@/services/const.js'

const SERVER_ERRORS = {
  'User not found': 'Пользователь не найден',
}

async function errorText(e, fallback) {
  let raw = e?.response?.data?.error
  // при responseType: 'blob' тело ошибки тоже Blob — достаём текст
  if (!raw && e?.response?.data?.text) {
    try {
      raw = JSON.parse(await e.response.data.text()).error
    } catch {
      // не JSON — оставляем общее сообщение
    }
  }
  return SERVER_ERRORS[raw] || raw || fallback
}

const params = (userId) => (userId ? { userId } : {})

// имя файла из Content-Disposition (filename* — UTF-8, иначе filename)
function filenameFrom(headers, fallback) {
  const cd = headers?.['content-disposition'] || ''
  const star = cd.match(/filename\*=UTF-8''([^;]+)/i)
  if (star) {
    try {
      return decodeURIComponent(star[1])
    } catch {
      // битая кодировка — ниже запасной вариант
    }
  }
  return cd.match(/filename="([^"]+)"/i)?.[1] || fallback
}

export const backupDownloadUrl = (path) => (path ? `${API_BASE_URL}${path}` : null)

export const useBackup = defineStore('backup', {
  actions: {
    /** GET /api/v1/backup/status — можно ли делать бекап, сколько файлов, состояние архива файлов */
    async getStatus(userId) {
      try {
        const { data } = await apiClient.get('/api/v1/backup/status', { params: params(userId) })
        return data
      } catch (e) {
        console.error('Error fetching backup status:', e)
        notifyServerError(await errorText(e, 'Не удалось получить состояние бекапа'))
        return null
      }
    },

    /** GET /api/v1/backup/data — скачать ZIP «Данные» */
    async downloadData(userId) {
      try {
        const resp = await apiClient.get('/api/v1/backup/data', { params: params(userId), responseType: 'blob' })
        const objectUrl = URL.createObjectURL(resp.data)
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = filenameFrom(resp.headers, 'artcrm-data.zip')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
        return true
      } catch (e) {
        console.error('Error downloading data backup:', e)
        notifyServerError(await errorText(e, 'Не удалось сделать бекап данных'))
        return false
      }
    },

    /** POST /api/v1/backup/files — запустить сборку архива файлов */
    async startFiles(userId) {
      try {
        const { data } = await apiClient.post('/api/v1/backup/files', params(userId))
        return data
      } catch (e) {
        console.error('Error starting files backup:', e)
        notifyServerError(await errorText(e, 'Не удалось запустить бекап файлов'))
        return null
      }
    },
  },
})
