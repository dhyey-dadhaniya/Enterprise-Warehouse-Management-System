import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { findItemBySku } from '../../services/catalogService'
import { generateCode128Png, generateQrPng, decodeBarcode } from '../../services/barcodeService'

export function BarcodeSimPage() {
  const [sku, setSku] = useState('SKU-1042')
  const [code128Url, setCode128Url] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ── Decode state ───────────────────────────────────────────────────
  const [decodeFile, setDecodeFile] = useState<File | null>(null)
  const [decodePreview, setDecodePreview] = useState<string | null>(null)
  const [decodeResult, setDecodeResult] = useState<{ text: string; format: string } | null>(null)
  const [decoding, setDecoding] = useState(false)

  useEffect(() => {
    return () => {
      if (code128Url) URL.revokeObjectURL(code128Url)
      if (qrUrl) URL.revokeObjectURL(qrUrl)
    }
  }, [code128Url, qrUrl])

  const payload = useMemo(() => sku.trim(), [sku])

  const handleDecodeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setDecodeFile(file)
    setDecodeResult(null)
    if (decodePreview) URL.revokeObjectURL(decodePreview)
    setDecodePreview(file ? URL.createObjectURL(file) : null)
  }

  const handleDecode = async () => {
    if (!decodeFile) return
    setDecoding(true)
    setDecodeResult(null)
    try {
      const result = await decodeBarcode(decodeFile)
      setDecodeResult(result)
      toast.success(`Decoded: ${result.text}`)
    } catch {
      toast.error('Failed to decode. Make sure the image contains a valid barcode or QR code.')
    } finally {
      setDecoding(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Generated Barcodes</CardTitle>
        </CardHeader>
        <div className="grid place-items-center rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="w-full max-w-md">
            <div className="space-y-3">
              {code128Url ? (
                <img
                  src={code128Url}
                  alt="CODE 128 barcode"
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950"
                />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  Generate a CODE 128 barcode for a SKU.
                </div>
              )}

              {qrUrl ? (
                <div className="grid place-items-center">
                  <img
                    src={qrUrl}
                    alt="QR code"
                    className="size-40 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  Generate a QR code for the same payload.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scan Simulation (Real API)</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Enter SKU
          </label>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:ring-slate-800"
            placeholder="SKU-XXXX"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              onClick={async () => {
                const data = payload
                if (!data) {
                  toast.error('Enter a SKU first')
                  return
                }
                try {
                  setLoading(true)
                  const [code128, qr] = await Promise.all([
                    generateCode128Png({ data }),
                    generateQrPng({ data }),
                  ])
                  if (code128Url) URL.revokeObjectURL(code128Url)
                  if (qrUrl) URL.revokeObjectURL(qrUrl)
                  setCode128Url(URL.createObjectURL(code128))
                  setQrUrl(URL.createObjectURL(qr))
                  toast.success('Generated barcode + QR')
                } catch (e) {
                  toast.error('Failed to generate barcode. Ensure you are logged in.')
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
            >
              Generate
            </Button>

            <Button
              variant="secondary"
              onClick={async () => {
                const data = payload
                if (!data) {
                  toast.error('Enter a SKU first')
                  return
                }
                try {
                  setLoading(true)
                  const item = await findItemBySku(data)
                  if (!item) {
                    toast.error(`Item not found for ${data}`)
                    return
                  }
                  toast.success(`Fetched item: ${item.sku} (${item.name})`)
                } catch (e) {
                  toast.error('Failed to fetch item. Ensure you are logged in.')
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
            >
              Simulate Scan
            </Button>
          </div>
        </div>
      </Card>
      {/* ── Decode card ─────────────────────────────────────────────── */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Decode Barcode / QR Code</CardTitle>
        </CardHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* File input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Upload barcode image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleDecodeFileChange}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-amber-700 hover:file:bg-amber-100 dark:text-slate-400 dark:file:bg-amber-950/40 dark:file:text-amber-400"
            />
            {decodePreview && (
              <img
                src={decodePreview}
                alt="preview"
                className="max-h-36 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950"
              />
            )}
            <Button
              onClick={handleDecode}
              disabled={decoding || !decodeFile}
              className="w-full"
            >
              {decoding ? 'Decoding…' : 'Decode'}
            </Button>
          </div>

          {/* Result */}
          <div className="flex flex-col justify-center space-y-3">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Result</p>
            {decodeResult ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Text</span>
                    <p className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 break-all">
                      {decodeResult.text}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Format</span>
                    <p className="font-mono text-sm text-slate-700 dark:text-slate-300">
                      {decodeResult.format}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                Upload a barcode or QR image and click Decode.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

