// ============================================================
// FOCUS TO-DO - usePomodoro
// Custom hook quản lý Pomodoro timer với đầy đủ logic chu kỳ
// ============================================================
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { PomodoroPhase, PomodoroSession, Settings, PomodoroRecord } from '../types';
import { dateUtils } from '../utils/dateUtils';
import { uuid } from '../utils/uuid';

// ----------------------------------------------------------
// Kiểu trạng thái nội bộ của Pomodoro
// ----------------------------------------------------------
interface PomodoroState {
  phase: PomodoroPhase;
  timeLeft: number;           // Số giây còn lại
  isRunning: boolean;
  cycleCount: number;          // Số chu kỳ focus đã hoàn thành
  currentTaskId: string | null;
  currentTaskTitle: string | null;
  totalSecondsThisSession: number; // Tổng giây focus trong phiên hiện tại
}

// ----------------------------------------------------------
// Params của hook
// ----------------------------------------------------------
interface UsePomodoroParams {
  settings: Settings;
  onSessionComplete: (session: PomodoroSession) => void;
  onFocusTimeUpdate: (taskId: string, seconds: number) => void;
  onPomodoroRecordStart?: (record: PomodoroRecord) => void;
  onPomodoroRecordUpdate?: (id: string, updates: Partial<PomodoroRecord>) => void;
  onPomodoroCountIncrement?: (taskId: string) => void;
}

// ----------------------------------------------------------
// Trả về của hook
// ----------------------------------------------------------
interface UsePomodoroReturn extends PomodoroState {
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setTask: (taskId: string, taskTitle: string) => void;
  progressPercent: number;    // 0–100
  totalFocusedToday: number;  // Phút đã focus hôm nay (từ session)
}

// ----------------------------------------------------------
// Tính tổng thời gian (giây) của một phase
// ----------------------------------------------------------
function getPhaseDuration(phase: PomodoroPhase, settings: Settings): number {
  switch (phase) {
    case 'focus':       return settings.pomodoroLength * 60;
    case 'short-break': return settings.shortBreakLength * 60;
    case 'long-break':  return settings.longBreakLength * 60;
    default:            return settings.pomodoroLength * 60;
  }
}

// ----------------------------------------------------------
// Xác định phase tiếp theo sau khi phase hiện tại kết thúc
// ----------------------------------------------------------
function getNextPhase(
  currentPhase: PomodoroPhase,
  cycleCount: number,
  settings: Settings,
): PomodoroPhase {
  if (currentPhase === 'focus') {
    // Sau mỗi longBreakAfter chu kỳ -> nghỉ dài
    const nextCycle = cycleCount + 1;
    if (nextCycle % settings.longBreakAfter === 0) return 'long-break';
    return 'short-break';
  }
  // Sau break bất kỳ -> quay lại focus
  return 'focus';
}

// ----------------------------------------------------------
// Hook chính
// ----------------------------------------------------------
function usePomodoro({
  settings,
  onSessionComplete,
  onFocusTimeUpdate,
  onPomodoroRecordStart,
  onPomodoroRecordUpdate,
  onPomodoroCountIncrement,
}: UsePomodoroParams): UsePomodoroReturn {
  // Trạng thái ban đầu - bắt đầu ở idle
  const [state, setState] = useState<PomodoroState>({
    phase: 'idle',
    timeLeft: settings.pomodoroLength * 60,
    isRunning: false,
    cycleCount: 0,
    currentTaskId: null,
    currentTaskTitle: null,
    totalSecondsThisSession: 0,
  });

  // Tổng phút focus hôm nay (theo dõi riêng để hiển thị)
  const [totalFocusedToday, setTotalFocusedToday] = useState<number>(0);

  // Refs để tránh stale closure trong setInterval
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  const settingsRef = useRef(settings);
  const sessionStartRef = useRef<string>(dateUtils.now());
  const activeRecordIdRef = useRef<string | null>(null);
  // Số giây focus thực đã trôi qua trong pha focus hiện tại (reset ở đầu mỗi pha focus)
  const focusElapsedRef = useRef<number>(0);

  // Đồng bộ refs mỗi khi state/settings thay đổi
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // --------------------------------------------------------
  // Dừng interval helper
  // --------------------------------------------------------
  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // --------------------------------------------------------
  // Xử lý khi phase kết thúc (timeLeft = 0)
  // --------------------------------------------------------
  const handlePhaseComplete = useCallback(() => {
    clearTimer();
    const current = stateRef.current;
    const cfg = settingsRef.current;
    const now = dateUtils.now();

    // Tạo session record. Với pha focus, ghi thời lượng THỰC đã trôi qua
    // (round phút) để Σ session ≈ Σ totalFocusTime; pomodoro chạy hết giờ
    // thì giá trị này = pomodoroLength nên không đổi hành vi cũ.
    const focusMinutes = Math.round(focusElapsedRef.current / 60);
    const session: PomodoroSession = {
      id: uuid(),
      taskId: current.currentTaskId,
      taskTitle: current.currentTaskTitle,
      type: current.phase as 'focus' | 'short-break' | 'long-break',
      duration:
        current.phase === 'focus'
          ? focusMinutes
          : current.phase === 'short-break'
          ? cfg.shortBreakLength
          : cfg.longBreakLength,
      startTime: sessionStartRef.current,
      endTime: dateUtils.now(),
      completed: true,
    };
    // Bỏ qua session focus 0 phút (tránh rác); break luôn ghi
    if (current.phase !== 'focus' || focusMinutes >= 1) {
      onSessionComplete(session);
    }

    // Tính chu kỳ mới và phase tiếp theo
    let newCycleCount = current.cycleCount;
    if (current.phase === 'focus') {
      newCycleCount += 1;
      // Cộng thêm vào tổng focus hôm nay (phút)
      setTotalFocusedToday((prev) => prev + cfg.pomodoroLength);
      // Pomodoro chạy hết giờ = 1 pomodoro hoàn thành cho task
      if (current.currentTaskId && onPomodoroCountIncrement) {
        onPomodoroCountIncrement(current.currentTaskId);
      }
    }

    const nextPhase = getNextPhase(current.phase, newCycleCount, cfg);
    const nextTimeLeft = getPhaseDuration(nextPhase, cfg);
    // Bắt đầu một pha focus mới -> reset bộ đếm giây focus thực
    if (nextPhase === 'focus') {
      focusElapsedRef.current = 0;
    }

    // Ghi nhận vòng đời chi tiết
    if (current.phase === 'focus') {
      const recordId = activeRecordIdRef.current;
      if (recordId && onPomodoroRecordUpdate) {
        const breakStart = (nextPhase === 'short-break' || nextPhase === 'long-break') ? now : null;
        setTimeout(() => {
          onPomodoroRecordUpdate(recordId, {
            endTime: now,
            breakStart: breakStart,
            completed: true,
            updatedAt: now,
          });
        }, 0);
      }
    } else if (current.phase === 'short-break' || current.phase === 'long-break') {
      const recordId = activeRecordIdRef.current;
      if (recordId && onPomodoroRecordUpdate) {
        setTimeout(() => {
          onPomodoroRecordUpdate(recordId, {
            breakEnd: now,
            updatedAt: now,
          });
        }, 0);
      }
      activeRecordIdRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      phase: nextPhase,
      timeLeft: nextTimeLeft,
      cycleCount: newCycleCount,
      isRunning: false,
    }));

    // Auto start phase tiếp theo theo cài đặt
    const shouldAutoStart =
      (nextPhase === 'focus' && cfg.autoStartNextPomodoro) ||
      (nextPhase !== 'focus' && cfg.autoStartBreak && !cfg.disableBreak);

    if (shouldAutoStart) {
      // Dùng setTimeout để đảm bảo state đã được cập nhật
      setTimeout(() => {
        const startNow = dateUtils.now();
        sessionStartRef.current = startNow;
        
        // Tạo PomodoroRecord mới khi tự động bắt đầu focus
        if (nextPhase === 'focus') {
          const recordId = uuid();
          activeRecordIdRef.current = recordId;
          if (onPomodoroRecordStart) {
            onPomodoroRecordStart({
              id: recordId,
              taskId: current.currentTaskId,
              taskTitle: current.currentTaskTitle,
              startTime: startNow,
              endTime: null,
              breakStart: null,
              breakEnd: null,
              completed: false,
              createdAt: startNow,
              updatedAt: startNow,
            });
          }
        }
        
        intervalRef.current = setInterval(() => tick(), 1000);
        setState((prev) => ({ ...prev, isRunning: true }));
      }, 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimer, onSessionComplete, onPomodoroRecordStart, onPomodoroRecordUpdate, onPomodoroCountIncrement]);

  // --------------------------------------------------------
  // Tick mỗi giây
  // --------------------------------------------------------
  const tick = useCallback(() => {
    const current = stateRef.current;
    const cfg = settingsRef.current;

    // Cập nhật focus time cho task đang làm
    if (current.phase === 'focus' && current.currentTaskId) {
      onFocusTimeUpdate(current.currentTaskId, 1);
    }
    // Đếm giây focus thực của pha hiện tại (kể cả khi chưa gán task)
    if (current.phase === 'focus') {
      focusElapsedRef.current += 1;
    }

    setState((prev) => {
      const next = prev.timeLeft - 1;
      if (next <= 0) {
        // Gọi handlePhaseComplete ở tick tiếp theo để tránh gọi trong setState
        setTimeout(() => handlePhaseComplete(), 0);
        return { ...prev, timeLeft: 0 };
      }
      // Cộng thêm giây vào totalSecondsThisSession khi đang focus
      const addSec = prev.phase === 'focus' ? 1 : 0;
      return {
        ...prev,
        timeLeft: next,
        totalSecondsThisSession: prev.totalSecondsThisSession + addSec,
      };
    });
    // Dùng cfg để tránh warning unused
    void cfg;
  }, [handlePhaseComplete, onFocusTimeUpdate]);

  // --------------------------------------------------------
  // Dọn dẹp interval khi unmount
  // --------------------------------------------------------
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // --------------------------------------------------------
  // start: bắt đầu đếm ngược
  // --------------------------------------------------------
  const start = useCallback(() => {
    clearTimer();
    setState((prev) => {
      // Nếu đang idle -> chuyển sang focus
      const phase = prev.phase === 'idle' ? 'focus' : prev.phase;
      const timeLeft =
        prev.phase === 'idle'
          ? settingsRef.current.pomodoroLength * 60
          : prev.timeLeft;
      const now = dateUtils.now();
      sessionStartRef.current = now;

      // Tạo PomodoroRecord mới khi chuyển từ idle sang focus thủ công
      if (prev.phase === 'idle') {
        // Bắt đầu pha focus mới -> reset bộ đếm giây focus thực
        focusElapsedRef.current = 0;
        const recordId = uuid();
        activeRecordIdRef.current = recordId;
        if (onPomodoroRecordStart) {
          setTimeout(() => {
            onPomodoroRecordStart({
              id: recordId,
              taskId: prev.currentTaskId,
              taskTitle: prev.currentTaskTitle,
              startTime: now,
              endTime: null,
              breakStart: null,
              breakEnd: null,
              completed: false,
              createdAt: now,
              updatedAt: now,
            });
          }, 0);
        }
      }

      return { ...prev, phase, timeLeft, isRunning: true };
    });
    intervalRef.current = setInterval(() => tick(), 1000);
  }, [clearTimer, tick, onPomodoroRecordStart]);

  // --------------------------------------------------------
  // pause: tạm dừng đếm ngược
  // --------------------------------------------------------
  const pause = useCallback(() => {
    clearTimer();
    setState((prev) => ({ ...prev, isRunning: false }));
  }, [clearTimer]);

  // --------------------------------------------------------
  // reset: đặt lại về idle
  // --------------------------------------------------------
  const reset = useCallback(() => {
    clearTimer();
    const current = stateRef.current;
    const now = dateUtils.now();
    if (current.phase === 'focus') {
      // Ghi nhận phần focus dở (thời gian thực) trước khi huỷ
      const focusMinutes = Math.round(focusElapsedRef.current / 60);
      if (focusMinutes >= 1) {
        onSessionComplete({
          id: uuid(),
          taskId: current.currentTaskId,
          taskTitle: current.currentTaskTitle,
          type: 'focus',
          duration: focusMinutes,
          startTime: sessionStartRef.current,
          endTime: now,
          completed: false,
        });
      }
      const recordId = activeRecordIdRef.current;
      if (recordId && onPomodoroRecordUpdate) {
        setTimeout(() => {
          onPomodoroRecordUpdate(recordId, {
            endTime: now,
            completed: false,
            updatedAt: now,
          });
        }, 0);
      }
    } else if (current.phase === 'short-break' || current.phase === 'long-break') {
      const recordId = activeRecordIdRef.current;
      if (recordId && onPomodoroRecordUpdate) {
        setTimeout(() => {
          onPomodoroRecordUpdate(recordId, {
            breakEnd: now,
            updatedAt: now,
          });
        }, 0);
      }
    }
    activeRecordIdRef.current = null;
    focusElapsedRef.current = 0;

    setState((prev) => ({
      ...prev,
      phase: 'idle',
      timeLeft: settingsRef.current.pomodoroLength * 60,
      isRunning: false,
      totalSecondsThisSession: 0,
    }));
  }, [clearTimer, onPomodoroRecordUpdate, onSessionComplete]);

  // --------------------------------------------------------
  // skip: bỏ qua phase hiện tại, chuyển sang phase tiếp theo
  // --------------------------------------------------------
  const skip = useCallback(() => {
    clearTimer();
    const current = stateRef.current;
    const now = dateUtils.now();
    
    if (current.phase === 'focus') {
      // Ghi nhận phần focus dở (thời gian thực) trước khi bỏ qua
      const focusMinutes = Math.round(focusElapsedRef.current / 60);
      if (focusMinutes >= 1) {
        onSessionComplete({
          id: uuid(),
          taskId: current.currentTaskId,
          taskTitle: current.currentTaskTitle,
          type: 'focus',
          duration: focusMinutes,
          startTime: sessionStartRef.current,
          endTime: now,
          completed: false,
        });
      }
      const recordId = activeRecordIdRef.current;
      if (recordId && onPomodoroRecordUpdate) {
        const nextPhase = getNextPhase(current.phase, current.cycleCount, settingsRef.current);
        const breakStart = (nextPhase === 'short-break' || nextPhase === 'long-break') ? now : null;
        setTimeout(() => {
          onPomodoroRecordUpdate(recordId, {
            endTime: now,
            breakStart: breakStart,
            completed: false,
            updatedAt: now,
          });
        }, 0);
      }
    } else if (current.phase === 'short-break' || current.phase === 'long-break') {
      const recordId = activeRecordIdRef.current;
      if (recordId && onPomodoroRecordUpdate) {
        setTimeout(() => {
          onPomodoroRecordUpdate(recordId, {
            breakEnd: now,
            updatedAt: now,
          });
        }, 0);
      }
      activeRecordIdRef.current = null;
    }

    setState((prev) => {
      const nextPhase = getNextPhase(
        prev.phase === 'idle' ? 'focus' : prev.phase,
        prev.cycleCount,
        settingsRef.current,
      );
      const nextTimeLeft = getPhaseDuration(nextPhase, settingsRef.current);
      return {
        ...prev,
        phase: nextPhase,
        timeLeft: nextTimeLeft,
        isRunning: false,
      };
    });
    // Pha tiếp theo bắt đầu lại từ đầu -> reset bộ đếm giây focus thực
    focusElapsedRef.current = 0;
  }, [clearTimer, onPomodoroRecordUpdate, onSessionComplete]);

  // --------------------------------------------------------
  // setTask: gán task cho phiên hiện tại
  // --------------------------------------------------------
  const setTask = useCallback((taskId: string, taskTitle: string) => {
    setState((prev) => ({
      ...prev,
      currentTaskId: taskId,
      currentTaskTitle: taskTitle,
    }));
  }, []);

  // --------------------------------------------------------
  // Tính progressPercent (0–100)
  // --------------------------------------------------------
  const progressPercent = useMemo(() => {
    if (state.phase === 'idle') return 0;
    const total = getPhaseDuration(state.phase, settings);
    if (total === 0) return 0;
    return Math.round(((total - state.timeLeft) / total) * 100);
  }, [state.phase, state.timeLeft, settings]);

  return {
    ...state,
    start,
    pause,
    reset,
    skip,
    setTask,
    progressPercent,
    totalFocusedToday,
  };
}

export default usePomodoro;
