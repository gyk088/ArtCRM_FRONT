import axios from 'axios'
import { getToken } from '@/services/auth.js'

const apiClient = axios.create({
  timeout: 100000,
  baseURL: 'http://31.220.77.203:9999',
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

export default apiClient