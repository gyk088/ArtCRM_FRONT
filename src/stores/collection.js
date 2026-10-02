// stores/collection.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

export const useCollection = defineStore('collection', {
  state: () => {
    return {
      listCollections: [],
      loading: false,
      error: null,

      // 📁 Папки — группировка ссылок, как в файловом менеджере
      folders: [],
      foldersLoading: false,
      currentFolderId: null,
    }
  },

  actions: {
    /**
     * GET /api/v1/collections - Получить все свои ссылки
     */
    async getAllCollections() {
      this.loading = true
      this.error = null
      let success = true

      try {
        const resp = await apiClient.get('/api/v1/collections')
        this.listCollections = resp.data || []
      } catch (e) {
        console.error('Error fetching collections:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to load collections')
        this.error = e?.response?.data?.error || 'Failed to load collections'
        success = false
      } finally {
        this.loading = false
      }
      return success
    },

    /**
     * GET /api/v1/collections/:id - Получить свою ссылку по ID (для редактирования)
     */
    async getCollectionById(id) {
      let result = null
      try {
        const resp = await apiClient.get(`/api/v1/collections/${id}`)
        result = resp.data
      } catch (e) {
        console.error('Error fetching collection by id:', e)
        if (e?.response?.status !== 404) {
          notifyServerError(e?.response?.data?.error || 'Failed to load collection')
        }
        result = null
      }
      return result
    },

    /**
     * GET /api/v1/collections/public/:id - Публичная страница ссылки (без авторизации)
     */
    async getPublicCollection(id) {
      let result = null
      try {
        const resp = await apiClient.get(`/api/v1/collections/public/${id}`)
        result = resp.data
      } catch (e) {
        if (e?.response?.status !== 404) {
          console.error('Error fetching public collection:', e)
        }
        result = null
      }
      return result
    },

    /**
     * POST /api/v1/collections - Создать новую ссылку
     */
    async createCollection(data) {
      let result = null
      try {
        const resp = await apiClient.post('/api/v1/collections', data)
        result = resp.data
        if (result) {
          this.listCollections.unshift(result)
          notifyServerSuccess('Ссылка создана')
        }
      } catch (e) {
        console.error('Error creating collection:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось создать ссылку')
        this.error = e?.response?.data?.error || 'Не удалось создать ссылку'
        result = null
      }
      return result
    },

    /**
     * PUT /api/v1/collections/:id - Обновить ссылку
     */
    async updateCollection(id, data) {
      let result = null
      try {
        const resp = await apiClient.put(`/api/v1/collections/${id}`, data)
        result = resp.data
        if (result) {
          const index = this.listCollections.findIndex(c => c.id === id)
          if (index !== -1) this.listCollections[index] = result
          notifyServerSuccess('Ссылка обновлена')
        }
      } catch (e) {
        console.error('Error updating collection:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось обновить ссылку')
        this.error = e?.response?.data?.error || 'Не удалось обновить ссылку'
        result = null
      }
      return result
    },

    /**
     * DELETE /api/v1/collections/:id - Удалить ссылку
     */
    async deleteCollection(id) {
      let success = true
      try {
        await apiClient.delete(`/api/v1/collections/${id}`)
        this.listCollections = this.listCollections.filter(c => c.id !== id)
        notifyServerSuccess('Ссылка удалена')
      } catch (e) {
        console.error('Error deleting collection:', e)
        notifyServerError(e?.response?.data?.error || 'Не удалось удалить ссылку')
        this.error = e?.response?.data?.error || 'Не удалось удалить ссылку'
        success = false
      }
      return success
    },

    // ==================== ПАПКИ ====================

    async getFolders() {
      this.foldersLoading = true
      try {
        const resp = await apiClient.get('/api/v1/collections/folder')
        this.folders = resp.data
        return this.folders
      } catch (e) {
        console.error('Error fetching collection folders:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to load folders')
        this.error = e?.response?.data?.error || 'Failed to load folders'
        return []
      } finally {
        this.foldersLoading = false
      }
    },

    async createFolder(name, parentId = null) {
      try {
        const resp = await apiClient.post('/api/v1/collections/folder', { name, parent_id: parentId })
        this.folders.push(resp.data)
        notifyServerSuccess('Папка создана')
        return resp.data
      } catch (e) {
        console.error('Error creating collection folder:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to create folder')
        this.error = e?.response?.data?.error || 'Failed to create folder'
        return null
      }
    },

    async renameFolder(folderId, name) {
      try {
        const resp = await apiClient.put(`/api/v1/collections/folder/${folderId}`, { name })
        this.folders = this.folders.map(f => f.id === folderId ? resp.data : f)
        return resp.data
      } catch (e) {
        console.error('Error renaming collection folder:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to rename folder')
        this.error = e?.response?.data?.error || 'Failed to rename folder'
        throw e
      }
    },

    /**
     * Вложить папку в другую папку (или вынести на корневой уровень,
     * если parentId === null).
     */
    async moveFolderToParent(folderId, parentId) {
      try {
        const resp = await apiClient.put(`/api/v1/collections/folder/${folderId}`, { parent_id: parentId })
        this.folders = this.folders.map(f => f.id === folderId ? resp.data : f)
        return resp.data
      } catch (e) {
        console.error('Error moving collection folder:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to move folder')
        throw e
      }
    },

    async deleteFolder(folderId) {
      let success = true
      try {
        await apiClient.delete(`/api/v1/collections/folder/${folderId}`)

        // Бэкенд удаляет папку каскадно вместе со всеми вложенными — синхронизируем локально
        const removedIds = new Set([folderId])
        let addedMore = true
        while (addedMore) {
          addedMore = false
          for (const f of this.folders) {
            if (removedIds.has(f.parent_id) && !removedIds.has(f.id)) {
              removedIds.add(f.id)
              addedMore = true
            }
          }
        }

        this.folders = this.folders.filter(f => !removedIds.has(f.id))

        // Ссылки удалённых папок отвязаны на бэкенде (folder_id = null)
        this.listCollections = this.listCollections.map(c =>
          removedIds.has(c.folder_id) ? { ...c, folder_id: null } : c
        )

        if (removedIds.has(this.currentFolderId)) {
          this.currentFolderId = null
        }

        notifyServerSuccess('Папка удалена')
      } catch (e) {
        console.error('Error deleting collection folder:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to delete folder')
        this.error = e?.response?.data?.error || 'Failed to delete folder'
        success = false
      }
      return success
    },

    setCurrentFolder(folderId) {
      this.currentFolderId = folderId
    },

    async moveCollectionToFolder(collectionId, folderId) {
      try {
        const resp = await apiClient.patch(`/api/v1/collections/${collectionId}/folder`, { folderId })
        const index = this.listCollections.findIndex(c => c.id === collectionId)
        if (index !== -1) this.listCollections[index] = resp.data
        return resp.data
      } catch (e) {
        console.error('Error moving collection to folder:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to move collection')
        this.error = e?.response?.data?.error || 'Failed to move collection'
        throw e
      }
    },

    /**
     * Пересортировка ссылок внутри одной папки/корня после drag&drop —
     * ids передаются в новом визуальном порядке.
     */
    async reorderCollections(ids) {
      const previous = this.listCollections
      const orderIndex = new Map(ids.map((id, i) => [id, i]))
      this.listCollections = [...this.listCollections].sort((a, b) => {
        const ai = orderIndex.has(a.id) ? orderIndex.get(a.id) : Infinity
        const bi = orderIndex.has(b.id) ? orderIndex.get(b.id) : Infinity
        return ai - bi
      })

      try {
        await apiClient.patch('/api/v1/collections/reorder', { ids })
      } catch (e) {
        console.error('Error reordering collections:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to reorder collections')
        this.listCollections = previous
      }
    },

    /**
     * Пересортировка папок внутри одного уровня вложенности после drag&drop.
     */
    async reorderFolders(ids) {
      const previous = this.folders
      const orderIndex = new Map(ids.map((id, i) => [id, i]))
      this.folders = [...this.folders].sort((a, b) => {
        const ai = orderIndex.has(a.id) ? orderIndex.get(a.id) : Infinity
        const bi = orderIndex.has(b.id) ? orderIndex.get(b.id) : Infinity
        return ai - bi
      })

      try {
        await apiClient.patch('/api/v1/collections/folder/reorder', { ids })
      } catch (e) {
        console.error('Error reordering collection folders:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to reorder folders')
        this.folders = previous
      }
    },
  }
})
