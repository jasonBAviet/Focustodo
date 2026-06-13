import React, { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';

const IconEye = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const DEV_BYPASS_EMAIL = import.meta.env.VITE_DEV_BYPASS_EMAIL as string | undefined;

const AuthScreen: React.FC = () => {
  const { login, register, error, setError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err) {
      // lỗi đã được AuthContext xử lý
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    if (!DEV_BYPASS_EMAIL) return;
    setLoading(true);
    try {
      await login(DEV_BYPASS_EMAIL, '__dev__');
    } catch {
      // lỗi đã được AuthContext xử lý
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin((prev) => !prev);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError(null);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Focus To Do</h2>
          <p>{isLogin ? 'Đăng nhập để đồng bộ hóa công việc' : 'Tạo tài khoản mới để bắt đầu'}</p>
        </div>

        {error && (
          <div className="auth-error">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@viethanh.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                >
                  {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>

        {import.meta.env.DEV && DEV_BYPASS_EMAIL && (
          <>
            <div className="auth-divider"><span>dev</span></div>
            <button type="button" className="auth-dev-btn" onClick={handleDevLogin} disabled={loading}>
              {DEV_BYPASS_EMAIL}
            </button>
          </>
        )}

        <div className="auth-footer">
          <span>{isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}</span>
          <button type="button" className="auth-switch-btn" onClick={switchMode}>
            {isLogin ? 'Đăng ký ngay' : 'Đăng nhập ngay'}
          </button>
        </div>
      </div>

      <style>{`
        .auth-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          width: 100vw;
          background: radial-gradient(circle at top left, #1a1b2f, #0c0d14);
          font-family: var(--font-main);
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9999;
          overflow: hidden;
        }

        .auth-container::before {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(67, 97, 238, 0.15) 0%, transparent 70%);
          top: 15%;
          left: 20%;
          border-radius: 50%;
        }

        .auth-container::after {
          content: '';
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(242, 95, 92, 0.1) 0%, transparent 70%);
          bottom: 10%;
          right: 15%;
          border-radius: 50%;
        }

        .auth-card {
          width: 100%;
          max-width: 420px;
          padding: var(--space-10);
          background: rgba(20, 21, 38, 0.65);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          z-index: 10;
          transition: all 0.3s ease;
        }

        .auth-header {
          text-align: center;
          margin-bottom: var(--space-8);
        }

        .auth-header h2 {
          font-size: var(--text-3xl);
          font-weight: 700;
          background: linear-gradient(135deg, #7ec8e3, #4361ee);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 var(--space-2-5) 0;
        }

        .auth-header p {
          color: rgba(255, 255, 255, 0.6);
          font-size: var(--text-md);
          margin: 0;
        }

        .auth-error {
          background: rgba(242, 95, 92, 0.15);
          border: 1px solid rgba(242, 95, 92, 0.3);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          margin-bottom: var(--space-5);
          font-size: var(--text-base);
          color: var(--accent);
          text-align: center;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .form-group label {
          font-size: var(--text-sm);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.5);
        }

        .form-group input {
          width: 100%;
          padding: var(--space-3) var(--space-4);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-md);
          color: #ffffff;
          font-size: var(--text-md);
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s, background-color 0.2s;
        }

        .form-group input:focus {
          border-color: rgba(67, 97, 238, 0.6);
          background: rgba(255, 255, 255, 0.08);
        }

        .password-input-wrapper {
          position: relative;
          width: 100%;
        }

        .password-input-wrapper input {
          padding-right: 45px !important;
        }

        .password-toggle-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(30, 32, 60, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          color: #a0aec0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px 6px;
          z-index: 2;
          transition: color 0.2s, background 0.2s, border-color 0.2s;
        }

        .password-toggle-btn:hover {
          color: #7ec8e3;
          background: rgba(67, 97, 238, 0.25);
          border-color: rgba(67, 97, 238, 0.5);
        }

        .auth-submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #4361ee, #3f37c9);
          color: #ffffff;
          border: none;
          border-radius: var(--radius-md);
          font-size: var(--text-md);
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
        }

        .auth-submit-btn:hover {
          opacity: 0.95;
        }

        .auth-submit-btn:active {
          transform: scale(0.98);
        }

        .auth-submit-btn:disabled {
          background: #3f3e5c;
          color: rgba(255, 255, 255, 0.4);
          cursor: not-allowed;
        }

        .auth-footer {
          margin-top: var(--space-6);
          display: flex;
          justify-content: center;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--text-base);
          color: rgba(255, 255, 255, 0.5);
        }

        .auth-switch-btn {
          background: none;
          border: none;
          color: #7ec8e3;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          font-size: var(--text-base);
        }

        .auth-switch-btn:hover {
          text-decoration: underline;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          margin: var(--space-5) 0 var(--space-4);
          gap: var(--space-3);
        }
        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
        }
        .auth-divider span {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.25);
          padding: 0 4px;
        }

        .auth-dev-btn {
          width: 100%;
          padding: 10px 14px;
          background: rgba(255, 165, 0, 0.08);
          border: 1px dashed rgba(255, 165, 0, 0.35);
          border-radius: var(--radius-md);
          color: rgba(255, 165, 0, 0.7);
          font-size: var(--text-sm);
          font-family: monospace;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .auth-dev-btn:hover {
          background: rgba(255, 165, 0, 0.14);
          border-color: rgba(255, 165, 0, 0.55);
          color: rgba(255, 165, 0, 0.9);
        }
        .auth-dev-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default AuthScreen;
