import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getCar, type Car } from '../../api'

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

export default function CarDetail() {
  const { id } = useParams<{ id: string }>()

  const { data: car, isLoading, isError } = useQuery<Car>({
    queryKey: ['cars', id],
    queryFn: () => getCar(id!)
  })

  if (!id) return <p>Missing car ID.</p>
  if (isLoading) return <p>Loading car…</p>
  if (isError || !car) return <p>Car not found.</p>

  const purchasePrice = Number(car.purchasePrice ?? 0)
  const totalMaintenance = sumEntries(car.maintenanceCosts) || Number(car.maintenance ?? car.maintenence ?? 0)
  const totalAdded = sumEntries(car.addedCosts) || Number(car.addedCost ?? 0)
  const salePrice = Number(car.salePrice ?? car.price ?? 0)
  const totalCost = purchasePrice + totalMaintenance + totalAdded
  const grossProfit = salePrice - totalCost
  const gallery = Array.from(
    new Set([...(car.images ?? []), ...(car.image ? [car.image] : [])])
  ).filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="text-sm text-slate-300 hover:text-white">← Back to inventory</Link>
        <Link to={`/edit/${car.id}`} className="inline-flex items-center rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">Edit car</Link>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Vehicle record</div>
            <h1 className="text-2xl font-semibold text-white">{car.year} {car.make} {car.model}{car.trim ? ` ${car.trim}` : ''}</h1>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${car.status === 'sold' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-sky-500/20 text-sky-300'}`}>
            {car.status === 'sold' ? 'Sold' : 'Inventory'}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-3">
            {gallery.length > 0 ? (
              <>
                <img src={gallery[0]} alt={`${car.make} ${car.model}`} className="h-80 w-full rounded-lg object-cover border border-slate-700" />
                {gallery.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {gallery.slice(1).map((image, index) => (
                      <img key={`${image}-${index}`} src={image} alt={`${car.make} ${car.model} gallery ${index + 1}`} className="h-20 w-20 rounded-md object-cover border border-slate-700" />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/70 text-sm text-slate-400">
                No photos uploaded
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">Quick summary</div>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><span className="text-slate-400">Sale price</span><span className="font-semibold text-white">{formatCurrency(salePrice)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-400">Purchase price</span><span>{formatCurrency(purchasePrice)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-400">Maintenance</span><span>{formatCurrency(totalMaintenance)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-400">Added costs</span><span>{formatCurrency(totalAdded)}</span></div>
                <div className="flex justify-between gap-3 border-t border-slate-800 pt-2"><span className="text-slate-400">Profit / loss</span><span className={grossProfit >= 0 ? 'font-semibold text-emerald-300' : 'font-semibold text-red-300'}>{formatCurrency(grossProfit)}</span></div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
              <div className="text-xs uppercase tracking-wide text-slate-400">Vehicle detail</div>
              <dl className="mt-2 space-y-2">
                <div className="flex justify-between gap-3"><dt className="text-slate-400">VIN</dt><dd>{car.vin || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-400">Mileage</dt><dd>{car.mileage.toLocaleString()} mi</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-400">Year</dt><dd>{car.year}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-400">Trim</dt><dd>{car.trim || car.trimLevel || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-400">Purchase date</dt><dd>{car.purchaseDate || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-400">Sold date</dt><dd>{car.soldDate || '—'}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Vehicle information</h2>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div><dt className="text-xs uppercase tracking-wide text-slate-400">Make</dt><dd className="mt-1">{car.make}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-slate-400">Model</dt><dd className="mt-1">{car.model}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-slate-400">Year</dt><dd className="mt-1">{car.year}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-slate-400">Mileage</dt><dd className="mt-1">{car.mileage.toLocaleString()} mi</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-slate-400">Status</dt><dd className="mt-1">{car.status === 'sold' ? 'Sold' : 'Inventory'}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-slate-400">Trim</dt><dd className="mt-1">{car.trim || car.trimLevel || '—'}</dd></div>
            <div className="md:col-span-2"><dt className="text-xs uppercase tracking-wide text-slate-400">Description</dt><dd className="mt-1 whitespace-pre-line text-slate-300">{car.description || 'No description provided.'}</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Funding</h2>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">Primary source</div>
              <div className="mt-1 font-medium text-white">{car.fundingSource || 'Not specified'}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">Source entries</div>
              {car.fundingSources && car.fundingSources.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {car.fundingSources.map((entry, index) => (
                    <li key={`${entry.label}-${index}`} className="flex justify-between gap-3 text-slate-300"><span>{entry.label}</span><span>{formatCurrency(entry.amount)}</span></li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-slate-400">No funding entries recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Maintenance costs</h2>
          {car.maintenanceCosts && car.maintenanceCosts.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {car.maintenanceCosts.map((entry, index) => (
                <li key={`${entry.label}-${index}`} className="flex justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2"><span>{entry.label}</span><span>{formatCurrency(entry.amount)}</span></li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No maintenance entries recorded.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Added costs</h2>
          {car.addedCosts && car.addedCosts.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {car.addedCosts.map((entry, index) => (
                <li key={`${entry.label}-${index}`} className="flex justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2"><span>{entry.label}</span><span>{formatCurrency(entry.amount)}</span></li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No added cost entries recorded.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="mb-3 text-lg font-semibold text-white">Per-car financial statement</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-4 font-medium">Line item</th>
                <th className="py-2 pr-4 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800"><td className="py-2 pr-4">Sale price</td><td className="py-2 pr-4 text-right">{formatCurrency(salePrice)}</td></tr>
              <tr className="border-b border-slate-800"><td className="py-2 pr-4">Purchase price</td><td className="py-2 pr-4 text-right">{formatCurrency(purchasePrice)}</td></tr>
              <tr className="border-b border-slate-800"><td className="py-2 pr-4">Maintenance</td><td className="py-2 pr-4 text-right">{formatCurrency(totalMaintenance)}</td></tr>
              <tr className="border-b border-slate-800"><td className="py-2 pr-4">Added costs</td><td className="py-2 pr-4 text-right">{formatCurrency(totalAdded)}</td></tr>
              <tr className="border-b border-slate-800"><td className="py-2 pr-4 font-medium text-white">Total cost basis</td><td className="py-2 pr-4 text-right font-medium text-white">{formatCurrency(totalCost)}</td></tr>
              <tr><td className="py-2 pr-4 font-medium text-white">Gross profit / loss</td><td className={`py-2 pr-4 text-right font-medium ${grossProfit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{formatCurrency(grossProfit)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
