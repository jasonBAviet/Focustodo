import React, { useState, useMemo, useEffect } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import GanttFilters from './GanttFilters';
import GanttChartContainer from './GanttChartContainer';
import { getGanttColumns, getGanttRange } from './ganttUtils';
import type { GanttPeriod } from './ganttUtils';
import { dateUtils } from '@/utils/dateUtils';

const GanttView: React.FC = () => {
  const {
    tasks: allTasks,
    projects,
    folders,
    tags,
    selectedTaskId,
    setSelectedTaskId,
    activeView,
    activeProjectId,
    activeFolderId,
    activeTagId,
    setActiveView,
    setActiveProjectId,
    setActiveFolderId,
    setActiveTagId,
  } = useTaskContext();

  // State bộ lọc thời gian
  const [period, setPeriod] = useState<GanttPeriod>('weekly'); // Mặc định là weekly
  const [viewRange, setViewRange] = useState<number>(4); // Mặc định là 4 tuần
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Tự động điều chỉnh viewRange khi thay đổi period
  const handlePeriodChange = (newPeriod: GanttPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod === 'daily') {
      setViewRange(14);
    } else if (newPeriod === 'weekly') {
      setViewRange(4);
    } else if (newPeriod === 'monthly') {
      setViewRange(3);
    } else if (newPeriod === 'yearly') {
      setViewRange(2);
    }
  };

  // State bộ lọc phân loại
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedTagId, setSelectedTagId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Đồng bộ bộ lọc từ left sidebar sang bộ lọc của Gantt
  useEffect(() => {
    if (activeView === 'project' && activeProjectId) {
      setSelectedProjectId(activeProjectId);
      setSelectedFolderId('all');
      setSelectedTagId('all');
    } else if (activeView === 'folder' && activeFolderId) {
      setSelectedFolderId(activeFolderId);
      setSelectedProjectId('all');
      setSelectedTagId('all');
    } else if (activeView === 'tag' && activeTagId) {
      setSelectedTagId(activeTagId);
      setSelectedProjectId('all');
      setSelectedFolderId('all');
    } else {
      setSelectedProjectId('all');
      setSelectedFolderId('all');
      setSelectedTagId('all');
    }
  }, [activeView, activeProjectId, activeFolderId, activeTagId]);

  // Tính toán các cột thời gian trục X
  const columns = useMemo(() => {
    return getGanttColumns(period, currentDate, viewRange);
  }, [period, currentDate, viewRange]);

  // Khoảng ngày thực tế hiển thị trên lưới
  const { start: rangeStart, end: rangeEnd } = useMemo(() => {
    return getGanttRange(columns, period);
  }, [columns, period]);

  // Xử lý thay đổi bộ lọc phân loại
  const handleFolderChange = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedProjectId('all');
    setSelectedTagId('all');
    if (folderId === 'all') {
      setActiveView('planned');
      setActiveFolderId(null);
    } else {
      setActiveView('folder');
      setActiveFolderId(folderId);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedTagId('all');
    setSelectedFolderId('all');
    if (projectId === 'all') {
      setActiveView('planned');
      setActiveProjectId(null);
    } else {
      setActiveView('project');
      setActiveProjectId(projectId);
    }
  };

  const handleTagChange = (tagId: string) => {
    setSelectedTagId(tagId);
    setSelectedProjectId('all');
    setSelectedFolderId('all');
    if (tagId === 'all') {
      setActiveView('planned');
      setActiveTagId(null);
    } else {
      setActiveView('tag');
      setActiveTagId(tagId);
    }
  };

  // Lọc danh sách các Task hiển thị trên Gantt
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      // 1. Lọc theo thư mục (Folder)
      if (selectedFolderId !== 'all') {
        const project = projects.find((p) => p.id === task.projectId);
        if (!project || project.folderId !== selectedFolderId) return false;
      }

      // 2. Lọc theo dự án (Project)
      if (selectedProjectId !== 'all') {
        if (task.projectId !== selectedProjectId) return false;
      }

      // 3. Lọc theo nhãn (Tag)
      if (selectedTagId !== 'all') {
        if (!task.tags || !task.tags.includes(selectedTagId)) return false;
      }

      // 3.5. Lọc theo Chú giải (Trạng thái)
      if (selectedStatus !== 'all') {
        const taskStatus = dateUtils.calculateTaskStatus(task.completed, task.startDate, task.dueDate, task.completedAt);
        if (taskStatus !== selectedStatus) return false;
      }

      // 4. Lọc theo thời gian: task phải có giao dịch thời gian với Gantt Grid
      const taskStartStr = task.startDate || task.dueDate || task.createdAt;
      const taskEndStr = task.dueDate || task.startDate || task.createdAt;

      if (!taskStartStr) return false;

      const taskStart = new Date(taskStartStr);
      taskStart.setHours(0, 0, 0, 0);

      const taskEnd = new Date(taskEndStr);
      taskEnd.setHours(23, 59, 59, 999);

      return taskStart.getTime() <= rangeEnd.getTime() && taskEnd.getTime() >= rangeStart.getTime();
    });
  }, [allTasks, projects, selectedFolderId, selectedProjectId, selectedTagId, selectedStatus, rangeStart, rangeEnd]);

  return (
    <div className="gantt-view-container">
      {/* Bộ lọc tương tự Report */}
      <GanttFilters
        folders={folders}
        projects={projects}
        tags={tags}
        selectedFolderId={selectedFolderId}
        selectedProjectId={selectedProjectId}
        selectedTagId={selectedTagId}
        selectedStatus={selectedStatus}
        period={period}
        currentDate={currentDate}
        viewRange={viewRange}
        onFolderChange={handleFolderChange}
        onProjectChange={handleProjectChange}
        onTagChange={handleTagChange}
        onStatusChange={setSelectedStatus}
        onPeriodChange={handlePeriodChange}
        onDateChange={setCurrentDate}
        onViewRangeChange={setViewRange}
      />

      {/* Grid Biểu đồ Gantt */}
      <div className="gantt-chart-area">
        <GanttChartContainer
          tasks={filteredTasks}
          projects={projects}
          columns={columns}
          period={period}
          selectedTaskId={selectedTaskId}
          onSelectTask={setSelectedTaskId}
          currentDate={currentDate}
        />
      </div>

      <style>{`
        .gantt-view-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 12px;
          min-height: 0;
        }
        .gantt-chart-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
      `}</style>
    </div>
  );
};

export default GanttView;
