import axios, { AxiosHeaders } from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 15_000,
})

function readAccessToken(): string | null {
  const raw = localStorage.getItem('wms.auth')
  if (!raw) return null

  try {
    // Zustand persist commonly stores { state: { accessToken } }, but some setups store { accessToken } directly.
    const parsed = JSON.parse(raw) as
      | { state?: { accessToken?: string | null } }
      | { accessToken?: string | null }
      | unknown

    if (typeof parsed === 'object' && parsed !== null) {
      const p = parsed as { state?: { accessToken?: string | null }; accessToken?: string | null }
      return p.state?.accessToken ?? p.accessToken ?? null
    }

    return null
  } catch {
    return null
  }
}

api.interceptors.request.use((config) => {
  const token = readAccessToken()
  if (token) {
    const headers = AxiosHeaders.from(config.headers ?? {})
    headers.set('Authorization', `Bearer ${token}`)
    config.headers = headers
  }
  return config
})

