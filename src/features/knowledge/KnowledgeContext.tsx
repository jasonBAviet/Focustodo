import React, { createContext, useContext, useCallback, useState } from 'react';
import type { Knowledge, Priority } from '@/types';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { uuid } from '@/utils/uuid';
import { dateUtils } from '@/utils/dateUtils';

interface KnowledgeContextType {
  knowledges: Knowledge[];
  addKnowledge: (title: string, projectId?: string | null, priority?: Priority) => Knowledge;
  updateKnowledge: (id: string, updates: Partial<Knowledge>) => void;
  deleteKnowledge: (id: string) => void;
  selectedKnowledgeId: string | null;
  setSelectedKnowledgeId: (id: string | null) => void;
}

export const KnowledgeContext = createContext<KnowledgeContextType | null>(null);

export function KnowledgeProvider({ children }: { children: React.ReactNode }) {
  const { knowledges, setKnowledges, deletedIdsRef } = useTaskContext();
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string | null>(null);

  const addKnowledge = useCallback(
    (title: string, projectId: string | null = null, priority: Priority = 'none'): Knowledge => {
      const now = dateUtils.now();
      const newKnowledge: Knowledge = {
        id: uuid(),
        title,
        projectId,
        priority,
        dueDate: null,
        reminder: null,
        repeat: 'none',
        repeatCustom: null,
        note: '',
        subtasks: [],
        pomodoroEstimate: 1,
        pomodoroCompleted: 0,
        totalFocusTime: 0,
        completed: false,
        flagged: false,
        tags: [],
        createdAt: now,
        completedAt: null,
        updatedAt: now,
      };

      setKnowledges((prev: Knowledge[]) => [...prev, newKnowledge]);
      return newKnowledge;
    },
    [setKnowledges]
  );

  const updateKnowledge = useCallback(
    (id: string, updates: Partial<Knowledge>) => {
      setKnowledges((prev: Knowledge[]) =>
        prev.map((k) => (k.id === id ? { ...k, ...updates, updatedAt: dateUtils.now() } : k))
      );
    },
    [setKnowledges]
  );

  const deleteKnowledge = useCallback(
    (id: string) => {
      deletedIdsRef.current.knowledges.push(id);
      setKnowledges((prev: Knowledge[]) => prev.filter((k) => k.id !== id));
      setSelectedKnowledgeId((prev) => (prev === id ? null : prev));
    },
    [setKnowledges, deletedIdsRef]
  );

  return (
    <KnowledgeContext.Provider
      value={{
        knowledges,
        addKnowledge,
        updateKnowledge,
        deleteKnowledge,
        selectedKnowledgeId,
        setSelectedKnowledgeId,
      }}
    >
      {children}
    </KnowledgeContext.Provider>
  );
}

export function useKnowledgeContext() {
  const ctx = useContext(KnowledgeContext);
  if (!ctx) {
    throw new Error('useKnowledgeContext must be used within KnowledgeProvider');
  }
  return ctx;
}
