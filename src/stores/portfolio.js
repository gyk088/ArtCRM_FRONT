// stores/portfolio.js
// Портфолио художника (карточка художника → «Портфолио»), см. PortfolioService на бэкенде.
import { defineStore } from 'pinia'
import { message } from 'ant-design-vue'
import apiClient from '@/services/api.js'
import { notifyServerError } from '@/services/notify.js'

const SERVER_ERRORS = {
  'Portfolio not found': 'Портфолио не найдено',
  'Artist not found': 'Художник не найден',
  'File not found': 'Файл не найден в ваших «Файлах»',
  'Art object not found': 'Работа не найдена',
  'Portfolio title is required': 'Укажите название (имя художника)',
}

function errorText(e, fallback) {
  const raw = e?.response?.data?.error
  if (SERVER_ERRORS[raw]) return SERVER_ERRORS[raw]
  if (raw && /too long/.test(raw)) return 'Слишком длинный текст в одном из полей'
  if (raw && /Too many/.test(raw)) return 'Слишком много элементов в одном из проектов'
  return raw || fallback
}

/** Публичная ссылка на портфолио (страница рендерится бэкендом на том же домене) */
export const portfolioPublicUrl = (id) => `${window.location.origin}/portfolio/${id}`

export async function copyPortfolioLink(id) {
  const link = portfolioPublicUrl(id)
  try {
    await navigator.clipboard.writeText(link)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = link
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
  message.success('Ссылка на портфолио скопирована')
}

export const usePortfolio = defineStore('portfolio', {
  actions: {
    /** GET /api/v1/portfolios?artist= — портфолио художника */
    async listByArtist(artistId) {
      try {
        const resp = await apiClient.get('/api/v1/portfolios', { params: { artist: artistId } })
        return resp.data || []
      } catch (e) {
        console.error('Error fetching portfolios:', e)
        notifyServerError(errorText(e, 'Не удалось загрузить портфолио'))
        return null
      }
    },

    /** GET /api/v1/portfolios/:id. notFound: true — 404 без уведомления */
    async get(id) {
      try {
        const resp = await apiClient.get(`/api/v1/portfolios/${id}`)
        return resp.data
      } catch (e) {
        if (e?.response?.status === 404) return { notFound: true }
        console.error('Error fetching portfolio:', e)
        notifyServerError(errorText(e, 'Не удалось загрузить портфолио'))
        return null
      }
    },

    /** POST /api/v1/portfolios — { artist_id, ...поля }; пустое заполняется из анкеты художника */
    async create(data) {
      try {
        const resp = await apiClient.post('/api/v1/portfolios', data)
        return resp.data
      } catch (e) {
        console.error('Error creating portfolio:', e)
        notifyServerError(errorText(e, 'Не удалось создать портфолио'))
        return null
      }
    },

    /** PUT /api/v1/portfolios/:id — только переданные поля */
    async update(id, data) {
      try {
        const resp = await apiClient.put(`/api/v1/portfolios/${id}`, data)
        return resp.data
      } catch (e) {
        console.error('Error saving portfolio:', e)
        notifyServerError(errorText(e, 'Не удалось сохранить портфолио'))
        return null
      }
    },

    async remove(id) {
      try {
        await apiClient.delete(`/api/v1/portfolios/${id}`)
        return true
      } catch (e) {
        console.error('Error deleting portfolio:', e)
        notifyServerError(errorText(e, 'Не удалось удалить портфолио'))
        return false
      }
    },
  },
})
