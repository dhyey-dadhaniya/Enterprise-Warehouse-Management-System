import type { UserRole } from '../types/roles'
import { api } from './http'

type LoginResponse = {
  accessToken: string
  tokenType: string
  expiresInMs: number
}
type NormalisedAuth = { token: string }

export async function login(input: { username: string; password: string }): Promise<NormalisedAuth> {
  const res = await api.post<LoginResponse>('/auth/login', input)
  return { token: res.data.accessToken }
}

export async function register(input: {
  username: string
  password: string
  role: 'ADMIN' | 'OPERATOR'
}): Promise<NormalisedAuth> {
  const res = await api.post<LoginResponse>('/auth/register', input)
  return { token: res.data.accessToken }
}

export async function me(): Promise<{ username: string; roles: string[] }> {
  const res = await api.get<{ username: string; roles: string[] }>('/me')
  return res.data
}

export function roleFromAuthorities(authorities: string[]): UserRole {
  return authorities.includes('ROLE_ADMIN') ? 'ADMIN' : 'OPERATOR'
}

