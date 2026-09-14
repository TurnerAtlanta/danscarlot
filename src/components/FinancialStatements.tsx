import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCars, type Car } from '../api'

function sumEntries(entries?: { label: string; amount: number }[]) {
  return (entries ?? []).reduce((total, entry) => total + Number(entry.amount || 0), 0)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value || 0)
}

function matchesDateFilter(car: Car, fromDate?: string, toDate?: string) {
  const referenceDate = car.status === 'sold' ? car.soldDate ?? car.purchaseDate : car.purchaseDate ?? car.soldDate
  if (!referenceDate) return true
  if (fromDate && referenceDate < fromDate) return false
  if (toDate && referenceDate > toDate) return false
  return true
}

function getCarFinancials(car: Car) {
  const purchasePrice = Number(car.purchasePrice ?? 0)
  const maintenance = sumEntries(car.maintenanceCosts) || Number(car.maintenance ?? car.maintenence ?? 0)
  const added = sumEntries(car.addedCosts) || Number(car.addedCost ?? 0)
  const salePrice = Number(car.salePrice ?? car.price ?? 0)
  const totalCost = purchasePrice + maintenance + added
  const profit = salePrice - totalCost

  return { purchasePrice, maintenance, added, salePrice, totalCost, profit }
}

export default function FinancialStatements() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'inventory' | 'sold'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const { data: cars = [], isLoading, isError } = useQuery<Car[]>({
    queryKey: ['cars'],
    queryFn: getCars
  })

  const filteredCars = useMemo(() => {
    return cars.filter((car) => {
      const statusMatch = statusFilter === 'all' || car.status === statusFilter
      const dateMatch = matchesDateFilter(car, fromDate || undefined, toDate || undefined)
      return statusMatch && dateMatch
    })
  }, [cars, statusFilter, fromDate, toDate])

  const totals = filteredCars.reduce(
    (acc, car) => {
      const financials = getCarFinancials(car)
      acc.purchase += financials.purchasePrice
      acc.maintenance += financials.maintenance
      acc.added += financials.added
      acc.sales += financials.salePrice
      acc.cost += financials.totalCost
      acc.profit += financials.profit
      acc.units += 1
      return acc
    },
    { purchase: 0, maintenance: 0, added: 0, sales: 0, cost: 0, profit: 0, units: 0 }
  )

  const exportCsv = () => {
    const rows = [
      ['Vehicle', 'Trim', 'Status', 'Purchase Date', 'Sold Date', 'Purchase', 'Maintenance', 'Added', 'Total Cost', 'Sale', 'Profit'],
      ...filteredCars.map((car) => {
        const financials = getCarFinancials(car)
        return [
          `${car.year} ${car.make} ${car.model}`,
          car.trim ?? car.trimLevel ?? '',
          car.status ?? 'inventory',
          car.purchaseDate ?? '',
          car.soldDate ?? '',
          String(financials.purchasePrice),
          String(financials.maintenance),
          String(financials.added),
          String(financials.totalCost),
          String(financials.salePrice),
          String(financials.profit)
        ]
      })
    ]

    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'dan-carlot-financials.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <style>{`@media print { .financial-toolbar, .no-print { display: none !important; } .statement-table { font-size: 12px; } }`}</style>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Financial statements</h1>
            <p className="text-sm text-slate-400">Per vehicle and total lot performance</p>
          </div>
          <div className="financial-toolbar flex gap-2">
            <button type="button" onClick={exportCsv} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">Export CSV</button>
            <button type="button" onClick={() => window.print()} className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">Print P&L</button>
          </div>
        </div>

        <div className="financial-toolbar grid gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'inventory' | 'sold')} className="input">
            <option value="all">All status</option>
            <option value="inventory">Inventory</option>
            <option value="sold">Sold</option>
          </select>
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="input" />
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="input" />
          <button type="button" onClick={() => { setStatusFilter('all'); setFromDate(''); setToDate('') }} className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">Reset</button>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"><div className="text-xs text-slate-400">Units</div><div className="mt-1 text-lg font-semibold">{totals.units}</div></div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"><div className="text-xs text-slate-400">Purchase total</div><div className="mt-1 text-lg font-semibold">{formatCurrency(totals.purchase)}</div></div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"><div className="text-xs text-slate-400">Maintenance</div><div className="mt-1 text-lg font-semibold">{formatCurrency(totals.maintenance)}</div></div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"><div className="text-xs text-slate-400">Added costs</div><div className="mt-1 text-lg font-semibold">{formatCurrency(totals.added)}</div></div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"><div className="text-xs text-slate-400">Sale revenue</div><div className="mt-1 text-lg font-semibold">{formatCurrency(totals.sales)}</div></div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"><div className="text-xs text-slate-400">Net profit</div><div className={`mt-1 text-lg font-semibold ${totals.profit >= 0 ? 'text-brand' : 'text-red-400'}`}>{formatCurrency(totals.profit)}</div></div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 no-print">
          <h2 className="text-base font-semibold">Profit & loss summary</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-slate-800 p-3"><div className="text-xs text-slate-400">Revenue</div><div className="mt-1 text-xl font-semibold">{formatCurrency(totals.sales)}</div></div>
            <div className="rounded-md border border-slate-800 p-3"><div className="text-xs text-slate-400">Total cost</div><div className="mt-1 text-xl font-semibold">{formatCurrency(totals.cost)}</div></div>
            <div className="rounded-md border border-slate-800 p-3"><div className="text-xs text-slate-400">Gross profit</div><div className={`mt-1 text-xl font-semibold ${totals.profit >= 0 ? 'text-brand' : 'text-red-400'}`}>{formatCurrency(totals.profit)}</div></div>
            <div className="rounded-md border border-slate-800 p-3"><div className="text-xs text-slate-400">Units</div><div className="mt-1 text-xl font-semibold">{totals.units}</div></div>
          </div>
        </div>

        {filteredCars.length === 0 ? (
          <p className="text-sm text-slate-400">No cars match these filters.</p>
        ) : (
          <div className="statement-table overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/70">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-300">
                <tr>
                  <th className="px-3 py-2 font-medium">Vehicle</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Trim</th>
                  <th className="px-3 py-2 font-medium">Purchase</th>
                  <th className="px-3 py-2 font-medium">Maintenance</th>
                  <th className="px-3 py-2 font-medium">Added</th>
                  <th className="px-3 py-2 font-medium">Total cost</th>
                  <th className="px-3 py-2 font-medium">Sale</th>
                  <th className="px-3 py-2 font-medium">Profit</th>
                </tr>
              </thead>
              <tbody>
                {filteredCars.map((car) => {
                  const financials = getCarFinancials(car)
                  return (
                    <tr key={car.id} className="border-b border-slate-800 last:border-b-0">
                      <td className="px-3 py-2"><div className="font-medium">{car.year} {car.make} {car.model}</div><div className="text-xs text-slate-400">VIN: {car.vin}</div></td>
                      <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] ${car.status === 'sold' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-sky-500/20 text-sky-300'}`}>{car.status ?? 'inventory'}</span></td>
                      <td className="px-3 py-2">{car.trim ?? car.trimLevel ?? '—'}</td>
                      <td className="px-3 py-2">{formatCurrency(financials.purchasePrice)}</td>
                      <td className="px-3 py-2">{formatCurrency(financials.maintenance)}</td>
                      <td className="px-3 py-2">{formatCurrency(financials.added)}</td>
                      <td className="px-3 py-2">{formatCurrency(financials.totalCost)}</td>
                      <td className="px-3 py-2">{formatCurrency(financials.salePrice)}</td>
                      <td className={`px-3 py-2 font-medium ${financials.profit >= 0 ? 'text-brand' : 'text-red-400'}`}>{formatCurrency(financials.profit)}</td>
                    </tr>
                  )
                })}
                <tr className="bg-slate-950/60">
                  <td className="px-3 py-2 font-semibold">Total</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2 font-semibold">{formatCurrency(totals.purchase)}</td>
                  <td className="px-3 py-2 font-semibold">{formatCurrency(totals.maintenance)}</td>
                  <td className="px-3 py-2 font-semibold">{formatCurrency(totals.added)}</td>
                  <td className="px-3 py-2 font-semibold">{formatCurrency(totals.cost)}</td>
                  <td className="px-3 py-2 font-semibold">{formatCurrency(totals.sales)}</td>
                  <td className={`px-3 py-2 font-semibold ${totals.profit >= 0 ? 'text-brand' : 'text-red-400'}`}>{formatCurrency(totals.profit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
