// stores/art.js
import { defineStore } from 'pinia'
import { Modal } from 'ant-design-vue'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'
import { useArtWork } from '@/stores/artWork.js'
import { useCollection } from '@/stores/collection.js'
import { useExhibition } from '@/stores/exhibition.js'

export function formatStorageSize(bytes) {
  const value = Number(bytes) || 0
  if (value < 1024) return `${value} Б`
  const units = ['КБ', 'МБ', 'ГБ', 'ТБ']
  let size = value / 1024
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

export function showStorageLimitModal(used, limit) {
  Modal.warning({
    title: 'Недостаточно места на диске',
    content: `Использовано ${formatStorageSize(used)} из ${formatStorageSize(limit)}. Освободите место (удалите ненужные файлы) или обратитесь к администратору, чтобы увеличить лимит.`,
    okText: 'Понятно'
  })
}

export const useFile = defineStore('file', {
  state: () => {
    return {
      files: [],
      currentFile: null,
      fileStats: null,
      storageInfo: null, // { used, limit, remaining }
      loading: false,
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
      },
      filters: {
        search: '',
        mimetype: '',
        ext: ''
      },
      error: null,

      // 📁 Папки
      folders: [],
      foldersLoading: false,
      currentFolderId: null
    }
  },

  actions: {
    async uploadFile(file, data) {
      let success = true
      try {
        const formData = new FormData();
        formData.append("name", data.name);
        formData.append("comment", data.comment);
        formData.append("file", file);

        const resp = await apiClient.post('/api/v1/file/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

        let uploaded = resp.data

        if (this.currentFolderId) {
          uploaded = await this.moveFileToFolder(uploaded.id, this.currentFolderId)
        }

        this.files.unshift(uploaded) // Добавляем новый файл в начало списка
        notifyServerSuccess('Файл успешно загружен')
        console.log('Upload Response', uploaded)
        this.getStorageInfo()
      } catch (e) {
        console.error('Error fetching data:', e)

        if (e?.response?.data?.code === 'STORAGE_LIMIT_EXCEEDED') {
          showStorageLimitModal(e.response.data.used, e.response.data.limit)
        } else {
          notifyServerError(e?.response?.data?.message || 'Failed to load user data')
        }

        this.error = e?.response?.data?.message || 'Failed to load user data'
        success = false
      }
      return success
    },

    /**
     * POST /api/v1/file/:id/copy - скопировать чужой файл (по id) в свои
     * файлы. Нужно при импорте ссылки/выставки: работы копируются целиком,
     * включая обложку и доп. изображения, а не просто ссылаются на чужой
     * файл (тот может позже удалиться у исходного владельца).
     *
     * Бросает ошибку с полем quotaExceeded=true, если не хватает места —
     * вызывающий код (импорт) должен остановиться и показать пользователю
     * предупреждение, а не тихо продолжать без картинок.
     */
    async copyFile(fileId) {
      try {
        const resp = await apiClient.post(`/api/v1/file/${fileId}/copy`)
        const copied = resp.data
        this.files.unshift(copied)
        return copied
      } catch (e) {
        if (e?.response?.data?.code === 'STORAGE_LIMIT_EXCEEDED') {
          const err = new Error(e.response.data.error)
          err.quotaExceeded = true
          err.used = e.response.data.used
          err.limit = e.response.data.limit
          throw err
        }
        console.error('Error copying file:', fileId, e)
        throw e
      }
    },

    /**
     * GET /api/v1/file/storage - использовано/доступно места на диске
     */
    async getStorageInfo() {
      try {
        const resp = await apiClient.get('/api/v1/file/storage')
        this.storageInfo = resp.data
      } catch (e) {
        console.error('Error fetching storage info:', e)
      }
      return this.storageInfo
    },

    /**
     * Проверить, используется ли файл в работах, ссылках или выставках —
     * чтобы предупредить пользователя, откуда файл пропадёт при удалении
     * (само удаление теперь разрешено всегда, бэкенд отвязывает файл везде
     * сам — см. FileService.deleteFile). Работа ссылается на файл через
     * avatar_id/avatar.id и images[].id, ссылка (коллекция) и выставка —
     * через avatar.id. Фото в галерее выставки в этой проверке не
     * учитываются (список выставок не тянет их без отдельного запроса на
     * каждую) — при удалении они всё равно корректно отвяжутся на бэкенде.
     */
    async checkFileUsage(fileId) {
      const artWorkStore = useArtWork()
      const collectionStore = useCollection()
      const exhibitionStore = useExhibition()

      if (!artWorkStore.listArtWorks.length) {
        await artWorkStore.getListArtWorks()
      }
      if (!collectionStore.listCollections.length) {
        await collectionStore.getAllCollections()
      }
      if (!exhibitionStore.listExhibitions.length) {
        await exhibitionStore.getAllExhibitions()
      }

      const works = artWorkStore.listArtWorks.filter(w =>
        w.avatar_id === fileId ||
        w.avatar?.id === fileId ||
        (w.images || []).some(img => img?.id === fileId)
      )

      const collections = collectionStore.listCollections.filter(c =>
        c.avatar?.id === fileId
      )

      const exhibitions = exhibitionStore.listExhibitions.filter(e =>
        e.avatar?.id === fileId
      )

      return { works, collections, exhibitions }
    },

    // Удаление файла всегда разрешено, даже если он где-то используется —
    // бэкенд сам отвязывает файл от всех работ/ссылок/выставок перед
    // удалением (см. FileService.deleteFile). Возвращает { unlinkedFrom }
    // при успехе или null при ошибке.
    async deleteFile(fileId) {
      try {
        const resp = await apiClient.delete(`/api/v1/file/${fileId}`)
        this.files = this.files.filter(f => f.id !== fileId) // Удаляем файл из списка
        notifyServerSuccess('Файл успешно удален')
        this.getStorageInfo()
        return resp.data
      } catch (e) {
        console.error('Error deleting file:', e)
        const rawMessage = e?.response?.data?.error || e?.response?.data?.message || ''
        notifyServerError(rawMessage || 'Failed to delete file')
        this.error = rawMessage || 'Failed to delete file'
        return null
      }
    },

    // ==================== ПАПКИ ====================

    async getFolders() {
      this.foldersLoading = true
      try {
        const resp = await apiClient.get('/api/v1/file/folder')
        this.folders = resp.data
        return this.folders
      } catch (e) {
        console.error('Error fetching folders:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to load folders')
        this.error = e?.response?.data?.error || 'Failed to load folders'
        return []
      } finally {
        this.foldersLoading = false
      }
    },

    async createFolder(name, parentId = null) {
      try {
        const resp = await apiClient.post('/api/v1/file/folder', { name, parent_id: parentId })
        this.folders.push(resp.data)
        notifyServerSuccess('Папка создана')
        return resp.data
      } catch (e) {
        console.error('Error creating folder:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to create folder')
        this.error = e?.response?.data?.error || 'Failed to create folder'
        return null
      }
    },

    async deleteFolder(folderId) {
      let success = true
      try {
        await apiClient.delete(`/api/v1/file/folder/${folderId}`)

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

        // Файлы удалённых папок отвязаны на бэкенде (folder_id = null)
        this.files = this.files.map(f =>
          removedIds.has(f.folder_id) ? { ...f, folder_id: null } : f
        )

        if (removedIds.has(this.currentFolderId)) {
          this.currentFolderId = null
        }

        notifyServerSuccess('Папка удалена')
      } catch (e) {
        console.error('Error deleting folder:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to delete folder')
        this.error = e?.response?.data?.error || 'Failed to delete folder'
        success = false
      }
      return success
    },

    setCurrentFolder(folderId) {
      this.currentFolderId = folderId
    },

    async renameFile(fileId, { name, comment } = {}) {
      try {
        const resp = await apiClient.put(`/api/v1/file/${fileId}`, { name, comment })

        this.files = this.files.map(f => f.id === fileId ? resp.data : f)

        return resp.data
      } catch (e) {
        console.error('Error renaming file:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to rename file')
        this.error = e?.response?.data?.error || 'Failed to rename file'
        throw e
      }
    },

    async renameFolder(folderId, name) {
      try {
        const resp = await apiClient.put(`/api/v1/file/folder/${folderId}`, { name })

        this.folders = this.folders.map(f => f.id === folderId ? resp.data : f)

        return resp.data
      } catch (e) {
        console.error('Error renaming folder:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to rename folder')
        this.error = e?.response?.data?.error || 'Failed to rename folder'
        throw e
      }
    },

    /**
     * Установить (fileId) или снять (null) обложку папки — картинка вместо
     * стандартной иконки папки в файловом менеджере.
     */
    async setFolderCover(folderId, fileId) {
      try {
        const resp = await apiClient.put(`/api/v1/file/folder/${folderId}`, { avatar_id: fileId })
        this.folders = this.folders.map(f => f.id === folderId ? resp.data : f)
        return resp.data
      } catch (e) {
        console.error('Error setting folder cover:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to set folder cover')
        this.error = e?.response?.data?.error || 'Failed to set folder cover'
        throw e
      }
    },

    /**
     * Пересортировка файлов внутри одной папки/корня после drag&drop —
     * ids передаются в новом визуальном порядке.
     */
    async reorderFiles(ids) {
      const previous = this.files
      // Оптимистично переставляем локально сразу, не дожидаясь ответа
      // сервера — иначе список на секунду "прыгнет" обратно на старое место.
      const orderIndex = new Map(ids.map((id, i) => [id, i]))
      this.files = [...this.files].sort((a, b) => {
        const ai = orderIndex.has(a.id) ? orderIndex.get(a.id) : Infinity
        const bi = orderIndex.has(b.id) ? orderIndex.get(b.id) : Infinity
        return ai - bi
      })

      try {
        await apiClient.patch('/api/v1/file/reorder', { ids })
      } catch (e) {
        console.error('Error reordering files:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to reorder files')
        this.files = previous
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
        await apiClient.patch('/api/v1/file/folder/reorder', { ids })
      } catch (e) {
        console.error('Error reordering folders:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to reorder folders')
        this.folders = previous
      }
    },

    /**
     * Вложить папку в другую папку (или вынести на корневой уровень,
     * если parentId === null) — например, при перетаскивании одной
     * папки на другую в файловом менеджере.
     */
    async moveFolderToParent(folderId, parentId) {
      try {
        const resp = await apiClient.put(`/api/v1/file/folder/${folderId}`, { parent_id: parentId })
        this.folders = this.folders.map(f => f.id === folderId ? resp.data : f)
        return resp.data
      } catch (e) {
        console.error('Error moving folder:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to move folder')
        throw e
      }
    },

    async moveFileToFolder(fileId, folderId) {
      try {
        const resp = await apiClient.patch(`/api/v1/file/${fileId}/folder`, { folderId })

        this.files = this.files.map(f => f.id === fileId ? resp.data : f)

        return resp.data
      } catch (e) {
        console.error('Error moving file to folder:', e)
        notifyServerError(e?.response?.data?.error || 'Failed to move file')
        this.error = e?.response?.data?.error || 'Failed to move file'
        throw e
      }
    },


    /**
     * Получить все файлы пользователя
     * @param {Object} params - параметры запроса (page, limit, search, mimetype, ext)
     */
    async getAllFiles(params = {}) {
      this.loading = true;
      this.error = null;

      try {
        // Объединяем текущие фильтры с новыми параметрами
        const queryParams = {
          page: params.page || this.pagination.page,
          limit: params.limit || this.pagination.limit,
          ...params
        };

        // Удаляем undefined значения
        Object.keys(queryParams).forEach(key => {
          if (queryParams[key] === undefined || queryParams[key] === '') {
            delete queryParams[key];
          }
        });

        const response = await apiClient.get('/api/v1/file/list', {
          params: queryParams
        });

        // Проверяем, пришли ли данные с пагинацией или просто массив
        if (response.data.files && Array.isArray(response.data.files)) {
          // С пагинацией
          this.files = response.data.files;
          this.pagination = response.data.pagination;
        } else if (Array.isArray(response.data)) {
          // Без пагинации
          this.files = response.data;
          this.pagination = {
            page: 1,
            limit: this.files.length,
            total: this.files.length,
            totalPages: 1
          };
        }

        return this.files;
      } catch (e) {
        console.error('Error fetching files:', e);
        notifyServerError(e?.response?.data?.error || 'Failed to load files');
        this.error = e?.response?.data?.error || 'Failed to load files';
        return [];
      } finally {
        this.loading = false;
      }
    },

    /**
     * Сбросить все состояние локаций
     */
    resetLocationsState() {
      this.user = null
      this.session = null
    }
  }
})
