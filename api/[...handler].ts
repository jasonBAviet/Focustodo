import { VercelRequest, VercelResponse } from '@vercel/node';
import server from '../server';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return server(req, res);
}
