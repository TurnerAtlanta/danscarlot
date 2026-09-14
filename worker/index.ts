// worker/index.ts - Single Worker: serves the SPA static assets and the /api/* inventory API.
export interface FinancialEntry {
  label: string
  amount: number
}

export interface Car {
  id: string
  make: string
  model: string
  year: number
  price: number
  mileage: number
  image?: string
  images?: string[]
  vin: string
  description?: string
  trim?: string
  trimLevel?: string
  status?: 'inventory' | 'sold'
  purchaseDate?: string
  soldDate?: string
  purchasePrice?: number
  salePrice?: number
  fundingSource?: string
  fundingSources?: FinancialEntry[]
  fundingSourceEntries?: FinancialEntry[]
  maintenance?: number
  maintenence?: number
  maintenanceCosts?: FinancialEntry[]
  maintenenceCosts?: FinancialEntry[]
  addedCost?: number
  addedCosts?: FinancialEntry[]
}

export interface Env {
  CAR_STORE: DurableObjectNamespace
  ASSETS: Fetcher
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...securityHeaders
    }
  })
}

const MAX_STRING_LENGTH = 500
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{5,17}$/i

function parseEntryList(value: unknown): FinancialEntry[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === 'string') {
          return parseEntryList(entry)
        }
        if (entry && typeof entry === 'object') {
          const source = entry as Record<string, unknown>
          const label = String(source.label ?? source.name ?? source.source ?? 'Entry').trim()
          const amount = Number(source.amount ?? source.value ?? 0)
          if (!label || !Number.isFinite(amount)) return null
          return { label, amount }
        }
        return null
      })
      .flat()
      .filter((entry): entry is FinancialEntry => Boolean(entry) && Number.isFinite(entry.amount))
  }

  if (typeof value !== 'string') return []

  return value
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelPart, ...amountParts] = line.split(':')
      const amount = Number(amountParts.join(':').trim() || labelPart)
      const label = amountParts.length > 0 ? labelPart.trim() || 'Entry' : 'Entry'
      if (!Number.isFinite(amount)) return null
      return { label, amount }
    })
    .filter((entry): entry is FinancialEntry => Boolean(entry))
}

function sumEntries(entries: FinancialEntry[] = []): number {
  return entries.reduce((total, entry) => total + Number(entry.amount || 0), 0)
}

function sanitizeCarInput(body: Partial<Car>): { car?: Omit<Car, 'id'>; error?: string } {
  const make = String(body.make ?? '').trim()
  const model = String(body.model ?? '').trim()
  const vin = String(body.vin ?? '').trim()
  const trim = String(body.trimLevel ?? body.trim ?? '').trim()
  const year = Number(body.year)
  const price = Number(body.price ?? body.salePrice ?? 0)
  const mileage = Number(body.mileage ?? 0)
  const purchasePrice = Number(body.purchasePrice ?? 0)
  const salePrice = Number(body.salePrice ?? body.price ?? 0)
  const status = body.status === 'sold' ? 'sold' : 'inventory'
  const purchaseDate = typeof body.purchaseDate === 'string' ? body.purchaseDate : undefined
  const soldDate = typeof body.soldDate === 'string' ? body.soldDate : undefined
  const fundingSource = String(body.fundingSource ?? '').trim()
  const fundingSources = parseEntryList(body.fundingSources ?? body.fundingSourceEntries ?? body.fundingSource)
  const maintenanceCosts = parseEntryList(
    body.maintenanceCosts ?? body.maintenenceCosts ?? body.maintenance ?? body.maintenence
  )
  const addedCosts = parseEntryList(body.addedCosts ?? body.addedCost)
  const rawImages = Array.isArray(body.images)
    ? body.images.map((entry) => String(entry).trim()).filter(Boolean)
    : typeof body.images === 'string'
      ? [String(body.images).trim()].filter(Boolean)
      : []
  const image = body.image ? String(body.image).slice(0, 5000000) : rawImages[0]?.slice(0, 5000000)
  const images = rawImages.length ? rawImages.slice(0, 12).map((entry) => entry.slice(0, 5000000)) : undefined

  if (!make || !model || !vin) return { error: 'Missing required fields' }
  if (make.length > MAX_STRING_LENGTH || model.length > MAX_STRING_LENGTH) {
    return { error: 'Field too long' }
  }
  if (!VIN_PATTERN.test(vin)) return { error: 'Invalid VIN' }
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return { error: 'Invalid year' }
  if (!Number.isFinite(price) || price < 0) return { error: 'Invalid price' }
  if (!Number.isFinite(mileage) || mileage < 0) return { error: 'Invalid mileage' }
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) return { error: 'Invalid purchase price' }
  if (!Number.isFinite(salePrice) || salePrice < 0) return { error: 'Invalid sale price' }

  const description = body.description ? String(body.description).slice(0, 5000) : undefined
  const fundingSummary = fundingSource || (fundingSources.length ? fundingSources.map((entry) => `${entry.label}: ${entry.amount}`).join(', ') : undefined)

  return {
    car: {
      make,
      model,
      year,
      price,
      mileage,
      vin,
      description,
      image,
      images,
      trim: trim || undefined,
      trimLevel: trim || undefined,
      status,
      purchaseDate,
      soldDate,
      purchasePrice,
      salePrice,
      fundingSource: fundingSummary,
      fundingSources: fundingSources.length ? fundingSources : undefined,
      fundingSourceEntries: fundingSources.length ? fundingSources : undefined,
      maintenance: sumEntries(maintenanceCosts),
      maintenence: sumEntries(maintenanceCosts),
      maintenanceCosts: maintenanceCosts.length ? maintenanceCosts : undefined,
      maintenenceCosts: maintenanceCosts.length ? maintenanceCosts : undefined,
      addedCost: sumEntries(addedCosts),
      addedCosts: addedCosts.length ? addedCosts : undefined
    }
  }
}

export class CarStore {
  constructor(private state: DurableObjectState) {}

  async getCars(): Promise<Car[]> {
    return (await this.state.storage.get<Car[]>('cars')) ?? []
  }

  async saveCars(cars: Car[]) {
    await this.state.storage.put('cars', cars)
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/api/, '')

    if (path === '/cars' && request.method === 'GET') {
      return json(await this.getCars())
    }

    if (path.startsWith('/cars/') && request.method === 'GET') {
      const id = path.split('/')[2]
      const cars = await this.getCars()
      const car = cars.find((entry) => entry.id === id)
      if (!car) return json({ error: 'Car not found' }, 404)
      return json(car)
    }

    if (path === '/cars' && request.method === 'POST') {
      const body = (await request.json().catch(() => null)) as Partial<Car> | null
      if (!body) return json({ error: 'Invalid JSON' }, 400)

      const { car, error } = sanitizeCarInput(body)
      if (error || !car) return json({ error: error ?? 'Invalid input' }, 400)

      const cars = await this.getCars()
      const newCar: Car = { id: crypto.randomUUID(), ...car }
      cars.push(newCar)
      await this.saveCars(cars)
      return json(newCar, 201)
    }

    if (path.startsWith('/cars/') && request.method === 'PUT') {
      const id = path.split('/')[2]
      const body = (await request.json().catch(() => null)) as Partial<Car> | null
      if (!body) return json({ error: 'Invalid JSON' }, 400)

      const { car, error } = sanitizeCarInput(body)
      if (error || !car) return json({ error: error ?? 'Invalid input' }, 400)

      const cars = await this.getCars()
      const index = cars.findIndex((c) => c.id === id)
      if (index === -1) return json({ error: 'Car not found' }, 404)

      const updated: Car = { id, ...car }
      cars[index] = updated
      await this.saveCars(cars)
      return json(updated)
    }

    if (path.startsWith('/cars/') && request.method === 'DELETE') {
      const id = path.split('/')[2]
      const cars = await this.getCars()
      const filtered = cars.filter((c) => c.id !== id)
      if (filtered.length === cars.length) {
        return json({ error: 'Car not found' }, 404)
      }
      await this.saveCars(filtered)
      return json({ success: true })
    }

    return json({ error: 'Not found' }, 404)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      const id = env.CAR_STORE.idFromName('global')
      const stub = env.CAR_STORE.get(id)
      const response = await stub.fetch(request)
      const headers = new Headers(response.headers)
      for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value)
      return new Response(response.body, { status: response.status, headers })
    }

    return env.ASSETS.fetch(request)
  }
}
