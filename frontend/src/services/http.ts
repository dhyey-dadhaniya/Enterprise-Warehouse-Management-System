import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 15_000,
})

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('wms.auth')
  const token = raw ? (JSON.parse(raw) as { state?: { accessToken?: string | null } })?.state?.accessToken : null
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

