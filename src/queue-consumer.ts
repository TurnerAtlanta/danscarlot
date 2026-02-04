// src/queue-consumer.ts
import type { MessageBatch, Queue } from ‘@cloudflare/workers-types’;

interface Env {
SYNC_QUEUE: Queue;
INTEGRATIONS_KV: KVNamespace;
WAYNE_REEVES_API_KEY?: string;
WAYNE_REEVES_API_URL?: string;
QUICKBOOKS_CLIENT_ID?: string;
QUICKBOOKS_REALM_ID?: string;
CARLOT_AGENT: DurableObjectNamespace;
}

interface SyncMessage {
type: ‘vehicle_sync’ | ‘expense_sync’ | ‘quickbooks_auth_refresh’;
vehicleId?: string;
serviceId?: string;
amount?: number;
action?: string;
timestamp: string;
}

export default {
async queue(batch: MessageBatch<SyncMessage>, env: Env): Promise<void> {
for (const message of batch.messages) {
try {
await processSyncMessage(message.body, env);
message.ack();
} catch (error) {
console.error(‘Queue processing error:’, error);
message.retry();
}
}
}
};

async function processSyncMessage(msg: SyncMessage, env: Env): Promise<void> {
switch (msg.type) {
case ‘vehicle_sync’:
await syncVehicleToExternalSystems(msg, env);
break;


case 'expense_sync':
  await syncExpenseToQuickBooks(msg, env);
  break;

case 'quickbooks_auth_refresh':
  await refreshQuickBooksToken(env);
  break;


}
}

async function syncVehicleToExternalSystems(msg: SyncMessage, env: Env): Promise<void> {
// Push updates to Wayne Reeves when vehicle is sold or updated
if (env.WAYNE_REEVES_API_KEY && msg.vehicleId) {
try {
const agent = env.CARLOT_AGENT.idFromName(‘main’);
const stub = env.CARLOT_AGENT.get(agent);


  const vehicleResp = await stub.fetch(`http://internal/api/vehicles/${msg.vehicleId}`);
  const vehicle = await vehicleResp.json();

  if (msg.action === 'sold') {
    // Notify Wayne Reeves of sale
    await fetch(`${env.WAYNE_REEVES_API_URL}/inventory/${vehicle.external_dms_id}/sold`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.WAYNE_REEVES_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        saleDate: vehicle.sale_date,
        salePrice: vehicle.sale_price
      })
    });
  } else {
    // Update inventory in Wayne Reeves
    await fetch(`${env.WAYNE_REEVES_API_URL}/inventory/${vehicle.external_dms_id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${env.WAYNE_REEVES_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mileage: vehicle.mileage,
        location: vehicle.location,
        status: vehicle.status
      })
    });
  }

  console.log(`Vehicle ${msg.vehicleId} synced to Wayne Reeves`);
} catch (error) {
  console.error('Wayne Reeves sync error:', error);
  throw error; // Will retry
}


}
}

async function syncExpenseToQuickBooks(msg: SyncMessage, env: Env): Promise<void> {
if (!env.QUICKBOOKS_CLIENT_ID || !msg.serviceId) return;

try {
const accessToken = await env.INTEGRATIONS_KV.get(‘quickbooks_access_token’);
if (!accessToken) {
console.error(‘QuickBooks not authenticated’);
return;
}


const expense = {
  PaymentType: 'Cash',
  AccountRef: { value: '35' },
  Line: [{
    Amount: msg.amount,
    DetailType: 'AccountBasedExpenseLineDetail',
    AccountBasedExpenseLineDetail: {
      AccountRef: { value: '35' }
    },
    Description: `Service expense - Vehicle service`
  }],
  TxnDate: new Date().toISOString().split('T')[0]
};

const response = await fetch(
  `https://quickbooks.api.intuit.com/v3/company/${env.QUICKBOOKS_REALM_ID}/purchase`,
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

if (!response.ok) {
  throw new Error(`QuickBooks API error: ${response.status}`);
}

console.log(`Expense ${msg.serviceId} synced to QuickBooks`);


} catch (error) {
console.error(‘QuickBooks expense sync error:’, error);
throw error;
}
}

async function refreshQuickBooksToken(env: Env): Promise<void> {
const refreshToken = await env.INTEGRATIONS_KV.get(‘quickbooks_refresh_token’);
if (!refreshToken) return;

try {
const response = await fetch(‘https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer’, {
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/x-www-form-urlencoded’,
‘Authorization’: `Basic ${btoa(`${env.QUICKBOOKS_CLIENT_ID}:${env.QUICKBOOKS_CLIENT_SECRET}`)}`
},
body: new URLSearchParams({
grant_type: ‘refresh_token’,
refresh_token: refreshToken
})
});


if (response.ok) {
  const tokens = await response.json();
  await env.INTEGRATIONS_KV.put('quickbooks_access_token', tokens.access_token, { expirationTtl: 3600 });
  await env.INTEGRATIONS_KV.put('quickbooks_refresh_token', tokens.refresh_token);
  console.log('QuickBooks token refreshed');
}


} catch (error) {
console.error(‘Token refresh error:’, error);
}
}
