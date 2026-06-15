import { diaryRepository } from './diary.repository.js';
import { webhookService } from '../webhooks/webhook.service.js';

export const VALID_PRIORITIES = ['high', 'medium', 'low', 'none'];

export function rowToDiary(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title ?? '',
    projectId: r.project_id ?? null,
    priority: r.priority ?? 'none',
    dueDate: r.due_date ?? null,
    reminder: r.reminder ?? null,
    repeat: r.repeat ?? 'none',
    repeatCustom: r.repeat_custom ?? null,
    note: r.note ?? '',
    subtasks: r.subtasks ?? [],
    pomodoroEstimate: r.pomodoro_estimate ?? 1,
    pomodoroCompleted: r.pomodoro_completed ?? 0,
    totalFocusTime: r.total_focus_time ?? 0,
    completed: r.completed ?? false,
    flagged: r.flagged ?? false,
    tags: r.tags ?? [],
    position: r.position ?? 0,
    createdAt: r.created_at ?? null,
    completedAt: r.completed_at ?? null,
    updatedAt: r.updated_at ?? null,
    taskId: r.task_id ?? null,
  };
}

export const DEFAULT_DIARY_TEMPLATE = `### 🏆 Thành quả đạt được (Wins of the Day)
- 

### 🧩 Khó khăn & Bài học (Challenges & Lessons)
- 

### 💭 Cảm nhận & Suy nghĩ (Feelings & Reflections)
- 

### 🎯 Mục tiêu tiếp theo (Focus for Tomorrow)
- `;

export class DiaryService {
  triggerWebhook(userId, eventType, data) {
    webhookService.dispatchToAll(userId, eventType, data);
  }

  async getDiaries(userId, filters) {
    if (filters.priority && !VALID_PRIORITIES.includes(filters.priority)) {
      throw new Error(`priority phai la mot trong: ${VALID_PRIORITIES.join(', ')}`);
    }
    const result = await diaryRepository.getDiaries(userId, filters);
    return {
      data: result.rows.map(rowToDiary),
      total: result.total,
      limit: result.limit,
      offset: result.offset
    };
  }

  async getDiaryById(id, userId) {
    const diary = await diaryRepository.getDiaryById(id, userId);
    if (!diary) throw new Error('Nhat ky khong tim thay');
    return { data: rowToDiary(diary) };
  }

  async createDiary(userId, body) {
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      throw new Error('Truong "title" la bat buoc va khong duoc rong.');
    }
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      throw new Error(`priority phai la mot trong: ${VALID_PRIORITIES.join(', ')}`);
    }

    if (body.projectId) {
      const proj = await diaryRepository.getProjectById(body.projectId, userId);
      if (!proj) {
        throw new Error(`Project "${body.projectId}" khong ton tai hoac khong thuoc quyen so huu.`);
      }
    }

    // Gan template mac dinh neu note trong
    const inputNote = (body.note && body.note.trim() !== '') ? body.note : DEFAULT_DIARY_TEMPLATE;

    const diaryRow = await diaryRepository.insertDiary({
      ...body,
      note: inputNote
    }, userId);

    const diary = rowToDiary(diaryRow);
    this.triggerWebhook(userId, 'diary.created', diary);
    return { data: diary };
  }

  async updateDiary(id, userId, body) {
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      throw new Error(`priority phai la mot trong: ${VALID_PRIORITIES.join(', ')}`);
    }

    const cur = await diaryRepository.getDiaryById(id, userId);
    if (!cur) throw new Error('Nhat ky khong tim thay');

    const now = new Date().toISOString();

    const updated = {
      title: body.title ?? cur.title,
      project_id: 'projectId' in body ? body.projectId : cur.project_id,
      priority: body.priority ?? cur.priority,
      due_date: 'dueDate' in body ? body.dueDate : cur.due_date,
      reminder: 'reminder' in body ? body.reminder : cur.reminder,
      repeat: body.repeat ?? cur.repeat,
      repeat_custom: 'repeatCustom' in body ? body.repeatCustom : cur.repeat_custom,
      note: 'note' in body ? body.note : cur.note,
      subtasks: 'subtasks' in body ? JSON.stringify(body.subtasks) : cur.subtasks,
      pomodoro_estimate: body.pomodoroEstimate ?? cur.pomodoro_estimate,
      completed: 'completed' in body ? body.completed : cur.completed,
      flagged: 'flagged' in body ? body.flagged : cur.flagged,
      tags: 'tags' in body ? JSON.stringify(body.tags) : cur.tags,
      position: 'position' in body ? body.position : cur.position,
      completed_at: 'completed' in body ? (body.completed ? cur.completed_at ?? now : null) : cur.completed_at,
      updated_at: now,
      task_id: 'taskId' in body ? body.taskId : cur.task_id,
    };

    const result = await diaryRepository.updateDiary(id, userId, updated);
    const updatedDiary = rowToDiary(result);
    this.triggerWebhook(userId, 'diary.updated', updatedDiary);
    return { data: updatedDiary };
  }

  async reorderDiaries(userId, orderedIds) {
    if (!Array.isArray(orderedIds)) {
      throw new Error('orderedIds[] la bat buoc.');
    }
    await diaryRepository.reorderDiaries(userId, orderedIds);
    return { status: 'ok', count: orderedIds.length };
  }

  async deleteDiary(id, userId) {
    const now = new Date().toISOString();
    const result = await diaryRepository.deleteDiary(id, userId, now);
    if (!result) throw new Error('Nhat ky khong tim thay');
    const deletedDiary = rowToDiary(result);
    this.triggerWebhook(userId, 'diary.deleted', deletedDiary);
    return { data: { id: deletedDiary.id }, message: 'Da xoa nhat ky thanh cong.' };
  }
}

export const diaryService = new DiaryService();
