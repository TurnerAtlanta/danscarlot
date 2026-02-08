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

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://danscarlot.turneratlanta.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
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
      ...corsHeaders,
      ...securityHeaders
    }
  })
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

    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // GET /api/cars
    if (path === '/cars' && request.method === 'GET') {
      const cars = await this.getCars()
      return json(cars)
    }

    // POST /api/cars
    if (path === '/cars' && request.method === 'POST') {
      const body = (await request.json()) as Partial<Car>

      if (!body.make || !body.model || !body.year || !body.price || !body.vin) {
        return json({ error: 'Missing required fields' }, 400)
      }

      const cars = await this.getCars()
      const newCar: Car = {
        id: crypto.randomUUID(),
        make: body.make,
        model: body.model,
        year: Number(body.year),
        price: Number(body.price),
        mileage: Number(body.mileage ?? 0),
        image: body.image,
        vin: body.vin,
        description: body.description
      }

      cars.push(newCar)
      await this.saveCars(cars)
      return json(newCar, 201)
    }

    // PUT /api/cars/:id
    if (path.startsWith('/cars/') && request.method === 'PUT') {
      const id = path.split('/')[2]
      const body = (await request.json()) as Partial<Car>
      const cars = await this.getCars()
      const index = cars.findIndex((c) => c.id === id)
      if (index === -1) return json({ error: 'Car not found' }, 404)

      const updated: Car = {
        ...cars[index],
        ...body,
        id // enforce ID
      }

      cars[index] = updated
      await this.saveCars(cars)
      return json(updated)
    }

    // DELETE /api/cars/:id
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
  async fetch(request: Request, env: { CAR_STORE: DurableObjectNamespace }) {
    const id = env.CAR_STORE.idFromName('global')
    const stub = env.CAR_STORE.get(id)
    return stub.fetch(request)
  }
}
