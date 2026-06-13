// ============================================================
// FOCUS TO-DO - WebhookSettings
// Tab Webhook & Integration Settings
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/core/contexts/AppContext';
import { useWebhookContext } from '@/core/contexts/WebhookContext';
import type useWebhook from '@/shared/hooks/useWebhook';
import Toggle from '@/shared/components/Toggle';
import ApiSchemaDoc from '@/features/settings/components/ApiSchemaDoc';

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
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  cursor: 'pointer',
  marginTop: 10,
  transition: 'background var(--transition-fast)',
};

const btnDangerStyle: React.CSSProperties = {
  ...btnStyle,
  marginTop: 0,
  padding: '4px 10px',
  color: '#f25f5c',
  borderColor: 'rgba(242,95,92,0.3)',
};

// ----------------------------------------------------------
// Types
// ----------------------------------------------------------
type TestResult = { status: 'success'; code: number } | { status: 'error'; message: string } | null;

interface Subscriber {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  secret?: string;
  created_at: string;
  last_triggered_at?: string;
}

interface ApiKeyRecord {
  id: string;
  key_prefix: string;
  label: string;
  scopes: string[];
  created_at: string;
  last_used_at?: string;
  revoked: boolean;
}

const ALL_EVENTS = ['task.created', 'task.updated', 'task.deleted', 'task.completed', 'pomodoro.completed'];

// ----------------------------------------------------------
// Event Log
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
        <button type="button" style={{ ...btnStyle, padding: '4px 10px', fontSize: 'var(--text-sm)' }} onClick={onClear}>
          Clear Log
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-card)' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--divider)' }}>Thoi gian</th>
              <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--divider)' }}>Event</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--divider)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>Chua co event nao.</td></tr>
            ) : (
              displayed.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td style={{ padding: '5px 8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(ev.timestamp).toLocaleTimeString('vi-VN')}</td>
                  <td style={{ padding: '5px 8px', color: 'var(--text-primary)' }}>{ev.eventType}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                      fontSize: 'var(--text-xs)', fontWeight: 600,
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
// Webhook Subscribers section
// ----------------------------------------------------------
const WebhookSubscribersSection: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', events: ALL_EVENTS.slice(0, 4), secret: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('focus-token') || sessionStorage.getItem('focus-token') || '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/webhooks/subscribers', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setSubscribers(json.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (sub: Subscriber) => {
    await fetch(`/api/webhooks/subscribers/${sub.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ enabled: !sub.enabled }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xoa subscriber nay?')) return;
    await fetch(`/api/webhooks/subscribers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  const handleAdd = async () => {
    setError('');
    if (!form.name.trim() || !form.url.trim()) { setError('Ten va URL la bat buoc.'); return; }
    if (form.events.length === 0) { setError('Chon it nhat 1 event.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/webhooks/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: form.name, url: form.url, events: form.events, secret: form.secret || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Loi them subscriber.'); return; }
      setForm({ name: '', url: '', events: ALL_EVENTS.slice(0, 4), secret: '' });
      setAddOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Loi ket noi.');
    } finally {
      setSaving(false);
    }
  };

  const toggleEvent = (ev: string) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
    }));
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          {loading ? 'Dang tai...' : `${subscribers.length} subscriber`}
        </span>
        <button type="button" style={{ ...btnStyle, marginTop: 0, padding: '5px 12px' }} onClick={() => { setAddOpen(v => !v); setError(''); }}>
          {addOpen ? 'Huy' : '+ Them'}
        </button>
      </div>

      {addOpen && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 12 }}>
          <label style={labelStyle}>Ten subscriber</label>
          <input style={inputStyle} placeholder="Slack, n8n, Zapier..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <label style={labelStyle}>URL (HTTPS)</label>
          <input style={inputStyle} type="url" placeholder="https://hooks.example.com/..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
          <label style={labelStyle}>Events nhan</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {ALL_EVENTS.map(ev => (
              <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-sm)', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} />
                {ev}
              </label>
            ))}
          </div>
          <label style={labelStyle}>Secret HMAC (tuy chon)</label>
          <input style={inputStyle} type="password" placeholder="De trong neu khong can ky payload" value={form.secret} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))} />
          {error && <div style={{ color: '#f25f5c', fontSize: 'var(--text-sm)', marginTop: 8 }}>{error}</div>}
          <button type="button" style={{ ...btnStyle, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)', marginTop: 12 }} disabled={saving} onClick={handleAdd}>
            {saving ? 'Dang luu...' : 'Luu subscriber'}
          </button>
        </div>
      )}

      {subscribers.length === 0 && !loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: '8px 0' }}>Chua co subscriber nao.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {subscribers.map(sub => (
            <div key={sub.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Toggle checked={sub.enabled} onChange={() => handleToggle(sub)} label="" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{sub.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sub.url.length > 50 ? sub.url.slice(0, 50) + '...' : sub.url}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                  {(sub.events || []).join(', ')}
                  {sub.last_triggered_at && <span style={{ marginLeft: 8 }}>· last push: {new Date(sub.last_triggered_at).toLocaleString('vi-VN')}</span>}
                </div>
              </div>
              <button type="button" style={btnDangerStyle} onClick={() => handleDelete(sub.id)}>Xoa</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------
// API Keys section
// ----------------------------------------------------------
const ApiKeysSection: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState('');

  const token = localStorage.getItem('focus-token') || sessionStorage.getItem('focus-token') || '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/keys', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const json = await res.json(); setKeys(json.data || []); }
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    setNewKey('');
    try {
      const res = await fetch('/api/auth/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label: label.trim() || 'External API Key', scopes: ['tasks'] }),
      });
      const json = await res.json();
      if (res.ok) {
        setNewKey(json.key);
        setLabel('');
        setAddOpen(false);
        load();
      }
    } finally { setSaving(false); }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Thu hoi key nay?')) return;
    await fetch(`/api/auth/keys/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setNewKey('');
    load();
  };

  return (
    <div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 8 }}>
        API Key cho phep he thong ngoai goi <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 3 }}>/api/external/v1/tasks</code> voi header <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 3 }}>X-API-Key</code>.
      </div>

      {newKey && (
        <div style={{ background: 'rgba(6,214,160,0.1)', border: '1px solid rgba(6,214,160,0.3)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 'var(--text-xs)', color: '#06d6a0', fontWeight: 700, marginBottom: 4 }}>Key moi (chi hien thi 1 lan, sao chep ngay):</div>
          <code style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{newKey}</code>
          <button type="button" style={{ ...btnStyle, marginTop: 8, padding: '4px 10px', fontSize: 'var(--text-xs)' }}
            onClick={() => { navigator.clipboard.writeText(newKey); }}>
            Copy
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          {loading ? 'Dang tai...' : `${keys.filter(k => !k.revoked).length} key hieu luc`}
        </span>
        <button type="button" style={{ ...btnStyle, marginTop: 0, padding: '5px 12px' }} onClick={() => setAddOpen(v => !v)}>
          {addOpen ? 'Huy' : '+ Tao key'}
        </button>
      </div>

      {addOpen && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 12 }}>
          <label style={labelStyle}>Nhan key (de nho)</label>
          <input style={inputStyle} placeholder="Vi du: n8n integration" value={label} onChange={e => setLabel(e.target.value)} />
          <button type="button" style={{ ...btnStyle, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)', marginTop: 12 }} disabled={saving} onClick={handleCreate}>
            {saving ? 'Dang tao...' : 'Tao API Key'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {keys.map(k => (
          <div key={k.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, opacity: k.revoked ? 0.4 : 1 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{k.key_prefix}…</code>
                {k.label && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{k.label}</span>}
                {k.revoked && <span style={{ fontSize: 'var(--text-xs)', color: '#f25f5c', background: 'rgba(242,95,92,0.1)', padding: '1px 6px', borderRadius: 3 }}>Da thu hoi</span>}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                Tao: {new Date(k.created_at).toLocaleDateString('vi-VN')}
                {k.last_used_at && <span style={{ marginLeft: 8 }}>· Dung lan cuoi: {new Date(k.last_used_at).toLocaleDateString('vi-VN')}</span>}
                <span style={{ marginLeft: 8 }}>· scope: {(k.scopes || []).join(', ')}</span>
              </div>
            </div>
            {!k.revoked && (
              <button type="button" style={btnDangerStyle} onClick={() => handleRevoke(k.id)}>Thu hoi</button>
            )}
          </div>
        ))}
        {keys.length === 0 && !loading && (
          <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: '8px 0' }}>Chua co API key nao.</div>
        )}
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

  const handleTestConnection = async () => {
    if (!settings.webhookUrl) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: settings.webhookUrl, payload: { event: 'test', timestamp: new Date().toISOString() } }),
      });
      const data = await res.json();
      if (res.ok) setTestResult({ status: 'success', code: data.code });
      else setTestResult({ status: 'error', message: data.message || 'Unknown error' });
    } catch (err) {
      setTestResult({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      {/* Section Webhook (legacy single URL) */}
      <div style={sectionTitleStyle}>Webhook (Single URL)</div>

      <Toggle checked={settings.webhookEnabled} onChange={(v) => updateSettings({ webhookEnabled: v })} label="Bat Webhook" />

      <label style={labelStyle}>URL Webhook</label>
      <input type="url" style={inputStyle} placeholder="https://hooks.example.com/..."
        value={settings.webhookUrl} onChange={(e) => updateSettings({ webhookUrl: e.target.value })} disabled={!settings.webhookEnabled} />

      <button type="button"
        style={{ ...btnStyle, opacity: (!settings.webhookEnabled || !settings.webhookUrl || testing) ? 0.5 : 1 }}
        onClick={handleTestConnection} disabled={!settings.webhookEnabled || !settings.webhookUrl || testing}>
        {testing ? 'Dang kiem tra...' : 'Test Connection'}
      </button>

      {testResult && (
        <div style={{
          marginTop: 8, padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)',
          background: testResult.status === 'success' ? 'rgba(6,214,160,0.12)' : 'rgba(242,95,92,0.12)',
          color: testResult.status === 'success' ? '#06d6a0' : '#f25f5c',
        }}>
          {testResult.status === 'success' ? `Status ${testResult.code} OK - Ket noi thanh cong` : `Loi: ${testResult.message}`}
        </div>
      )}

      <div style={dividerStyle} />

      {/* Section Webhook Subscribers */}
      <div style={sectionTitleStyle}>Webhook Subscribers</div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 10 }}>
        Dang ky nhieu URL nhan push khi co task event. Ho tro HMAC signing. Schema: <code style={{ background: 'var(--bg-card)', padding: '1px 4px', borderRadius: 3 }}>{`{ event, timestamp, data }`}</code>
      </div>
      <WebhookSubscribersSection />

      <div style={dividerStyle} />

      {/* Section External API Keys */}
      <div style={sectionTitleStyle}>API Keys (External Access)</div>
      <ApiKeysSection />

      <div style={dividerStyle} />

      {/* Section External API URL (legacy) */}
      <div style={sectionTitleStyle}>External API (Legacy)</div>

      <Toggle checked={settings.externalApiEnabled} onChange={(v) => updateSettings({ externalApiEnabled: v })} label="Bat External API" />
      <label style={labelStyle}>URL API</label>
      <input type="url" style={inputStyle} placeholder="https://api.example.com/..."
        value={settings.externalApiUrl} onChange={(e) => updateSettings({ externalApiUrl: e.target.value })} disabled={!settings.externalApiEnabled} />

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
