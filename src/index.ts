// src/index.ts - Main Worker Entry Point + CarLotAgent Durable Object
// ============================================================================

import Hono from 'hono';
import { cors } from 'hono/cors';
import { Agent, routeAgentRequest } from 'agents';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Env {
  CARLOTAGENT: DurableObjectNamespace<CarLotAgent>;
  INTEGRATIONSKV?: KVNamespace;
  AUTHKV?: KVNamespace;
  SYNCQUEUE: Queue<QueueMessage>;
  ASSETS: Fetcher;
  WAYNEREEVESAPIKEY?: string;
  WAYNEREEVESAPIURL?: string;
  QUICKBOOKSCLIENTID?: string;
  QUICKBOOKSCLIENTSECRET?: string;
  QUICKBOOKSREALMID?: string;
  CARGURUSAPIKEY?: string;
  TRUECARDEALERID?: string;
  KBBDEALERID?: string;
}

type QueueMessage = 
  | { type: 'vehiclesync'; action: 'sold' | 'update'; vehicleId: string; timestamp: string }
  | { type: 'expensesync'; serviceId: string; vehicleId: string; amount: number; timestamp: string };

interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  purchaseprice: number;
  purchasedate: string;
  saleprice: number | null;
  saledate: string | null;
  status: string;
  location: string;
  mileage: number;
  color: string;
  bodystyle: string;
  transmission: string;
  fueltype: string;
  description: string;
  features: string;
  images: string;
  createdat: string;
  updatedat?: string;
  publishtowebsite: number;
  publishtothirdparty: number;
  externaldmsid?: string;
  externaldmssource?: string;
  quickbooksinvoiceid?: string;
  carguruslistingid?: string;
  truecarlistingid?: string;
  kbblistingid?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  duedate: string;
  status: string;
  createdby: string;
  createdat: string;
  updatedat?: string;
}

interface Service {
  id: string;
  vehicleid: string;
  servicetype: string;
  description: string;
  cost: number;
  servicedate: string;
  createdat: string;
}

interface Comment {
  id: string;
  entitytype: string;
  entityid: string;
  username: string;
  comment: string;
  createdat: string;
}

interface WebSocketMessage {
  type: string;
  payload?: any;
  data?: any;
  source?: string;
}

// ============================================================================
// CARLOT AGENT (DURABLE OBJECT)
// ============================================================================

export class CarLotAgent extends Agent<Env> {
  async onConnect(connection: WebSocket): Promise<void> {
    connection.accept();

    const tasks = await this.sql<Task>'SELECT * FROM tasks ORDER BY created_at DESC LIMIT 100';
    const vehicles = await this.sql<Vehicle>'SELECT * FROM vehicles ORDER BY created_at DESC LIMIT 100';

    connection.send(
      JSON.stringify({
        type: 'state',
        tasks: Array.from(tasks),
        vehicles: Array.from(vehicles),
      })
    );
  }

  async onMessage(connection: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') {
      console.error('Received non-string message');
      return;
    }

    let  WebSocketMessage;
    try {
      data = JSON.parse(message) as WebSocketMessage;
    } catch (err) {
      console.error("Invalid JSON message received:", err);
      return;
    }

    switch (data.type) {
      case 'taskupdate':
        await this.handleTaskUpdate(data.payload);
        this.broadcast(JSON.stringify(data));
        break;
      case 'inventoryupdate':
        await this.handleInventoryUpdate(data.payload);
        this.broadcast(JSON.stringify(data));
        break;
      case 'commentadd':
        await this.handleCommentAdd(data.payload);
        this.broadcast(JSON.stringify(data));
        break;
      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  private async handleTaskUpdate(payload: any): Promise<void> {
    await this.sql`
      INSERT INTO tasks (id, title, description, assignee, duedate, status, createdby, createdat)
      VALUES (${payload.id}, ${payload.title}, ${payload.description}, ${payload.assignee}, ${payload.dueDate}, ${payload.status}, ${payload.createdBy}, ${new Date().toISOString()})
      ON CONFLICT(id) DO UPDATE SET
        title = ${payload.title},
        description = ${payload.description},
        assignee = ${payload.assignee},
        duedate = ${payload.dueDate},
        status = ${payload.status},
        updatedat = ${new Date().toISOString()}
    `;
  }

  private async handleInventoryUpdate(payload: any): Promise<void> {
    await this.sql`
      INSERT INTO vehicles (
        id, vin, make, model, year, purchaseprice, purchasedate, saleprice, saledate,
        status, location, mileage, color, bodystyle, transmission, fueltype,
        description, features, images, createdat, publishtowebsite, publishtothirdparty
      ) VALUES (
        ${payload.id}, ${payload.vin}, ${payload.make}, ${payload.model}, ${payload.year},
        ${payload.purchasePrice}, ${payload.purchaseDate}, ${payload.salePrice ?? null}, ${payload.saleDate ?? null},
        ${payload.status}, ${payload.location}, ${payload.mileage ?? 0}, ${payload.color ?? ''}, ${payload.bodyStyle ?? ''},
        ${payload.transmission ?? ''}, ${payload.fuelType ?? ''}, ${payload.description ?? ''}, ${payload.features ?? ''},
        ${payload.images ?? ''}, ${new Date().toISOString()},
        ${payload.publishToWebsite !== false ? 1 : 0}, ${payload.publishToThirdParty !== false ? 1 : 0}
      )
      ON CONFLICT(id) DO UPDATE SET
        make = ${payload.make}, model = ${payload.model}, year = ${payload.year},
        purchaseprice = ${payload.purchasePrice}, saleprice = ${payload.salePrice ?? null},
        saledate = ${payload.saleDate ?? null}, status = ${payload.status}, location = ${payload.location},
        mileage = ${payload.mileage ?? 0}, color = ${payload.color ?? ''}, bodystyle = ${payload.bodyStyle ?? ''},
        transmission = ${payload.transmission ?? ''}, fueltype = ${payload.fuelType ?? ''},
        description = ${payload.description ?? ''}, features = ${payload.features ?? ''}, images = ${payload.images ?? ''},
        publishtowebsite = ${payload.publishToWebsite !== false ? 1 : 0},
        publishtothirdparty = ${payload.publishToThirdParty !== false ? 1 : 0},
        updatedat = ${new Date().toISOString()}
    `;

    if (payload.saleDate && this.env.SYNCQUEUE) {
      try {
        await this.env.SYNCQUEUE.send({
          type: 'vehiclesync',
          action: 'sold',
          vehicleId: payload.id,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error queuing vehicle sync:', error);
      }
    }
  }

  private async handleCommentAdd(payload: any): Promise<void> {
    await this.sql`
      INSERT INTO comments (id, entitytype, entityid, username, comment, createdat)
      VALUES (${payload.id}, ${payload.entityType}, ${payload.entityId}, ${payload.userName}, ${payload.comment}, ${new Date().toISOString()})
    `;
  }

  private broadcast(message: string): void {
    const connections = this.ctx.getWebSockets();
    for (const conn of connections) {
      try {
        conn.send(message);
      } catch (error) {
        console.error('Error broadcasting to connection:', error);
      }
    }
  }

  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Tasks API
    if (url.pathname === '/api/tasks' && request.method === 'GET') {
      const tasks = await this.sql<Task>`SELECT * FROM tasks ORDER BY created_at DESC`;
      return Response.json(Array.from(tasks));
    }

    // Vehicles API
    if (url.pathname === '/api/vehicles' && request.method === 'GET') {
      const vehicles = await this.sql<Vehicle>`SELECT * FROM vehicles ORDER BY created_at DESC`;
      return Response.json(Array.from(vehicles));
    }

    // Single vehicle API (for queue consumer)
    if (url.pathname.startsWith('/api/vehicles/') && request.method === 'GET') {
      const vehicleId = url.pathname.split('/').pop();
      const vehicle = await this.sql<Vehicle>`SELECT * FROM vehicles WHERE id = ${vehicleId} LIMIT 1`;
      const result = Array.from(vehicle);
      if (result.length === 0) {
        return Response.json({ error: 'Vehicle not found' }, { status: 404 });
      }
      return Response.json(result[0]);
    }

    // Public inventory feed (customer-facing)
    if (url.pathname === '/api/public/inventory' && request.method === 'GET') {
      const vehicles = await this.sql<Vehicle>`
        SELECT id, vin, make, model, year, saleprice as price, mileage, color, bodystyle,
               transmission, fueltype, description, features, images, location
        FROM vehicles
        WHERE status = 'available' AND publishtowebsite = 1
        ORDER BY created_at DESC
      `;
      return Response.json(Array.from(vehicles), {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Public vehicle detail (customer-facing)
    if (url.pathname.startsWith('/api/public/vehicle/') && request.method === 'GET') {
      const vehicleId = url.pathname.split('/').pop();
      const vehicle = await this.sql<Vehicle>`
        SELECT id, vin, make, model, year, saleprice as price, mileage, color, bodystyle,
               transmission, fueltype, description, features, images, location
        FROM vehicles
        WHERE id = ${vehicleId} AND status = 'available' AND publishtowebsite = 1
        LIMIT 1
      `;
      const result = Array.from(vehicle);
      if (result.length === 0) {
        return Response.json({ error: 'Vehicle not found' }, { status: 404 });
      }
      return Response.json(result[0], {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Services API
    if (url.pathname === '/api/services' && request.method === 'GET') {
      const vehicleId = url.searchParams.get('vehicleId');
      const services = await this.sql<Service>`SELECT * FROM services WHERE vehicleid = ${vehicleId} ORDER BY servicedate DESC`;
      return Response.json(Array.from(services));
    }

    if (url.pathname === '/api/services' && request.method === 'POST') {
      const payload = await request.json() as any;
      await this.sql`
        INSERT INTO services (id, vehicleid, servicetype, description, cost, servicedate, createdat)
        VALUES (${payload.id}, ${payload.vehicleId}, ${payload.serviceType}, ${payload.description}, ${payload.cost}, ${payload.serviceDate}, ${new Date().toISOString()})
      `;
      this.broadcast(JSON.stringify({ type: 'serviceadd', payload }));

      if (this.env.SYNCQUEUE) {
        try {
          await this.env.SYNCQUEUE.send({
            type: 'expensesync',
            serviceId: payload.id,
            vehicleId: payload.vehicleId,
            amount: payload.cost,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Error queuing expense sync:', error);
        }
      }
      return Response.json({ success: true });
    }

    // Analytics API
    if (url.pathname === '/api/analytics' && request.method === 'GET') {
      const analytics = await this.calculateAnalytics();
      return Response.json(analytics);
    }

    // Comments API
    if (url.pathname === '/api/comments' && request.method === 'GET') {
      const entityType = url.searchParams.get('entityType');
      const entityId = url.searchParams.get('entityId');
      const comments = await this.sql<Comment>`
        SELECT * FROM comments
        WHERE entitytype = ${entityType} AND entityid = ${entityId}
        ORDER BY created_at ASC
      `;
      return Response.json(Array.from(comments));
    }

    return new Response('Not found', { status: 404 });
  }

  private async calculateAnalytics() {
    const vehicles = await this.sql<Vehicle>`SELECT * FROM vehicles`;
    const services = await this.sql<Service>`SELECT * FROM services`;

    let totalRevenue = 0;
    let totalCost = 0;
    let soldCount = 0;
    let inventoryCount = 0;

    for (const vehicle of Array.from(vehicles)) {
      const purchasePrice = Number(vehicle.purchaseprice) || 0;
      totalCost += purchasePrice;
      if (vehicle.status === 'sold' && vehicle.saleprice) {
        totalRevenue += Number(vehicle.saleprice);
        soldCount++;
      } else {
        inventoryCount++;
      }
    }

    for (const service of Array.from(services)) {
      totalCost += Number(service.cost) || 0;
    }

    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      profit,
      margin: margin.toFixed(2),
      soldCount,
      inventoryCount,
      avgProfitPerVehicle: soldCount > 0 ? (profit / soldCount).toFixed(2) : '0',
    };
  }
}

// ============================================================================
// MAIN HONO APP
// ============================================================================

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

// QuickBooks OAuth routes
app.get('/api/integrations/quickbooks/authorize', async (c) => {
  const { handleQuickBooksAuthorize } = await import('./quickbooks-oauth');
  return handleQuickBooksAuthorize(c.req.raw, c.env);
});

app.get('/api/integrations/quickbooks/callback', async (c) => {
  const { handleQuickBooksCallback } = await import('./quickbooks-oauth');
  return handleQuickBooksCallback(c.req.raw, c.env);
});

app.post('/api/integrations/quickbooks/disconnect', async (c) => {
  const { handleQuickBooksDisconnect } = await import('./quickbooks-oauth');
  return handleQuickBooksDisconnect(c.env);
});

// Agent routes (handles WebSocket connections and API calls)
app.all('/agents/*', async (c) => {
  const agentResponse = await routeAgentRequest(c.req.raw, c.env);
  if (agentResponse) return agentResponse;
  return c.json({ error: 'Agent not found' }, 404);
});

// Fallback API routes to agent
app.get('/api/*', async (c) => {
  const agentRequest = await routeAgentRequest(c.req.raw, c.env);
  if (agentRequest) return agentRequest;
  return c.json({ error: 'Not found' }, 404);
});

app.post('/api/*', async (c) => {
  const agentRequest = await routeAgentRequest(c.req.raw, c.env);
  if (agentRequest) return agentRequest;
  return c.json({ error: 'Not found' }, 404);
});

// Serve static assets (React app, inventory page, etc.)
app.get('/*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
export { CarLotAgent };

// Export queue consumer
export default { queue: await import('./queue-consumer') };
