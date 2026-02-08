import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { addCar, type Car } from '../../api'

export default function AddCar() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (car: Omit<Car, 'id'>) => addCar(car),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] })
      toast.success('Car added')
      navigate('/')
    },
    onError: () => toast.error('Failed to add car')
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    const car: Omit<Car, 'id'> = {
      make: String(data.get('make') || ''),
      model: String(data.get('model') || ''),
      year: Number(data.get('year') || 0),
      price: Number(data.get('price') || 0),
      mileage: Number(data.get('mileage') || 0),
      image: String(data.get('image') || '') || undefined,
      vin: String(data.get('vin') || ''),
      description: String(data.get('description') || '') || undefined
    }

    mutation.mutate(car)
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-lg font-semibold">Add car</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input name="make" placeholder="Make" required className="input" />
          <input name="model" placeholder="Model" required className="input" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <input
            name="year"
            type="number"
            placeholder="Year"
            required
            className="input"
          />
          <input
            name="price"
            type="number"
            placeholder="Price"
            required
            className="input"
          />
          <input
            name="mileage"
            type="number"
            placeholder="Mileage"
            required
            className="input"
          />
        </div>
        <input name="vin" placeholder="VIN" required className="input" />
        <input name="image" placeholder="Image URL (optional)" className="input" />
        <textarea
          name="description"
          placeholder="Description (optional)"
          rows={3}
          className="input"
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex items-center rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {mutation.isPending ? 'Saving…' : 'Save car'}
        </button>
      </form>
    </div>
  )
}
