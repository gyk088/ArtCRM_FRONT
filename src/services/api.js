import axios from 'axios'
import { getToken, logout } from '@/services/auth.js'
import { API_BASE_URL } from '@/services/const.js'
import { installApiCache } from '@/offline/apiCache.js'

const apiClient = axios.create({
  timeout: 100000,
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  maxContentLength: 10000
})

apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()     
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    config.headers['x-type'] = 'desktop';
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout()
    }
    return Promise.reject(error)
  }
)

// Без интернета — ответы GET из сохранённого на устройстве (src/offline/)
installApiCache(apiClient)

export default apiClient