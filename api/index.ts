import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-Admin-Key, X-Signature');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Route to Express app
  return app(req, res);
}
