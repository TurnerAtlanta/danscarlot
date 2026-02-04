# Integration Setup Guide

This guide walks you through setting up integrations with Wayne Reeves DMS, QuickBooks, and third-party listing sites.

## Table of Contents

- [Wayne Reeves DMS Integration](#wayne-reeves-dms-integration)
- [QuickBooks Online Integration](#quickbooks-online-integration)
- [Third-Party Listing Sites](#third-party-listing-sites)
- [Webhooks Configuration](#webhooks-configuration)
- [Troubleshooting](#troubleshooting)

-----

## Wayne Reeves DMS Integration

Wayne Reeves is a popular dealer management system. This integration allows bidirectional sync of inventory and sales data.

### Setup Steps

1. **Get API Credentials from Wayne Reeves**
- Log into your Wayne Reeves account
- Navigate to Settings → API Access
- Generate a new API key
- Note your API endpoint URL
1. **Configure in CarLot Manager**

```bash
# Set environment variables
npx wrangler secret put WAYNE_REEVES_API_KEY
# Paste your API key when prompted

# The API URL is already configured in wrangler.jsonc
# If your endpoint is different, update it there
```

1. **Initial Sync**

Once configured, perform an initial sync:

```bash
curl -X POST https://your-worker.workers.dev/api/integrations/wayne-reeves/sync
```

This will import all existing inventory from Wayne Reeves.

### Features

- **Pull inventory** from Wayne Reeves on demand
- **Push updates** when vehicles are sold in CarLot Manager
- **Webhook support** to receive real-time updates from Wayne Reeves
- **Automatic sync** via queue workers for reliability

### Data Mapping

|Wayne Reeves Field|CarLot Manager Field|
|------------------|--------------------|
|`stock_number`    |`external_dms_id`   |
|`vin`             |`vin`               |
|`make`            |`make`              |
|`model`           |`model`             |
|`year`            |`year`              |
|`cost`            |`purchase_price`    |
|`date_acquired`   |`purchase_date`     |
|`mileage`         |`mileage`           |
|`location`        |`location`          |

### Setting Up Webhooks

To receive real-time updates from Wayne Reeves:

1. In Wayne Reeves, go to Settings → Webhooks
1. Add a new webhook with URL: `https://your-worker.workers.dev/api/webhooks/wayne-reeves`
1. Select events: `vehicle.added`, `vehicle.updated`, `vehicle.sold`
1. Save and test the webhook

-----

## QuickBooks Online Integration

Sync sales and expenses with QuickBooks for accounting.

### Setup Steps

1. **Create a QuickBooks App**
- Go to [QuickBooks Developer Portal](https://developer.intuit.com)
- Create a new app
- Get your Client ID and Client Secret
- Set redirect URI to: `https://your-worker.workers.dev/api/integrations/quickbooks/callback`
1. **Configure Secrets**

```bash
npx wrangler secret put QUICKBOOKS_CLIENT_ID
npx wrangler secret put QUICKBOOKS_CLIENT_SECRET
npx wrangler secret put QUICKBOOKS_REALM_ID
```

1. **OAuth Authentication**

Navigate to:

```
https://your-worker.workers.dev/api/integrations/quickbooks/authorize
```

This will redirect you to QuickBooks to authorize access. After authorization, tokens are stored in KV.

### What Gets Synced

**Sales → QuickBooks Invoices**

- When a vehicle is marked as sold
- Creates an invoice with the sale price
- Links to the customer (if available)
- Posted within 7 days of sale

**Service Costs → QuickBooks Expenses**

- Service records automatically create expense entries
- Categorized to your vehicle service expense account
- Posted within 7 days of service date

### Manual Sync

To manually trigger a sync:

```bash
curl -X POST https://your-worker.workers.dev/api/integrations/quickbooks/sync
```

### Automatic Token Refresh

Access tokens expire after 1 hour. The system automatically refreshes them using the refresh token stored in KV.

-----

## Third-Party Listing Sites

Publish your inventory to popular car listing platforms.

### Supported Platforms

1. **CarGurus**
1. **TrueCar**
1. **Kelley Blue Book (KBB)**

### Configuration

#### CarGurus

1. Sign up for CarGurus Dealer Account
1. Get your API key from CarGurus Dealer Dashboard
1. Configure:

```bash
npx wrangler secret put CARGURUS_API_KEY
```

#### TrueCar

1. Register as a TrueCar Certified Dealer
1. Get your Dealer ID
1. Update `wrangler.jsonc`:

```jsonc
"vars": {
  "TRUECAR_DEALER_ID": "YOUR_DEALER_ID"
}
```

#### Kelley Blue Book (KBB)

1. Apply for KBB Instant Cash Offer program
1. Get your Dealer ID
1. Update `wrangler.jsonc`:

```jsonc
"vars": {
  "KBB_DEALER_ID": "YOUR_DEALER_ID"
}
```

### Publishing Vehicles

**Via UI:**

1. Go to Inventory tab
1. Click on a vehicle
1. Toggle “Publish to Website”
1. Toggle “Publish to Third Party”
1. Click “Publish to Listing Sites”

**Via API:**

```bash
curl -X POST https://your-worker.workers.dev/api/integrations/listings/publish \
  -H "Content-Type: application/json" \
  -d '{"vehicleId": "VEHICLE_ID_HERE"}'
```

### What Gets Published

- VIN
- Year, Make, Model
- Price
- Mileage
- Color (exterior/interior)
- Body style
- Transmission
- Fuel type
- Description
- Photos (if uploaded)

### Updating Listings

When you update a vehicle in CarLot Manager (price change, mileage, sold status), the changes are automatically queued for sync to listing sites.

### Removing Listings

When a vehicle is marked as sold, it’s automatically removed from all listing platforms within 24 hours.

-----

## Webhooks Configuration

### Receiving Webhooks from External Systems

Your Worker can receive webhooks at these endpoints:

**Wayne Reeves:**

```
POST https://your-worker.workers.dev/api/webhooks/wayne-reeves
```

**QuickBooks:** (for payment notifications)

```
POST https://your-worker.workers.dev/api/webhooks/quickbooks
```

### Webhook Security

For production, implement webhook signature verification:

```typescript
// Add to webhook handlers
const signature = request.headers.get('X-Webhook-Signature');
const payload = await request.text();
const expectedSignature = await crypto.subtle.digest(
  'SHA-256',
  new TextEncoder().encode(payload + WEBHOOK_SECRET)
);

if (signature !== bufferToHex(expectedSignature)) {
  return new Response('Invalid signature', { status: 401 });
}
```

-----

## Integration Status Dashboard

Check the status of all integrations:

```bash
curl https://your-worker.workers.dev/api/integrations/status
```

Response:

```json
{
  "wayneReeves": {
    "configured": true,
    "lastSync": "2025-02-03T10:30:00Z",
    "status": "connected"
  },
  "quickbooks": {
    "configured": true,
    "authenticated": true,
    "lastSync": "2025-02-03T09:15:00Z",
    "status": "connected"
  },
  "listings": {
    "carGurus": { "configured": true },
    "trueCar": { "configured": true },
    "kbb": { "configured": false },
    "totalPublished": 24
  }
}
```

-----

## Queue-Based Sync

All integrations use Cloudflare Queues for reliability:

- **Automatic retries** if API calls fail
- **Rate limiting** protection
- **Dead letter queue** for failed messages
- **Batch processing** for efficiency

Monitor queue health:

```bash
npx wrangler queues list
npx wrangler queues consumer stats sync-queue
```

-----

## Troubleshooting

### Wayne Reeves Sync Failing

**Problem:** Vehicles not syncing from Wayne Reeves

**Solutions:**

1. Check API key is valid: `npx wrangler secret list`
1. Verify API URL in wrangler.jsonc
1. Check queue processing: `npx wrangler tail`
1. Look for errors in dashboard: Cloudflare Dashboard → Workers → Logs

### QuickBooks Authentication Expired

**Problem:** QuickBooks returns 401 errors

**Solutions:**

1. Refresh token may be expired (valid for 100 days)
1. Re-authenticate at `/api/integrations/quickbooks/authorize`
1. Check KV storage for token: `npx wrangler kv:key get quickbooks_access_token --binding=INTEGRATIONS_KV`

### Listings Not Publishing

**Problem:** Vehicles not appearing on CarGurus/TrueCar/KBB

**Solutions:**

1. Verify API credentials are configured
1. Check vehicle has `publish_to_third_party = true`
1. Ensure vehicle has required fields (VIN, price, photos)
1. Check listing site API status
1. Review queue failures: `npx wrangler queues consumer stats sync-queue`

### Webhook Not Receiving Updates

**Problem:** Not receiving webhook notifications

**Solutions:**

1. Verify webhook URL is publicly accessible
1. Check webhook is registered in external system
1. Test with: `curl -X POST https://your-worker.workers.dev/api/webhooks/wayne-reeves -d '{}'`
1. Review worker logs for incoming requests

-----

## API Reference

### Sync Endpoints

**Sync with Wayne Reeves**

```
POST /api/integrations/wayne-reeves/sync
```

**Sync with QuickBooks**

```
POST /api/integrations/quickbooks/sync
```

**Publish to Listing Sites**

```
POST /api/integrations/listings/publish
Body: { "vehicleId": "xxx" }
```

**Check Integration Status**

```
GET /api/integrations/status
```

### Public Inventory API

**Get All Available Vehicles** (customer-facing)

```
GET /api/public/inventory
```

**Get Specific Vehicle** (customer-facing)

```
GET /api/public/vehicle/:id
```

These endpoints are public and CORS-enabled for embedding in external websites.

-----

## Embedding Inventory on Your Website

To display your inventory on your main website:

### Option 1: iframe Embed

```html
<iframe 
  src="https://your-worker.workers.dev/inventory.html" 
  width="100%" 
  height="800px" 
  frameborder="0">
</iframe>
```

### Option 2: API Integration

```javascript
fetch('https://your-worker.workers.dev/api/public/inventory')
  .then(res => res.json())
  .then(vehicles => {
    // Display vehicles in your own custom UI
    vehicles.forEach(vehicle => {
      console.log(`${vehicle.year} ${vehicle.make} ${vehicle.model} - $${vehicle.price}`);
    });
  });
```

### Option 3: WordPress Plugin

Create a simple WordPress shortcode:

```php
function carlot_inventory_shortcode() {
  $api_url = 'https://your-worker.workers.dev/api/public/inventory';
  $response = wp_remote_get($api_url);
  $vehicles = json_decode(wp_remote_retrieve_body($response));
  
  $output = '<div class="carlot-inventory">';
  foreach ($vehicles as $vehicle) {
    $output .= sprintf(
      '<div class="vehicle">
        <h3>%s %s %s</h3>
        <p>Price: $%s</p>
      </div>',
      $vehicle->year,
      $vehicle->make,
      $vehicle->model,
      number_format($vehicle->price)
    );
  }
  $output .= '</div>';
  
  return $output;
}
add_shortcode('carlot_inventory', 'carlot_inventory_shortcode');
```

Then use `[carlot_inventory]` in any page/post.

-----

## Best Practices

1. **Schedule regular syncs** - Set up Cron Triggers for daily Wayne Reeves syncs
1. **Monitor queue depths** - Set up alerts if queue gets backed up
1. **Test in preview** - Use wrangler dev to test integrations locally
1. **Keep credentials secure** - Never commit API keys to git
1. **Handle rate limits** - Respect API rate limits with queue delays
1. **Log everything** - Use Workers observability for debugging
1. **Validate webhooks** - Always verify webhook signatures in production

-----

## Support

For integration issues:

- Check Cloudflare Workers dashboard for errors
- Review queue consumer stats
- Enable verbose logging: `npx wrangler tail --format pretty`
- Consult integration partner documentation

For platform-specific API issues:

- Wayne Reeves: support@waynereeves.com
- QuickBooks: developer.intuit.com/support
- CarGurus: dealer-support@cargurus.com
- TrueCar: dealersupport@truecar.com
- KBB: dealer.support@kbb.com
