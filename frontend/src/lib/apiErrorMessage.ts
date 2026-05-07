import axios from 'axios'

/** Parses WMS `ApiError` JSON: `message` and optional `fieldErrors` (validation). */
export function getApiErrorMessage(err: unknown): string | null {
  if (!axios.isAxiosError(err)) return null
  const data = err.response?.data
  if (typeof data !== 'object' || data === null) return err.message || null

  const d = data as { message?: unknown; fieldErrors?: Record<string, string> }
  const fe = d.fieldErrors
  if (fe && typeof fe === 'object') {
    const parts = Object.values(fe).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    if (parts.length > 0) return parts.join(' · ')
  }
  if (typeof d.message === 'string' && d.message.trim()) return d.message.trim()
  return err.message || null
}
