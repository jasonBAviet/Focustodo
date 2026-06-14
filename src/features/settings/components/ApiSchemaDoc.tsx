// ============================================================
// FOCUS TO-DO - ApiSchemaDoc
// Component displaying API URL and Schema guide for external connection
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
  fontSize: 'var(--text-sm)',
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
  fontSize: 'var(--text-xs)',
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
// Sample Task Schema
// ----------------------------------------------------------
const SCHEMA_TEMPLATE = {
  title: 'Học thiết kế cơ sở dữ liệu SQL',
  projectId: 'inbox-default_user',
  priority: 'high',
  dueDate: '2026-06-30',
  note: 'Kiến thức quan trọng về cách tách bảng Task và Knowledge',
  isKnowledge: true,
  tags: ['database', 'learning'],
  pomodoroEstimate: 3
};

const ApiSchemaDoc: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const getApiUrl = () => {
    // 1. Nếu VITE_BACKEND_URL là URL tuyệt đối public (không phải localhost/127.0.0.1), ưu tiên sử dụng
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (backendUrl && backendUrl.startsWith('http') && !backendUrl.includes('localhost') && !backendUrl.includes('127.0.0.1')) {
      return `${backendUrl}/api/external/v1/tasks`;
    }
    
    // 2. Ngược lại, nếu chạy trên browser, lấy theo domain hiện tại của host
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/external/v1/tasks`;
    }
    
    return '/api/external/v1/tasks';
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
        Tích hợp hệ thống bên ngoài (Inbound API)
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '4px 0 12px 0', lineHeight: 1.5 }}>
        Bạn có thể tự động tạo nhiệm vụ hoặc kiến thức trong cơ sở dữ liệu từ các nguồn bên ngoài thông qua Focus To-Do Hub API.
        Dữ liệu gửi lên phải tuân thủ nghiêm ngặt cấu trúc (schema) bên dưới để tránh lỗi hệ thống.
      </p>

      {/* URL API */}
      <div style={{ margin: '12px 0' }}>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
          POST API URL (Tự động cập nhật theo domain hiện tại)
        </div>
        <div style={{ 
          background: 'var(--bg-input)', 
          padding: '8px 12px', 
          borderRadius: 'var(--radius-sm)', 
          fontFamily: 'monospace', 
          fontSize: 'var(--text-sm)', 
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
          Headers yêu cầu
        </div>
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.1)', 
          padding: '8px 12px', 
          borderRadius: 'var(--radius-sm)', 
          fontSize: 'var(--text-sm)', 
          color: 'var(--text-primary)',
          border: '1px solid var(--divider)'
        }}>
          <div><strong>Content-Type:</strong> application/json</div>
          <div style={{ marginTop: 2 }}><strong>X-API-Key:</strong> &lt;your_api_key&gt; (Lấy trong phần API Keys phía trên)</div>
        </div>
      </div>

      {/* JSON Schema Block */}
      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', marginTop: 12 }}>
        Mẫu JSON Payload gửi đi
      </div>
      <div style={codeBlockStyle}>
        <button type="button" style={copyBtnStyle} onClick={handleCopy}>
          {copied ? 'Đã sao chép!' : 'Sao chép Schema'}
        </button>
        <pre style={{ margin: 0 }}>{JSON.stringify(SCHEMA_TEMPLATE, null, 2)}</pre>
      </div>

      {/* Mo ta chi tiet cac truong */}
      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', marginTop: 16 }}>
        Chi tiết các trường dữ liệu
      </div>
      <table style={descTableStyle}>
        <thead>
          <tr>
            <th style={descThStyle}>Trường</th>
            <th style={descThStyle}>Kiểu</th>
            <th style={descThStyle}>Bắt buộc</th>
            <th style={descThStyle}>Mô tả / Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...descTdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>title</td>
            <td style={descTdStyle}>string</td>
            <td style={{ ...descTdStyle, color: '#f25f5c', fontWeight: 600 }}>Có</td>
            <td style={descTdStyle}>Tiêu đề nhiệm vụ/kiến thức. Không được để trống.</td>
          </tr>
          <tr>
            <td style={{ ...descTdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>projectId</td>
            <td style={descTdStyle}>string</td>
            <td style={descTdStyle}>Không</td>
            <td style={descTdStyle}>ID của dự án để tạo nhiệm vụ. Mặc định sẽ vào Inbox nếu để trống.</td>
          </tr>
          <tr>
            <td style={{ ...descTdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>priority</td>
            <td style={descTdStyle}>string</td>
            <td style={descTdStyle}>Không</td>
            <td style={descTdStyle}>Độ ưu tiên. Các giá trị hợp lệ: <code>high</code>, <code>medium</code>, <code>low</code>, <code>none</code>.</td>
          </tr>
          <tr>
            <td style={{ ...descTdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>dueDate</td>
            <td style={descTdStyle}>string</td>
            <td style={descTdStyle}>Không</td>
            <td style={descTdStyle}>Hạn chót hoàn thành. Định dạng: <code>YYYY-MM-DD</code>.</td>
          </tr>
          <tr>
            <td style={{ ...descTdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>note</td>
            <td style={descTdStyle}>string</td>
            <td style={descTdStyle}>Không</td>
            <td style={descTdStyle}>Nội dung ghi chú hoặc mô tả chi tiết của nhiệm vụ/kiến thức.</td>
          </tr>
          <tr>
            <td style={{ ...descTdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>isKnowledge</td>
            <td style={descTdStyle}>boolean</td>
            <td style={descTdStyle}>Không</td>
            <td style={descTdStyle}>Nếu đặt là <code>true</code>, hệ thống sẽ lưu thông tin này vào danh sách Kiến thức thay vì Nhiệm vụ. Mặc định là <code>false</code>.</td>
          </tr>
          <tr>
            <td style={{ ...descTdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>tags</td>
            <td style={descTdStyle}>array</td>
            <td style={descTdStyle}>Không</td>
            <td style={descTdStyle}>Mảng chứa danh sách các nhãn (ví dụ: <code>["database"]</code>).</td>
          </tr>
          <tr>
            <td style={{ ...descTdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>pomodoroEstimate</td>
            <td style={descTdStyle}>number</td>
            <td style={descTdStyle}>Không</td>
            <td style={descTdStyle}>Số lượng quả cà chua (Pomodoro) dự tính. Mặc định là 1.</td>
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
          <span>Xem tài liệu API đầy đủ (Swagger UI)</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </a>
      </div>
    </div>
  );
};

export default ApiSchemaDoc;
