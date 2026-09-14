// worker/index.ts - Single Worker: serves the SPA static assets and the /api/* inventory API.
export interface Car {
  id: string
  make: string
  model: string
  year: number
  price: number
  mileage: number
  image?: string
  vin: string
  description?: string
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

function sanitizeCarInput(body: Partial<Car>): { car?: Omit<Car, 'id'>; error?: string } {
  const make = String(body.make ?? '').trim()
  const model = String(body.model ?? '').trim()
  const vin = String(body.vin ?? '').trim()
  const year = Number(body.year)
  const price = Number(body.price)
  const mileage = Number(body.mileage ?? 0)

  if (!make || !model || !vin) return { error: 'Missing required fields' }
  if (make.length > MAX_STRING_LENGTH || model.length > MAX_STRING_LENGTH) {
    return { error: 'Field too long' }
  }
  if (!VIN_PATTERN.test(vin)) return { error: 'Invalid VIN' }
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return { error: 'Invalid year' }
  if (!Number.isFinite(price) || price < 0) return { error: 'Invalid price' }
  if (!Number.isFinite(mileage) || mileage < 0) return { error: 'Invalid mileage' }

  const description = body.description ? String(body.description).slice(0, 5000) : undefined
  const image = body.image ? String(body.image).slice(0, 2000) : undefined

  return {
    car: { make, model, year, price, mileage, vin, description, image }
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
