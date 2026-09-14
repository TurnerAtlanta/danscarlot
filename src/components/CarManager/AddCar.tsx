import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { addCar, type Car } from '../../api'

function parseEntryText(value: string): { label: string; amount: number }[] {
  return value
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelPart, ...amountParts] = line.split(':')
      const amount = Number(amountParts.join(':').trim() || labelPart)
      if (!Number.isFinite(amount)) return null
      return {
        label: amountParts.length > 0 ? labelPart.trim() || 'Entry' : 'Entry',
        amount
      }
    })
    .filter((entry): entry is { label: string; amount: number } => Boolean(entry))
}

async function readImageFiles(files: FileList | null): Promise<string[]> {
  if (!files || files.length === 0) return []
  const dataUrls: string[] = []

  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) continue

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(new Error('Failed to read image'))
      reader.readAsDataURL(file)
    })

    if (dataUrl) dataUrls.push(dataUrl)
  }

  return dataUrls
}

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const photos = await readImageFiles((form.elements.namedItem('photos') as HTMLInputElement | null)?.files ?? null)
    const directImage = String(data.get('image') || '').trim()
    const imageList = photos.length ? photos : directImage ? [directImage] : undefined

    const car: Omit<Car, 'id'> = {
      make: String(data.get('make') || ''),
      model: String(data.get('model') || ''),
      year: Number(data.get('year') || 0),
      price: Number(data.get('price') || 0),
      mileage: Number(data.get('mileage') || 0),
      image: imageList?.[0],
      images: imageList,
      vin: String(data.get('vin') || ''),
      description: String(data.get('description') || '') || undefined,
      trim: String(data.get('trim') || '') || undefined,
      trimLevel: String(data.get('trim') || '') || undefined,
      status: (String(data.get('status') || 'inventory') as 'inventory' | 'sold') || 'inventory',
      purchaseDate: String(data.get('purchaseDate') || '') || undefined,
      soldDate: String(data.get('soldDate') || '') || undefined,
      purchasePrice: Number(data.get('purchasePrice') || 0),
      salePrice: Number(data.get('price') || 0),
      fundingSource: String(data.get('fundingSource') || '') || undefined,
      fundingSources: parseEntryText(String(data.get('fundingSources') || '')),
      maintenance: Number(data.get('maintenance') || 0),
      maintenanceCosts: parseEntryText(String(data.get('maintenanceCosts') || '')),
      addedCost: Number(data.get('addedCost') || 0),
      addedCosts: parseEntryText(String(data.get('addedCosts') || ''))
    }

    mutation.mutate(car)
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold">Add car</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input name="make" placeholder="Make" required className="input" />
          <input name="model" placeholder="Model" required className="input" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          <input name="year" type="number" placeholder="Year" required className="input" />
          <input name="trim" placeholder="Trim level" className="input" />
          <input name="price" type="number" placeholder="Sale price" required className="input" />
          <input name="mileage" type="number" placeholder="Mileage" required className="input" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <input name="purchasePrice" type="number" placeholder="Purchase price" className="input" />
          <select name="status" defaultValue="inventory" className="input">
            <option value="inventory">Inventory</option>
            <option value="sold">Sold</option>
          </select>
          <input name="vin" placeholder="VIN" required className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input name="purchaseDate" type="date" className="input" />
          <input name="soldDate" type="date" className="input" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input name="fundingSource" placeholder="Funding source" className="input" />
          <textarea name="fundingSources" placeholder="Bank: 12000\nCash: 5000" rows={3} className="input" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <textarea name="maintenanceCosts" placeholder="Oil service: 280\nBrake work: 440" rows={3} className="input" />
          <textarea name="addedCosts" placeholder="Tires: 900\nDetailing: 150" rows={3} className="input" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input name="photos" type="file" accept="image/*" multiple className="input file:mr-3 file:rounded file:border-0 file:bg-brand file:px-2 file:py-1 file:text-white" />
          <input name="image" placeholder="Image URL (optional)" className="input" />
        </div>
        <textarea name="description" placeholder="Description (optional)" rows={3} className="input" />
        <button type="submit" disabled={mutation.isPending} className="inline-flex items-center rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60">
          {mutation.isPending ? 'Saving…' : 'Save car'}
        </button>
      </form>
    </div>
  )
}
