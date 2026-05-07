import { api } from './http'

export async function generateCode128Png(input: { data: string; width?: number; height?: number }): Promise<Blob> {
  const params = new URLSearchParams()
  params.set('data', input.data)
  if (input.width != null) params.set('width', String(input.width))
  if (input.height != null) params.set('height', String(input.height))

  const res = await api.post(`/barcodes/code128?${params.toString()}`, null, { responseType: 'blob' })
  return res.data as Blob
}

export async function generateQrPng(input: { data: string; size?: number }): Promise<Blob> {
  const params = new URLSearchParams()
  params.set('data', input.data)
  if (input.size != null) params.set('size', String(input.size))

  const res = await api.post(`/barcodes/qr?${params.toString()}`, null, { responseType: 'blob' })
  return res.data as Blob
}

export async function decodeBarcode(file: File): Promise<{ text: string; format: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<{ text: string; format: string }>('/barcodes/decode', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

