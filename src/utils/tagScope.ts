import type { Tag, Project, Folder, ViewType } from '@/types';
import { getAncestorFolderIds, getDescendantFolderIds } from '@/utils/folderUtils';

// ============================================================
// Tag scope by Project / Folder.
// Global tags (no projectId or folderId) always visible.
// Folder-bound tags inherit down the subtree (child projects + child folders).
// ============================================================

export function isGlobalTag(tag: Tag): boolean {
  return !tag.projectId && !tag.folderId;
}

export interface TagScopeContext {
  projectId?: string | null;
  folderId?: string | null;
}

// Returns tags related to the current context.
// No context (both projectId and folderId are empty) -> return all tags.
export function getVisibleTags(
  tags: Tag[],
  folders: Folder[],
  projects: Project[],
  ctx: TagScopeContext,
): Tag[] {
  const activeTags = tags.filter((t) => t.isVisible !== false);

  // Project context.
  if (ctx.projectId) {
    const project = projects.find((p) => p.id === ctx.projectId);
    const folderChain = project?.folderId
      ? new Set(getAncestorFolderIds(folders, project.folderId))
      : new Set<string>();
    return activeTags.filter(
      (t) =>
        isGlobalTag(t) ||
        t.projectId === ctx.projectId ||
        (!!t.folderId && folderChain.has(t.folderId)),
    );
  }

  // Folder context.
  if (ctx.folderId) {
    const subtree = new Set(getDescendantFolderIds(folders, ctx.folderId));
    const ancestors = getAncestorFolderIds(folders, ctx.folderId);
    const scopeFolders = new Set<string>([...subtree, ...ancestors]);
    const projectIdsInSubtree = new Set(
      projects.filter((p) => p.folderId && subtree.has(p.folderId)).map((p) => p.id),
    );
    return activeTags.filter(
      (t) =>
        isGlobalTag(t) ||
        (!!t.folderId && scopeFolders.has(t.folderId)) ||
        (!!t.projectId && projectIdsInSubtree.has(t.projectId)),
    );
  }

  // No context -> show all.
  return activeTags;
}

// Convert navigation state (activeView/activeProjectId/activeFolderId) to context,
// then filter tags. View is not project/folder -> no context -> show all.
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
