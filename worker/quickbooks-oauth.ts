// src/quickbooks-oauth.ts
/**
 * QuickBooks OAuth 2.0 Flow Handler
 *
 * This module handles the OAuth flow for QuickBooks Online integration.
 * It manages authorization, token exchange, and token refresh.
 */

interface Env {
  QUICKBOOKS_CLIENT_ID: string;
  QUICKBOOKS_CLIENT_SECRET: string;
  INTEGRATIONS_KV: KVNamespace;
}

const QUICKBOOKS_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const QUICKBOOKS_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

/**
 * Initiates the QuickBooks OAuth flow
 */
export async function handleQuickBooksAuthorize(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const redirectUri = `${baseUrl}/api/integrations/quickbooks/callback`;

  const state = crypto.randomUUID();
  await env.INTEGRATIONS_KV.put(`qb_oauth_state:${state}`, 'pending', { expirationTtl: 600 });

  const authUrl = new URL(QUICKBOOKS_AUTH_URL);
  authUrl.searchParams.set('client_id', env.QUICKBOOKS_CLIENT_ID);
  authUrl.searchParams.set('scope', 'com.intuit.quickbooks.accounting');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  return Response.redirect(authUrl.toString(), 302);
}

/**
 * Handles the OAuth callback from QuickBooks
 */
export async function handleQuickBooksCallback(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const realmId = url.searchParams.get('realmId');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(`QuickBooks authorization failed: ${error}`, { status: 400 });
  }

  if (!code || !state || !realmId) {
    return new Response('Missing required parameters', { status: 400 });
  }

  // Verify state to prevent CSRF
  const storedState = await env.INTEGRATIONS_KV.get(`qb_oauth_state:${state}`);
  if (!storedState) {
    return new Response('Invalid state parameter', { status: 400 });
  }

  // Exchange authorization code for tokens
  const baseUrl = `${url.protocol}//${url.host}`;
  const redirectUri = `${baseUrl}/api/integrations/quickbooks/callback`;

  const tokenResponse = await fetch(QUICKBOOKS_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${env.QUICKBOOKS_CLIENT_ID}:${env.QUICKBOOKS_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    console.error('Token exchange failed:', errText);
    return new Response(`Token exchange failed: ${errText}`, { status: 400 });
  }

  const tokens = await tokenResponse.json<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>();

  // Store tokens in KV
  await env.INTEGRATIONS_KV.put('quickbooks_access_token', tokens.access_token, {
    expirationTtl: tokens.expires_in,
  });
  await env.INTEGRATIONS_KV.put('quickbooks_refresh_token', tokens.refresh_token);
  await env.INTEGRATIONS_KV.put('quickbooks_realm_id', realmId);
  await env.INTEGRATIONS_KV.put('quickbooks_connected_at', new Date().toISOString());

  // Clean up state
  await env.INTEGRATIONS_KV.delete(`qb_oauth_state:${state}`);

  return new Response(
    `<!DOCTYPE html> <html> <head> <title>QuickBooks Connected</title> <style> body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f7; } .container { background: white; padding: 40px; border-radius: 16px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); } h1 { color: #2ca01c; margin-bottom: 20px; } p { color: #666; margin-bottom: 30px; } button { padding: 12px 24px; background: #007AFF; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; } </style> </head> <body> <div class="container"> <h1>✅ QuickBooks Connected!</h1> <p>Your QuickBooks account is now connected to CarLot Manager.</p> <p>Sales and expenses will automatically sync.</p> <button onclick="window.close()">Close Window</button> </div> <script> setTimeout(() => { if (window.opener) { window.opener.postMessage({ type: 'quickbooks_connected' }, '*'); window.close(); } }, 2000); </script> </body> </html>`,
    {
      headers: { 'Content-Type': 'text/html' },
    },
  );
}

/**
 * Refresh QuickBooks access token
 */
export async function refreshQuickBooksToken(env: Env): Promise<boolean> {
  const refreshToken = await env.INTEGRATIONS_KV.get('quickbooks_refresh_token');

  if (!refreshToken) {
    console.error('No refresh token available');
    return false;
  }

  try {
    const response = await fetch(QUICKBOOKS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${env.QUICKBOOKS_CLIENT_ID}:${env.QUICKBOOKS_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', await response.text());
      return false;
    }

    const tokens = await response.json<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }>();

    await env.INTEGRATIONS_KV.put('quickbooks_access_token', tokens.access_token, {
      expirationTtl: tokens.expires_in,
    });
    await env.INTEGRATIONS_KV.put('quickbooks_refresh_token', tokens.refresh_token);

    return true;
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}

/**
 * Disconnect QuickBooks integration
 */
export async function handleQuickBooksDisconnect(env: Env): Promise<Response> {
  await env.INTEGRATIONS_KV.delete('quickbooks_access_token');
  await env.INTEGRATIONS_KV.delete('quickbooks_refresh_token');
  await env.INTEGRATIONS_KV.delete('quickbooks_realm_id');
  await env.INTEGRATIONS_KV.delete('quickbooks_connected_at');

  return Response.json({ success: true, message: 'QuickBooks disconnected' });
}
