import type { Folder } from '@/types';

// ============================================================
// Multi-level nested folder utilities (parent_id).
// All functions prevent cycles using visited set.
// ============================================================

// Root folder: no parent, or parent points to a non-existent folder (orphan).
export function getRootFolders(folders: Folder[]): Folder[] {
  const ids = new Set(folders.map((f) => f.id));
  return folders.filter((f) => !f.parentId || !ids.has(f.parentId));
}

export function getChildFolders(folders: Folder[], parentId: string): Folder[] {
  return folders
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

// All folder ids in the subtree (including itself).
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

// Ancestor chain of a folder (including itself): [folderId, parent, grandparent, ...].
// Go backward by parentId, prevent cycles using visited set.
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

// Is `candidateAncestorId` the ancestor (or itself) of `folderId`?
// Used to prevent making a folder a child of its own subtree.
export function isAncestor(folders: Folder[], candidateAncestorId: string, folderId: string): boolean {
  return getDescendantFolderIds(folders, candidateAncestorId).includes(folderId);
}
