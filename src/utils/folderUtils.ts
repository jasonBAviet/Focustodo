import type { Folder } from '@/types';

// ============================================================
// Tiện ích cây thư mục lồng nhiều cấp (parent_id).
// Mọi hàm chống chu trình bằng tập visited.
// ============================================================

// Thư mục gốc: không có parent, hoặc parent trỏ tới folder không tồn tại (orphan).
export function getRootFolders(folders: Folder[]): Folder[] {
  const ids = new Set(folders.map((f) => f.id));
  return folders.filter((f) => !f.parentId || !ids.has(f.parentId));
}

export function getChildFolders(folders: Folder[], parentId: string): Folder[] {
  return folders
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

// Tất cả id thư mục trong cây con (gồm chính nó).
export function getDescendantFolderIds(folders: Folder[], rootId: string): string[] {
  const childrenByParent = new Map<string, Folder[]>();
  for (const f of folders) {
    const pid = f.parentId ?? null;
    if (pid) {
      const arr = childrenByParent.get(pid) ?? [];
      arr.push(f);
      childrenByParent.set(pid, arr);
    }
  }
  const result: string[] = [];
  const visited = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    result.push(id);
    for (const child of childrenByParent.get(id) ?? []) stack.push(child.id);
  }
  return result;
}

// Chuỗi tổ tiên của một folder (gồm chính nó): [folderId, parent, grandparent, ...].
// Đi ngược theo parentId, chống chu trình bằng tập visited.
export function getAncestorFolderIds(folders: Folder[], folderId: string): string[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const result: string[] = [];
  const visited = new Set<string>();
  let cur: string | null | undefined = folderId;
  while (cur && !visited.has(cur) && byId.has(cur)) {
    visited.add(cur);
    result.push(cur);
    cur = byId.get(cur)!.parentId ?? null;
  }
  return result;
}

// Có phải `candidateAncestorId` là tổ tiên (hoặc chính) của `folderId` không?
// Dùng để chặn việc đặt một folder làm con của chính cây con của nó.
export function isAncestor(folders: Folder[], candidateAncestorId: string, folderId: string): boolean {
  return getDescendantFolderIds(folders, candidateAncestorId).includes(folderId);
}
