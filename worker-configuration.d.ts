
export interface Env {
  // Durable Objects
  CARLOT_AGENT: DurableObjectNamespace<import('./src/index').CarLotAgent>;

  // KV Namespaces
  AUTH_KV: KVNamespace;
  INTEGRATIONS_KV: KVNamespace;

  // Queues
  SYNC_QUEUE: Queue<{ vehicleId: string; action: 'sync' | 'update' }>;

  // Assets (for React/Vite build)
  ASSETS: Fetcher;

  // Env vars
  WAYNE_REEVES_API_KEY?: string;
  QUICKBOOKS_CLIENT_ID?: string;
  QUICKBOOKS_CLIENT_SECRET?: string;
  QUICKBOOKS_REALM_ID?: string;
}

// Cloudflare Workers runtime types (Request, Response, etc.)
declare global {
  const __STATIC_CONTENT_MANIFEST: any;
}
