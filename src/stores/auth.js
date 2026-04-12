// stores/art.js
import { defineStore } from 'pinia'
import apiClient from '@/services/api.js'
import { notifyServerError, notifyServerSuccess } from '@/services/notify.js'
import { setUser, setSession } from '@/services/auth.js'

export const useAuth = defineStore('auth', {
  state: () => {
    return {
      // Auth    
      user: null,
      session: null     
    }
  },   

  actions: {
    // ==================== LOCATIONS ACTIONS ====================
    
    /**
     * GET /api/v1/art/locations - Получить все локации
     */
    async login(email, password) {     
      let success = true
      try {
        const resp = await apiClient.post('/api/v1/auth/login', { email, password })
        this.user = resp.data?.user || null
        this.session = resp.data?.session || null
        setUser(this.user)
        setSession(this.session)
        console.log('User Data', resp.data)
      } catch (e) {
        console.error('Error fetching data:', e)
        notifyServerError(e?.response?.data?.message || 'Failed to load user data')
        this.error = e?.response?.data?.message || 'Failed to load user data'
        success = false
      } finally {
        this.loading = false
      }
      return success
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