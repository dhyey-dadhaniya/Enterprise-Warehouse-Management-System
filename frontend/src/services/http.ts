import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const api = axios.create({
  baseURL: '/api',
  timeout: 15_000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

