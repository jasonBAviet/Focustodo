import React, { useState, useRef, useEffect } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { usePomodoroContext } from '@/features/pomodoro/PomodoroContext';
import { dateUtils } from '@/utils/dateUtils';

import { useContextMenu } from '@/shared/hooks/useContextMenu';
import ContextMenu from '@/shared/components/ContextMenu';
import EventsSidebar from './EventsSidebar';
import './EventsHub.css';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];



const EventsHub: React.FC = () => {
  const { tasks, updateTask, projects, addTask, deleteTask } = useTaskContext();
  const { activateTask } = usePomodoroContext();

  const contextMenu = useContextMenu<string>();
  const mainAreaRef = useRef<HTMLDivElement>(null);

  const handleCopyTask = (taskId: string) => {
    const originalTask = tasks.find((t) => t.id === taskId);
    if (!originalTask) return;

    const newTask = addTask(
      originalTask.title + ' (Copy)',
      originalTask.projectId,
      originalTask.priority,
      originalTask.pomodoroEstimate
    );

    updateTask(newTask.id, {
      startDate: originalTask.startDate,
      dueDate: originalTask.dueDate,
      tags: originalTask.tags,
      note: originalTask.note,
      subtasks: originalTask.subtasks ? originalTask.subtasks.map(sub => ({ ...sub, id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) })) : []
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa công việc này không?')) {
      deleteTask(taskId);
    }
  };

  // State quản lý ngày được chọn
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // State đóng/mở sidebar bên phải
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // State quản lý slot giờ đang được drag over để tạo hiệu ứng hover
  const [dragOverSlot, setDragOverSlot] = useState<{ hour: number; column: string } | null>(null);

  useEffect(() => {
    const currentHour = new Date().getHours();
    const targetElement = mainAreaRef.current?.querySelector(`[data-hour="${currentHour}"]`);
    if (targetElement) {
      const timer = setTimeout(() => {
        targetElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedDate]);

  // Helper chuyển hướng ngày
  const navigateDay = (direction: 'prev' | 'next' | 'today') => {
    const nextDate = new Date(selectedDate);
    if (direction === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setSelectedDate(today);
    } else if (direction === 'prev') {
      nextDate.setDate(selectedDate.getDate() - 1);
      setSelectedDate(nextDate);
    } else {
      nextDate.setDate(selectedDate.getDate() + 1);
      setSelectedDate(nextDate);
    }
  };

  // Định dạng nhãn ngày tiêu đề (Ví dụ: "Today Monday")
  const getDayLabel = () => {
    const isToday = dateUtils.isToday(selectedDate.toISOString());
    const dayName = WEEKDAYS[selectedDate.getDay()];
    if (isToday) return `Today ${dayName}`;
    return `${dayName} ${dateUtils.formatShort(selectedDate.toISOString())}`;
  };

  // Hàm lọc danh sách công việc ở cột Scheduled và Completed trên Timeline
  const getTimelineTasks = (hour: number, isCompleted: boolean) => {
    return tasks.filter((task) => {
      if (task.completed !== isCompleted) return false;
      const taskDateStr = task.startDate || (isCompleted ? task.completedAt : null);
      if (!taskDateStr) return false;

      const d = new Date(taskDateStr);
      const sameDay =
        d.getFullYear() === selectedDate.getFullYear() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getDate() === selectedDate.getDate();

      return sameDay && d.getHours() === hour;
    });
  };


  // Xử lý kéo thả
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, hour: number, column: string) => {
    e.preventDefault();
    if (!dragOverSlot || dragOverSlot.hour !== hour || dragOverSlot.column !== column) {
      setDragOverSlot({ hour, column });
    }
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    setDragOverSlot(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Đặt thời gian bắt đầu
    const targetDate = new Date(selectedDate);
    targetDate.setHours(hour, 0, 0, 0);

    updateTask(taskId, {
      startDate: targetDate.toISOString(),
      dueDate: targetDate.toISOString(), // Đồng bộ dueDate trùng ngày lập kế hoạch
    });
  };

  // Thêm nhanh task mới từ nút cộng
  const handleAddTaskClick = () => {
    const title = window.prompt('Nhập tiêu đề công việc mới:');
    if (title && title.trim()) {
      const newTask = addTask(title.trim(), null, 'none', 1);
      // Đặt giờ mặc định lúc 9 giờ sáng của ngày đang chọn
      const targetDate = new Date(selectedDate);
      targetDate.setHours(9, 0, 0, 0);
      updateTask(newTask.id, {
        startDate: targetDate.toISOString(),
        dueDate: targetDate.toISOString(),
      });
    }
  };



  return (
    <div className={`events-hub-container ${sidebarCollapsed ? 'sidebar-hidden' : ''}`}>
      {/* Cột chính bên trái: Lịch trình theo giờ */}
      <div ref={mainAreaRef} className="events-main-area">
        <div className="events-header">
          <div className="events-header-left">
            <h1 className="events-title">{getDayLabel()}</h1>
            <div className="events-date-navigator">
              <button className="events-nav-btn" onClick={() => navigateDay('today')}>Today</button>
              <button className="events-nav-btn" onClick={() => navigateDay('prev')}>&lt;</button>
              <button className="events-nav-btn" onClick={() => navigateDay('next')}>&gt;</button>
              <div className="events-date-picker-wrapper">
                <input
                  type="date"
                  className="events-date-input"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    if (e.target.value) {
                      const parts = e.target.value.split('-');
                      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                      d.setHours(0, 0, 0, 0);
                      setSelectedDate(d);
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div className="events-header-actions">
            {sidebarCollapsed && (
              <button
                className="events-open-sidebar-btn"
                onClick={() => setSidebarCollapsed(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                </svg>
                Open Sidebar
              </button>
            )}
            <button className="events-add-btn" onClick={handleAddTaskClick}>+</button>
          </div>
        </div>

        {/* Lưới lịch trình */}
        <div className="events-timeline-container">
          <div className="events-timeline-header">
            <div>Hour</div>
            <div className="events-timeline-header-label">Scheduled</div>
            <div className="events-timeline-header-label">Completed</div>
          </div>

          <div className="events-timeline-body">
            {HOURS.map((hour) => {
              const scheduledTasks = getTimelineTasks(hour, false);
              const completedTasks = getTimelineTasks(hour, true);
              const formattedHour = `${String(hour).padStart(2, '0')}:00 - ${String(hour).padStart(2, '0')}:59`;

              const isDragOverScheduled = dragOverSlot?.hour === hour && dragOverSlot?.column === 'scheduled';

              return (
                <div key={hour} data-hour={hour} className="events-hour-row">
                  <div className="events-hour-time">{formattedHour}</div>
                  
                  {/* Cột Scheduled */}
                  <div
                    className={`events-hour-column scheduled-col ${isDragOverScheduled ? 'drag-over' : ''}`}
                    onDragOver={(e) => handleDragOver(e, hour, 'scheduled')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, hour)}
                  >
                    {scheduledTasks.map((task) => {
                      const projectColor = projects.find((p) => p.id === task.projectId)?.color || 'var(--accent, #f25f5c)';
                      return (
                        <div
                          key={task.id}
                          className={`events-task-card priority-${task.priority}`}
                          style={{ borderLeft: `4px solid ${projectColor}` }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onContextMenu={(e) => contextMenu.open(e, task.id)}
                        >
                          <div className="events-task-card-content">
                            <span className="events-task-title" title={task.title}>{task.title}</span>
                            <span className="events-task-duration">
                              {task.pomodoroEstimate > 0 ? `${task.pomodoroEstimate * 25}m` : '25m'}
                            </span>
                          </div>
                          <button
                            className="events-play-btn"
                            onClick={() => activateTask(task.id, task.title)}
                            title="Chạy Pomodoro cho công việc này"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <circle cx="12" cy="12" r="10" />
                              <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cột Completed */}
                  <div className="events-hour-column completed-col">
                    {completedTasks.map((task) => {
                      const projectColor = projects.find((p) => p.id === task.projectId)?.color || '#a0aec0';
                      return (
                        <div
                          key={task.id}
                          className="events-task-card completed"
                          style={{ borderLeft: `4px solid ${projectColor}` }}
                          onContextMenu={(e) => contextMenu.open(e, task.id)}
                        >
                          <div className="events-task-card-content">
                            <span className="events-task-title" title={task.title}>{task.title}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar bên phải: Danh sách công việc chờ */}
      <EventsSidebar
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        handleDragStart={handleDragStart}
      />

      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={contextMenu.close}
      >
        <div
          className="events-context-menu-item"
          onClick={() => {
            if (contextMenu.data) {
              handleCopyTask(contextMenu.data);
            }
            contextMenu.close();
          }}
        >
          Copy
        </div>
        <div
          className="events-context-menu-item delete"
          onClick={() => {
            if (contextMenu.data) {
              handleDeleteTask(contextMenu.data);
            }
            contextMenu.close();
          }}
        >
          Delete
        </div>
      </ContextMenu>
    </div>
  );
};

export default EventsHub;
