# CarLot Manager

A comprehensive Progressive Web App (PWA) for managing used car lot operations, built on Cloudflare Workers with real-time collaboration.

## Features

### 📋 Task Management

- Create and assign tasks to team members
- Track task status (Pending, In Progress, Completed)
- Set due dates and descriptions
- Real-time updates across all users
- Comment on tasks for collaboration

### 🚗 Inventory Management

- Add vehicles with complete details (VIN, make, model, year)
- Track purchase and sale prices
- Mark vehicles as sold with automatic profit calculation
- Organize by location
- View vehicle-specific service history
- Add comments and notes to vehicles
- Customer photos and descriptions
- Publish to website and third-party listing sites

### 🔧 Service Tracking

- Record all maintenance and repairs per vehicle
- Track service costs
- Detailed service history
- Automatic cost aggregation for P&L

### 💰 Financial Analytics

- **Total Revenue**: Sum of all vehicle sales
- **Total Costs**: Purchase prices + service costs
- **Net Profit**: Revenue minus all costs
- **Profit Margin**: Percentage profitability
- **Average Profit per Vehicle**: Performance metrics
- **Inventory Count**: Current stock levels
- **Vehicles Sold**: Sales volume tracking

### 🔗 System Integrations

- **Wayne Reeves DMS**: Bidirectional inventory sync
- **QuickBooks Online**: Automatic accounting sync (sales & expenses)
- **CarGurus**: Publish listings automatically
- **TrueCar**: Automated inventory distribution
- **Kelley Blue Book**: KBB Instant Cash Offer integration
- **Public API**: Embed inventory on your website

### 👥 Collaboration

- Real-time updates via WebSockets
- Multi-user support with user identification
- Comment threads on tasks and vehicles
- Shared visibility for owner and employees

### 📱 PWA Features

- Works offline with Service Worker caching
- Install to home screen on mobile devices
- Responsive design for all screen sizes
- Apple Human Interface Guidelines compliant

### 🌐 Customer-Facing Features

- Public inventory website (`/inventory.html`)
- REST API for website integration
- Beautiful vehicle detail pages
- Mobile-optimized browsing experience
- Direct contact and test drive scheduling

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Backend**: Cloudflare Workers with Hono
- **Real-time**: Cloudflare Agents with WebSocket support
- **Database**: Agent SQLite (embedded in Durable Objects)
- **Deployment**: Cloudflare Workers platform

## Setup Instructions

### Prerequisites

- Node.js 18 or later
- npm or yarn
- Cloudflare account (free tier works)

### Installation

1. **Install dependencies**:

```bash
npm install
```

1. **Create KV Namespaces**:

```bash
# Create production KV namespaces
npx wrangler kv:namespace create "INTEGRATIONS_KV"
npx wrangler kv:namespace create "AUTH_KV"

# Create preview KV namespaces
npx wrangler kv:namespace create "INTEGRATIONS_KV" --preview
npx wrangler kv:namespace create "AUTH_KV" --preview

# Update the IDs in wrangler.jsonc with the output from above commands
```

1. **Login to Cloudflare**:

```bash
npx wrangler login
```

1. **Deploy the application**:

```bash
npm run deploy
```

1. **Access your app**:
   Your app will be available at `https://carlot-manager.<your-subdomain>.workers.dev`

### Local Development

Run the development server:

```bash
npm run dev
```

Access locally at `http://localhost:8787`

## Integration Setup

CarLot Manager integrates with popular dealer management and accounting systems. See **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** for detailed setup instructions.

### Quick Integration Overview

**Wayne Reeves DMS**

```bash
npx wrangler secret put WAYNE_REEVES_API_KEY
```

**QuickBooks Online**

```bash
npx wrangler secret put QUICKBOOKS_CLIENT_ID
npx wrangler secret put QUICKBOOKS_CLIENT_SECRET
```

**Third-Party Listing Sites**

- Configure CarGurus, TrueCar, and KBB in `wrangler.jsonc`
- Publish vehicles directly from the UI

**Public Inventory Website**

- Access at: `https://your-worker.workers.dev/inventory.html`
- Embed on your website with iframe or API
- Mobile-responsive and SEO-friendly

For complete setup instructions, troubleshooting, and API documentation, see [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md).

## Usage Guide

### First Time Setup

1. **Set Your Name**: When you first access the app, you’ll be prompted to enter your name. This is stored in localStorage and used to identify your actions.
1. **Choose a Tab**: Navigate between Tasks, Inventory, and Analytics using the top navigation.

### Managing Tasks

1. Click **”+ New Task”** button
1. Enter task details:
- Title (required)
- Description
- Assignee name
- Due date
1. Update status by selecting from dropdown:
- Pending (gray)
- In Progress (orange)
- Completed (green)
1. Add comments for collaboration

### Managing Inventory

1. Click **”+ Add Vehicle”** button
1. Enter vehicle information:
- VIN number (required)
- Make, Model, Year
- Purchase price
- Location on lot
1. Click on any vehicle to view details
1. In detail view:
- Add service records
- Add comments/notes
- Mark as sold (when applicable)

### Recording a Sale

1. Find the vehicle in inventory
1. Click **“Mark as Sold”** button
1. Enter the sale price
1. Vehicle status updates automatically
1. Analytics refresh with new profit data

### Adding Service Records

1. Select a vehicle from inventory
1. Click **”+ Add Service”** in the detail panel
1. Enter:
- Service type (e.g., “Oil Change”, “Brake Repair”)
- Description
- Cost
- Service date
1. Record saves and costs roll into P&L

### Viewing Analytics

1. Click **“Analytics”** tab
1. View real-time metrics:
- Financial performance
- Inventory status
- Sales volume
1. Click **“🔄 Refresh Analytics”** to update

## Real-time Collaboration

The app uses WebSocket connections through Cloudflare Agents:

- **Automatic Updates**: When any user makes a change, all connected users see it immediately
- **Comments Sync**: Comments appear in real-time across all sessions
- **Status Changes**: Task and vehicle status updates broadcast instantly
- **No Refresh Needed**: Changes appear without page reloads

## Data Persistence

All data is stored in the Agent’s embedded SQLite database:

- **Tasks**: Stored with full history and comments
- **Vehicles**: Complete inventory with service records
- **Services**: Linked to specific vehicles
- **Comments**: Threaded discussions on tasks and vehicles

Data persists across sessions and survives Worker restarts.

## Mobile & PWA Usage

### Installing on iOS (iPhone/iPad)

1. Open the app in Safari
1. Tap the Share button
1. Scroll down and tap “Add to Home Screen”
1. Tap “Add” to confirm
1. App appears on home screen like a native app

### Installing on Android

1. Open the app in Chrome
1. Tap the menu (three dots)
1. Tap “Add to Home Screen” or “Install App”
1. Tap “Add” to confirm

### Offline Mode

The app caches essential resources:

- Works when internet is temporarily unavailable
- Syncs changes when connection returns
- Service Worker handles caching automatically

## API Endpoints

The Worker exposes these internal API endpoints (handled by the Agent):

- `GET /api/tasks` - Retrieve all tasks
- `GET /api/vehicles` - Retrieve all vehicles
- `GET /api/services?vehicleId={id}` - Get services for a vehicle
- `POST /api/services` - Add a new service record
- `GET /api/comments?entityType={type}&entityId={id}` - Get comments
- `GET /api/analytics` - Calculate financial metrics

## Security Notes

- No authentication is built-in (add Cloudflare Access if needed)
- All users can view and edit all data
- User names are self-reported (stored in browser)
- For production, implement proper auth and RBAC

## Customization

### Adding New Fields

Edit the Agent SQL schema in `src/index.ts`:

```typescript
await this.sql`
  ALTER TABLE vehicles ADD COLUMN mileage INTEGER
`;
```

### Changing Colors

Update the inline styles in `public/app.tsx`:

- Blue: `#007AFF` (Apple iOS blue)
- Green: `#34C759` (Success/sold)
- Red: `#FF3B30` (Costs)
- Orange: `#FF9500` (In progress)

### Adding Features

1. Add new SQL tables in the Agent’s `handleX` methods
1. Add UI in `public/app.tsx`
1. Add WebSocket message handlers for real-time sync

## Troubleshooting

**Service Worker not registering?**

- Check browser console for errors
- Ensure HTTPS (required for Service Workers)
- Clear browser cache and reload

**Data not syncing?**

- Check WebSocket connection in Network tab
- Ensure Agent binding is correct in wrangler.jsonc
- Check browser console for connection errors

**Analytics showing zero?**

- Add some vehicles and mark them as sold
- Service costs must be added to show in totals
- Click refresh analytics button

## Support

For issues or questions:

- Check Cloudflare Workers documentation: https://developers.cloudflare.com/workers
- Review Agents documentation: https://developers.cloudflare.com/agents
- Check browser console for error messages

## License

MIT - Feel free to modify and use for your business needs.
