import React from 'react';
import type { Task } from '@/types';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useDiaryContext } from '@/features/diary/DiaryContext';
import { dateUtils } from '@/utils/dateUtils';

interface TaskDiariesProps {
  task: Task;
}

const TaskDiaries: React.FC<TaskDiariesProps> = ({ task }) => {
  const { setActiveView } = useTaskContext();
  const { diaries, addDiary, setSelectedDiaryId } = useDiaryContext();

  const linkedDiaries = diaries.filter((d) => d.taskId === task.id);

  const handleCreateDiaryForTask = () => {
    const today = new Date();
    const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    const newDiary = addDiary(`Nhật ký: ${task.title} (${dateStr})`, task.projectId, task.priority, task.id);
    if (newDiary) {
      setSelectedDiaryId(newDiary.id);
      setActiveView('diary');
    }
  };

  const handleGoToDiary = (diaryId: string) => {
    setSelectedDiaryId(diaryId);
    setActiveView('diary');
  };

  return (
    <div className="detail-diary-section">
      <div className="diary-header">
        <span className="diary-section-title">Nhật ký liên kết</span>
        <button 
          type="button" 
          className="diary-add-btn"
          onClick={handleCreateDiaryForTask}
        >
          + Viết nhật ký
        </button>
      </div>
      {linkedDiaries.length > 0 ? (
        <div className="diary-list">
          {linkedDiaries.map((d) => (
            <div 
              key={d.id} 
              className="diary-item-link"
              onClick={() => handleGoToDiary(d.id)}
            >
              <span className="diary-item-title">{d.title}</span>
              <span className="diary-item-date">{dateUtils.formatShort(d.createdAt)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="diary-placeholder">
          Chưa có nhật ký nào liên kết với công việc này.
        </div>
      )}
    </div>
  );
};

export default TaskDiaries;
