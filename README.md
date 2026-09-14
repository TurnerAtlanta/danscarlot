# Dan's Car Lot

A small single-page app for managing a used car lot's inventory, deployed as a single
Cloudflare Worker (serves the React SPA and the `/api/*` REST API from one origin).

## Tech stack

- **Frontend**: React 18 + TypeScript + Vite, React Router, TanStack Query, Tailwind CSS
- **Backend**: Cloudflare Worker (`worker/index.ts`) with a Durable Object (`CarStore`) for storage
- **Deployment**: Single Cloudflare Worker with static assets binding

## Local development

```bash
npm install
npm run dev          # Vite dev server for the frontend (http://localhost:5173)
npm run worker:dev    # Wrangler dev server for the Worker + API (http://localhost:8787)
```

## Build & deploy

```bash
npm run build   # tsc typecheck + vite build -> dist/
npm run deploy  # build, then wrangler deploy
```

Deployment requires Cloudflare credentials available in the shell, e.g. `npx wrangler login`,
or `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` set as environment variables (never commit
these values to the repo).

## API

All endpoints are same-origin under `/api`:

- `GET /api/cars` - list cars
- `POST /api/cars` - create a car
- `PUT /api/cars/:id` - update a car
- `DELETE /api/cars/:id` - delete a car

## Configuration

`wrangler.toml` defines the Worker name, the Durable Object binding, the static assets binding,
and the custom domain route. Update `zone_id` and the route pattern for your own Cloudflare zone
before deploying to a custom domain.
