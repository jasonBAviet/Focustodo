import type { Task, Priority, RepeatType, Subtask } from '../types';
import { dateUtils } from './dateUtils';
import { uuid } from './uuid';

interface ParsedCSVTask {
  title: string;
  projectId: string | null;
  priority: Priority;
  dueDate: string | null;
  reminder: string | null;
  repeat: RepeatType;
  repeatCustom: string | null;
  note: string;
  pomodoroEstimate: number;
  pomodoroCompleted: number;
  totalFocusTime: number;
  completed: boolean;
  flagged: boolean;
  tags: string[];
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
  subtasks: Subtask[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parsePriority(value: string): Priority {
  const v = value.toLowerCase().trim();
  if (v === 'high') return 'high';
  if (v === 'medium') return 'medium';
  if (v === 'low') return 'low';
  return 'none';
}

function parseRepeat(value: string): RepeatType {
  const v = value.toLowerCase().trim();
  if (v === 'daily') return 'daily';
  if (v === 'weekly') return 'weekly';
  if (v === 'monthly') return 'monthly';
  if (v === 'custom') return 'custom';
  return 'none';
}

function parseSubtaskJSON(raw: string): Subtask[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item) => typeof item.title === 'string')
      .map((item) => ({
        id: uuid(),
        title: String(item.title),
        completed: Boolean(item.completed),
        createdAt: dateUtils.now(),
      }));
  } catch {
    return [];
  }
}

export function importFromCSV(content: string): Partial<Task>[] {
  const lines = content
    .replace(/^\uFEFF/, '') // strip BOM
    .split('\n')
    .filter((l) => l.trim());

  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const titleIdx = headers.indexOf('title');
  if (titleIdx === -1) throw new Error('CSV phai co cot "Title"');

  const col = (name: string) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? idx : -1;
  };

  const idx = {
    priority: col('priority'),
    projectId: col('project id'),
    dueDate: col('due date'),
    status: col('status'),
    note: col('note'),
    pomEst: col('pomodoro estimated'),
    pomDone: col('pomodoro completed'),
    focusTime: col('focus time (min)'),
    reminder: col('reminder'),
    repeat: col('repeat'),
    repeatCustom: col('repeat custom'),
    flagged: col('flagged'),
    tags: col('tags'),
    subtasks: col('subtasks'),
    createdAt: col('created at'),
    completedAt: col('completed at'),
    updatedAt: col('updated at'),
  };

  const tasks: Partial<Task>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const title = cols[titleIdx]?.trim();
    if (!title) continue;

    const getCol = (colIdx: number) => (colIdx >= 0 ? cols[colIdx]?.trim() || '' : '');
    const getDate = (colIdx: number): string | null => {
      const v = getCol(colIdx);
      if (!v) return null;
      try {
        const d = dateUtils.fromDateInput(v);
        return d || null;
      } catch {
        return null;
      }
    };

    const completed = idx.status >= 0
      ? getCol(idx.status).toLowerCase() === 'completed'
      : false;

    const parsed: ParsedCSVTask = {
      title,
      projectId: getCol(idx.projectId) || null,
      priority: parsePriority(getCol(idx.priority)),
      dueDate: getDate(idx.dueDate),
      reminder: getDate(idx.reminder),
      repeat: parseRepeat(getCol(idx.repeat)),
      repeatCustom: getCol(idx.repeatCustom) || null,
      note: getCol(idx.note),
      pomodoroEstimate: parseInt(getCol(idx.pomEst) || '0', 10) || 0,
      pomodoroCompleted: parseInt(getCol(idx.pomDone) || '0', 10) || 0,
      totalFocusTime: parseInt(getCol(idx.focusTime) || '0', 10) || 0,
      completed,
      flagged: getCol(idx.flagged).toLowerCase() === 'true',
      tags: getCol(idx.tags)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: getDate(idx.createdAt) || dateUtils.now(),
      completedAt: completed ? (getDate(idx.completedAt) || dateUtils.now()) : null,
      updatedAt: getDate(idx.updatedAt) || dateUtils.now(),
      subtasks: parseSubtaskJSON(getCol(idx.subtasks)),
    };

    tasks.push({
      id: uuid(),
      title: parsed.title,
      projectId: parsed.projectId,
      priority: parsed.priority,
      dueDate: parsed.dueDate,
      reminder: parsed.reminder,
      repeat: parsed.repeat,
      repeatCustom: parsed.repeatCustom,
      note: parsed.note,
      pomodoroEstimate: parsed.pomodoroEstimate,
      pomodoroCompleted: parsed.pomodoroCompleted,
      totalFocusTime: parsed.totalFocusTime,
      completed: parsed.completed,
      flagged: parsed.flagged,
      tags: parsed.tags,
      subtasks: parsed.subtasks,
      createdAt: parsed.createdAt,
      completedAt: parsed.completedAt,
      updatedAt: parsed.updatedAt,
    });
  }

  return tasks;
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}
