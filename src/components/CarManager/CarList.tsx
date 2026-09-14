import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getCars, deleteCar, type Car } from '../../api'
import { Pencil, Trash2 } from 'lucide-react'

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

export default function CarList() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<'all' | 'inventory' | 'sold'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const { data: cars, isLoading, isError } = useQuery<Car[]>({
    queryKey: ['cars'],
    queryFn: getCars
  })

  const filteredCars = useMemo(() => {
    if (!cars) return []
    return cars.filter((car) => {
      const matchesStatus = statusFilter === 'all' || car.status === statusFilter
      const matchesDates = matchesDateFilter(car, fromDate || undefined, toDate || undefined)
      return matchesStatus && matchesDates
    })
  }, [cars, statusFilter, fromDate, toDate])

  const deleteMutation = useMutation({
    mutationFn: deleteCar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] })
      toast.success('Car deleted')
    },
    onError: () => toast.error('Failed to delete car')
  })

  if (isLoading) return <p>Loading cars…</p>
  if (isError) return <p>Failed to load cars.</p>

  const totals = filteredCars.reduce(
    (acc, car) => {
      const purchasePrice = Number(car.purchasePrice ?? 0)
      const maintenance = sumEntries(car.maintenanceCosts) || Number(car.maintenance ?? car.maintenence ?? 0)
      const added = sumEntries(car.addedCosts) || Number(car.addedCost ?? 0)
      const salePrice = Number(car.salePrice ?? car.price ?? 0)
      const totalCost = purchasePrice + maintenance + added
      acc.purchase += purchasePrice
      acc.maintenance += maintenance
      acc.added += added
      acc.sales += salePrice
      acc.profit += salePrice - totalCost
      return acc
    },
    { purchase: 0, maintenance: 0, added: 0, sales: 0, profit: 0 }
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Inventory</h1>
        <Link to="/add" className="inline-flex items-center rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">
          Add car
        </Link>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'inventory' | 'sold')} className="input">
          <option value="all">All status</option>
          <option value="inventory">Inventory</option>
          <option value="sold">Sold</option>
        </select>
        <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="input" />
        <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="input" />
        <button type="button" onClick={() => { setStatusFilter('all'); setFromDate(''); setToDate('') }} className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
          Reset
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"><div className="text-xs text-slate-400">Purchase</div><div className="mt-1 font-semibold">{formatCurrency(totals.purchase)}</div></div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"><div className="text-xs text-slate-400">Maintenance</div><div className="mt-1 font-semibold">{formatCurrency(totals.maintenance)}</div></div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"><div className="text-xs text-slate-400">Added</div><div className="mt-1 font-semibold">{formatCurrency(totals.added)}</div></div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"><div className="text-xs text-slate-400">Profit</div><div className="mt-1 font-semibold text-brand">{formatCurrency(totals.profit)}</div></div>
      </div>

      {filteredCars.length === 0 && <p className="text-sm text-slate-400">No cars match the current filters.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredCars.map((car) => {
          const purchasePrice = Number(car.purchasePrice ?? 0)
          const maintenance = sumEntries(car.maintenanceCosts) || Number(car.maintenance ?? car.maintenence ?? 0)
          const added = sumEntries(car.addedCosts) || Number(car.addedCost ?? 0)
          const totalCost = purchasePrice + maintenance + added
          const net = Number(car.salePrice ?? car.price ?? 0) - totalCost
          const primaryImage = car.images?.[0] ?? car.image

          return (
            <div key={car.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 flex gap-3">
              {primaryImage ? (
                <div className="relative w-28 h-20 shrink-0">
                  <img src={primaryImage} alt={`${car.make} ${car.model}`} className="w-28 h-20 object-cover rounded-md" />
                  {car.images && car.images.length > 1 && <span className="absolute bottom-1 right-1 rounded bg-slate-900/80 px-1 text-[9px] text-slate-100">+{car.images.length - 1}</span>}
                </div>
              ) : null}
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-semibold">{car.year} {car.make} {car.model}{car.trim ? ` ${car.trim}` : ''}</div>
                    <div className="text-xs text-slate-400">VIN: {car.vin}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-brand font-semibold">{formatCurrency(Number(car.price || 0))}</div>
                    <div className="text-xs text-slate-400">{car.mileage.toLocaleString()} miles</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-300">
                  <span className={`rounded-full px-2 py-0.5 ${car.status === 'sold' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-sky-500/20 text-sky-300'}`}>
                    {car.status === 'sold' ? 'Sold' : 'Inventory'}
                  </span>
                  {(car.purchaseDate || car.soldDate) && <span>{car.status === 'sold' ? car.soldDate : car.purchaseDate}</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
                  <div>Purchase: {formatCurrency(purchasePrice)}</div>
                  <div>Maintenance: {formatCurrency(maintenance)}</div>
                  <div>Added: {formatCurrency(added)}</div>
                  <div>Profit: {formatCurrency(net)}</div>
                </div>
                {car.description && <p className="text-xs text-slate-300 line-clamp-2">{car.description}</p>}
                <div className="flex gap-2 pt-1">
                  <Link to={`/edit/${car.id}`} className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"><Pencil className="w-3 h-3" />Edit</Link>
                  <button type="button" onClick={() => deleteMutation.mutate(car.id)} className="inline-flex items-center gap-1 rounded-md border border-red-500/60 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"><Trash2 className="w-3 h-3" />Delete</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
