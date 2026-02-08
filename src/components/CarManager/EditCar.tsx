import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getCars, updateCar, type Car } from '../../api'

export default function EditCar() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: cars } = useQuery<Car[]>({
    queryKey: ['cars'],
    queryFn: getCars
  })

  const car = cars?.find((c) => c.id === id)

  const mutation = useMutation({
    mutationFn: (updated: Car) => updateCar(updated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] })
      toast.success('Car updated')
      navigate('/')
    },
    onError: () => toast.error('Failed to update car')
  })

  if (!id) return <p>Missing car ID.</p>
  if (!cars) return <p>Loading car…</p>
  if (!car) return <p>Car not found.</p>

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    const updated: Car = {
      ...car,
      make: String(data.get('make') || ''),
      model: String(data.get('model') || ''),
      year: Number(data.get('year') || 0),
      price: Number(data.get('price') || 0),
      mileage: Number(data.get('mileage') || 0),
      image: String(data.get('image') || '') || undefined,
      vin: String(data.get('vin') || ''),
      description: String(data.get('description') || '') || undefined
    }

    mutation.mutate(updated)
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-lg font-semibold">Edit car</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            name="make"
            defaultValue={car.make}
            placeholder="Make"
            required
            className="input"
          />
          <input
            name="model"
            defaultValue={car.model}
            placeholder="Model"
            required
            className="input"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <input
            name="year"
            type="number"
            defaultValue={car.year}
            placeholder="Year"
            required
            className="input"
          />
          <input
            name="price"
            type="number"
            defaultValue={car.price}
            placeholder="Price"
            required
            className="input"
          />
          <input
            name="mileage"
            type="number"
            defaultValue={car.mileage}
            placeholder="Mileage"
            required
            className="input"
          />
        </div>
        <input
          name="vin"
          defaultValue={car.vin}
          placeholder="VIN"
          required
          className="input"
        />
        <input
          name="image"
          defaultValue={car.image}
          placeholder="Image URL (optional)"
          className="input"
        />
        <textarea
          name="description"
          defaultValue={car.description}
          placeholder="Description (optional)"
          rows={3}
          className="input"
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex items-center rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
