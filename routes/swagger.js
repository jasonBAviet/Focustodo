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
      'Public API turns Focus To-Do into a "task hub": external systems can read/write tasks, projects, folders, tags, ' +
      'receive deltas via /changes, and push tasks via inbound webhook /hooks/{integration} (HMAC validation). ' +
      'Authentication via `X-API-Key` header (key generated via POST /keys, scopes: tasks:read|write, projects:*, folders:*, tags:*, changes:read, admin). ' +
      'Same-origin SPA is allowed without a key.',
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
          title: { type: 'string', example: 'Complete Q2 report' },
          projectId: { type: 'string', nullable: true, example: 'work' },
          priority: { type: 'string', enum: ['high', 'medium', 'low', 'none'], example: 'high' },
          dueDate: { type: 'string', nullable: true, example: '2026-06-30' },
          reminder: { type: 'string', nullable: true, example: '2026-06-29T09:00:00.000Z' },
          repeat: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly', 'custom'], example: 'none' },
          repeatCustom: { type: 'string', nullable: true },
          note: { type: 'string', example: 'Send to manager before 5pm' },
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
          totalFocusTime: { type: 'integer', description: 'Focus time in minutes', example: 0 },
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
          title: { type: 'string', example: 'Complete Q2 report' },
          projectId: { type: 'string', nullable: true, example: 'work', description: 'Project ID must exist in the system' },
          priority: { type: 'string', enum: ['high', 'medium', 'low', 'none'], example: 'high' },
          dueDate: { type: 'string', nullable: true, example: '2026-06-30', description: 'Format YYYY-MM-DD' },
          reminder: { type: 'string', nullable: true, example: '2026-06-29T09:00:00.000Z' },
          repeat: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly', 'custom'], example: 'none' },
          note: { type: 'string', example: 'Send to manager before 5pm' },
          pomodoroEstimate: { type: 'integer', example: 3 },
          flagged: { type: 'boolean', example: false },
          tags: { type: 'array', items: { type: 'string' }, example: [] },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Field "title" is required and cannot be empty.' },
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
          parentId: { type: 'string', nullable: true, description: 'Parent folder (nested); null = root' },
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
          orderedIds: { type: 'array', items: { type: 'string' }, description: 'List of ids in new order; position = index.' },
        },
      },
      ChangesResponse: {
        type: 'object',
        properties: {
          now: { type: 'string', description: 'ISO timestamp to use for the next poll (?since=)' },
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
        summary: 'Get task list',
        description: 'Returns a task list with pagination and filtering.',
        tags: ['Tasks'],
        parameters: [
          { name: 'projectId', in: 'query', schema: { type: 'string' }, description: 'Filter by project ID' },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['high', 'medium', 'low', 'none'] } },
          { name: 'completed', in: 'query', schema: { type: 'boolean' }, description: 'Filter by completion status' },
          { name: 'dueDate', in: 'query', schema: { type: 'string' }, description: 'Due date in YYYY-MM-DD format' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100, maximum: 500 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          200: { description: 'Success', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskListResponse' } } } },
          401: { description: 'Unauthorized access', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        summary: 'Create new task',
        description: 'Create a new task from an external system. Only `title` is required.',
        tags: ['Tasks'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskInput' } } },
        },
        responses: {
          201: { description: 'Successfully created', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskResponse' } } } },
          400: { description: 'Invalid input data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { description: 'Unauthorized access', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Task ID already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/tasks/{id}': {
      get: {
        summary: 'Get task details by ID',
        tags: ['Tasks'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Success', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskResponse' } } } },
          404: { description: 'Task not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        summary: 'Update task',
        description: 'Update task fields partially or fully. Only send the fields to be changed.',
        tags: ['Tasks'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskInput' } } },
        },
        responses: {
          200: { description: 'Successfully updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskResponse' } } } },
          400: { description: 'Invalid data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Task not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        summary: 'Delete task',
        tags: ['Tasks'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Successfully deleted', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'object' }, message: { type: 'string' } } } } } },
          404: { description: 'Task not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/tasks/{id}/complete': {
      patch: {
        summary: 'Complete task (spawns next occurrence if repeating)',
        description: 'Sets completed (default true). If task repeats (repeat != none) and changes false->true, server spawns the next occurrence and returns it in `spawned`.',
        tags: ['Tasks'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { completed: { type: 'boolean', default: true } } } } } },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Task' }, spawned: { $ref: '#/components/schemas/Task' } } } } } },
          404: { description: 'Task not found' },
        },
      },
    },
    '/tasks/reorder': {
      post: {
        summary: 'Reorder tasks',
        tags: ['Tasks'],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReorderInput' } } } },
        responses: { 200: { description: 'OK' } },
      },
    },
    '/projects': {
      get: { summary: 'Project list', tags: ['Projects'], responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Project' } } } } } } } } },
      post: { summary: 'Create project', tags: ['Projects'], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Project' } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/projects/{id}': {
      get: { summary: 'Project details', tags: ['Projects'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } } },
      put: { summary: 'Update project', tags: ['Projects'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      delete: { summary: 'Delete project (sets task to null, removes from folder)', tags: ['Projects'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/folders': {
      get: { summary: 'Folder list', tags: ['Folders'], responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Folder' } } } } } } } } },
      post: { summary: 'Create folder', tags: ['Folders'], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Folder' } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/folders/{id}': {
      put: { summary: 'Update folder', tags: ['Folders'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      delete: { summary: 'Delete folder (sets child project to null)', tags: ['Folders'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/tags': {
      get: { summary: 'Tag list', tags: ['Tags'], responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Tag' } } } } } } } } },
      post: { summary: 'Create tag', tags: ['Tags'], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Tag' } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/tags/{id}': {
      put: { summary: 'Update tag', tags: ['Tags'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
      delete: { summary: 'Delete tag (removes from all tasks)', tags: ['Tags'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
    },
    '/changes': {
      get: {
        summary: 'Delta feed - changes since `since`',
        description: 'Returns entities with updated_at > since (including tombstones). Used for 2-way sync without reload.',
        tags: ['Sync'],
        parameters: [
          { name: 'since', in: 'query', schema: { type: 'string' }, description: 'ISO timestamp; empty = returns all live entities.' },
          { name: 'types', in: 'query', schema: { type: 'string' }, description: 'Filter by type, e.g.: tasks,projects' },
        ],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/ChangesResponse' } } } } },
      },
    },
    '/events': {
      get: {
        summary: 'Realtime SSE - nudge on changes',
        description: 'Stream text/event-stream; every 2xx mutation emits 1 event {"type":"change"} for the client to poll /changes immediately. Same-origin SPA. Does not maintain long connections on serverless (Vercel).',
        tags: ['Sync'],
        responses: { 200: { description: 'event-stream' } },
      },
    },
    '/hooks/{integration}': {
      post: {
        summary: 'Inbound webhook - external apps push tasks',
        description: 'Arbitrary JSON body mapped to a task based on webhook_endpoints config. Header `X-Signature` = HMAC-SHA256(secret, rawBody) hex.',
        tags: ['Inbound'],
        security: [],
        parameters: [{ name: 'integration', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: {
          201: { description: 'Task created', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskResponse' } } } },
          401: { description: 'Invalid HMAC signature' },
          404: { description: 'Integration does not exist/is disabled' },
        },
      },
    },
    '/keys': {
      get: { summary: 'List API keys (prefix only)', tags: ['Admin'], responses: { 200: { description: 'OK' } } },
      post: { summary: 'Create API key (returns raw key once)', tags: ['Admin'], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { label: { type: 'string' }, scopes: { type: 'array', items: { type: 'string' } } } } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/integrations': {
      get: { summary: 'List inbound endpoints', tags: ['Admin'], responses: { 200: { description: 'OK' } } },
      post: { summary: 'Create/update inbound endpoint (returns secret)', tags: ['Admin'], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { integration: { type: 'string' }, secret: { type: 'string' }, mapping: { type: 'object' }, defaultProjectId: { type: 'string' }, enabled: { type: 'boolean' } } } } } }, responses: { 201: { description: 'Created' } } },
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
    /* Import Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

    /* Typography & Layout */
    body {
      margin: 0;
      background: radial-gradient(circle at top right, #1d1b38, #0b0a16);
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #e2e8f0;
    }

    /* Scrollbar customization */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #0b0a16;
    }
    ::-webkit-scrollbar-thumb {
      background: #2a2550;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #3e3875;
    }

    /* Swagger UI Shell */
    .swagger-ui {
      font-family: inherit !important;
      color: #e2e8f0 !important;
    }

    /* Title & Header section */
    .swagger-ui .info {
      margin: 40px 0 !important;
      padding: 24px !important;
      background: rgba(26, 21, 51, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
    }

    .swagger-ui .info .title {
      color: #ffffff !important;
      font-family: inherit !important;
      font-weight: 700 !important;
      font-size: 2.2rem !important;
      text-shadow: 0 0 20px rgba(242, 95, 92, 0.3);
    }

    .swagger-ui .info li, 
    .swagger-ui .info p, 
    .swagger-ui .info a,
    .swagger-ui .info td {
      color: #94a3b8 !important;
      font-family: inherit !important;
    }

    .swagger-ui .info a {
      color: #38bdf8 !important;
      text-decoration: none !important;
      transition: color 0.2s;
    }
    .swagger-ui .info a:hover {
      color: #7dd3fc !important;
      text-decoration: underline !important;
    }

    /* Scheme & Authorize section */
    .swagger-ui .scheme-container {
      background: rgba(26, 21, 51, 0.5) !important;
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      box-shadow: none !important;
      border-radius: 16px !important;
      padding: 16px 24px !important;
      margin: 20px 0 !important;
      backdrop-filter: blur(10px);
    }

    .swagger-ui .scheme-container select {
      background: #15102a !important;
      color: #e2e8f0 !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 8px !important;
      padding: 6px 12px !important;
    }

    /* Premium Glassmorphic Topbar */
    #swagger-ui .topbar {
      background: rgba(11, 10, 22, 0.7) !important;
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding: 14px 0 !important;
    }

    #swagger-ui .topbar-wrapper img {
      display: none !important;
    }

    #swagger-ui .topbar-wrapper::before {
      content: 'FOCUS TO-DO';
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      font-size: 1.3rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      background: linear-gradient(135deg, #ff7e67, #f25f5c);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      padding-left: 1rem;
    }

    #swagger-ui .topbar-wrapper::after {
      content: 'DEVELOPER PORTAL';
      color: rgba(255, 255, 255, 0.4);
      font-family: 'Outfit', sans-serif;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      margin-left: 8px;
      align-self: center;
      border-left: 1px solid rgba(255, 255, 255, 0.15);
      padding-left: 8px;
    }

    /* Buttons (Authorize, Try it out) */
    .swagger-ui .btn.authorize {
      background: linear-gradient(135deg, #10b981, #059669) !important;
      color: #ffffff !important;
      border: none !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25) !important;
      transition: all 0.2s !important;
      font-weight: 600 !important;
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
    }

    .swagger-ui .btn.authorize:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4) !important;
    }

    .swagger-ui .btn.authorize svg {
      fill: #ffffff !important;
    }

    .swagger-ui .btn {
      background: #1f1a3a !important;
      color: #e2e8f0 !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 8px !important;
      transition: all 0.2s !important;
    }

    .swagger-ui .btn:hover {
      background: #2b2550 !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
    }

    /* Operation Blocks & Cards */
    .swagger-ui .opblock-tag-section {
      background: rgba(26, 21, 51, 0.2) !important;
      border-radius: 12px;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 255, 255, 0.02);
    }

    .swagger-ui .opblock-tag {
      color: #ffffff !important;
      font-family: inherit !important;
      font-size: 1.3rem !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      padding: 16px 20px !important;
      font-weight: 600 !important;
    }

    .swagger-ui .opblock-tag small {
      color: #64748b !important;
      font-family: inherit !important;
    }

    .swagger-ui .opblock {
      border-radius: 10px !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
      margin-bottom: 12px !important;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.03) !important;
    }

    /* Neon API Method Badges & Backgrounds */
    /* GET */
    .swagger-ui .opblock.opblock-get {
      background: rgba(14, 116, 144, 0.15) !important;
      border-color: rgba(14, 116, 144, 0.3) !important;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary-method {
      background: #0e7490 !important;
      color: #ffffff !important;
      border-radius: 6px;
      font-weight: 700;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary-path {
      color: #38bdf8 !important;
      font-weight: 600;
    }

    /* POST */
    .swagger-ui .opblock.opblock-post {
      background: rgba(4, 120, 87, 0.15) !important;
      border-color: rgba(4, 120, 87, 0.3) !important;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-method {
      background: #047857 !important;
      color: #ffffff !important;
      border-radius: 6px;
      font-weight: 700;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary-path {
      color: #34d399 !important;
      font-weight: 600;
    }

    /* PUT */
    .swagger-ui .opblock.opblock-put {
      background: rgba(180, 83, 9, 0.15) !important;
      border-color: rgba(180, 83, 9, 0.3) !important;
    }
    .swagger-ui .opblock.opblock-put .opblock-summary-method {
      background: #b45309 !important;
      color: #ffffff !important;
      border-radius: 6px;
      font-weight: 700;
    }
    .swagger-ui .opblock.opblock-put .opblock-summary-path {
      color: #fbbf24 !important;
      font-weight: 600;
    }

    /* DELETE */
    .swagger-ui .opblock.opblock-delete {
      background: rgba(185, 28, 28, 0.15) !important;
      border-color: rgba(185, 28, 28, 0.3) !important;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method {
      background: #b91c1c !important;
      color: #ffffff !important;
      border-radius: 6px;
      font-weight: 700;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary-path {
      color: #f87171 !important;
      font-weight: 600;
    }

    /* PATCH */
    .swagger-ui .opblock.opblock-patch {
      background: rgba(109, 40, 217, 0.15) !important;
      border-color: rgba(109, 40, 217, 0.3) !important;
    }
    .swagger-ui .opblock.opblock-patch .opblock-summary-method {
      background: #6d28d9 !important;
      color: #ffffff !important;
      border-radius: 6px;
      font-weight: 700;
    }
    .swagger-ui .opblock.opblock-patch .opblock-summary-path {
      color: #a78bfa !important;
      font-weight: 600;
    }

    .swagger-ui .opblock .opblock-summary-description {
      color: #94a3b8 !important;
      font-family: inherit !important;
    }

    /* Parameters & Request Forms */
    .swagger-ui .opblock-section-header {
      background: rgba(15, 12, 35, 0.6) !important;
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      border-radius: 8px;
    }
    .swagger-ui .opblock-section-header h4 {
      color: #ffffff !important;
      font-family: inherit !important;
    }

    .swagger-ui table.parameters thead tr th {
      color: #ffffff !important;
      font-family: inherit !important;
      border-bottom: 2px solid rgba(255, 255, 255, 0.08) !important;
    }

    .swagger-ui .parameter__name {
      color: #38bdf8 !important;
      font-family: inherit !important;
      font-weight: 600 !important;
    }

    .swagger-ui .parameter__type {
      color: #a78bfa !important;
      font-family: inherit !important;
    }

    .swagger-ui .parameter__desc {
      color: #94a3b8 !important;
      font-family: inherit !important;
    }

    .swagger-ui input[type=text], 
    .swagger-ui textarea {
      background: #0f0b21 !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: #e2e8f0 !important;
      border-radius: 6px !important;
      padding: 8px 12px !important;
      font-family: inherit !important;
      outline: none;
    }

    .swagger-ui input[type=text]:focus, 
    .swagger-ui textarea:focus {
      border-color: #f25f5c !important;
      box-shadow: 0 0 8px rgba(242, 95, 92, 0.2) !important;
    }

    /* Responses Block */
    .swagger-ui .responses-table {
      background: transparent !important;
    }
    .swagger-ui .response-col_status {
      color: #ffffff !important;
      font-weight: 600 !important;
    }
    .swagger-ui .response-col_description {
      color: #e2e8f0 !important;
    }

    /* Code Syntax / JSON view */
    .swagger-ui section.models {
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      border-radius: 12px !important;
      background: rgba(26, 21, 51, 0.2) !important;
      margin-top: 30px !important;
    }

    .swagger-ui section.models h4 {
      color: #ffffff !important;
      font-family: inherit !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      padding: 16px 20px !important;
    }

    .swagger-ui section.models .model-container {
      background: transparent !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03) !important;
      margin: 0 !important;
      padding: 12px 20px !important;
    }

    .swagger-ui .model-title {
      color: #38bdf8 !important;
      font-family: inherit !important;
    }

    .swagger-ui .model {
      color: #e2e8f0 !important;
      font-family: Monaco, Consolas, "Andale Mono", monospace !important;
    }

    .swagger-ui pre {
      background: #090616 !important;
      border: 1px solid rgba(255, 255, 255, 0.05) !important;
      border-radius: 8px !important;
      padding: 14px !important;
      color: #818cf8 !important;
      font-size: 0.85rem !important;
    }

    .swagger-ui code {
      color: #f472b6 !important;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
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
