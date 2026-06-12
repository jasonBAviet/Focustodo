// ============================================================
// FOCUS TO-DO - ApiSchemaDoc
// Component hien thi URL API va Schema huong dan ket noi tu ngoai
// ============================================================
import React, { useState } from 'react';

// ----------------------------------------------------------
// Styles
// ----------------------------------------------------------
const containerStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '16px 20px',
  marginTop: 16,
};

const titleStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const codeBlockStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.22)',
  padding: 12,
  borderRadius: 'var(--radius-md)',
  fontFamily: 'Consolas, Monaco, monospace',
  fontSize: 12,
  color: '#a9b7c6',
  overflowX: 'auto',
  margin: '8px 0',
  position: 'relative',
  border: '1px solid rgba(255, 255, 255, 0.05)',
};

const copyBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 8,
  padding: '4px 8px',
  background: 'var(--bg-card-hover)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: 11,
  cursor: 'pointer',
  transition: 'all var(--transition-fast)',
};

const descTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: 12,
  fontSize: 'var(--text-xs)',
};

const descThStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text-muted)',
  fontWeight: 600,
};

const descTdStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid var(--divider)',
  color: 'var(--text-secondary)',
  verticalAlign: 'top',
};

const linkBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--accent)',
  background: 'var(--accent-soft)',
  color: 'var(--accent)',
  fontSize: 'var(--text-sm)',
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: 16,
  textDecoration: 'none',
  transition: 'all var(--transition-fast)',
};

// ----------------------------------------------------------
// Schema Task mau
// ----------------------------------------------------------
const SCHEMA_TEMPLATE = {
  title: 'Lam bao cao phan tich he thong',
  projectId: 'inbox-default_user',
  priority: 'high',
  dueDate: '2026-06-30',
  note: 'Gui cho truong nhom truoc 17:00 chieu',
  tags: ['urgent', 'report'],
  pomodoroEstimate: 3
};

const ApiSchemaDoc: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const getApiUrl = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (backendUrl && backendUrl.startsWith('http')) {
      return `${backendUrl}/api/tasks`;
    }
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/tasks`;
    }
    return '/api/tasks';
  };

  const apiUrl = getApiUrl();

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(SCHEMA_TEMPLATE, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>
        Tich hop he thong ngoai (Inbound API Integration)
      </div>
      
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '4px 0 12px 0', lineHeight: 1.5 }}>
        Ban co the tu dong tao task trong co so du lieu tu cac nguon ben ngoai thong qua API chinh thuc cua Focus To-Do Hub. 
        Du lieu gui len phai tuan thu dung dinh dang schema ben duoi de tranh gay loi hoac lam hong cau truc he thong.
      </p>

      {/* URL API */}
      <div style={{ margin: '12px 0' }}>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
          POST URL API
        </div>
        <div style={{ 
          background: 'var(--bg-input)', 
          padding: '8px 12px', 
          borderRadius: 'var(--radius-sm)', 
          fontFamily: 'monospace', 
          fontSize: 12, 
          color: 'var(--accent)',
          border: '1px solid var(--border)',
          wordBreak: 'break-all'
        }}>
          {apiUrl}
        </div>
      </div>

      {/* Headers yeu cau */}
      <div style={{ margin: '12px 0' }}>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
          Headers bat buoc
        </div>
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.1)', 
          padding: '8px 12px', 
          borderRadius: 'var(--radius-sm)', 
          fontSize: 12, 
          color: 'var(--text-primary)',
          border: '1px solid var(--divider)'
        }}>
          <div><strong>Content-Type:</strong> application/json</div>
          <div style={{ marginTop: 2 }}><strong>X-API-Key:</strong> &lt;ma_api_key_cua_ban&gt;</div>
        </div>
      </div>

      {/* JSON Schema Block */}
      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', marginTop: 12 }}>
        JSON Payload Mau
      </div>
      <div style={codeBlockStyle}>
        <button type="button" style={copyBtnStyle} onClick={handleCopy}>
          {copied ? 'Da sao chep!' : 'Copy Schema'}
        </button>
        <pre style={{ margin: 0 }}>{JSON.stringify(SCHEMA_TEMPLATE, null, 2)}</pre>
      </div>

      {/* Mo ta chi tiet cac truong */}
      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', marginTop: 16 }}>
        Chi tiet cac truong du lieu
      </div>
      <table style={descTableStyle}>
        <thead>
          <tr>
            <th style={descThStyle}>Truong</th>
            <th style={descThStyle}>Kieu</th>
            <th style={descThStyle}>Bat buoc</th>
            <th style={descThStyle}>Ghi chu</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...descTdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>title</td>
            <td style={descTdStyle}>string</td>
            <td style={{ ...descTdStyle, color: '#f25f5c', fontWeight: 600 }}>Co</td>
            <td style={descTdStyle}>Tieu de cua cong viec. Khong duoc de trong.</td>
          </tr>
          <tr>
            <td style={{ ...descTdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>projectId</td>
            <td style={descTdStyle}>string</td>
            <td style={descTdStyle}>Khong</td>
            <td style={descTdStyle}>ID cua du an muon tao task vao. Neu bo trong se mac dinh vao Inbox.</td>
          </tr>
          <tr>
            <td style={{ ...descTdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>priority</td>
            <td style={descTdStyle}>string</td>
            <td style={descTdStyle}>Khong</td>
            <td style={descTdStyle}>Do uu tien. Cac gia tri cho phep: <code>high</code>, <code>medium</code>, <code>low</code>, <code>none</code>.</td>
          </tr>
          <tr>
            <td style={{ ...descTdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>dueDate</td>
            <td style={descTdStyle}>string</td>
            <td style={descTdStyle}>Khong</td>
            <td style={descTdStyle}>Ngay het han cong viec. Dinh dang: <code>YYYY-MM-DD</code>.</td>
          </tr>
          <tr>
            <td style={{ ...descTdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>note</td>
            <td style={descTdStyle}>string</td>
            <td style={descTdStyle}>Khong</td>
            <td style={descTdStyle}>Noi dung ghi chu hoac mo ta bo sung cho cong viec.</td>
          </tr>
          <tr>
            <td style={{ ...descTdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>tags</td>
            <td style={descTdStyle}>array</td>
            <td style={descTdStyle}>Khong</td>
            <td style={descTdStyle}>Mang cac chuoi tag (vi du: <code>["urgent"]</code>). Cac tag nay se tu dong gan vao task.</td>
          </tr>
          <tr>
            <td style={{ ...descTdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>pomodoroEstimate</td>
            <td style={descTdStyle}>number</td>
            <td style={descTdStyle}>Khong</td>
            <td style={descTdStyle}>So Pomodoro du kien cho task. Mac dinh la 1.</td>
          </tr>
        </tbody>
      </table>

      {/* Button link to Swagger Docs */}
      <div style={{ textAlign: 'center' }}>
        <a 
          href="/api/docs" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={linkBtnStyle}
        >
          <span>Mo tai lieu API day du (Swagger UI)</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </a>
      </div>
    </div>
  );
};

export default ApiSchemaDoc;
