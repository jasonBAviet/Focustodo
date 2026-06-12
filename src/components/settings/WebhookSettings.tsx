// ============================================================
// FOCUS TO-DO - WebhookSettings
// Tab Webhook & Integration Settings
// ============================================================
import React, { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useWebhookContext } from '../../contexts/WebhookContext';
import type useWebhook from '../../hooks/useWebhook';
import Toggle from '../common/Toggle';
import ApiSchemaDoc from './ApiSchemaDoc';

// ----------------------------------------------------------
// Styles
// ----------------------------------------------------------
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 12,
  marginTop: 20,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--text-sm)',
  color: 'var(--text-secondary)',
  marginBottom: 6,
  marginTop: 12,
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'var(--divider)',
  margin: '16px 0',
};

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  cursor: 'pointer',
  marginTop: 10,
  transition: 'background var(--transition-fast)',
};

// ----------------------------------------------------------
// Kieu du lieu ket qua test
// ----------------------------------------------------------
type TestResult = { status: 'success'; code: number } | { status: 'error'; message: string } | null;

// ----------------------------------------------------------
// Bang event log
// ----------------------------------------------------------
const EventLogTable: React.FC<{
  events: ReturnType<typeof useWebhook>['webhookEvents'];
  onClear: () => void;
}> = ({ events, onClear }) => {
  const displayed = events.slice(0, 20);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          {events.length} su kien (hien thi 20 gan nhat)
        </span>
        <button type="button" style={{ ...btnStyle, padding: '4px 10px', fontSize: 12 }} onClick={onClear}>
          Clear Log
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-card)' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--divider)' }}>Thoi gian</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--divider)' }}>Event</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--divider)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Chua co event nao.
                </td>
              </tr>
            ) : (
              displayed.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td style={{ padding: '5px 8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {new Date(ev.timestamp).toLocaleTimeString('vi-VN')}
                  </td>
                  <td style={{ padding: '5px 8px', color: 'var(--text-primary)' }}>
                    {ev.eventType}
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      background: ev.status === 'success' ? 'rgba(6,214,160,0.15)' : 'rgba(242,95,92,0.15)',
                      color: ev.status === 'success' ? '#06d6a0' : '#f25f5c',
                    }}>
                      {ev.status === 'success' ? (ev.statusCode ? `${ev.statusCode} OK` : 'OK') : 'Error'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ----------------------------------------------------------
// Component chinh
// ----------------------------------------------------------
const WebhookSettings: React.FC = () => {
  const { settings, updateSettings } = useAppContext();
  const { webhookEvents, clearEvents } = useWebhookContext();

  const [testResult, setTestResult] = useState<TestResult>(null);
  const [testing, setTesting] = useState(false);

  // Test connection via backend proxy
  const handleTestConnection = async () => {
    if (!settings.webhookUrl) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: settings.webhookUrl,
          payload: { event: 'test', timestamp: new Date().toISOString() },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ status: 'success', code: data.code });
      } else {
        setTestResult({ status: 'error', message: data.message || 'Unknown error' });
      }
    } catch (err) {
      setTestResult({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      {/* Section Webhook */}
      <div style={sectionTitleStyle}>Webhook</div>

      <Toggle
        checked={settings.webhookEnabled}
        onChange={(v) => updateSettings({ webhookEnabled: v })}
        label="Bat Webhook"
      />

      <label style={labelStyle}>URL Webhook</label>
      <input
        type="url"
        style={inputStyle}
        placeholder="https://hooks.example.com/..."
        value={settings.webhookUrl}
        onChange={(e) => updateSettings({ webhookUrl: e.target.value })}
        disabled={!settings.webhookEnabled}
      />

      <button
        type="button"
        style={{ ...btnStyle, opacity: (!settings.webhookEnabled || !settings.webhookUrl || testing) ? 0.5 : 1 }}
        onClick={handleTestConnection}
        disabled={!settings.webhookEnabled || !settings.webhookUrl || testing}
      >
        {testing ? 'Dang kiem tra...' : 'Test Connection'}
      </button>

      {testResult && (
        <div style={{
          marginTop: 8,
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-sm)',
          background: testResult.status === 'success' ? 'rgba(6,214,160,0.12)' : 'rgba(242,95,92,0.12)',
          color: testResult.status === 'success' ? '#06d6a0' : '#f25f5c',
        }}>
          {testResult.status === 'success'
            ? `Status ${testResult.code} OK - Ket noi thanh cong`
            : `Loi: ${testResult.message}`}
        </div>
      )}

      <div style={dividerStyle} />

      {/* Section External API */}
      <div style={sectionTitleStyle}>External API</div>

      <Toggle
        checked={settings.externalApiEnabled}
        onChange={(v) => updateSettings({ externalApiEnabled: v })}
        label="Bat External API"
      />

      <label style={labelStyle}>URL API</label>
      <input
        type="url"
        style={inputStyle}
        placeholder="https://api.example.com/..."
        value={settings.externalApiUrl}
        onChange={(e) => updateSettings({ externalApiUrl: e.target.value })}
        disabled={!settings.externalApiEnabled}
      />

      <div style={dividerStyle} />

      {/* Section API Schema */}
      <ApiSchemaDoc />

      <div style={dividerStyle} />

      {/* Section Event Log */}
      <div style={sectionTitleStyle}>Webhook Event Log</div>
      <EventLogTable events={webhookEvents} onClear={clearEvents} />
    </div>
  );
};

export default WebhookSettings;
