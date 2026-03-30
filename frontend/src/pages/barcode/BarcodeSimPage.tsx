import { useState } from 'react'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

export function BarcodeSimPage() {
  const [sku, setSku] = useState('SKU-1042')

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Generated Barcode (Mock)</CardTitle>
        </CardHeader>
        <div className="grid place-items-center rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="w-full max-w-md">
            <div className="rounded-lg bg-slate-900 px-4 py-8 text-center font-mono text-lg tracking-widest text-white">
              {sku}
            </div>
            <div className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
              Replace with real barcode rendering library later.
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scan Simulation</CardTitle>
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
          <Button
            onClick={() => toast.success(`Fetched product for ${sku} (mock)`)}
          >
            Simulate Scan
          </Button>
        </div>
      </Card>
    </div>
  )
}

