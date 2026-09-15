import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { addCar, type Car } from '../../api'
import { CAR_MAKES, MODEL_OPTIONS_LIST, TRIM_OPTIONS, YEAR_OPTIONS } from './carOptions'

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
      <datalist id="make-options">
        {CAR_MAKES.map((make) => (
          <option key={make} value={make} />
        ))}
      </datalist>
      <datalist id="model-options">
        {MODEL_OPTIONS_LIST.map((model) => (
          <option key={model} value={model} />
        ))}
      </datalist>
      <datalist id="trim-options">
        {TRIM_OPTIONS.map((trim) => (
          <option key={trim} value={trim} />
        ))}
      </datalist>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="make" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Make</label>
              <input id="make" name="make" list="make-options" placeholder="Make" required className="input" />
            </div>
            <div>
              <label htmlFor="model" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Model</label>
              <input id="model" name="model" list="model-options" placeholder="Model" required className="input" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label htmlFor="year" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Year</label>
              <select id="year" name="year" defaultValue={new Date().getFullYear()} required className="input">
                {YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="trim" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Trim level</label>
              <input id="trim" name="trim" list="trim-options" placeholder="Trim level" className="input" />
            </div>
            <div>
              <label htmlFor="price" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Sale price</label>
              <input id="price" name="price" type="number" placeholder="Sale price" required className="input" />
            </div>
            <div>
              <label htmlFor="mileage" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Mileage</label>
              <input id="mileage" name="mileage" type="number" placeholder="Mileage" required className="input" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="purchasePrice" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Purchase price</label>
              <input id="purchasePrice" name="purchasePrice" type="number" placeholder="Purchase price" className="input" />
            </div>
            <div>
              <label htmlFor="status" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Status</label>
              <select id="status" name="status" defaultValue="inventory" className="input">
                <option value="inventory">Inventory</option>
                <option value="sold">Sold</option>
              </select>
            </div>
            <div>
              <label htmlFor="vin" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">VIN</label>
              <input id="vin" name="vin" placeholder="VIN" required className="input" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="purchaseDate" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Purchase date</label>
              <input id="purchaseDate" name="purchaseDate" type="date" className="input" />
            </div>
            <div>
              <label htmlFor="soldDate" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Sold date</label>
              <input id="soldDate" name="soldDate" type="date" className="input" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="fundingSource" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Funding source</label>
              <input id="fundingSource" name="fundingSource" placeholder="Funding source" className="input" />
            </div>
            <div>
              <label htmlFor="fundingSources" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Funding source entries</label>
              <textarea id="fundingSources" name="fundingSources" placeholder="Bank: 12000\nCash: 5000" rows={3} className="input" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="maintenanceCosts" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Maintenance costs</label>
              <textarea id="maintenanceCosts" name="maintenanceCosts" placeholder="Oil service: 280\nBrake work: 440" rows={3} className="input" />
            </div>
            <div>
              <label htmlFor="addedCosts" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Added costs</label>
              <textarea id="addedCosts" name="addedCosts" placeholder="Tires: 900\nDetailing: 150" rows={3} className="input" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="photos" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Vehicle photos</label>
              <input id="photos" name="photos" type="file" accept="image/*" multiple className="input file:mr-3 file:rounded file:border-0 file:bg-brand file:px-2 file:py-1 file:text-white" />
            </div>
            <div>
              <label htmlFor="image" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Image URL</label>
              <input id="image" name="image" placeholder="Image URL (optional)" className="input" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="block text-xs font-medium uppercase tracking-wide text-slate-400">Description</label>
          <textarea id="description" name="description" placeholder="Description (optional)" rows={3} className="input" />
        </div>

        <button type="submit" disabled={mutation.isPending} className="inline-flex items-center rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60">
          {mutation.isPending ? 'Saving…' : 'Save car'}
        </button>
      </form>
    </div>
  )
}
