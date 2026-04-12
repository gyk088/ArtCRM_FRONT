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
      },      error: null
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
        this.files.unshift(resp.data) // Добавляем новый файл в начало списка
        notifyServerSuccess('Файл успешно загружен')
        console.log('Upload Response', resp.data)   
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