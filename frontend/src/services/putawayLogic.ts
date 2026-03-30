export function suggestBinLocation(input: {
  sku: string
  warehouseName: string
  qty: number
}): { aisle: string; bin: string; confidence: number; reason: string } {
  const key = `${input.warehouseName}:${input.sku}`
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0

  const aisleLetter = String.fromCharCode(65 + (h % 6)) // A-F
  const aisleNum = 1 + ((h >>> 3) % 9) // 1-9
  const binNum = 1 + ((h >>> 7) % 24) // 1-24
  const level = ['A', 'B', 'C', 'D'][((h >>> 11) % 4)] // A-D

  const aisle = `${aisleLetter}${aisleNum}`
  const bin = `${level}-${String(binNum).padStart(2, '0')}`

  const confidence = Math.max(0.62, Math.min(0.92, 0.72 + (Math.min(input.qty, 30) / 200)))
  const reason =
    input.qty >= 12
      ? 'Bulk quantity → allocate deeper bins'
      : 'Fast pick → allocate near primary aisles'

  return { aisle, bin, confidence, reason }
}

