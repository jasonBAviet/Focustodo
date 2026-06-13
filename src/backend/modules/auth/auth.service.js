import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { hashPassword, generateSalt } from '../../../../db.js';
import { authRepository } from './auth.repository.js';

// Khong cho phep fallback neu thieu JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('[SECURITY] JWT_SECRET chua duoc cau hinh trong .env. Server khong the khoi dong.');
}

export class AuthService {
  hashKey(raw) {
    return crypto.createHash('sha256').update(String(raw)).digest('hex');
  }

  generateToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    // Token co han 30 ngay
    const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  verifyToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, body, signature] = parts;
      const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
      const sigA = Buffer.from(expectedSig, 'utf8');
      const sigB = Buffer.from(signature, 'utf8');
      if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) return null;
      const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (decoded.exp && Date.now() / 1000 > decoded.exp) return null;
      return decoded;
    } catch {
      return null;
    }
  }

  async validateApiKey(providedKey, scope) {
    const hashed = this.hashKey(providedKey);
    const keyRecord = await authRepository.findKeyByHash(hashed);
    
    if (keyRecord && !keyRecord.revoked) {
      const scopes = Array.isArray(keyRecord.scopes) ? keyRecord.scopes : [];
      if (scopes.includes('admin') || scopes.includes(scope)) {
        await authRepository.updateKeyLastUsed(keyRecord.id, new Date().toISOString()).catch(() => {});
        return {
          valid: true,
          apiKey: { id: keyRecord.id, scopes },
          user: { id: keyRecord.user_id }
        };
      }
      return { valid: false, error: `Forbidden: key thieu scope "${scope}".` };
    }
    return { valid: false, error: 'Unauthorized: X-API-Key khong hop le hoac da thu hoi.' };
  }

  async createApiKey(label, scopes, userId) {
    const scopeList = Array.isArray(scopes) ? scopes : [];
    const raw = `ft_${crypto.randomBytes(24).toString('hex')}`;
    const id = randomUUID();
    const now = new Date().toISOString();
    
    await authRepository.insertApiKey({
      id,
      keyHash: this.hashKey(raw),
      keyPrefix: raw.slice(0, 12),
      label: label ?? '',
      scopes: scopeList,
      createdAt: now,
      userId
    });

    return { id, key: raw, keyPrefix: raw.slice(0, 12), label: label ?? '', scopes: scopeList };
  }

  async getAllApiKeys() {
    return await authRepository.getAllApiKeys();
  }

  async revokeApiKey(id) {
    return await authRepository.revokeApiKey(id);
  }

  async getApiKeysByUser(userId) {
    return await authRepository.getApiKeysByUser(userId);
  }

  async revokeApiKeyByUser(id, userId) {
    return await authRepository.revokeApiKeyByUser(id, userId);
  }

  async registerUser(email, password) {
    if (password.length < 8) throw new Error('Mat khau phai co it nhat 8 ky tu.');
    if (password.length > 128) throw new Error('Mat khau khong duoc vuot qua 128 ky tu.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email khong hop le.');

    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) throw new Error('Email nay da duoc dang ky.');

    const userId = randomUUID();
    const salt = generateSalt();
    const hashedPw = hashPassword(password, salt);
    const now = new Date().toISOString();

    await authRepository.insertUser({ userId, email, hashedPw, salt, now });
    await authRepository.seedDefaultProjects(userId, now);

    const token = this.generateToken({ id: userId, email });
    return { token, user: { id: userId, email } };
  }

  async loginUser(email, password) {
    // Dev bypass: chi hoat dong khi NODE_ENV != 'production' va DEV_BYPASS_EMAIL duoc dat
    const devBypassEmail = process.env.DEV_BYPASS_EMAIL?.trim().toLowerCase();
    if (process.env.NODE_ENV !== 'production' && devBypassEmail && email.trim().toLowerCase() === devBypassEmail) {
      const existing = await authRepository.findUserByEmail(email.trim());
      if (!existing) {
        return await this.registerUser(email.trim(), 'devbypass_12345');
      }
      const token = this.generateToken({ id: existing.id, email: existing.email });
      return { token, user: { id: existing.id, email: existing.email } };
    }

    if (password.length > 128) throw new Error('Email hoac mat khau khong dung.');

    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new Error('Email hoac mat khau khong dung.');

    const hashed = hashPassword(password, user.password_salt || null);
    if (user.password_hash !== hashed) throw new Error('Email hoac mat khau khong dung.');

    // Auto-migrate
    if (!user.password_salt) {
      try {
        const newSalt = generateSalt();
        const newHash = hashPassword(password, newSalt);
        await authRepository.updateUserSalt(user.id, newHash, newSalt, new Date().toISOString());
      } catch (err) {
        console.warn('[Auth] Khong the migrate password sang salt moi:', err.message);
      }
    }

    const token = this.generateToken({ id: user.id, email: user.email });
    return { token, user: { id: user.id, email: user.email } };
  }
}

export const authService = new AuthService();
