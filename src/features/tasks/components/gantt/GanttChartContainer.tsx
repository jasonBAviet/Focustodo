import React from 'react';
import type { Task, Project } from '@/types';
import type { GanttColumn, GanttPeriod } from './ganttUtils';
import {
  getGanttRange,
  getGanttBarPosition,
  getTaskProgress,
} from './ganttUtils';
import { dateUtils } from '@/utils/dateUtils';
import { useTaskContext } from '@/features/tasks/TaskContext';
import './gantt.css';

interface GanttChartContainerProps {
  tasks: Task[];
  projects: Project[];
  columns: GanttColumn[];
  period: GanttPeriod;
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  currentDate: Date;
}

const getTooltipText = (
  task: Task,
  projectName: string,
  progress: number,
  status: string,
  daysDiff: number
) => {
  const startStr = task.startDate ? dateUtils.formatShort(task.startDate) : 'Chưa đặt';
  const dueStr = task.dueDate ? dateUtils.formatShort(task.dueDate) : 'Chưa đặt';
  const completedStr = task.completedAt ? dateUtils.formatShort(task.completedAt) : 'Chưa xong';

  let statusText = 'Đang thực hiện';
  if (status === 'completed-early-or-on-time') {
    statusText = daysDiff === 0 ? 'Hoàn thành đúng hạn' : `Hoàn thành sớm ${Math.abs(daysDiff)} ngày`;
  } else if (status === 'completed-late') {
    statusText = `Hoàn thành trễ ${daysDiff} ngày`;
  } else if (status === 'overdue') {
    statusText = `Quá hạn ${daysDiff} ngày`;
  } else if (status === 'not-started') {
    statusText = 'Chưa bắt đầu';
  }

  return `${task.title}
Dự án: ${projectName}
Bắt đầu kế hoạch: ${startStr}
Hạn chót kế hoạch: ${dueStr}
Thực tế hoàn thành: ${completedStr}
Trạng thái: ${statusText}
Tiến độ: ${progress}%`;
};

const GanttChartContainer: React.FC<GanttChartContainerProps> = ({
  tasks,
  projects,
  columns,
  period,
  selectedTaskId,
  onSelectTask,
  currentDate,
}) => {
  const { addTask, updateTask, getProjectName } = useTaskContext();
  const viewportRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      // Tìm cột trùng với currentDate. Ở chế độ 'yearly' mỗi cột đại diện cho
      // cả một tháng (luôn có ngày = 1), nên phải so khớp theo năm+tháng;
      // so khớp chính xác từng ngày sẽ không bao giờ trùng (currentDate hiếm khi
      // rơi đúng vào ngày 1).
      const targetIndex = columns.findIndex((col) => {
        if (period === 'yearly') {
          return (
            col.date.getFullYear() === currentDate.getFullYear() &&
            col.date.getMonth() === currentDate.getMonth()
          );
        }
        const colDate = new Date(col.date);
        colDate.setHours(0, 0, 0, 0);
        const refDate = new Date(currentDate);
        refDate.setHours(0, 0, 0, 0);
        return colDate.getTime() === refDate.getTime();
      });

      if (targetIndex !== -1) {
        let widthVal = 140;
        if (period === 'daily') widthVal = 120;
        else if (period === 'weekly') widthVal = 140;
        else if (period === 'monthly') widthVal = 60;
        else if (period === 'yearly') widthVal = 150;

        const cellLeft = targetIndex * widthVal;
        const viewportWidth = viewport.clientWidth;
        const sidebarWidth = window.innerWidth <= 768 ? 160 : 280;

        const visibleGridWidth = viewportWidth - sidebarWidth;
        const scrollTarget = cellLeft - (visibleGridWidth - widthVal) / 2;

        viewport.scrollTo({
          left: Math.max(0, scrollTarget),
          behavior: 'smooth',
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentDate, columns, period]);

  const { start: rangeStart, end: rangeEnd } = React.useMemo(() => {
    return getGanttRange(columns, period);
  }, [columns, period]);

  const getProjectInfo = (projectId: string | null) => {
    const project = projects.find((p) => p.id === projectId);
    return {
      // Dùng chung getProjectName để nhãn "không có dự án" đồng nhất với
      // các view khác (calendar, settings...) thay vì một chuỗi fallback riêng.
      name: getProjectName(projectId),
      color: project?.color || 'var(--text-tertiary, #888888)',
    };
  };

  // Xác định chiều rộng tối thiểu của mỗi cột dựa theo period
  const colWidth = React.useMemo(() => {
    switch (period) {
      case 'daily': return '120px';
      case 'weekly': return '140px';
      case 'monthly': return '60px';
      case 'yearly': return '150px';
      default: return '80px';
    }
  }, [period]);

  const handleCellContextMenu = (e: React.MouseEvent, date: Date, projectId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const formattedDate = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const title = window.prompt(`Thêm công việc mới cho ngày ${formattedDate}:`);
    if (title && title.trim()) {
      const isoDate = new Date(date);
      isoDate.setHours(9, 0, 0, 0);
      const newTask = addTask(title.trim(), projectId, 'none');
      updateTask(newTask.id, {
        startDate: isoDate.toISOString(),
        dueDate: isoDate.toISOString()
      });
    }
  };

  return (
    <div className="gantt-chart-card">
      <div className="gantt-viewport" ref={viewportRef}>
        <div
          className="gantt-table"
          style={{
            '--col-width': colWidth,
            '--grid-cols': columns.length,
          } as React.CSSProperties}
        >
          {/* Header Row */}
          <div className="gantt-row header-row">
            <div className="gantt-cell sidebar-cell header-cell sticky-left-top">
              <span>Công việc</span>
              <span className="gantt-header-sub">Tiến độ</span>
            </div>
            <div className="gantt-grid-header-cells">
              {columns.map((col, idx) => (
                <div
                  key={idx}
                  className={`gantt-cell grid-header-cell ${col.isToday ? 'today' : ''} ${col.isWeekStart ? 'week-start' : ''} ${col.isMonthStart ? 'month-start' : ''}`}
                  title={col.date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                >
                  <span className="gantt-col-label">{col.label}</span>
                  <span className="gantt-col-sublabel">{col.subLabel}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Body Rows */}
          <div className="gantt-body">
            {tasks.length === 0 ? (
              <div className="gantt-empty-container">
                <div className="gantt-empty-message">Không có dữ liệu công việc</div>
              </div>
            ) : (
              tasks.map((task) => {
                const isSelected = task.id === selectedTaskId;
                const project = getProjectInfo(task.projectId);
                const progress = getTaskProgress(task);
                const {
                  left,
                  width,
                  isVisible,
                  actualWidth,
                  dueDateLeft,
                  hasConnector,
                  connectorLeft,
                  connectorWidth,
                  isLate,
                  lateLeft,
                  lateWidth,
                  status,
                  daysDiff,
                } = getGanttBarPosition(task, rangeStart, rangeEnd);

                return (
                  <div
                    key={task.id}
                    className={`gantt-row body-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelectTask(isSelected ? null : task.id)}
                  >
                    {/* Cột trái: Tên task và project */}
                    <div className="gantt-cell sidebar-cell">
                      <div className="gantt-task-meta">
                        <div className="gantt-task-title-row">
                          <span className={`priority-indicator priority-${task.priority}`} />
                          <span className={`gantt-task-title ${task.completed ? 'completed' : ''}`}>
                            {task.title}
                          </span>
                        </div>
                        <span className="gantt-project-badge" style={{ '--project-color': project.color } as React.CSSProperties}>
                          {project.name}
                        </span>
                      </div>
                      <span className="gantt-task-progress-val">{progress}%</span>
                    </div>

                    {/* Vùng grid bên phải chứa nền cột và thanh tiến độ */}
                    <div className="gantt-grid-body-cells">
                      {columns.map((col, idx) => (
                        <div
                          key={idx}
                          className={`gantt-grid-cell-bg ${col.isToday ? 'today-bg' : ''} ${col.isWeekStart ? 'week-start-bg' : ''} ${col.isMonthStart ? 'month-start-bg' : ''}`}
                          onContextMenu={(e) => handleCellContextMenu(e, col.date, task.projectId)}
                          title={`${col.date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}\nClick chuột phải để thêm công việc mới vào ngày này`}
                        />
                      ))}

                      {/* Vẽ thanh Gantt Bar */}
                      {isVisible && (
                        <div
                          className={`gantt-bar-container status-${status}`}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            '--bar-color': project.color,
                          } as React.CSSProperties}
                          title={getTooltipText(task, project.name, progress, status, daysDiff)}
                        >
                          {/* 1. Thanh thực tế (Actual Segment) */}
                          <div
                            className="gantt-segment gantt-segment-actual"
                            style={{
                              left: '0%',
                              width: `${actualWidth}%`,
                              '--segment-color': project.color,
                            } as React.CSSProperties}
                          />

                          {/* 2. Đường chỉ dẫn (Connector Line) */}
                          {hasConnector && (
                            <div
                              className="gantt-segment-connector"
                              style={{
                                left: `${connectorLeft}%`,
                                width: `${connectorWidth}%`,
                              }}
                            />
                          )}

                          {/* 3. Phần trễ / quá hạn (Late Segment) */}
                          {isLate && (
                            <div
                              className={`gantt-segment ${status === 'overdue' ? 'gantt-segment-overdue' : 'gantt-segment-delay'}`}
                              style={{
                                left: `${lateLeft}%`,
                                width: `${lateWidth}%`,
                              }}
                            />
                          )}

                          {/* 4. Vạch đỏ hạn chót (Due Date Line) */}
                          {dueDateLeft !== null && (
                            <div
                              className="gantt-due-date-line"
                              style={{
                                left: `${dueDateLeft}%`,
                              }}
                            />
                          )}

                          {/* 5. Text tiêu đề của bar */}
                          <span className="gantt-bar-text">
                            {task.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default GanttChartContainer;


