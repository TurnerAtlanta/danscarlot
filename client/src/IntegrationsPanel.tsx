import React, { useState, useEffect } from 'react';

interface IntegrationStatus {
  wayneReeves: {
    configured: boolean;
    lastSync?: string;
    status: string;
  };
  quickbooks: {
    configured: boolean;
    authenticated: boolean;
    lastSync?: string;
    status: string;
  };
  listings: {
    carGurus: { configured: boolean };
    trueCar: { configured: boolean };
    kbb: { configured: boolean };
    totalPublished: number;
  };
}

export function IntegrationsPanel() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/integrations/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error loading integration status:', error);
    }
  };

  const syncWayneReeves = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/integrations/wayne-reeves/sync', {
        method: 'POST'
      });
      const result = await response.json();
      alert(`Synced ${result.synced} vehicles from Wayne Reeves`);
      loadStatus();
    } catch (error: any) {
      alert('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const syncQuickBooks = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/integrations/quickbooks/sync', {
        method: 'POST'
      });
      const result = await response.json();
      alert(`Synced ${result.synced} transactions to QuickBooks`);
      loadStatus();
    } catch (error: any) {
      alert('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const connectQuickBooks = () => {
    const width = 600;
    const height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    const popup = window.open(
      '/api/integrations/quickbooks/authorize',
      'QuickBooks Authorization',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    window.addEventListener('message', (event) => {
      if (event.data.type === 'quickbooks_connected') {
        popup?.close();
        loadStatus();
        alert('QuickBooks connected successfully!');
      }
    });
  };

  const disconnectQuickBooks = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks?')) return;

    try {
      await fetch('/api/integrations/quickbooks/disconnect', { method: 'POST' });
      alert('QuickBooks disconnected');
      loadStatus();
    } catch (error: any) {
      alert('Disconnect failed: ' + error.message);
    }
  };

  if (!status) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading integrations...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '30px' }}>
        System Integrations
      </h2>

      <div style={{
        background: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              Wayne Reeves DMS
            </h3>
            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
              Dealer management system integration for inventory sync
            </p>
          </div>
          <span style={{
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
            background: status.wayneReeves.status === 'connected' ? '#34C759' : '#8E8E93',
            color: 'white'
          }}>
            {status.wayneReeves.configured ? status.wayneReeves.status : 'not configured'}
          </span>
        </div>

        {status.wayneReeves.lastSync && (
          <p style={{ fontSize: '13px', color: '#999', marginBottom: '15px' }}>
            Last sync: {new Date(status.wayneReeves.lastSync).toLocaleString()}
          </p>
        )}

        <button
          onClick={syncWayneReeves}
          disabled={!status.wayneReeves.configured || syncing}
          style={{
            padding: '10px 20px',
            background: status.wayneReeves.configured ? '#007AFF' : '#d2d2d7',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: status.wayneReeves.configured ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>

        {!status.wayneReeves.configured && (
          <p style={{ marginTop: '15px', fontSize: '13px', color: '#666' }}>
            Configure Wayne Reeves credentials in environment variables
          </p>
        )}
      </div>

      <div style={{
        background: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              QuickBooks Online
            </h3>
            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
              Accounting integration for sales invoices and expense tracking
            </p>
          </div>
          <span style={{
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
            background: status.quickbooks.authenticated ? '#34C759' : '#8E8E93',
            color: 'white'
          }}>
            {status.quickbooks.authenticated ? 'connected' : 'not connected'}
          </span>
        </div>

        {status.quickbooks.lastSync && (
          <p style={{ fontSize: '13px', color: '#999', marginBottom: '15px' }}>
            Last sync: {new Date(status.quickbooks.lastSync).toLocaleString()}
          </p>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          {!status.quickbooks.authenticated ? (
            <button
              onClick={connectQuickBooks}
              disabled={!status.quickbooks.configured}
              style={{
                padding: '10px 20px',
                background: status.quickbooks.configured ? '#007AFF' : '#d2d2d7',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: status.quickbooks.configured ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Connect QuickBooks
            </button>
          ) : (
            <>
              <button
                onClick={syncQuickBooks}
                disabled={syncing}
                style={{
                  padding: '10px 20px',
                  background: '#007AFF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={disconnectQuickBooks}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: '#FF3B30',
                  border: '1px solid #FF3B30',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Disconnect
              </button>
            </>
          )}
        </div>

        {!status.quickbooks.configured && (
          <p style={{ marginTop: '15px', fontSize: '13px', color: '#666' }}>
            Configure QuickBooks credentials in environment variables
          </p>
        )}
      </div>

      <div style={{
        background: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>
          Third-Party Listing Sites
        </h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          Publish inventory to popular automotive marketplaces
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div style={{ padding: '15px', background: '#f5f5f7', borderRadius: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '5px' }}>
              CarGurus
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: status.listings.carGurus.configured ? '#34C759' : '#8E8E93' }}>
              {status.listings.carGurus.configured ? 'Configured' : 'Not configured'}
            </div>
          </div>

          <div style={{ padding: '15px', background: '#f5f5f7', borderRadius: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '5px' }}>
              TrueCar
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: status.listings.trueCar.configured ? '#34C759' : '#8E8E93' }}>
              {status.listings.trueCar.configured ? 'Configured' : 'Not configured'}
            </div>
          </div>

          <div style={{ padding: '15px', background: '#f5f5f7', borderRadius: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '5px' }}>
              Kelley Blue Book
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: status.listings.kbb.configured ? '#34C759' : '#8E8E93' }}>
              {status.listings.kbb.configured ? 'Configured' : 'Not configured'}
            </div>
          </div>
        </div>

        <div style={{ padding: '15px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '5px' }}>
            Currently Published
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#007AFF' }}>
            {status.listings.totalPublished} vehicles
          </div>
        </div>

        <p style={{ marginTop: '15px', fontSize: '13px', color: '#666' }}>
          To publish a vehicle, go to Inventory, select vehicle, and enable "Publish to Third Party"
        </p>
      </div>

      <div style={{
        background: 'white',
        border: '1px solid #e5e5e5',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
          Public Inventory Website
        </h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
          Customer-facing inventory page for your website
        </p>

        <a
          href="/inventory.html"
          target="_blank"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#007AFF',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          View Public Inventory Page
        </a>

        <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f7', borderRadius: '8px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>Embed on your website:</p>
          <code style={{
            display: 'block',
            padding: '10px',
            background: 'white',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            overflowX: 'auto'
          }}>
            {`<iframe src="${window.location.origin}/inventory.html" width="100%" height="800px"></iframe>`}
          </code>
        </div>
      </div>
    </div>
  );
}
 
