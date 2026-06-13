import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { PomodoroPhase, PomodoroSession, Settings, PomodoroRecord } from '@/types';
import { getPhaseDuration, getNextPhase, createSessionRecord, createInitialPomodoroRecord, updateRecordOnPhaseEnd } from './pomodoroUtils';
import { dateUtils } from '@/utils/dateUtils';

interface PomodoroState {
  phase: PomodoroPhase;
  timeLeft: number;
  isRunning: boolean;
  cycleCount: number;
  currentTaskId: string | null;
  currentTaskTitle: string | null;
  totalSecondsThisSession: number;
}

interface UsePomodoroParams {
  settings: Settings;
  onSessionComplete: (session: PomodoroSession) => void;
  onFocusTimeUpdate: (taskId: string, seconds: number) => void;
  onPomodoroRecordStart?: (record: PomodoroRecord) => void;
  onPomodoroRecordUpdate?: (id: string, updates: Partial<PomodoroRecord>) => void;
  onPomodoroCountIncrement?: (taskId: string) => void;
}

interface UsePomodoroReturn extends PomodoroState {
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setTask: (taskId: string, taskTitle: string) => void;
  progressPercent: number;
  totalFocusedToday: number;
}

function usePomodoro({
  settings,
  onSessionComplete,
  onFocusTimeUpdate,
  onPomodoroRecordStart,
  onPomodoroRecordUpdate,
  onPomodoroCountIncrement,
}: UsePomodoroParams): UsePomodoroReturn {
  const [state, setState] = useState<PomodoroState>({
    phase: 'idle',
    timeLeft: settings.pomodoroLength * 60,
    isRunning: false,
    cycleCount: 0,
    currentTaskId: null,
    currentTaskTitle: null,
    totalSecondsThisSession: 0,
  });

  const [totalFocusedToday, setTotalFocusedToday] = useState<number>(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  const settingsRef = useRef(settings);
  const sessionStartRef = useRef<string>(dateUtils.now());
  const activeRecordIdRef = useRef<string | null>(null);
  const focusElapsedRef = useRef<number>(0);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handlePhaseComplete = useCallback(() => {
    clearTimer();
    const current = stateRef.current;
    const cfg = settingsRef.current;
    const now = dateUtils.now();

    const focusMinutes = Math.round(focusElapsedRef.current / 60);
    const session = createSessionRecord(current.phase, cfg, focusElapsedRef.current, current.currentTaskId, current.currentTaskTitle, sessionStartRef.current, now, true);
    
    if (current.phase !== 'focus' || focusMinutes >= 1) {
      onSessionComplete(session);
    }

    let newCycleCount = current.cycleCount;
    if (current.phase === 'focus') {
      newCycleCount += 1;
      setTotalFocusedToday((prev) => prev + cfg.pomodoroLength);
      if (current.currentTaskId && onPomodoroCountIncrement) {
        onPomodoroCountIncrement(current.currentTaskId);
      }
    }

    const nextPhase = getNextPhase(current.phase, newCycleCount, cfg);
    const nextTimeLeft = getPhaseDuration(nextPhase, cfg);
    
    if (nextPhase === 'focus') {
      focusElapsedRef.current = 0;
    }

    activeRecordIdRef.current = updateRecordOnPhaseEnd(current.phase, nextPhase, now, true, activeRecordIdRef.current, onPomodoroRecordUpdate);

    setState((prev) => ({
      ...prev,
      phase: nextPhase,
      timeLeft: nextTimeLeft,
      cycleCount: newCycleCount,
      isRunning: false,
    }));

    const shouldAutoStart = (nextPhase === 'focus' && cfg.autoStartNextPomodoro) || (nextPhase !== 'focus' && cfg.autoStartBreak && !cfg.disableBreak);

    if (shouldAutoStart) {
      setTimeout(() => {
        const startNow = dateUtils.now();
        sessionStartRef.current = startNow;
        
        if (nextPhase === 'focus') {
          const record = createInitialPomodoroRecord(current.currentTaskId, current.currentTaskTitle, startNow);
          activeRecordIdRef.current = record.id;
          if (onPomodoroRecordStart) onPomodoroRecordStart(record);
        }
        
        intervalRef.current = setInterval(() => tick(), 1000);
        setState((prev) => ({ ...prev, isRunning: true }));
      }, 300);
    }
  }, [clearTimer, onSessionComplete, onPomodoroRecordStart, onPomodoroRecordUpdate, onPomodoroCountIncrement]);

  const tick = useCallback(() => {
    const current = stateRef.current;
    if (current.phase === 'focus' && current.currentTaskId) {
      onFocusTimeUpdate(current.currentTaskId, 1);
    }
    if (current.phase === 'focus') {
      focusElapsedRef.current += 1;
    }
    setState((prev) => {
      const next = prev.timeLeft - 1;
      if (next <= 0) {
        setTimeout(() => handlePhaseComplete(), 0);
        return { ...prev, timeLeft: 0 };
      }
      return {
        ...prev,
        timeLeft: next,
        totalSecondsThisSession: prev.totalSecondsThisSession + (prev.phase === 'focus' ? 1 : 0),
      };
    });
  }, [handlePhaseComplete, onFocusTimeUpdate]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const start = useCallback(() => {
    clearTimer();
    setState((prev) => {
      const phase = prev.phase === 'idle' ? 'focus' : prev.phase;
      const timeLeft = prev.phase === 'idle' ? settingsRef.current.pomodoroLength * 60 : prev.timeLeft;
      const now = dateUtils.now();
      sessionStartRef.current = now;

      if (prev.phase === 'idle') {
        focusElapsedRef.current = 0;
        const record = createInitialPomodoroRecord(prev.currentTaskId, prev.currentTaskTitle, now);
        activeRecordIdRef.current = record.id;
        if (onPomodoroRecordStart) {
          setTimeout(() => onPomodoroRecordStart(record), 0);
        }
      }
      return { ...prev, phase, timeLeft, isRunning: true };
    });
    intervalRef.current = setInterval(() => tick(), 1000);
  }, [clearTimer, tick, onPomodoroRecordStart]);

  const pause = useCallback(() => {
    clearTimer();
    setState((prev) => ({ ...prev, isRunning: false }));
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    const current = stateRef.current;
    const now = dateUtils.now();
    if (current.phase === 'focus') {
      const focusMinutes = Math.round(focusElapsedRef.current / 60);
      if (focusMinutes >= 1) {
        onSessionComplete(createSessionRecord('focus', settingsRef.current, focusElapsedRef.current, current.currentTaskId, current.currentTaskTitle, sessionStartRef.current, now, false));
      }
    }
    activeRecordIdRef.current = updateRecordOnPhaseEnd(current.phase, null, now, false, activeRecordIdRef.current, onPomodoroRecordUpdate);
    focusElapsedRef.current = 0;
    setState((prev) => ({ ...prev, phase: 'idle', timeLeft: settingsRef.current.pomodoroLength * 60, isRunning: false, totalSecondsThisSession: 0 }));
  }, [clearTimer, onPomodoroRecordUpdate, onSessionComplete]);

  const skip = useCallback(() => {
    clearTimer();
    const current = stateRef.current;
    const now = dateUtils.now();
    
    if (current.phase === 'focus') {
      const focusMinutes = Math.round(focusElapsedRef.current / 60);
      if (focusMinutes >= 1) {
        onSessionComplete(createSessionRecord('focus', settingsRef.current, focusElapsedRef.current, current.currentTaskId, current.currentTaskTitle, sessionStartRef.current, now, false));
      }
    }
    const nextPhase = getNextPhase(current.phase === 'idle' ? 'focus' : current.phase, current.cycleCount, settingsRef.current);
    activeRecordIdRef.current = updateRecordOnPhaseEnd(current.phase, nextPhase, now, false, activeRecordIdRef.current, onPomodoroRecordUpdate);

    setState((prev) => {
      const nPhase = getNextPhase(prev.phase === 'idle' ? 'focus' : prev.phase, prev.cycleCount, settingsRef.current);
      return { ...prev, phase: nPhase, timeLeft: getPhaseDuration(nPhase, settingsRef.current), isRunning: false };
    });
    focusElapsedRef.current = 0;
  }, [clearTimer, onPomodoroRecordUpdate, onSessionComplete]);

  const setTask = useCallback((taskId: string, taskTitle: string) => {
    setState((prev) => ({ ...prev, currentTaskId: taskId, currentTaskTitle: taskTitle }));
  }, []);

  const progressPercent = useMemo(() => {
    if (state.phase === 'idle') return 0;
    const total = getPhaseDuration(state.phase, settings);
    if (total === 0) return 0;
    return Math.round(((total - state.timeLeft) / total) * 100);
  }, [state.phase, state.timeLeft, settings]);

  return { ...state, start, pause, reset, skip, setTask, progressPercent, totalFocusedToday };
}

export default usePomodoro;
