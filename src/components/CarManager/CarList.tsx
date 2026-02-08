import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getCars, deleteCar, type Car } from '../../api'
import { Pencil, Trash2 } from 'lucide-react'

export default function CarList() {
  const queryClient = useQueryClient()

  const { data: cars, isLoading, isError } = useQuery<Car[]>({
    queryKey: ['cars'],
    queryFn: getCars
  })

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Inventory</h1>
        <Link
          to="/add"
          className="inline-flex items-center rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Add car
        </Link>
      </div>
      {(!cars || cars.length === 0) && <p className="text-sm text-slate-400">No cars yet.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {cars?.map((car) => (
          <div
            key={car.id}
            className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 flex gap-3"
          >
            {car.image && (
              <img
                src={car.image}
                alt={`${car.make} ${car.model}`}
                className="w-28 h-20 object-cover rounded-md"
              />
            )}
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="font-semibold">
                    {car.year} {car.make} {car.model}
                  </div>
                  <div className="text-xs text-slate-400">VIN: {car.vin}</div>
                </div>
                <div className="text-right">
                  <div className="text-brand font-semibold">
                    ${car.price.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">
                    {car.mileage.toLocaleString()} miles
                  </div>
                </div>
              </div>
              {car.description && (
                <p className="text-xs text-slate-300 line-clamp-2">{car.description}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Link
                  to={`/edit/${car.id}`}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(car.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-500/60 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
