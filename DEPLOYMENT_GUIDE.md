# Deployment Guide - CarLot Manager

Complete step-by-step guide to deploy CarLot Manager with all integrations.

## Prerequisites

- Node.js 18+ installed
- Cloudflare account (free tier works)
- npm or yarn package manager
- Git (optional, for version control)

## Quick Start (Basic Deployment)

### 1. Install Dependencies

```bash
cd carlot-manager
npm install
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

This opens a browser window for authentication.

### 3. Create KV Namespaces

```bash
# Production namespaces
npx wrangler kv:namespace create "INTEGRATIONS_KV"
npx wrangler kv:namespace create "AUTH_KV"

# Preview namespaces (for local development)
npx wrangler kv:namespace create "INTEGRATIONS_KV" --preview
npx wrangler kv:namespace create "AUTH_KV" --preview
```

**Copy the IDs** from the output and update `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "AUTH_KV",
    "id": "<PASTE_PRODUCTION_ID_HERE>",
    "preview_id": "<PASTE_PREVIEW_ID_HERE>"
  },
  {
    "binding": "INTEGRATIONS_KV",
    "id": "<PASTE_PRODUCTION_ID_HERE>",
    "preview_id": "<PASTE_PREVIEW_ID_HERE>"
  }
]
```

### 4. Deploy

```bash
npm run deploy
```

Your app is now live at: `https://carlot-manager.<your-subdomain>.workers.dev`

### 5. Test the Basic App

1. Visit your Worker URL
1. Enter your name when prompted
1. Create a test task
1. Add a test vehicle
1. View analytics

-----

## Full Integration Setup

### Wayne Reeves DMS Integration

**Step 1: Get Wayne Reeves Credentials**

1. Log into Wayne Reeves account
1. Go to Settings → Developer → API Keys
1. Create new API key
1. Note your API endpoint URL

**Step 2: Configure in Worker**

```bash
# Set API key as secret (secure)
npx wrangler secret put WAYNE_REEVES_API_KEY
# Paste your API key when prompted

# Verify URL in wrangler.jsonc (update if different)
# "WAYNE_REEVES_API_URL": "https://api.waynereeves.com/v1"
```

**Step 3: Initial Sync**

```bash
# Test in development
npx wrangler dev

# In another terminal, trigger sync
curl -X POST http://localhost:8787/api/integrations/wayne-reeves/sync
```

**Step 4: Set Up Webhook (Optional but Recommended)**

In Wayne Reeves dashboard:

- URL: `https://carlot-manager.YOUR-SUBDOMAIN.workers.dev/api/webhooks/wayne-reeves`
- Events: `vehicle.added`, `vehicle.updated`, `vehicle.sold`
- Method: POST

-----

### QuickBooks Online Integration

**Step 1: Create QuickBooks Developer App**

1. Go to [developer.intuit.com](https://developer.intuit.com)
1. Click “Create an app”
1. Choose “QuickBooks Online and Payments”
1. Fill in app details:
- App name: CarLot Manager
- Description: Inventory and accounting integration
1. Get your credentials from Keys & OAuth

**Step 2: Configure OAuth Settings**

In QuickBooks Developer portal, set:

- **Redirect URI**: `https://carlot-manager.YOUR-SUBDOMAIN.workers.dev/api/integrations/quickbooks/callback`
- **Scopes**: `com.intuit.quickbooks.accounting`

**Step 3: Add Secrets to Worker**

```bash
npx wrangler secret put QUICKBOOKS_CLIENT_ID
# Paste Client ID

npx wrangler secret put QUICKBOOKS_CLIENT_SECRET
# Paste Client Secret

npx wrangler secret put QUICKBOOKS_REALM_ID
# Get this from QuickBooks company settings
```

**Step 4: Connect QuickBooks**

1. Deploy worker: `npm run deploy`
1. Go to Integrations tab in app
1. Click “Connect QuickBooks”
1. Authorize in popup window
1. Done! Sales and expenses will auto-sync

**Step 5: Verify Sync**

```bash
# Manually trigger a sync
curl -X POST https://carlot-manager.YOUR-SUBDOMAIN.workers.dev/api/integrations/quickbooks/sync
```

-----

### Third-Party Listing Sites

#### CarGurus

**Step 1: Get API Access**

1. Sign up at [cargurus.com/dealer](https://www.cargurus.com/dealer)
1. Request API access from your account manager
1. Get API key from dashboard

**Step 2: Configure**

```bash
npx wrangler secret put CARGURUS_API_KEY
# Paste API key
```

#### TrueCar

**Step 1: Dealer Registration**

1. Apply at [dealers.truecar.com](https://dealers.truecar.com)
1. Complete TrueCar Certified Dealer process
1. Get Dealer ID from dashboard

**Step 2: Configure**

Edit `wrangler.jsonc`:

```jsonc
"vars": {
  "TRUECAR_DEALER_ID": "YOUR_DEALER_ID_HERE"
}
```

#### Kelley Blue Book (KBB)

**Step 1: Apply for Program**

1. Contact KBB dealer services
1. Apply for KBB Instant Cash Offer program
1. Get Dealer ID

**Step 2: Configure**

Edit `wrangler.jsonc`:

```jsonc
"vars": {
  "KBB_DEALER_ID": "YOUR_DEALER_ID_HERE"
}
```

**Step 3: Publish Vehicles**

1. Go to Inventory tab
1. Select vehicle
1. Toggle “Publish to Website” ON
1. Toggle “Publish to Third Party” ON
1. Changes sync automatically via queue

-----

## Environment Variables Reference

### Required for Core Functionality

- None (works out of the box)

### Required for Wayne Reeves

- `WAYNE_REEVES_API_KEY` (secret)
- `WAYNE_REEVES_API_URL` (in wrangler.jsonc)

### Required for QuickBooks

- `QUICKBOOKS_CLIENT_ID` (secret)
- `QUICKBOOKS_CLIENT_SECRET` (secret)
- `QUICKBOOKS_REALM_ID` (secret)

### Required for Listing Sites

- `CARGURUS_API_KEY` (secret, optional)
- `TRUECAR_DEALER_ID` (in wrangler.jsonc, optional)
- `KBB_DEALER_ID` (in wrangler.jsonc, optional)

-----

## Custom Domain Setup

### Option 1: Cloudflare Workers Routes

1. Go to Cloudflare Dashboard
1. Select your domain
1. Go to Workers & Pages → Routes
1. Add route: `inventory.yourdomain.com/*`
1. Select worker: `carlot-manager`

### Option 2: Workers Custom Domain

```bash
npx wrangler domains add carlot.yourdomain.com
```

Update URLs in QuickBooks OAuth redirect settings!

-----

## Local Development

### Start Dev Server

```bash
npm run dev
```

Access at `http://localhost:8787`

### Test with Local Storage

KV namespaces work in local mode with `.wrangler/state`

### Debug with Logs

```bash
# In one terminal
npm run dev

# In another terminal
npx wrangler tail --format pretty
```

-----

## Production Checklist

Before going live, ensure:

- [ ] All KV namespace IDs updated in wrangler.jsonc
- [ ] All secrets set with `npx wrangler secret put`
- [ ] QuickBooks OAuth redirect URI matches your domain
- [ ] Wayne Reeves webhook configured (if using)
- [ ] Custom domain configured (optional)
- [ ] Test all integrations in preview
- [ ] Backup plan for data (export from Agent SQLite)

-----

## Monitoring & Maintenance

### View Logs

```bash
npx wrangler tail
```

### Check Queue Health

```bash
npx wrangler queues list
npx wrangler queues consumer stats sync-queue
```

### Monitor Integration Status

Visit: `https://your-worker.workers.dev/api/integrations/status`

### Scheduled Syncs (Optional)

Add cron trigger in `wrangler.jsonc`:

```jsonc
"triggers": {
  "crons": ["0 */6 * * *"]  // Every 6 hours
}
```

Add to `src/index.ts`:

```typescript
export default {
  async scheduled(event, env, ctx) {
    // Sync Wayne Reeves every 6 hours
    const agent = env.CARLOT_AGENT.idFromName('main');
    const stub = env.CARLOT_AGENT.get(agent);
    await stub.fetch('http://internal/api/integrations/wayne-reeves/sync', {
      method: 'POST'
    });
  }
}
```

-----

## Troubleshooting

### Worker Not Deploying

```bash
# Check for syntax errors
npm run build

# Verify wrangler.jsonc is valid JSON
cat wrangler.jsonc | jq .

# Check account status
npx wrangler whoami
```

### Integrations Not Working

```bash
# List all secrets
npx wrangler secret list

# Check environment variables
cat wrangler.jsonc | grep -A 10 vars

# Test integration endpoint
curl https://your-worker.workers.dev/api/integrations/status
```

### QuickBooks Auth Failing

- Verify redirect URI matches EXACTLY in QuickBooks developer portal
- Check Client ID and Client Secret are correct
- Ensure Realm ID is from correct company
- Try disconnecting and reconnecting

### Queue Backlog

```bash
# Check queue depth
npx wrangler queues consumer stats sync-queue

# Purge queue (careful!)
npx wrangler queues consumer purge sync-queue
```

-----

## Updating the App

### Pull Latest Changes

```bash
git pull origin main
npm install
```

### Update Schema (if needed)

If database schema changed, you may need to:

```bash
# Deploy with migration
npm run deploy
```

Agents automatically handle SQLite schema migrations.

### Update Secrets

```bash
# Rotate API keys
npx wrangler secret put WAYNE_REEVES_API_KEY
```

-----

## Backup & Recovery

### Export Data from Agent

```typescript
// Add this endpoint to get SQL dump
app.get('/admin/export', async (c) => {
  const agent = env.CARLOT_AGENT.idFromName('main');
  const stub = env.CARLOT_AGENT.get(agent);
  
  const vehicles = await stub.sql`SELECT * FROM vehicles`;
  const tasks = await stub.sql`SELECT * FROM tasks`;
  
  return c.json({
    vehicles: Array.from(vehicles),
    tasks: Array.from(tasks)
  });
});
```

### Import Data

Create vehicles via API:

```bash
curl -X POST https://your-worker.workers.dev/api/vehicles \
  -H "Content-Type: application/json" \
  -d @backup.json
```

-----

## Security Best Practices

1. **Never commit secrets** - Use `wrangler secret put`
1. **Verify webhook signatures** in production
1. **Use custom domain** for professional appearance
1. **Enable rate limiting** if needed
1. **Rotate API keys** regularly
1. **Use Cloudflare Access** to restrict admin access (optional)

-----

## Performance Optimization

### Enable Caching

Already configured for public inventory API:

```typescript
headers: {
  'Cache-Control': 'public, max-age=300'
}
```

### Use CDN for Images

Store vehicle photos in R2:

```bash
npx wrangler r2 bucket create vehicle-images
```

Update wrangler.jsonc:

```jsonc
"r2_buckets": [
  {
    "binding": "VEHICLE_IMAGES",
    "bucket_name": "vehicle-images"
  }
]
```

-----

## Cost Estimate

### Cloudflare Workers (Free Tier)

- 100,000 requests/day FREE
- Suitable for most small to medium dealerships

### Paid Plan ($5/month)

- 10 million requests/month
- Recommended for high-traffic sites

### Integrations

- Wayne Reeves: Check with provider
- QuickBooks: Included with QBO subscription
- Listing sites: Typically included with dealer programs

-----

## Support Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers)
- [Agents Documentation](https://developers.cloudflare.com/agents)
- [QuickBooks API Docs](https://developer.intuit.com/app/developer/qbo/docs/get-started)
- [Integration Guide](./INTEGRATION_GUIDE.md)

-----

## What"s Next?

After successful deployment:

1. ✅ Configure your dealership information
1. ✅ Import existing inventory (or sync from Wayne Reeves)
1. ✅ Connect QuickBooks for accounting
1. ✅ Publish to listing sites
1. ✅ Embed inventory on your website
1. ✅ Train your team
1. ✅ Start tracking tasks and profits!

For questions or issues, check the troubleshooting section or review the logs with `npx wrangler tail`.
