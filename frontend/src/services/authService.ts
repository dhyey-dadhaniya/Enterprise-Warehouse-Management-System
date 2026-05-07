import { api } from './http'
import type { UserRole } from '../types/roles'

type LoginResponse = {
  accessToken: string
  tokenType: string
  expiresInMs: number
}

export async function login(input: { username: string; password: string }) {
  const res = await api.post<LoginResponse>('/auth/login', input, {
    // login is public; ensure no stale auth header leaks in
    headers: { Authorization: '' },
  })
  return res.data
}

type RegisterResponse = {
  message: string
}

export async function register(input: { username: string; password: string; role: UserRole }) {
  const res = await api.post<RegisterResponse>(
    '/auth/register',
    { username: input.username, password: input.password, role: input.role },
    { headers: { Authorization: '' } },
  )
  return res.data
}

export async function me(accessToken?: string): Promise<{ username: string; roles: string[] }> {
  const res = await api.get<{ username: string; roles: string[] }>('/me', {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  })
  return res.data
}

