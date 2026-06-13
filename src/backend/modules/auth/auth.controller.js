import { authService } from './auth.service.js';

export class AuthController {
  async register(req, res) {
    try {
      const { email, password } = req.body ?? {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email va password la bat buoc.' });
      }

      const result = await authService.registerUser(email, password);
      res.status(201).json(result);
    } catch (err) {
      if (err.message === 'Email nay da duoc dang ky.' || err.message.includes('hop le') || err.message.includes('ky tu')) {
        return res.status(400).json({ error: err.message });
      }
      console.error('[Auth Register]', err);
      res.status(500).json({ error: 'Loi he thong khi dang ky.' });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body ?? {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email va password la bat buoc.' });
      }

      const result = await authService.loginUser(email, password);
      res.json(result);
    } catch (err) {
      if (err.message === 'Email hoac mat khau khong dung.') {
        return res.status(400).json({ error: err.message });
      }
      console.error('[Auth Login]', err);
      res.status(500).json({ error: 'Loi he thong khi dang nhap.' });
    }
  }

  getMe(req, res) {
    res.json({ user: req.user });
  }

  async createApiKey(req, res) {
    try {
      const { label, scopes, userId = 'default_user' } = req.body ?? {};
      const result = await authService.createApiKey(label, scopes, userId);
      res.status(201).json({ ...result, note: 'Luu lai key nay - se KHONG hien thi lai.' });
    } catch (err) {
      console.error('[POST /api/keys]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAllApiKeys(req, res) {
    try {
      const data = await authService.getAllApiKeys();
      res.json({ data });
    } catch (err) {
      console.error('[GET /api/keys]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async revokeApiKey(req, res) {
    try {
      const id = req.params.id;
      const revokedId = await authService.revokeApiKey(id);
      if (!revokedId) return res.status(404).json({ error: 'Key khong ton tai' });
      res.json({ data: { id: revokedId }, message: 'Da thu hoi key.' });
    } catch (err) {
      console.error('[DELETE /api/keys/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // User-scoped: lay API keys cua chinh user dang dang nhap
  async getUserApiKeys(req, res) {
    try {
      const data = await authService.getApiKeysByUser(req.user.id);
      res.json({ data });
    } catch (err) {
      console.error('[GET /api/auth/keys]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createUserApiKey(req, res) {
    try {
      const { label, scopes } = req.body ?? {};
      const allowedScopes = ['tasks'];
      const scopeList = Array.isArray(scopes) ? scopes.filter(s => allowedScopes.includes(s)) : ['tasks'];
      const result = await authService.createApiKey(label, scopeList, req.user.id);
      res.status(201).json({ ...result, note: 'Luu lai key nay - se KHONG hien thi lai.' });
    } catch (err) {
      console.error('[POST /api/auth/keys]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async revokeUserApiKey(req, res) {
    try {
      const revokedId = await authService.revokeApiKeyByUser(req.params.id, req.user.id);
      if (!revokedId) return res.status(404).json({ error: 'Key khong ton tai hoac khong co quyen.' });
      res.json({ data: { id: revokedId }, message: 'Da thu hoi key.' });
    } catch (err) {
      console.error('[DELETE /api/auth/keys/:id]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const authController = new AuthController();
