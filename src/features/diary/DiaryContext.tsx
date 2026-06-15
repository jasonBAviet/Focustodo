import React, { createContext, useContext, useCallback, useState, useMemo } from 'react';
import type { Diary, Priority } from '@/types';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { uuid } from '@/utils/uuid';
import { dateUtils } from '@/utils/dateUtils';
export const DEFAULT_DIARY_TEMPLATE = `### 🏆 Thành quả đạt được (Wins of the Day)
- 

### 🧩 Khó khăn & Bài học (Challenges & Lessons)
- 

### 💭 Cảm nhận & Suy nghĩ (Feelings & Reflections)
- 

### 🎯 Mục tiêu tiếp theo (Focus for Tomorrow)
- `;

interface DiaryContextType {
  diaries: Diary[];
  addDiary: (title: string, projectId?: string | null, priority?: Priority, taskId?: string | null) => Diary;
  updateDiary: (id: string, updates: Partial<Diary>) => void;
  deleteDiary: (id: string) => void;
  selectedDiaryId: string | null;
  setSelectedDiaryId: (id: string | null) => void;
}

export const DiaryContext = createContext<DiaryContextType | null>(null);

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const { diaries, setDiaries, deletedIdsRef } = useTaskContext();
  const [selectedDiaryId, setSelectedDiaryId] = useState<string | null>(null);

  const addDiary = useCallback(
    (title: string, projectId: string | null = null, priority: Priority = 'none', taskId: string | null = null): Diary => {
      const now = dateUtils.now();
      const newDiary: Diary = {
        id: uuid(),
        title,
        projectId,
        priority,
        dueDate: null,
        reminder: null,
        repeat: 'none',
        repeatCustom: null,
        note: DEFAULT_DIARY_TEMPLATE,
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
        taskId,
      };

      setDiaries((prev: Diary[]) => [...prev, newDiary]);
      return newDiary;
    },
    [setDiaries]
  );

  const updateDiary = useCallback(
    (id: string, updates: Partial<Diary>) => {
      setDiaries((prev: Diary[]) =>
        prev.map((d) => (d.id === id ? { ...d, ...updates, updatedAt: dateUtils.now() } : d))
      );
    },
    [setDiaries]
  );

  const deleteDiary = useCallback(
    (id: string) => {
      deletedIdsRef.current.diaries.push(id);
      setDiaries((prev: Diary[]) => prev.filter((d) => d.id !== id));
      setSelectedDiaryId((prev) => (prev === id ? null : prev));
    },
    [setDiaries, deletedIdsRef]
  );

  const value = useMemo(() => ({
    diaries,
    addDiary,
    updateDiary,
    deleteDiary,
    selectedDiaryId,
    setSelectedDiaryId,
  }), [diaries, addDiary, updateDiary, deleteDiary, selectedDiaryId]);

  return (
    <DiaryContext.Provider value={value}>
      {children}
    </DiaryContext.Provider>
  );
}

export function useDiaryContext() {
  const ctx = useContext(DiaryContext);
  if (!ctx) {
    throw new Error('useDiaryContext must be used within DiaryProvider');
  }
  return ctx;
}
