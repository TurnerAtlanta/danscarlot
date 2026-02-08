const API_BASE = 'https://api.danscarlot.turneratlanta.com/api'

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

export async function getCars(): Promise<Car[]> {
  const res = await fetch(`${API_BASE}/cars`)
  if (!res.ok) throw new Error('Failed to fetch cars')
  return res.json()
}

export async function addCar(car: Omit<Car, 'id'>): Promise<Car> {
  const res = await fetch(`${API_BASE}/cars`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(car)
  })
  if (!res.ok) throw new Error('Failed to add car')
  return res.json()
}

export async function updateCar(car: Car): Promise<Car> {
  const res = await fetch(`${API_BASE}/cars/${car.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(car)
  })
  if (!res.ok) throw new Error('Failed to update car')
  return res.json()
}

export async function deleteCar(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cars/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete car')
}
