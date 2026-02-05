// worker/queue-consumer.ts
import type { MessageBatch, Queue } from '@cloudflare/workers-types';

interface Env {
  SYNC_QUEUE: Queue;
  INTEGRATIONS_KV: KVNamespace;
  WAYNE_REEVES_API_KEY?: string;
  WAYNE_REEVES_API_URL?: string;
  QUICKBOOKS_CLIENT_ID?: string;
  QUICKBOOKS_CLIENT_SECRET?: string;
  QUICKBOOKS_REALM_ID?: string;
  CARLOT_AGENT: DurableObjectNamespace;
}

interface SyncMessage {
  type: 'vehicle_sync' | 'expense_sync' | 'quickbooks_auth_refresh';
  vehicleId?: string;
  serviceId?: string;
  amount?: number;
  action?: string; // e.g. 'sold' | 'updated'
  timestamp: string;
}

export default {
  async queue(batch: MessageBatch<SyncMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processSyncMessage(message.body, env);
        message.ack();
      } catch (error) {
        console.error('Queue processing error:', error);
        message.retry();
      }
    }
  },
};

async function processSyncMessage(msg: SyncMessage, env: Env): Promise<void> {
  switch (msg.type) {
    case 'vehicle_sync':
      await syncVehicleToExternalSystems(msg, env);
      break;

    case 'expense_sync':
      await syncExpenseToQuickBooks(msg, env);
      break;

    case 'quickbooks_auth_refresh':
      await refreshQuickBooksToken(env);
      break;

    default:
      console.warn('Unknown sync message type', msg.type);
  }
}

async function syncVehicleToExternalSystems(msg: SyncMessage, env: Env): Promise<void> {
  if (!env.WAYNE_REEVES_API_KEY || !env.WAYNE_REEVES_API_URL || !msg.vehicleId) return;

  try {
    const id = env.CARLOT_AGENT.idFromName('main');
    const stub = env.CARLOT_AGENT.get(id);

    const vehicleResp = await stub.fetch(`http://internal/api/vehicles/${msg.vehicleId}`);
    if (!vehicleResp.ok) {
      throw new Error(`CarLotAgent vehicle lookup failed: ${vehicleResp.status}`);
    }
    const vehicle = (await vehicleResp.json()) as any;

    if (!vehicle.external_dms_id) {
      console.warn('Vehicle missing external_dms_id; skipping Wayne Reeves sync', msg.vehicleId);
      return;
    }

    const baseUrl = env.WAYNE_REEVES_API_URL.replace(/\/+$/, '');

    if (msg.action === 'sold') {
      await fetch(`${baseUrl}/inventory/${vehicle.external_dms_id}/sold`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WAYNE_REEVES_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          saleDate: vehicle.sale_date,
          salePrice: vehicle.sale_price,
        }),
      });
    } else {
      await fetch(`${baseUrl}/inventory/${vehicle.external_dms_id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${env.WAYNE_REEVES_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mileage: vehicle.mileage,
          location: vehicle.location,
          status: vehicle.status,
        }),
      });
    }

    console.log(`Vehicle ${msg.vehicleId} synced to Wayne Reeves`);
  } catch (error) {
    console.error('Wayne Reeves sync error:', error);
    throw error; // trigger retry
  }
}

async function syncExpenseToQuickBooks(msg: SyncMessage, env: Env): Promise<void> {
  if (!env.QUICKBOOKS_CLIENT_ID || !env.QUICKBOOKS_REALM_ID || !msg.serviceId || !msg.amount) {
    return;
  }

  try {
    const accessToken = await env.INTEGRATIONS_KV.get('quickbooks_access_token');
    if (!accessToken) {
      console.error('QuickBooks not authenticated');
      return;
    }

    const expense = {
      PaymentType: 'Cash',
      AccountRef: { value: '35' }, // TODO: map to real QBO account id
      Line: [
        {
          Amount: msg.amount,
          DetailType: 'AccountBasedExpenseLineDetail',
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: '35' },
          },
          Description: 'Service expense - Vehicle service',
        },
      ],
      TxnDate: new Date().toISOString().split('T')[0],
    };

    const response = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${env.QUICKBOOKS_REALM_ID}/purchase`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(expense),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`QuickBooks API error: ${response.status} ${body}`);
    }

    console.log(`Expense ${msg.serviceId} synced to QuickBooks`);
  } catch (error) {
    console.error('QuickBooks expense sync error:', error);
    throw error;
  }
}

async function refreshQuickBooksToken(env: Env): Promise<void> {
  if (!env.QUICKBOOKS_CLIENT_ID || !env.QUICKBOOKS_CLIENT_SECRET) return;

  const refreshToken = await env.INTEGRATIONS_KV.get('quickbooks_refresh_token');
  if (!refreshToken) return;

  try {
    const basicAuth = btoa(`${env.QUICKBOOKS_CLIENT_ID}:${env.QUICKBOOKS_CLIENT_SECRET}`);

    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`QuickBooks token refresh failed: ${response.status} ${body}`);
    }

    const tokens = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Intuit returns a *new* refresh token on each refresh; always store the latest [web:21][web:24].
    await env.INTEGRATIONS_KV.put('quickbooks_access_token', tokens.access_token, {
      expirationTtl: tokens.expires_in ?? 3600,
    });
    await env.INTEGRATIONS_KV.put('quickbooks_refresh_token', tokens.refresh_token);

    console.log('QuickBooks token refreshed');
  } catch (error) {
    console.error('Token refresh error:', error);
    // Do not throw, to avoid infinite retries if credentials are bad
  }
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
