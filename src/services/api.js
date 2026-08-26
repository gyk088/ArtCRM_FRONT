import axios from 'axios'
import { getToken, logout } from '@/services/auth.js'

const apiClient = axios.create({
  timeout: 100000,
  baseURL: 'https://artapi.myoffer.life',
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

export default apiClient