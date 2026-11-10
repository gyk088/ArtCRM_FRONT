// stores/sale.js
// Продажи работ (my_sale) — см. SaleService на бэкенде.
// Одна работа продаётся один раз; скидка считается бэкендом (discount_pct).
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError } from '@/services/notify.js'
import { useArtWork } from '@/stores/artWork.js'

const SERVER_ERRORS = {
  'Art object is already sold': 'Эта работа уже продана',
  'Contact not found': 'Покупатель не найден в ваших контактах',
  'Sale not found': 'Продажа не найдена',
  'Art object not found': 'Работа не найдена',
  'Discount cannot exceed 100%': 'Скидка не может быть больше 100%',
  'Discount cannot exceed the work price': 'Скидка не может быть больше цены работы',
  'Work price is not set: enter the sale price instead of a discount': 'У работы не указана цена — укажите цену продажи',
}

function errorText(e, fallback) {
  const raw = e?.response?.data?.error
  return SERVER_ERRORS[raw] || raw || fallback
}

// Краткая информация о продаже лежит и в самой работе (work.sale) — для
// таблицы работ. Держим её в списке работ актуальной без перезагрузки.
function syncWorkSale(artId, sale) {
  const artWorkStore = useArtWork()
  const short = sale
    ? { id: sale.id, sale_date: sale.sale_date, sale_price: sale.sale_price, currency: sale.currency }
    : null
  const work = artWorkStore.listArtWorks.find(w => w.id === artId)
  if (work) work.sale = short
  if (artWorkStore.currentArtWork?.id === artId) artWorkStore.currentArtWork.sale = short
}

export const useSale = defineStore('sale', {
  actions: {
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
     * POST /api/v1/sales
     * @param {Object} data - { art_id, sale_date: 'YYYY-MM-DD', contact_id?, comment?,
     *   и либо discount_type: 'pct'|'amount' + discount_value (цену посчитает сервер
     *   от цены работы), либо sale_price + currency (у работы нет цены) }
     */
    async createSale(data) {
      try {
        const resp = await apiClient.post('/api/v1/sales', data)
        syncWorkSale(data.art_id, resp.data)
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
        syncWorkSale(resp.data.art_id, resp.data)
        return resp.data
      } catch (e) {
        console.error('Error updating sale:', e)
        notifyServerError(errorText(e, 'Не удалось сохранить продажу'))
        return null
      }
    },

    /** DELETE /api/v1/sales/:id — отменить продажу */
    async cancelSale(sale) {
      try {
        await apiClient.delete(`/api/v1/sales/${sale.id}`)
        syncWorkSale(sale.art_id, null)
        return true
      } catch (e) {
        console.error('Error cancelling sale:', e)
        notifyServerError(errorText(e, 'Не удалось отменить продажу'))
        return false
      }
    },
  },
})
