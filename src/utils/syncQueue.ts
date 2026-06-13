// Module quan ly hang doi dong bo hoa du lieu khi mat mang (Sync Queue)
// Khi mat mang, cac thao tac ghi duoc luu vao hang doi nay
// Khi co mang tro lai, hang doi tu dong gui len API

import { getAll, upsert, deleteById, STORES } from '@/utils/offlineDB';
import { loadToken } from '@/utils/secureStorage';

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncEntity = 'tasks' | 'projects' | 'folders' | 'tags';

export interface SyncQueueItem {
  id?: number;
  operation: SyncOperation;
  entity: SyncEntity;
  entity_id: string;
  payload: Record<string, unknown>;
  created_at: string;
  retry_count: number;
}

const MAX_RETRY = 3;

// Them 1 thao tac vao hang doi
export async function enqueue(
  operation: SyncOperation,
  entity: SyncEntity,
  entity_id: string,
  payload: Record<string, unknown>
): Promise<void> {
  const item: SyncQueueItem = {
    operation,
    entity,
    entity_id,
    payload,
    created_at: new Date().toISOString(),
    retry_count: 0,
  };
  await upsert(STORES.SYNC_QUEUE, item);
}

// Lay toan bo hang doi (theo thu tu thoi gian tao)
export async function getQueue(): Promise<SyncQueueItem[]> {
  const items = await getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
  return items.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

// Xoa 1 muc da dong bo hoa thanh cong
export async function dequeue(id: number): Promise<void> {
  await deleteById(STORES.SYNC_QUEUE, id);
}

// Chay qua trinh dong bo hoa: gui tung muc trong hang doi len API
export async function runSync(): Promise<{ success: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  let success = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await syncItem(item);
      if (item.id !== undefined) await dequeue(item.id);
      success++;
    } catch (err) {
      console.warn('[SyncQueue] Dong bo that bai cho item:', item.id, err);
      failed++;
      // Tang so lan thu lai, neu vuot qua gioi han thi xoa
      if (item.retry_count >= MAX_RETRY - 1) {
        if (item.id !== undefined) await dequeue(item.id);
        console.error('[SyncQueue] Xoa item sau', MAX_RETRY, 'lan thu:', item);
      } else {
        const updated: SyncQueueItem = { ...item, retry_count: item.retry_count + 1 };
        await upsert(STORES.SYNC_QUEUE, updated);
      }
    }
  }

  return { success, failed };
}

// Ham noi bo: thuc hien 1 thao tac dong bo len API
async function syncItem(item: SyncQueueItem): Promise<void> {
  const { operation, entity, entity_id, payload } = item;
  let url = `/api/${entity}`;
  let method = 'POST';

  if (operation === 'UPDATE') {
    url = `/api/${entity}/${entity_id}`;
    method = 'PUT';
  } else if (operation === 'DELETE') {
    url = `/api/${entity}/${entity_id}`;
    method = 'DELETE';
  }

  const token = await loadToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: operation !== 'DELETE' ? JSON.stringify(payload) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}

// Khoi dong trinh lang nghe trang thai mang, tu dong chay dong bo khi online tro lai
export function startNetworkListener(): () => void {
  const handleOnline = async () => {
    console.log('[SyncQueue] Co mang tro lai, bat dau dong bo hoa...');
    const result = await runSync();
    console.log('[SyncQueue] Ket qua dong bo:', result);
    // Phat su kien de UI co the cap nhat
    window.dispatchEvent(new CustomEvent('sync-complete', { detail: result }));
  };

  window.addEventListener('online', handleOnline);

  // Tra ve ham cleanup de goi khi component unmount
  return () => window.removeEventListener('online', handleOnline);
}
