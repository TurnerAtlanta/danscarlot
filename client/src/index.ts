// src/index.ts
import { Hono } from ‘hono’;
import { cors } from ‘hono/cors’;
import { Agent, routeAgentRequest } from ‘agents’;

interface Env {
CARLOT_AGENT: DurableObjectNamespace;
DB: D1Database;
AUTH_KV: KVNamespace;
INTEGRATIONS_KV: KVNamespace;
SYNC_QUEUE: Queue;
// Environment variables for API credentials
WAYNE_REEVES_API_KEY?: string;
WAYNE_REEVES_API_URL?: string;
QUICKBOOKS_CLIENT_ID?: string;
QUICKBOOKS_CLIENT_SECRET?: string;
QUICKBOOKS_REALM_ID?: string;
CARGURUS_API_KEY?: string;
TRUECAR_DEALER_ID?: string;
KBB_DEALER_ID?: string;
}

// Main CarLot Agent for real-time collaboration
export class CarLotAgent extends Agent<Env> {
async onConnect(connection: any) {
connection.accept();

```
// Send current state to newly connected client
const state = await this.getState();
connection.send(JSON.stringify({
  type: 'state',
  data: state
}));
```

}

async onMessage(connection: any, message: any) {
const data = JSON.parse(message);

```
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
```

}

private async handleTaskUpdate(payload: any) {
await this.sql`INSERT INTO tasks (id, title, description, assignee, due_date, status, created_by, created_at) VALUES (${payload.id}, ${payload.title}, ${payload.description}, ${payload.assignee},  ${payload.dueDate}, ${payload.status}, ${payload.createdBy}, ${new Date().toISOString()}) ON CONFLICT(id) DO UPDATE SET title = ${payload.title}, description = ${payload.description}, assignee = ${payload.assignee}, due_date = ${payload.dueDate}, status = ${payload.status}, updated_at = ${new Date().toISOString()}`;
}

private async handleInventoryUpdate(payload: any) {
await this.sql`INSERT INTO vehicles (id, vin, make, model, year, purchase_price, purchase_date,  sale_price, sale_date, status, location, mileage, color,  body_style, transmission, fuel_type, description, features, images, created_at, publish_to_website, publish_to_third_party) VALUES (${payload.id}, ${payload.vin}, ${payload.make}, ${payload.model}, ${payload.year}, ${payload.purchasePrice}, ${payload.purchaseDate}, ${payload.salePrice},  ${payload.saleDate}, ${payload.status}, ${payload.location}, ${payload.mileage || 0}, ${payload.color || ''}, ${payload.bodyStyle || ''}, ${payload.transmission || ''}, ${payload.fuelType || ''}, ${payload.description || ''}, ${payload.features || ''}, ${payload.images || ''}, ${new Date().toISOString()},  ${payload.publishToWebsite !== false}, ${payload.publishToThirdParty !== false}) ON CONFLICT(id) DO UPDATE SET make = ${payload.make}, model = ${payload.model}, year = ${payload.year}, purchase_price = ${payload.purchasePrice}, sale_price = ${payload.salePrice}, sale_date = ${payload.saleDate}, status = ${payload.status}, location = ${payload.location}, mileage = ${payload.mileage || 0}, color = ${payload.color || ''}, body_style = ${payload.bodyStyle || ''}, transmission = ${payload.transmission || ''}, fuel_type = ${payload.fuelType || ''}, description = ${payload.description || ''}, features = ${payload.features || ''}, images = ${payload.images || ''}, publish_to_website = ${payload.publishToWebsite !== false}, publish_to_third_party = ${payload.publishToThirdParty !== false}, updated_at = ${new Date().toISOString()}`;

```
// Queue sync jobs for integrations
if (this.env.SYNC_QUEUE) {
  await this.env.SYNC_QUEUE.send({
    type: 'vehicle_sync',
    action: payload.saleDate ? 'sold' : 'update',
    vehicleId: payload.id,
    timestamp: new Date().toISOString()
  });
}
```

}

private async handleCommentAdd(payload: any) {
await this.sql`INSERT INTO comments (id, entity_type, entity_id, user_name, comment, created_at) VALUES (${payload.id}, ${payload.entityType}, ${payload.entityId},  ${payload.userName}, ${payload.comment}, ${new Date().toISOString()})`;
}

private broadcast(message: string) {
const connections = this.ctx.getWebSockets();
for (const conn of connections) {
conn.send(message);
}
}

async onRequest(request: Request) {
const url = new URL(request.url);

```
if (url.pathname === '/api/tasks' && request.method === 'GET') {
  const tasks = await this.sql`SELECT * FROM tasks ORDER BY created_at DESC`;
  return Response.json(Array.from(tasks));
}

if (url.pathname === '/api/vehicles' && request.method === 'GET') {
  const vehicles = await this.sql`SELECT * FROM vehicles ORDER BY created_at DESC`;
  return Response.json(Array.from(vehicles));
}

// Public inventory feed (customer-facing)
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

// Public vehicle detail (customer-facing)
if (url.pathname.startsWith('/api/public/vehicle/') && request.method === 'GET') {
  const vehicleId = url.pathname.split('/').pop();
  const vehicle = await this.sql`
    SELECT id, vin, make, model, year, sale_price as price, mileage, color,
           body_style, transmission, fuel_type, description, features, images, location
    FROM vehicles 
    WHERE id = ${vehicleId} AND status = 'available' AND publish_to_website = true
    LIMIT 1
  `;
  const result = Array.from(vehicle);
  if (result.length === 0) {
    return Response.json({ error: 'Vehicle not found' }, { status: 404 });
  }
  return Response.json(result[0], {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

if (url.pathname === '/api/services' && request.method === 'GET') {
  const vehicleId = url.searchParams.get('vehicleId');
  const services = await this.sql`
    SELECT * FROM services 
    WHERE vehicle_id = ${vehicleId}
    ORDER BY service_date DESC
  `;
  return Response.json(Array.from(services));
}

if (url.pathname === '/api/analytics' && request.method === 'GET') {
  const analytics = await this.calculateAnalytics();
  return Response.json(analytics);
}

if (url.pathname === '/api/comments' && request.method === 'GET') {
  const entityType = url.searchParams.get('entityType');
  const entityId = url.searchParams.get('entityId');
  const comments = await this.sql`
    SELECT * FROM comments 
    WHERE entity_type = ${entityType} AND entity_id = ${entityId}
    ORDER BY created_at ASC
  `;
  return Response.json(Array.from(comments));
}

if (url.pathname === '/api/services' && request.method === 'POST') {
  const payload = await request.json();
  await this.sql`
    INSERT INTO services (id, vehicle_id, service_type, description, cost, service_date, created_at)
    VALUES (${payload.id}, ${payload.vehicleId}, ${payload.serviceType}, 
            ${payload.description}, ${payload.cost}, ${payload.serviceDate}, ${new Date().toISOString()})
  `;
  this.broadcast(JSON.stringify({ type: 'service_add', payload }));

  // Sync service cost to QuickBooks
  if (this.env.SYNC_QUEUE) {
    await this.env.SYNC_QUEUE.send({
      type: 'expense_sync',
      serviceId: payload.id,
      vehicleId: payload.vehicleId,
      amount: payload.cost,
      timestamp: new Date().toISOString()
    });
  }

  return Response.json({ success: true });
}

// Integration: Sync with Wayne Reeves DMS
if (url.pathname === '/api/integrations/wayne-reeves/sync' && request.method === 'POST') {
  const result = await this.syncWithWayneReeves();
  return Response.json(result);
}

// Integration: Sync with QuickBooks
if (url.pathname === '/api/integrations/quickbooks/sync' && request.method === 'POST') {
  const result = await this.syncWithQuickBooks();
  return Response.json(result);
}

// Integration: Publish to third-party sites
if (url.pathname === '/api/integrations/listings/publish' && request.method === 'POST') {
  const { vehicleId } = await request.json();
  const result = await this.publishToListingSites(vehicleId);
  return Response.json(result);
}

// Integration: Get sync status
if (url.pathname === '/api/integrations/status' && request.method === 'GET') {
  const status = await this.getIntegrationStatus();
  return Response.json(status);
}

// Webhook: Receive updates from Wayne Reeves
if (url.pathname === '/api/webhooks/wayne-reeves' && request.method === 'POST') {
  const payload = await request.json();
  await this.handleWayneReevesWebhook(payload);
  return Response.json({ success: true });
}

return new Response('Not found', { status: 404 });
```

}

private async syncWithWayneReeves(): Promise<any> {
if (!this.env.WAYNE_REEVES_API_KEY || !this.env.WAYNE_REEVES_API_URL) {
return { success: false, error: ‘Wayne Reeves credentials not configured’ };
}

```
try {
  // Fetch inventory from Wayne Reeves
  const response = await fetch(`${this.env.WAYNE_REEVES_API_URL}/inventory`, {
    headers: {
      'Authorization': `Bearer ${this.env.WAYNE_REEVES_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Wayne Reeves API error: ${response.status}`);
  }

  const data = await response.json();
  let synced = 0;
  let errors = 0;

  // Sync each vehicle from Wayne Reeves to our system
  for (const wrVehicle of data.vehicles || []) {
    try {
      await this.sql`
        INSERT INTO vehicles (id, vin, make, model, year, purchase_price, purchase_date,
                             mileage, color, body_style, transmission, fuel_type, status, location,
                             external_dms_id, external_dms_source, created_at)
        VALUES (${crypto.randomUUID()}, ${wrVehicle.vin}, ${wrVehicle.make}, ${wrVehicle.model},
               ${wrVehicle.year}, ${wrVehicle.cost || 0}, ${wrVehicle.date_acquired},
               ${wrVehicle.mileage}, ${wrVehicle.color}, ${wrVehicle.body_style},
               ${wrVehicle.transmission}, ${wrVehicle.fuel_type}, ${wrVehicle.status},
               ${wrVehicle.location}, ${wrVehicle.stock_number}, 'wayne_reeves',
               ${new Date().toISOString()})
        ON CONFLICT(vin) DO UPDATE SET
          mileage = ${wrVehicle.mileage},
          status = ${wrVehicle.status},
          location = ${wrVehicle.location},
          updated_at = ${new Date().toISOString()}
      `;
      synced++;
    } catch (e) {
      console.error('Error syncing vehicle:', wrVehicle.vin, e);
      errors++;
    }
  }

  // Store sync timestamp
  await this.env.INTEGRATIONS_KV?.put('wayne_reeves_last_sync', new Date().toISOString());

  return { success: true, synced, errors, timestamp: new Date().toISOString() };
} catch (error) {
  console.error('Wayne Reeves sync error:', error);
  return { success: false, error: error.message };
}
```

}

private async syncWithQuickBooks(): Promise<any> {
if (!this.env.QUICKBOOKS_CLIENT_ID || !this.env.QUICKBOOKS_REALM_ID) {
return { success: false, error: ‘QuickBooks credentials not configured’ };
}

```
try {
  // Get OAuth token from KV (assumes you have an OAuth flow elsewhere)
  const accessToken = await this.env.INTEGRATIONS_KV?.get('quickbooks_access_token');
  if (!accessToken) {
    return { success: false, error: 'QuickBooks not authenticated' };
  }

  // Get recent sales to sync
  const recentSales = await this.sql`
    SELECT * FROM vehicles 
    WHERE status = 'sold' 
    AND sale_date > datetime('now', '-7 days')
    AND quickbooks_invoice_id IS NULL
  `;

  let synced = 0;
  let errors = 0;

  for (const vehicle of recentSales) {
    try {
      // Create invoice in QuickBooks
      const invoice = {
        Line: [{
          Amount: vehicle.sale_price,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: { value: '1' }, // Your inventory item ID
            Qty: 1,
            UnitPrice: vehicle.sale_price
          },
          Description: `${vehicle.year} ${vehicle.make} ${vehicle.model} - VIN: ${vehicle.vin}`
        }],
        CustomerRef: { value: '1' } // Default customer or get from vehicle data
      };

      const response = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${this.env.QUICKBOOKS_REALM_ID}/invoice`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(invoice)
        }
      );

      if (response.ok) {
        const result = await response.json();
        await this.sql`
          UPDATE vehicles 
          SET quickbooks_invoice_id = ${result.Invoice.Id}
          WHERE id = ${vehicle.id}
        `;
        synced++;
      } else {
        errors++;
      }
    } catch (e) {
      console.error('Error syncing to QuickBooks:', vehicle.id, e);
      errors++;
    }
  }

  // Sync expenses (services)
  const recentServices = await this.sql`
    SELECT * FROM services 
    WHERE service_date > datetime('now', '-7 days')
    AND quickbooks_expense_id IS NULL
  `;

  for (const service of recentServices) {
    try {
      const expense = {
        PaymentType: 'Cash',
        AccountRef: { value: '35' }, // Your expense account
        Line: [{
          Amount: service.cost,
          DetailType: 'AccountBasedExpenseLineDetail',
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: '35' }
          },
          Description: `${service.service_type} - ${service.description}`
        }]
      };

      const response = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${this.env.QUICKBOOKS_REALM_ID}/purchase`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(expense)
        }
      );

      if (response.ok) {
        const result = await response.json();
        await this.sql`
          UPDATE services 
          SET quickbooks_expense_id = ${result.Purchase.Id}
          WHERE id = ${service.id}
        `;
        synced++;
      } else {
        errors++;
      }
    } catch (e) {
      console.error('Error syncing expense to QuickBooks:', service.id, e);
      errors++;
    }
  }

  await this.env.INTEGRATIONS_KV?.put('quickbooks_last_sync', new Date().toISOString());

  return { success: true, synced, errors, timestamp: new Date().toISOString() };
} catch (error) {
  console.error('QuickBooks sync error:', error);
  return { success: false, error: error.message };
}
```

}

private async publishToListingSites(vehicleId: string): Promise<any> {
const vehicle = await this.sql`SELECT * FROM vehicles WHERE id = ${vehicleId} LIMIT 1`;
const vehicleData = Array.from(vehicle)[0];

```
if (!vehicleData) {
  return { success: false, error: 'Vehicle not found' };
}

const results = {
  carGurus: { success: false },
  trueCar: { success: false },
  kbb: { success: false }
};

// CarGurus API
if (this.env.CARGURUS_API_KEY && vehicleData.publish_to_third_party) {
  try {
    const carGurusListing = {
      vin: vehicleData.vin,
      year: vehicleData.year,
      make: vehicleData.make,
      model: vehicleData.model,
      price: vehicleData.sale_price,
      mileage: vehicleData.mileage,
      exteriorColor: vehicleData.color,
      bodyStyle: vehicleData.body_style,
      transmission: vehicleData.transmission,
      fuelType: vehicleData.fuel_type,
      description: vehicleData.description,
      photos: vehicleData.images ? vehicleData.images.split(',') : []
    };

    const response = await fetch('https://api.cargurus.com/v1/listings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.CARGURUS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(carGurusListing)
    });

    if (response.ok) {
      const result = await response.json();
      await this.sql`
        UPDATE vehicles 
        SET cargurus_listing_id = ${result.listingId}
        WHERE id = ${vehicleId}
      `;
      results.carGurus = { success: true, listingId: result.listingId };
    }
  } catch (e) {
    console.error('CarGurus publish error:', e);
    results.carGurus = { success: false, error: e.message };
  }
}

// TrueCar API
if (this.env.TRUECAR_DEALER_ID && vehicleData.publish_to_third_party) {
  try {
    const trueCar Listing = {
      dealerId: this.env.TRUECAR_DEALER_ID,
      vin: vehicleData.vin,
      year: vehicleData.year,
      make: vehicleData.make,
      model: vehicleData.model,
      askingPrice: vehicleData.sale_price,
      odometer: vehicleData.mileage,
      exteriorColor: vehicleData.color,
      transmission: vehicleData.transmission,
      description: vehicleData.description
    };

    const response = await fetch('https://api.truecar.com/dealer/v1/inventory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(trueCarListing)
    });

    if (response.ok) {
      const result = await response.json();
      await this.sql`
        UPDATE vehicles 
        SET truecar_listing_id = ${result.inventoryId}
        WHERE id = ${vehicleId}
      `;
      results.trueCar = { success: true, listingId: result.inventoryId };
    }
  } catch (e) {
    console.error('TrueCar publish error:', e);
    results.trueCar = { success: false, error: e.message };
  }
}

// KBB Instant Cash Offer
if (this.env.KBB_DEALER_ID && vehicleData.publish_to_third_party) {
  try {
    const kbbListing = {
      dealerId: this.env.KBB_DEALER_ID,
      vin: vehicleData.vin,
      year: vehicleData.year,
      make: vehicleData.make,
      model: vehicleData.model,
      listPrice: vehicleData.sale_price,
      mileage: vehicleData.mileage,
      exteriorColor: vehicleData.color,
      interiorColor: vehicleData.interior_color,
      transmission: vehicleData.transmission
    };

    const response = await fetch('https://api.kbb.com/dealer/v1/inventory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(kbbListing)
    });

    if (response.ok) {
      const result = await response.json();
      await this.sql`
        UPDATE vehicles 
        SET kbb_listing_id = ${result.listingId}
        WHERE id = ${vehicleId}
      `;
      results.kbb = { success: true, listingId: result.listingId };
    }
  } catch (e) {
    console.error('KBB publish error:', e);
    results.kbb = { success: false, error: e.message };
  }
}

return { success: true, results, timestamp: new Date().toISOString() };
```

}

private async getIntegrationStatus(): Promise<any> {
const wayneReevesSync = await this.env.INTEGRATIONS_KV?.get(‘wayne_reeves_last_sync’);
const quickbooksSync = await this.env.INTEGRATIONS_KV?.get(‘quickbooks_last_sync’);
const quickbooksToken = await this.env.INTEGRATIONS_KV?.get(‘quickbooks_access_token’);

```
const publishedVehicles = await this.sql`
  SELECT COUNT(*) as count FROM vehicles 
  WHERE cargurus_listing_id IS NOT NULL 
     OR truecar_listing_id IS NOT NULL 
     OR kbb_listing_id IS NOT NULL
`;

return {
  wayneReeves: {
    configured: !!this.env.WAYNE_REEVES_API_KEY,
    lastSync: wayneReevesSync,
    status: wayneReevesSync ? 'connected' : 'not_synced'
  },
  quickbooks: {
    configured: !!this.env.QUICKBOOKS_CLIENT_ID,
    authenticated: !!quickbooksToken,
    lastSync: quickbooksSync,
    status: quickbooksToken ? 'connected' : 'not_authenticated'
  },
  listings: {
    carGurus: { configured: !!this.env.CARGURUS_API_KEY },
    trueCar: { configured: !!this.env.TRUECAR_DEALER_ID },
    kbb: { configured: !!this.env.KBB_DEALER_ID },
    totalPublished: Array.from(publishedVehicles)[0]?.count || 0
  }
};
```

}

private async handleWayneReevesWebhook(payload: any): Promise<void> {
// Handle webhook notifications from Wayne Reeves DMS
switch (payload.event) {
case ‘vehicle.added’:
case ‘vehicle.updated’:
await this.sql`INSERT INTO vehicles (id, vin, make, model, year, external_dms_id, external_dms_source, created_at) VALUES (${crypto.randomUUID()}, ${payload.vehicle.vin}, ${payload.vehicle.make}, ${payload.vehicle.model}, ${payload.vehicle.year}, ${payload.vehicle.stock_number}, 'wayne_reeves', ${new Date().toISOString()}) ON CONFLICT(vin) DO UPDATE SET make = ${payload.vehicle.make}, model = ${payload.vehicle.model}, updated_at = ${new Date().toISOString()}`;
this.broadcast(JSON.stringify({ type: ‘inventory_update’, source: ‘dms’ }));
break;

```
  case 'vehicle.sold':
    await this.sql`
      UPDATE vehicles 
      SET status = 'sold', 
          sale_date = ${payload.soldDate},
          sale_price = ${payload.salePrice}
      WHERE vin = ${payload.vehicle.vin}
    `;
    this.broadcast(JSON.stringify({ type: 'vehicle_sold', source: 'dms' }));
    break;
}
```

}

private async calculateAnalytics() {
const vehicles = await this.sql`SELECT * FROM vehicles`;
const services = await this.sql`SELECT * FROM services`;

```
let totalRevenue = 0;
let totalCost = 0;
let soldCount = 0;
let inventoryCount = 0;

for (const vehicle of vehicles) {
  const purchasePrice = vehicle.purchase_price || 0;
  totalCost += purchasePrice;
  
  if (vehicle.status === 'sold' && vehicle.sale_price) {
    totalRevenue += vehicle.sale_price;
    soldCount++;
  } else {
    inventoryCount++;
  }
}

for (const service of services) {
  totalCost += service.cost || 0;
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
  avgProfitPerVehicle: soldCount > 0 ? (profit / soldCount).toFixed(2) : 0
};
```

}
}

const app = new Hono<{ Bindings: Env }>();

app.use(’*’, cors());

// QuickBooks OAuth routes
app.get(’/api/integrations/quickbooks/authorize’, async (c) => {
const { handleQuickBooksAuthorize } = await import(’./quickbooks-oauth’);
return handleQuickBooksAuthorize(c.req.raw, c.env);
});

app.get(’/api/integrations/quickbooks/callback’, async (c) => {
const { handleQuickBooksCallback } = await import(’./quickbooks-oauth’);
return handleQuickBooksCallback(c.req.raw, c.env);
});

app.post(’/api/integrations/quickbooks/disconnect’, async (c) => {
const { handleQuickBooksDisconnect } = await import(’./quickbooks-oauth’);
return handleQuickBooksDisconnect(c.env);
});

app.get(’/api/*’, async (c) => {
const agentRequest = await routeAgentRequest(c.req.raw, c.env);
if (agentRequest) return agentRequest;
return c.json({ error: ‘Not found’ }, 404);
});

app.post(’/api/*’, async (c) => {
const agentRequest = await routeAgentRequest(c.req.raw, c.env);
if (agentRequest) return agentRequest;
return c.json({ error: ‘Not found’ }, 404);
});

app.get(’/*’, async (c) => {
return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
