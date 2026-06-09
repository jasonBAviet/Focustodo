import { Router } from 'express';
import { EventEmitter } from 'events';

// ============================================================
// Realtime qua SSE. `notifyChange()` được gọi sau mỗi mutation 2xx (middleware
// trong server.js); SSE đẩy 1 "nudge" để client poll /api/changes ngay lập tức.
// SSE chỉ báo "có thay đổi", KHÔNG gửi payload -> không cần phân quyền payload,
// tái dùng changes-feed sẵn có.
//
// LƯU Ý Vercel: serverless không giữ kết nối dài (maxDuration). Client chỉ mở
// EventSource khi VITE_ENABLE_SSE='true' (deploy long-running). Mặc định tắt ->
// dùng poll 25s. Trên server thường, bật cờ để có realtime thật.
// ============================================================
const bus = new EventEmitter();
bus.setMaxListeners(0); // nhiều tab/kết nối

export function notifyChange() {
  bus.emit('change');
}

export function createEventsRouter(_pool, auth) {
  const router = Router();

  router.get('/', auth.requireScope('changes:read'), (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // tắt buffering ở proxy (nginx)
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    res.write('retry: 10000\n\n'); // gợi ý EventSource reconnect sau 10s
    res.write(': connected\n\n');

    const onChange = () => res.write('data: {"type":"change"}\n\n');
    bus.on('change', onChange);

    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      bus.off('change', onChange);
      try { res.end(); } catch { /* đã đóng */ }
    });
  });

  return router;
}
