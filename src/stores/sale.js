// stores/sale.js
// Продажи работ (my_sale) — см. SaleService на бэкенде.
// Уникальная работа продаётся один раз; у работы с тиражом (quantity) может
// быть несколько продаж — в сумме не больше экземпляров. Скидка и цена за
// все экземпляры считаются бэкендом.
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError } from '@/services/notify.js'
import { useArtWork } from '@/stores/artWork.js'
import { getUser } from '@/services/auth.js'

const SERVER_ERRORS = {
  'Art object is already sold': 'Эта работа уже продана',
  'Contact not found': 'Покупатель не найден в ваших контактах',
  'Sale not found': 'Продажа не найдена',
  'Art object not found': 'Работа не найдена',
  'Discount cannot exceed 100%': 'Скидка не может быть больше 100%',
  'Discount cannot exceed the work price': 'Скидка не может быть больше цены работы',
  'Work price is not set: enter the sale price instead of a discount': 'У работы не указана цена — укажите цену продажи',
  'quantity must be an integer from 1': 'Количество — целое число от 1',
  'Seller not found': 'Этого сотрудника нельзя указать продавцом — он не из вашей галереи',
}

function errorText(e, fallback) {
  const raw = e?.response?.data?.error
  const notEnough = /^Not enough copies: (\d+) available$/.exec(raw || '')
  if (notEnough) return `Столько экземпляров нет — осталось ${notEnough[1]}`
  return SERVER_ERRORS[raw] || raw || fallback
}

// Краткая информация о продаже лежит и в самой работе (work.sale) — для
// таблицы работ. Держим её в списке работ актуальной без перезагрузки.
// artStatus — статус работы после продажи/отмены (сервер ставит «статус
// продажи» сам и возвращает прежний при отмене); undefined — не трогаем.
// summary — ответ GET /sales/art/:id/list: по нему же обновляем экземпляры
// (продано / осталось) — у тиража продаж несколько.
function syncWorkSale(artId, summary, artStatus) {
  const artWorkStore = useArtWork()
  const latest = summary?.sales?.[0] || null
  const short = latest
    ? { id: latest.id, sale_date: latest.sale_date, sale_price: latest.sale_price, currency: latest.currency, sales_count: summary.sales.length }
    : null
  const work = artWorkStore.listArtWorks.find(w => w.id === artId)
  const current = artWorkStore.currentArtWork?.id === artId ? artWorkStore.currentArtWork : null
  for (const w of [work, current]) {
    if (!w) continue
    w.sale = short
    if (summary) {
      w.sold_count = summary.sold
      w.available = summary.available
    }
    if (artStatus !== undefined) w.status = artStatus
  }
}

async function fetchSummary(artId) {
  try {
    return (await apiClient.get(`/api/v1/sales/art/${artId}/list`)).data || null
  } catch {
    return null
  }
}

// после изменения продажи — подтянуть свежие экземпляры и продажи работы
async function refreshWork(artId, artStatus) {
  const summary = await fetchSummary(artId)
  if (summary) syncWorkSale(artId, summary, artStatus)
  else if (artStatus !== undefined) syncWorkSale(artId, null, artStatus)
}

export const useSale = defineStore('sale', {
  state: () => ({
    // кого можно указать «кто продал» (галерея и её менеджеры); null — не загружали
    sellers: null,
    sellersFor: null,
  }),

  actions: {
    /** GET /api/v1/sales/sellers — один раз на пользователя (вход под другим — заново) */
    async getSellers() {
      const userId = getUser()?.id
      if (this.sellers && this.sellersFor === userId) return this.sellers
      try {
        this.sellers = (await apiClient.get('/api/v1/sales/sellers')).data || []
        this.sellersFor = userId
      } catch (e) {
        console.error('Error fetching sellers:', e)
        this.sellers = null
        return []
      }
      return this.sellers
    },

    /** GET /api/v1/sales/art/:artId — продажа работы или null */
    async getSaleByArtId(artId) {
      try {
        const resp = await apiClient.get(`/api/v1/sales/art/${artId}`)
        return resp.data || null
      } catch (e) {
        console.error('Error fetching sale:', e)
        notifyServerError(errorText(e, 'Не удалось загрузить данные о продаже'))
        throw e
      }
    },

    /**
     * GET /api/v1/sales/art/:artId/list — все продажи работы и экземпляры:
     * { total, sold, available, edition, art_status, sales: [...] }
     */
    async getSalesByArtId(artId) {
      try {
        return (await apiClient.get(`/api/v1/sales/art/${artId}/list`)).data
      } catch (e) {
        console.error('Error fetching sales:', e)
        notifyServerError(errorText(e, 'Не удалось загрузить данные о продаже'))
        throw e
      }
    },

    /**
     * POST /api/v1/sales
     * @param {Object} data - { art_id, sale_date: 'YYYY-MM-DD', contact_id?, comment?,
     *   и либо discount_type: 'pct'|'amount' + discount_value (цену посчитает сервер
     *   от цены работы), либо sale_price + currency (у работы нет цены) }
     */
    async createSale(data) {
      try {
        const resp = await apiClient.post('/api/v1/sales', data)
        await refreshWork(data.art_id, resp.data?.art_status)
        return resp.data
      } catch (e) {
        console.error('Error creating sale:', e)
        notifyServerError(errorText(e, 'Не удалось сохранить продажу'))
        return null
      }
    },

    /** PUT /api/v1/sales/:id — частичное обновление */
    async updateSale(id, data) {
      try {
        const resp = await apiClient.put(`/api/v1/sales/${id}`, data)
        await refreshWork(resp.data.art_id, resp.data?.art_status)
        return resp.data
      } catch (e) {
        console.error('Error updating sale:', e)
        notifyServerError(errorText(e, 'Не удалось сохранить продажу'))
        return null
      }
    },

    /**
     * DELETE /api/v1/sales/:id — отменить продажу. Возвращает объект
     * { art_status } (статус работы после отмены) или false при ошибке.
     */
    async cancelSale(sale) {
      try {
        const resp = await apiClient.delete(`/api/v1/sales/${sale.id}`)
        const artStatus = resp.data?.art_status
        await refreshWork(sale.art_id, artStatus)
        return { art_status: artStatus }
      } catch (e) {
        console.error('Error cancelling sale:', e)
        notifyServerError(errorText(e, 'Не удалось отменить продажу'))
        return false
      }
    },
  },
})
