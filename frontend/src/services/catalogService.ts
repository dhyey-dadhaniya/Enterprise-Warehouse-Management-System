import type { AxiosAdapter, AxiosRequestConfig } from 'axios'
import type { Product, Warehouse } from '../types/domain'
import { api } from './http'
import { productsSeed, warehousesSeed } from '../mocks/catalogMock'

let productsDb: Product[] = [...productsSeed]
let warehousesDb: Warehouse[] = [...warehousesSeed]

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function mockAdapter(): AxiosAdapter {
  return async (config: AxiosRequestConfig) => {
    await sleep(250)
    const method = (config.method ?? 'get').toLowerCase()
    const url = config.url ?? ''

    if (method === 'get' && url === '/warehouses') {
      return {
        status: 200,
        statusText: 'OK',
        config,
        headers: { 'content-type': 'application/json' },
        data: warehousesDb,
      }
    }

    if (method === 'get' && url.startsWith('/products')) {
      return {
        status: 200,
        statusText: 'OK',
        config,
        headers: { 'content-type': 'application/json' },
        data: productsDb,
      }
    }

    return {
      status: 404,
      statusText: 'Not Found',
      config,
      headers: { 'content-type': 'application/json' },
      data: { message: 'mock route not found', url, method },
    }
  }
}

export async function listWarehouses(): Promise<Warehouse[]> {
  const res = await api.get<Warehouse[]>('/warehouses', { adapter: mockAdapter() })
  return res.data
}

export async function listProducts(): Promise<Product[]> {
  const res = await api.get<Product[]>('/products', { adapter: mockAdapter() })
  return res.data
}

