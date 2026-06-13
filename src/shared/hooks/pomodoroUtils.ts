import type { PomodoroPhase, Settings, PomodoroSession, PomodoroRecord } from '@/types';
import { uuid } from '@/utils/uuid';

export function getPhaseDuration(phase: PomodoroPhase, settings: Settings): number {
  switch (phase) {
    case 'focus':       return settings.pomodoroLength * 60;
    case 'short-break': return settings.shortBreakLength * 60;
    case 'long-break':  return settings.longBreakLength * 60;
    default:            return settings.pomodoroLength * 60;
  }
}

export function getNextPhase(
  currentPhase: PomodoroPhase,
  cycleCount: number,
  settings: Settings,
): PomodoroPhase {
  if (currentPhase === 'focus') {
    const nextCycle = cycleCount + 1;
    if (nextCycle % settings.longBreakAfter === 0) return 'long-break';
    return 'short-break';
  }
  return 'focus';
}

export function createSessionRecord(
  phase: PomodoroPhase,
  settings: Settings,
  focusElapsedSeconds: number,
  taskId: string | null,
  taskTitle: string | null,
  startTime: string,
  endTime: string,
  completed: boolean
): PomodoroSession {
  const focusMinutes = Math.round(focusElapsedSeconds / 60);
  return {
    id: uuid(),
    taskId,
    taskTitle,
    type: phase as 'focus' | 'short-break' | 'long-break',
    duration: phase === 'focus' ? focusMinutes : (phase === 'short-break' ? settings.shortBreakLength : settings.longBreakLength),
    startTime,
    endTime,
    completed,
  };
}

export function createInitialPomodoroRecord(
  taskId: string | null,
  taskTitle: string | null,
  startTime: string
): PomodoroRecord {
  return {
    id: uuid(),
    taskId,
    taskTitle,
    startTime,
    endTime: null,
    breakStart: null,
    breakEnd: null,
    completed: false,
    createdAt: startTime,
    updatedAt: startTime,
  };
}

export function updateRecordOnPhaseEnd(
  currentPhase: PomodoroPhase,
  nextPhase: PomodoroPhase | null,
  now: string,
  completed: boolean,
  activeRecordId: string | null,
  onPomodoroRecordUpdate?: (id: string, updates: Partial<PomodoroRecord>) => void
): string | null {
  if (!activeRecordId || !onPomodoroRecordUpdate) return currentPhase === 'focus' ? activeRecordId : null;
  
  if (currentPhase === 'focus') {
    const breakStart = (nextPhase === 'short-break' || nextPhase === 'long-break') ? now : null;
    setTimeout(() => {
      onPomodoroRecordUpdate(activeRecordId, {
        endTime: now,
        breakStart: breakStart,
        completed,
        updatedAt: now,
      });
    }, 0);
    return activeRecordId;
  } else if (currentPhase === 'short-break' || currentPhase === 'long-break') {
    setTimeout(() => {
      onPomodoroRecordUpdate(activeRecordId, {
        breakEnd: now,
        updatedAt: now,
      });
    }, 0);
    return null;
  }
  return activeRecordId;
}
