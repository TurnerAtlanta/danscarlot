#!/bin/sh
# Deploys the app: builds the frontend, then deploys the Worker (static assets + API).
# Requires: `wrangler login` beforehand, or CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID
# set as environment variables (e.g. injected by your CI secrets store).
# Never hardcode credentials in this file or commit them to git.
set -e

npm run build
npx wrangler deploy

