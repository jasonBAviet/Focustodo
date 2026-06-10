import type { Tag, Project, Folder, ViewType } from '../types';
import { getAncestorFolderIds, getDescendantFolderIds } from './folderUtils';

// ============================================================
// Phạm vi nhãn (tag) theo Dự án / Thư mục.
// Nhãn "dùng chung" (không gắn projectId lẫn folderId) luôn hiện.
// Nhãn gắn thư mục kế thừa xuống cây con (dự án con + thư mục con).
// ============================================================

export function isGlobalTag(tag: Tag): boolean {
  return !tag.projectId && !tag.folderId;
}

export interface TagScopeContext {
  projectId?: string | null;
  folderId?: string | null;
}

// Trả về danh sách nhãn liên quan tới ngữ cảnh hiện tại.
// Không có ngữ cảnh (cả projectId lẫn folderId rỗng) -> trả về tất cả nhãn.
export function getVisibleTags(
  tags: Tag[],
  folders: Folder[],
  projects: Project[],
  ctx: TagScopeContext,
): Tag[] {
  // Ngữ cảnh dự án.
  if (ctx.projectId) {
    const project = projects.find((p) => p.id === ctx.projectId);
    const folderChain = project?.folderId
      ? new Set(getAncestorFolderIds(folders, project.folderId))
      : new Set<string>();
    return tags.filter(
      (t) =>
        isGlobalTag(t) ||
        t.projectId === ctx.projectId ||
        (!!t.folderId && folderChain.has(t.folderId)),
    );
  }

  // Ngữ cảnh thư mục.
  if (ctx.folderId) {
    const subtree = new Set(getDescendantFolderIds(folders, ctx.folderId));
    const ancestors = getAncestorFolderIds(folders, ctx.folderId);
    const scopeFolders = new Set<string>([...subtree, ...ancestors]);
    const projectIdsInSubtree = new Set(
      projects.filter((p) => p.folderId && subtree.has(p.folderId)).map((p) => p.id),
    );
    return tags.filter(
      (t) =>
        isGlobalTag(t) ||
        (!!t.folderId && scopeFolders.has(t.folderId)) ||
        (!!t.projectId && projectIdsInSubtree.has(t.projectId)),
    );
  }

  // Không có ngữ cảnh -> hiện tất cả.
  return tags;
}

// Quy đổi state điều hướng (activeView/activeProjectId/activeFolderId) -> ngữ cảnh,
// rồi lọc nhãn. View không phải project/folder -> không có ngữ cảnh -> hiện tất cả.
export function getContextTags(
  tags: Tag[],
  folders: Folder[],
  projects: Project[],
  activeView: ViewType,
  activeProjectId: string | null,
  activeFolderId: string | null,
): Tag[] {
  const ctx: TagScopeContext =
    activeView === 'project'
      ? { projectId: activeProjectId }
      : activeView === 'folder'
        ? { folderId: activeFolderId }
        : {};
  return getVisibleTags(tags, folders, projects, ctx);
}
