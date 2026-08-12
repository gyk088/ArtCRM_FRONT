// stores/art.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'

export const useFile = defineStore('file', {
  state: () => {
    return {
      files: [],
      currentFile: null,
      fileStats: null,
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
      } catch (e) {
        console.error('Error fetching data:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to load user data')
        this.error = e?.response?.data?.message || 'Failed to load user data'
        success = false
      }
      return success
    },

    async deleteFile(fileId) {
      let success = true
      try {
        await apiClient.delete(`/api/v1/file/${fileId}`)
        this.files = this.files.filter(f => f.id !== fileId) // Удаляем файл из списка
        notifyServerSuccess('Файл успешно удален')
      } catch (e) {
        console.error('Error deleting file:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to delete file')
        this.error = e?.response?.data?.message || 'Failed to delete file'
        success = false
      }
      return success
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
