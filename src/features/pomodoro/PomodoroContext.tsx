import React, { createContext, useContext, useState, useCallback } from 'react';
import usePomodoro from '@/shared/hooks/usePomodoro';
import { useAppContext } from '@/core/contexts/AppContext';
import { useTaskContext } from '@/features/tasks/TaskContext';
import type { PomodoroSession } from '@/types';

interface PomodoroContextType {
  phase: string;
  timeLeft: number;
  isRunning: boolean;
  cycleCount: number;
  currentTaskId: string | null;
  currentTaskTitle: string | null;
  progressPercent: number;
  totalFocusedToday: number;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  activateTask: (taskId: string, taskTitle: string) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useAppContext();
  const { tasks, updateTask, addPomodoroSession, addPomodoroRecord, updatePomodoroRecord } = useTaskContext();
  const [showModal, setShowModal] = useState(false);

  const handleSessionComplete = useCallback((session: PomodoroSession) => {
    addPomodoroSession(session);
  }, [addPomodoroSession]);

  const handleFocusTimeUpdate = useCallback((taskId: string, seconds: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const addedMinutes = seconds / 60;
    updateTask(taskId, { totalFocusTime: (task.totalFocusTime ?? 0) + addedMinutes });
  }, [tasks, updateTask]);

  // Mỗi pomodoro chạy hết giờ -> tăng số pomodoro hoàn thành của task
  const handlePomodoroCountIncrement = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    updateTask(taskId, { pomodoroCompleted: (task.pomodoroCompleted ?? 0) + 1 });
  }, [tasks, updateTask]);

  const pomo = usePomodoro({
    settings,
    onSessionComplete: handleSessionComplete,
    onFocusTimeUpdate: handleFocusTimeUpdate,
    onPomodoroRecordStart: addPomodoroRecord,
    onPomodoroRecordUpdate: updatePomodoroRecord,
    onPomodoroCountIncrement: handlePomodoroCountIncrement,
  });

  const activateTask = useCallback((taskId: string, taskTitle: string) => {
    pomo.setTask(taskId, taskTitle);
    pomo.start();
    setShowModal(true);
  }, [pomo]);

  const value: PomodoroContextType = {
    phase: pomo.phase,
    timeLeft: pomo.timeLeft,
    isRunning: pomo.isRunning,
    cycleCount: pomo.cycleCount,
    currentTaskId: pomo.currentTaskId,
    currentTaskTitle: pomo.currentTaskTitle,
    progressPercent: pomo.progressPercent,
    totalFocusedToday: pomo.totalFocusedToday,
    showModal,
    setShowModal,
    activateTask,
    start: pomo.start,
    pause: pomo.pause,
    reset: pomo.reset,
    skip: pomo.skip,
  };

  return (
    <PomodoroContext.Provider value={value}>
      {children}
    </PomodoroContext.Provider>
  );
};

export const usePomodoroContext = (): PomodoroContextType => {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error('usePomodoroContext must be used within PomodoroProvider');
  }
  return context;
};
