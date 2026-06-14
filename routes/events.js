import { Router } from 'express';
import { EventEmitter } from 'events';

// ============================================================
// Realtime via SSE. `notifyChange()` is called after each 2xx mutation (middleware
// in server.js); SSE pushes a "nudge" for the client to poll /api/changes immediately.
// SSE only indicates "changes available", DOES NOT send payload -> no payload authorization needed,
// reuses existing changes-feed.
//
// NOTE Vercel: serverless does not maintain long connections (maxDuration). Client only opens
// EventSource when VITE_ENABLE_SSE='true' (long-running deploy). Disabled by default ->
// uses 25s polling. On a standard server, enable the flag for true realtime.
// ============================================================
const bus = new EventEmitter();
bus.setMaxListeners(0); // multiple tabs/connections

export function notifyChange() {
  bus.emit('change');
}

export function createEventsRouter(_pool, auth) {
  const router = Router();

  router.get('/', auth.requireScope('changes:read'), (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable buffering in proxy (nginx)
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    res.write('retry: 10000\n\n'); // suggest EventSource to reconnect after 10s
    res.write(': connected\n\n');

    const onChange = () => res.write('data: {"type":"change"}\n\n');
    bus.on('change', onChange);

    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      bus.off('change', onChange);
      try { res.end(); } catch { /* already closed */ }
    });
  });

  return router;
}
