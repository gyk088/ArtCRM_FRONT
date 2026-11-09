// stores/report.js
// Сохраняемые отчёты (сейчас — о продажах). У каждого отчёта своя валюта и
// своя таблица курсов (см. ReportService на бэкенде).
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError } from '@/services/notify.js'

const SERVER_ERRORS = {
  'Report not found': 'Отчёт не найден',
  'Report name is required': 'Укажите название отчёта',
  'date_from must be before date_to': 'Дата «с» должна быть раньше даты «по»',
}

function errorText(e, fallback) {
  const raw = e?.response?.data?.error
  return SERVER_ERRORS[raw] || raw || fallback
}

export const useReport = defineStore('report', {
  state: () => ({
    listReports: [],
    loading: false,
  }),

  actions: {
    /** GET /api/v1/reports */
    async getListReports() {
      this.loading = true
      try {
        const resp = await apiClient.get('/api/v1/reports')
        this.listReports = resp.data || []
        return true
      } catch (e) {
        console.error('Error fetching reports:', e)
        notifyServerError(errorText(e, 'Не удалось загрузить отчёты'))
        return false
      } finally {
        this.loading = false
      }
    },

    /** POST /api/v1/reports — { name, currency, filters?, rates? } */
    async createReport(data) {
      try {
        const resp = await apiClient.post('/api/v1/reports', data)
        this.listReports = [resp.data, ...this.listReports]
        return resp.data
      } catch (e) {
        console.error('Error creating report:', e)
        notifyServerError(errorText(e, 'Не удалось создать отчёт'))
        return null
      }
    },

    /** GET /api/v1/reports/:id */
    async getReport(id) {
      try {
        const resp = await apiClient.get(`/api/v1/reports/${id}`)
        return resp.data
      } catch (e) {
        console.error('Error fetching report:', e)
        notifyServerError(errorText(e, 'Не удалось загрузить отчёт'))
        return null
      }
    },

    /** PUT /api/v1/reports/:id — { name?, currency?, filters?, rates? } */
    async updateReport(id, data) {
      try {
        const resp = await apiClient.put(`/api/v1/reports/${id}`, data)
        const index = this.listReports.findIndex(r => r.id === id)
        if (index !== -1) this.listReports[index] = { ...this.listReports[index], ...resp.data }
        return resp.data
      } catch (e) {
        console.error('Error updating report:', e)
        notifyServerError(errorText(e, 'Не удалось сохранить отчёт'))
        return null
      }
    },

    /** DELETE /api/v1/reports/:id */
    async deleteReport(id) {
      try {
        await apiClient.delete(`/api/v1/reports/${id}`)
        this.listReports = this.listReports.filter(r => r.id !== id)
        return true
      } catch (e) {
        console.error('Error deleting report:', e)
        notifyServerError(errorText(e, 'Не удалось удалить отчёт'))
        return false
      }
    },

    /** GET /api/v1/reports/:id/data — строки, сводка, разбивки */
    async getReportData(id) {
      try {
        const resp = await apiClient.get(`/api/v1/reports/${id}/data`)
        return resp.data
      } catch (e) {
        console.error('Error computing report:', e)
        notifyServerError(errorText(e, 'Не удалось сформировать отчёт'))
        return null
      }
    },

    /** GET /api/v1/reports/:id/export — скачать .xlsx */
    async exportReport(id, name) {
      try {
        const resp = await apiClient.get(`/api/v1/reports/${id}/export`, { responseType: 'blob' })
        const objectUrl = URL.createObjectURL(resp.data)
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = `${(name || 'report').replace(/[\\/:*?"<>|]+/g, '_')}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(objectUrl)
        return true
      } catch (e) {
        console.error('Error exporting report:', e)
        // при responseType: 'blob' тело ошибки тоже Blob — достаём текст
        let message = 'Не удалось выгрузить отчёт'
        try {
          const body = JSON.parse(await e?.response?.data?.text?.())
          message = SERVER_ERRORS[body.error] || body.error || message
        } catch {
          // не JSON — оставляем общее сообщение
        }
        notifyServerError(message)
        return false
      }
    },
  },
})
