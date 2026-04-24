import axios from 'axios'

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
    // Axios may use a plain object or AxiosHeaders internally; normalize to a plain object assignment.
    config.headers = (config.headers ?? {}) as Record<string, string>
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
  }
  return config
})

