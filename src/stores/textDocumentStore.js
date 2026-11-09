// stores/textDocumentStore.js
// Общая логика сторов биографий (stores/bio.js) и резюме (stores/cv.js) —
// оба работают с одинаковым API бэкенда (/api/v1/bio и /api/v1/cv, см.
// TextDocumentService), отличаются только адресом и текстами уведомлений.
//
// Раньше документы хранились только в localStorage браузера (ключи
// 'bioList' / 'cvList'). При первой загрузке списка такие записи один раз
// переносятся на сервер (POST /import) и ключ удаляется.
import apiClient from '@/services/api.js'
import { notifyServerError } from '@/services/notify.js'

function readLegacy(key) {
  try {
    const raw = localStorage.getItem(key)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch (e) {
    console.error(`Error reading legacy ${key}:`, e)
    return []
  }
}

export function createTextDocumentActions({ endpoint, legacyKey, listKey, texts }) {
  const errorText = (e, fallback) => e?.response?.data?.error || fallback

  const upsert = (store, doc) => {
    const index = store[listKey].findIndex(item => item.id === doc.id)
    if (index === -1) store[listKey].push(doc)
    else store[listKey][index] = doc
  }

  async function importLegacy(store) {
    const legacy = readLegacy(legacyKey)
    if (!legacy.length) {
      localStorage.removeItem(legacyKey)
      return
    }
    try {
      const resp = await apiClient.post(`${endpoint}/import`, {
        items: legacy.map(({ title, text, createdAt, updatedAt }) => ({ title, text, createdAt, updatedAt })),
      })
      // Удаляем ключ только после успешного ответа — иначе попробуем снова
      // при следующем заходе, а не потеряем документы
      localStorage.removeItem(legacyKey)
      for (const doc of resp.data?.created || []) upsert(store, doc)
    } catch (e) {
      console.error(`Error importing legacy ${legacyKey}:`, e)
      notifyServerError(errorText(e, texts.importError))
    }
  }

  return {
    /** GET {endpoint} — список документов текущего пользователя */
    async fetchList() {
      // Повторные вызовы во время загрузки (например, список + страница
      // редактирования) переиспользуют один запрос
      if (this._pending) return this._pending

      this._pending = (async () => {
        this.loading = true
        try {
          const resp = await apiClient.get(endpoint)
          this[listKey] = resp.data || []
          await importLegacy(this)
          this.loaded = true
          return true
        } catch (e) {
          console.error(`Error fetching ${endpoint}:`, e)
          notifyServerError(errorText(e, texts.loadError))
          return false
        } finally {
          this.loading = false
          this._pending = null
        }
      })()
      return this._pending
    },

    /** GET {endpoint}/:id — один документ (кладётся и в список) */
    async fetchOne(id) {
      try {
        const resp = await apiClient.get(`${endpoint}/${id}`)
        upsert(this, resp.data)
        return resp.data
      } catch (e) {
        console.error(`Error fetching ${endpoint}/${id}:`, e)
        notifyServerError(errorText(e, texts.loadError))
        return null
      }
    },

    /** POST {endpoint} — { title, text } */
    async add({ title, text }) {
      try {
        const resp = await apiClient.post(endpoint, { title, text })
        upsert(this, resp.data)
        return resp.data
      } catch (e) {
        console.error(`Error creating ${endpoint}:`, e)
        notifyServerError(errorText(e, texts.saveError))
        return null
      }
    },

    /** PUT {endpoint}/:id — { title, text } */
    async update(id, { title, text }) {
      try {
        const resp = await apiClient.put(`${endpoint}/${id}`, { title, text })
        upsert(this, resp.data)
        return resp.data
      } catch (e) {
        console.error(`Error updating ${endpoint}/${id}:`, e)
        notifyServerError(errorText(e, texts.saveError))
        return null
      }
    },

    /** DELETE {endpoint}/:id */
    async remove(id) {
      try {
        await apiClient.delete(`${endpoint}/${id}`)
        this[listKey] = this[listKey].filter(item => item.id !== id)
        return true
      } catch (e) {
        console.error(`Error deleting ${endpoint}/${id}:`, e)
        notifyServerError(errorText(e, texts.deleteError))
        return false
      }
    },
  }
}
