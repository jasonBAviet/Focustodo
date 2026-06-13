/**
 * scripts/reset_dev_user.js
 * Script chỉ dùng cho môi trường DEV để reset mật khẩu tài khoản default.
 * Chạy: node scripts/reset_dev_user.js
 */
import { pool, hashPassword, generateSalt } from '../db.js';

const DEV_EMAIL = 'default@focustodo.local';
const DEV_PASSWORD = 'Test@1234'; // Đổi tùy ý

async function resetDevUser() {
  try {
    const salt = generateSalt();
    const hashedPw = hashPassword(DEV_PASSWORD, salt);
    const now = new Date().toISOString();

    // Kiểm tra user có tồn tại không
    const check = await pool.query('SELECT id FROM users WHERE email = $1', [DEV_EMAIL]);

    if (check.rows.length === 0) {
      // Tạo mới nếu chưa có
      const { randomUUID } = await import('crypto');
      const userId = 'default_user';
      await pool.query(
        `INSERT INTO users (id, email, password_hash, password_salt, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           password_salt = EXCLUDED.password_salt,
           updated_at = EXCLUDED.updated_at`,
        [userId, DEV_EMAIL, hashedPw, salt, now, now]
      );
      console.log(`[DEV] Tao moi user: ${DEV_EMAIL}`);
    } else {
      // Reset password nếu đã có
      await pool.query(
        'UPDATE users SET password_hash = $1, password_salt = $2, updated_at = $3 WHERE email = $4',
        [hashedPw, salt, now, DEV_EMAIL]
      );
      console.log(`[DEV] Reset password thanh cong cho: ${DEV_EMAIL}`);
    }

    console.log(`[DEV] Email   : ${DEV_EMAIL}`);
    console.log(`[DEV] Password: ${DEV_PASSWORD}`);
    console.log('[DEV] Ban co the dang nhap ngay bay gio.');
  } catch (err) {
    console.error('[DEV] Loi khi reset dev user:', err.message);
  } finally {
    await pool.end();
  }
}

resetDevUser();
