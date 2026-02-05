// src/index.ts - Main Worker Entry Point
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Agent, routeAgentRequest } from 'agents';

interface Env {
  CARLOT_AGENT: DurableObjectNamespace;
  INTEGRATIONS_KV: KVNamespace;
  AUTH_KV: KVNamespace;
  SYNC_QUEUE: Queue;
  ASSETS: Fetcher;
  WAYNE_REEVES_API_KEY?: string;
  WAYNE_REEVES_API_URL?: string;
  QUICKBOOKS_CLIENT_ID?: string;
  QUICKBOOKS_CLIENT_SECRET?: string;
  QUICKBOOKS_REALM_ID?: string;
  CARGURUS_API_KEY?: string;
  TRUECAR_DEALER_ID?: string;
  KBB_DEALER_ID?: string;
}

// Import your Agent class
export class CarLotAgent extends Agent<Env> {
  async onConnect(connection: any) {
    connection.accept();
    const state = await this.getState();
    connection.send(JSON.stringify({
      type: 'state',
      data: state
    }));
  }

  async onMessage(connection: any, message: any) {
    const data = JSON.parse(message);
    
    switch (data.type) {
      case 'task_update':
        await this.handleTaskUpdate(data.payload);
        this.broadcast(message);
        break;
      case 'inventory_update':
        await this.handleInventoryUpdate(data.payload);
        this.broadcast(message);
        break;
      case 'comment_add':
        await this.handleCommentAdd(data.payload);
        this.broadcast(message);
        break;
    }
  }

  private async handleTaskUpdate(payload: any) {
    await this.sql`
      INSERT INTO tasks (id, title, description, assignee, due_date, status, created_by, created_at)
      VALUES (${payload.id}, ${payload.title}, ${payload.description}, ${payload.assignee}, 
              ${payload.dueDate}, ${payload.status}, ${payload.createdBy}, ${new Date().toISOString()})
      ON CONFLICT(id) DO UPDATE SET
        title = ${payload.title},
        description = ${payload.description},
        assignee = ${payload.assignee},
        due_date = ${payload.dueDate},
        status = ${payload.status},
        updated_at = ${new Date().toISOString()}
    `;
  }

  private async handleInventoryUpdate(payload: any) {
    await this.sql`
      INSERT INTO vehicles (id, vin, make, model, year, purchase_price, purchase_date, 
                           sale_price, sale_date, status, location, created_at)
      VALUES (${payload.id}, ${payload.vin}, ${payload.make}, ${payload.model}, ${payload.year},
              ${payload.purchasePrice}, ${payload.purchaseDate}, ${payload.salePrice}, 
              ${payload.saleDate}, ${payload.status}, ${payload.location}, ${new Date().toISOString()})
      ON CONFLICT(id) DO UPDATE SET
        make = ${payload.make},
        model = ${payload.model},
        year = ${payload.year},
        purchase_price = ${payload.purchasePrice},
        sale_price = ${payload.salePrice},
        sale_date = ${payload.saleDate},
        status = ${payload.status},
        location = ${payload.location},
        updated_at = ${new Date().toISOString()}
    `;

    // Queue sync jobs
    if (this.env.SYNC_QUEUE) {
      await this.env.SYNC_QUEUE.send({
        type: 'vehicle_sync',
        action: payload.saleDate ? 'sold' : 'update',
        vehicleId: payload.id,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async handleCommentAdd(payload: any) {
    await this.sql`
      INSERT INTO comments (id, entity_type, entity_id, user_name, comment, created_at)
      VALUES (${payload.id}, ${payload.entityType}, ${payload.entityId}, 
              ${payload.userName}, ${payload.comment}, ${new Date().toISOString()})
    `;
  }

  private broadcast(message: string) {
    const connections = this.ctx.getWebSockets();
    for (const conn of connections) {
      conn.send(message);
    }
  }

  async onRequest(request: Request) {
    const url = new URL(request.url);
    
    // API routes
    if (url.pathname === '/api/tasks' && request.method === 'GET') {
      const tasks = await this.sql`SELECT * FROM tasks ORDER BY created_at DESC`;
      return Response.json(Array.from(tasks));
    }
    
    if (url.pathname === '/api/vehicles' && request.method === 'GET') {
      const vehicles = await this.sql`SELECT * FROM vehicles ORDER BY created_at DESC`;
      return Response.json(Array.from(vehicles));
    }

    // Public inventory feed
    if (url.pathname === '/api/public/inventory' && request.method === 'GET') {
      const vehicles = await this.sql`
        SELECT id, vin, make, model, year, sale_price as price, mileage, color, 
               body_style, transmission, fuel_type, description, features, images, location
        FROM vehicles 
        WHERE status = 'available' AND publish_to_website = true
        ORDER BY created_at DESC
      `;
      return Response.json(Array.from(vehicles), {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    return new Response('Not found', { status: 404 });
  }
}

// Main Hono app
const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

// QuickBooks OAuth routes
app.get('/api/integrations/quickbooks/authorize', async (c) => {
  const { handleQuickBooksAuthorize } = await import('../worker/quickbooks-oauth');
  return handleQuickBooksAuthorize(c.req.raw, c.env);
});

app.get('/api/integrations/quickbooks/callback', async (c) => {
  const { handleQuickBooksCallback } = await import('../worker/quickbooks-oauth');
  return handleQuickBooksCallback(c.req.raw, c.env);
});

// Agent routes
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

// Serve static assets (React app)
app.get('/*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;

// Export queue consumer
export { default as queue } from '../worker/queue-consumer';
