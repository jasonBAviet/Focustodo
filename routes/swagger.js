import { Router } from 'express';

const router = Router();

// ============================================================
// OpenAPI 3.0 Spec
// ============================================================
const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Focus To-Do Hub API',
    description:
      'API cong khai bien Focus To-Do thanh "task hub": he thong ben ngoai co the doc/ghi task, project, folder, tag, ' +
      'nhan delta qua /changes, va day task vao qua inbound webhook /hooks/{integration} (xac thuc HMAC). ' +
      'Xac thuc bang header `X-API-Key` (key tao qua POST /keys, co scope: tasks:read|write, projects:*, folders:*, tags:*, changes:read, admin). ' +
      'SPA cung origin duoc cho qua khong can key.',
    version: '2.0.0',
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
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Work' },
          color: { type: 'string', example: '#4361ee' },
          isVisible: { type: 'boolean' },
          taskCount: { type: 'integer' },
          folderId: { type: 'string', nullable: true },
          position: { type: 'integer' },
          createdAt: { type: 'string' },
          updatedAt: { type: 'string' },
        },
      },
      Folder: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Q2 Goals' },
          color: { type: 'string' },
          projectIds: { type: 'array', items: { type: 'string' } },
          parentId: { type: 'string', nullable: true, description: 'Folder cha (lồng nhiều cấp); null = gốc' },
          position: { type: 'integer' },
          createdAt: { type: 'string' },
          updatedAt: { type: 'string' },
        },
      },
      Tag: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'urgent' },
          color: { type: 'string' },
          createdAt: { type: 'string' },
          updatedAt: { type: 'string' },
        },
      },
      ReorderInput: {
        type: 'object',
        required: ['orderedIds'],
        properties: {
          orderedIds: { type: 'array', items: { type: 'string' }, description: 'Danh sach id theo thu tu moi; position = chi so.' },
        },
      },
      ChangesResponse: {
        type: 'object',
        properties: {
          now: { type: 'string', description: 'Moc ISO de dung cho lan poll ke tiep (?since=)' },
          changes: {
            type: 'object',
            properties: {
              tasks: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
              projects: { type: 'array', items: { $ref: '#/components/schemas/Project' } },
              folders: { type: 'array', items: { $ref: '#/components/schemas/Folder' } },
              tags: { type: 'array', items: { $ref: '#/components/schemas/Tag' } },
            },
          },
          deletedIds: {
            type: 'object',
            properties: {
              tasks: { type: 'array', items: { type: 'string' } },
              projects: { type: 'array', items: { type: 'string' } },
              folders: { type: 'array', items: { type: 'string' } },
              tags: { type: 'array', items: { type: 'string' } },
            },
          },
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
    '/tasks/{id}/complete': {
      patch: {
        summary: 'Hoan thanh task (sinh occurrence ke tiep neu lap)',
        description: 'Dat completed (mac dinh true). Neu task lap (repeat != none) va chuyen false->true, server sinh occurrence ke tiep va tra ve trong truong `spawned`.',
        tags: ['Tasks'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { completed: { type: 'boolean', default: true } } } } } },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Task' }, spawned: { $ref: '#/components/schemas/Task' } } } } } },
          404: { description: 'Khong tim thay task' },
        },
      },
    },
    '/tasks/reorder': {
      post: {
        summary: 'Sap xep lai thu tu task',
        tags: ['Tasks'],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReorderInput' } } } },
        responses: { 200: { description: 'OK' } },
      },
    },
    '/projects': {
      get: { summary: 'Danh sach project', tags: ['Projects'], responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Project' } } } } } } } } },
      post: { summary: 'Tao project', tags: ['Projects'], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Project' } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/projects/{id}': {
      get: { summary: 'Chi tiet project', tags: ['Projects'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } } },
      put: { summary: 'Cap nhat project', tags: ['Projects'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      delete: { summary: 'Xoa project (gan task ve null, go khoi folder)', tags: ['Projects'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/folders': {
      get: { summary: 'Danh sach folder', tags: ['Folders'], responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Folder' } } } } } } } } },
      post: { summary: 'Tao folder', tags: ['Folders'], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Folder' } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/folders/{id}': {
      put: { summary: 'Cap nhat folder', tags: ['Folders'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      delete: { summary: 'Xoa folder (gan project con ve null)', tags: ['Folders'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/tags': {
      get: { summary: 'Danh sach tag', tags: ['Tags'], responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Tag' } } } } } } } } },
      post: { summary: 'Tao tag', tags: ['Tags'], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Tag' } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/tags/{id}': {
      put: { summary: 'Cap nhat tag', tags: ['Tags'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      delete: { summary: 'Xoa tag (go khoi moi task)', tags: ['Tags'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/changes': {
      get: {
        summary: 'Delta feed - thay doi ke tu `since`',
        description: 'Tra ve cac entity co updated_at > since (gom ca tombstone). Dung de dong bo 2 chieu khong can reload.',
        tags: ['Sync'],
        parameters: [
          { name: 'since', in: 'query', schema: { type: 'string' }, description: 'Moc ISO; bo trong = tra ve toan bo entity con song.' },
          { name: 'types', in: 'query', schema: { type: 'string' }, description: 'Loc loai, vd: tasks,projects' },
        ],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/ChangesResponse' } } } } },
      },
    },
    '/events': {
      get: {
        summary: 'Realtime SSE - nudge khi co thay doi',
        description: 'Stream text/event-stream; moi mutation 2xx phat 1 event {"type":"change"} de client poll /changes ngay. SPA same-origin. Khong giu ket noi dai tren serverless (Vercel).',
        tags: ['Sync'],
        responses: { 200: { description: 'event-stream' } },
      },
    },
    '/hooks/{integration}': {
      post: {
        summary: 'Inbound webhook - app ngoai day task vao',
        description: 'Body JSON tuy y duoc map sang task theo cau hinh webhook_endpoints. Header `X-Signature` = HMAC-SHA256(secret, rawBody) hex.',
        tags: ['Inbound'],
        security: [],
        parameters: [{ name: 'integration', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: {
          201: { description: 'Da tao task', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskResponse' } } } },
          401: { description: 'Chu ky HMAC khong hop le' },
          404: { description: 'Integration khong ton tai/da tat' },
        },
      },
    },
    '/keys': {
      get: { summary: 'Liet ke API key (chi prefix)', tags: ['Admin'], responses: { 200: { description: 'OK' } } },
      post: { summary: 'Tao API key (tra raw key 1 lan)', tags: ['Admin'], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { label: { type: 'string' }, scopes: { type: 'array', items: { type: 'string' } } } } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/integrations': {
      get: { summary: 'Liet ke inbound endpoint', tags: ['Admin'], responses: { 200: { description: 'OK' } } },
      post: { summary: 'Tao/cap nhat inbound endpoint (tra secret)', tags: ['Admin'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { integration: { type: 'string' }, secret: { type: 'string' }, mapping: { type: 'object' }, defaultProjectId: { type: 'string' }, enabled: { type: 'boolean' } } } } } }, responses: { 201: { description: 'Created' } } },
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
