interface Env {
  // Durable Objects
  CARLOT_AGENT: DurableObjectNamespace<import("./index").CarLotAgent>;

  // KV Namespaces
  AUTH_KV: KVNamespace;
  INTEGRATIONS_KV: KVNamespace;

  // Queues
  SYNC_QUEUE: Queue<QueueMessage>;

  // Assets (for static files)
  ASSETS: Fetcher;

  // Environment Variables
  WAYNE_REEVES_API_KEY?: string;
  WAYNE_REEVES_API_URL?: string;
  QUICKBOOKS_CLIENT_ID?: string;
  QUICKBOOKS_CLIENT_SECRET?: string;
  QUICKBOOKS_REALM_ID?: string;
  CARGURUS_API_KEY?: string;
  TRUECAR_DEALER_ID?: string;
  KBB_DEALER_ID?: string;
  NODE_ENV?: string;
}

// Queue message types
type QueueMessage = VehicleSyncMessage | ExpenseSyncMessage;

interface VehicleSyncMessage {
  type: "vehicle_sync";
  action: "sold" | "update";
  vehicleId: string;
  timestamp: string;
}

interface ExpenseSyncMessage {
  type: "expense_sync";
  serviceId: string;
  vehicleId: string;
  amount: number;
  timestamp: string;
}

// Database entity types
interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  purchase_price: number;
  purchase_date: string;
  sale_price: number | null;
  sale_date: string | null;
  status: "available" | "sold" | "pending" | "service";
  location: string;
  mileage: number;
  color: string;
  body_style: string;
  transmission: string;
  fuel_type: string;
  description: string;
  features: string;
  images: string;
  created_at: string;
  updated_at?: string;
  publish_to_website: number;
  publish_to_third_party: number;
  external_dms_id?: string;
  external_dms_source?: string;
  quickbooks_invoice_id?: string;
  cargurus_listing_id?: string;
  truecar_listing_id?: string;
  kbb_listing_id?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  due_date: string;
  status: "todo" | "in_progress" | "completed";
  created_by: string;
  created_at: string;
  updated_at?: string;
}

interface Service {
  id: string;
  vehicle_id: string;
  service_type: string;
  description: string;
  cost: number;
  service_date: string;
  created_at: string;
}

interface Comment {
  id: string;
  entity_type: "vehicle" | "task" | "service";
  entity_id: string;
  user_name: string;
  comment: string;
  created_at: string;
}

// WebSocket message types
interface WebSocketMessage {
  type:
    | "state"
    | "task_update"
    | "inventory_update"
    | "comment_add"
    | "service_add"
    | "vehicle_sold";
  payload?: any;
  data?: {
    tasks?: Task[];
    vehicles?: Vehicle[];
  };
  source?: "dms" | "user" | "system";
}

// Integration API response types
interface SyncResult {
  success: boolean;
  synced?: number;
  errors?: number;
  error?: string;
  timestamp?: string;
}

interface IntegrationStatus {
  wayneReeves: {
    configured: boolean;
    lastSync: string | null;
    status: "connected" | "not_synced" | "error";
  };
  quickbooks: {
    configured: boolean;
    authenticated: boolean;
    lastSync: string | null;
    status: "connected" | "not_authenticated" | "error";
  };
  listings: {
    carGurus: { configured: boolean };
    trueCar: { configured: boolean };
    kbb: { configured: boolean };
    totalPublished: number;
  };
}

interface PublishResult {
  success: boolean;
  error?: string;
  results?: {
    carGurus: { success: boolean; listingId?: string; error?: string };
    trueCar: { success: boolean; listingId?: string; error?: string };
    kbb: { success: boolean; listingId?: string; error?: string };
  };
  timestamp?: string;
}

interface Analytics {
  totalRevenue: number;
  totalCost: number;
  profit: number;
  margin: string;
  soldCount: number;
  inventoryCount: number;
  avgProfitPerVehicle: string;
}

// Wayne Reeves DMS types
interface WayneReevesVehicle {
  vin: string;
  stock_number: string;
  make: string;
  model: string;
  year: number;
  cost: number;
  date_acquired: string;
  mileage: number;
  color: string;
  body_style: string;
  transmission: string;
  fuel_type: string;
  status: string;
  location: string;
}

interface WayneReevesResponse {
  vehicles: WayneReevesVehicle[];
}

interface WayneReevesWebhook {
  event: "vehicle.added" | "vehicle.updated" | "vehicle.sold";
  vehicle: WayneReevesVehicle;
  soldDate?: string;
  salePrice?: number;
}

// QuickBooks types
interface QuickBooksInvoice {
  Line: Array<{
    Amount: number;
    DetailType: "SalesItemLineDetail";
    SalesItemLineDetail: {
      ItemRef: { value: string };
      Qty: number;
      UnitPrice: number;
    };
    Description: string;
  }>;
  CustomerRef: { value: string };
}

interface QuickBooksInvoiceResponse {
  Invoice: {
    Id: string;
    [key: string]: any;
  };
}

// OAuth types
interface QuickBooksOAuthParams {
  client_id: string;
  redirect_uri: string;
  response_type: "code";
  scope: string;
  state: string;
}

interface QuickBooksTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  x_refresh_token_expires_in: number;
}

// Export all types
export type {
  Env,
  QueueMessage,
  VehicleSyncMessage,
  ExpenseSyncMessage,
  Vehicle,
  Task,
  Service,
  Comment,
  WebSocketMessage,
  SyncResult,
  IntegrationStatus,
  PublishResult,
  Analytics,
  WayneReevesVehicle,
  WayneReevesResponse,
  WayneReevesWebhook,
  QuickBooksInvoice,
  QuickBooksInvoiceResponse,
  QuickBooksOAuthParams,
  QuickBooksTokenResponse,
};
