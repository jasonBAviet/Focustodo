import { Router } from 'express';

const router = Router();

// ============================================================
// OpenAPI 3.0 Spec
// ============================================================
const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Focus To-Do Public Task API',
    description:
      'API cong khai cho phep he thong ben ngoai tao, doc, cap nhat va xoa task trong Focus To-Do. ' +
      'Xac thuc bang header `X-API-Key` (neu bien moi truong `API_KEY` duoc cau hinh).',
    version: '1.0.0',
  },
  servers: [{ url: '/api', description: 'Local backend' }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
    schemas: {
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'abc-123' },
          title: { type: 'string', example: 'Hoan thanh bao cao Q2' },
          projectId: { type: 'string', nullable: true, example: 'work' },
          priority: { type: 'string', enum: ['high', 'medium', 'low', 'none'], example: 'high' },
          dueDate: { type: 'string', nullable: true, example: '2026-06-30' },
          reminder: { type: 'string', nullable: true, example: '2026-06-29T09:00:00.000Z' },
          repeat: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly', 'custom'], example: 'none' },
          repeatCustom: { type: 'string', nullable: true },
          note: { type: 'string', example: 'Gui cho manager truoc 5pm' },
          subtasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                completed: { type: 'boolean' },
                createdAt: { type: 'string' },
              },
            },
          },
          pomodoroEstimate: { type: 'integer', example: 3 },
          pomodoroCompleted: { type: 'integer', example: 0 },
          totalFocusTime: { type: 'integer', description: 'Thoi gian focus tinh bang phut', example: 0 },
          completed: { type: 'boolean', example: false },
          flagged: { type: 'boolean', example: false },
          tags: { type: 'array', items: { type: 'string' }, example: [] },
          createdAt: { type: 'string', example: '2026-05-31T10:00:00.000Z' },
          completedAt: { type: 'string', nullable: true },
          updatedAt: { type: 'string', example: '2026-05-31T10:00:00.000Z' },
        },
      },
      TaskInput: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', example: 'Hoan thanh bao cao Q2' },
          projectId: { type: 'string', nullable: true, example: 'work', description: 'ID project phai ton tai trong he thong' },
          priority: { type: 'string', enum: ['high', 'medium', 'low', 'none'], example: 'high' },
          dueDate: { type: 'string', nullable: true, example: '2026-06-30', description: 'Dinh dang YYYY-MM-DD' },
          reminder: { type: 'string', nullable: true, example: '2026-06-29T09:00:00.000Z' },
          repeat: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly', 'custom'], example: 'none' },
          note: { type: 'string', example: 'Gui cho manager truoc 5pm' },
          pomodoroEstimate: { type: 'integer', example: 3 },
          flagged: { type: 'boolean', example: false },
          tags: { type: 'array', items: { type: 'string' }, example: [] },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Truong "title" la bat buoc va khong duoc rong.' },
        },
      },
      TaskListResponse: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
          total: { type: 'integer', example: 42 },
          limit: { type: 'integer', example: 100 },
          offset: { type: 'integer', example: 0 },
        },
      },
      TaskResponse: {
        type: 'object',
        properties: {
          data: { $ref: '#/components/schemas/Task' },
        },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    '/tasks': {
      get: {
        summary: 'Lay danh sach task',
        description: 'Tra ve danh sach task co ho tro phan trang va loc theo cac tieu chi.',
        tags: ['Tasks'],
        parameters: [
          { name: 'projectId', in: 'query', schema: { type: 'string' }, description: 'Loc theo project ID' },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['high', 'medium', 'low', 'none'] } },
          { name: 'completed', in: 'query', schema: { type: 'boolean' }, description: 'Loc theo trang thai hoan thanh' },
          { name: 'dueDate', in: 'query', schema: { type: 'string' }, description: 'Ngay den han dinh dang YYYY-MM-DD' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100, maximum: 500 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          200: { description: 'Thanh cong', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskListResponse' } } } },
          401: { description: 'Khong co quyen truy cap', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        summary: 'Tao task moi',
        description: 'Tao mot task moi tu he thong ben ngoai. Chi truong `title` la bat buoc.',
        tags: ['Tasks'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskInput' } } },
        },
        responses: {
          201: { description: 'Tao thanh cong', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskResponse' } } } },
          400: { description: 'Du lieu dau vao khong hop le', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Khong co quyen truy cap', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Task ID da ton tai', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/tasks/{id}': {
      get: {
        summary: 'Lay chi tiet task theo ID',
        tags: ['Tasks'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Thanh cong', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskResponse' } } } },
          404: { description: 'Khong tim thay task', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        summary: 'Cap nhat task',
        description: 'Cap nhat mot phan hoac toan bo cac truong cua task. Chi gui nhung truong can thay doi.',
        tags: ['Tasks'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskInput' } } },
        },
        responses: {
          200: { description: 'Cap nhat thanh cong', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskResponse' } } } },
          400: { description: 'Du lieu khong hop le', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Khong tim thay task', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        summary: 'Xoa task',
        tags: ['Tasks'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Xoa thanh cong', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'object' }, message: { type: 'string' } } } } } },
          404: { description: 'Khong tim thay task', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
};

// ============================================================
// Route: GET /api/docs/openapi.json
// ============================================================
router.get('/openapi.json', (req, res) => {
  res.json(spec);
});

// ============================================================
// Route: GET /api/docs
// Swagger UI qua CDN - khong can cai them package
// ============================================================
router.get('/', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Focus To-Do - API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #1a1a2e; }
    #swagger-ui .topbar { background: #16213e; }
    #swagger-ui .topbar-wrapper img { display: none; }
    #swagger-ui .topbar-wrapper::before {
      content: 'Focus To-Do API';
      color: #f25f5c;
      font-size: 1.4rem;
      font-weight: 700;
      padding-left: 1rem;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      deepLinking: true,
      persistAuthorization: true,
    });
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;
