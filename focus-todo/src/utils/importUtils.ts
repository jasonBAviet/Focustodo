import type { Task, Priority, RepeatType } from '../types';
import { dateUtils } from './dateUtils';

interface ParsedRow {
  title: string;
  priority: Priority;
  dueDate: string | null;
  note: string;
  pomodoroEstimate: number;
  completed: boolean;
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

export function importFromCSV(content: string): Partial<Task>[] {
  const lines = content
    .replace(/^\uFEFF/, '') // strip BOM
    .split('\n')
    .filter((l) => l.trim());

  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const titleIdx = headers.indexOf('title');
  if (titleIdx === -1) throw new Error('CSV phai co cot "Title"');

  const priorityIdx = headers.indexOf('priority');
  const dueDateIdx = headers.indexOf('due date');
  const statusIdx = headers.indexOf('status');
  const noteIdx = headers.indexOf('note');
  const pomEstIdx = headers.indexOf('pomodoro estimated');

  const tasks: Partial<Task>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const title = cols[titleIdx]?.trim();
    if (!title) continue;

    const parsed: ParsedRow = {
      title,
      priority: priorityIdx >= 0 ? parsePriority(cols[priorityIdx] || '') : 'none',
      dueDate: dueDateIdx >= 0 && cols[dueDateIdx]?.trim()
        ? dateUtils.fromDateInput(cols[dueDateIdx].trim())
        : null,
      note: noteIdx >= 0 ? cols[noteIdx]?.trim() || '' : '',
      pomodoroEstimate: pomEstIdx >= 0 ? parseInt(cols[pomEstIdx] || '0', 10) || 0 : 0,
      completed: statusIdx >= 0 ? cols[statusIdx]?.trim().toLowerCase() === 'completed' : false,
    };

    tasks.push({
      id: crypto.randomUUID(),
      title: parsed.title,
      priority: parsed.priority,
      dueDate: parsed.dueDate,
      note: parsed.note,
      pomodoroEstimate: parsed.pomodoroEstimate,
      completed: parsed.completed,
      projectId: null,
      reminder: null,
      repeat: 'none' as RepeatType,
      repeatCustom: null,
      subtasks: [],
      pomodoroCompleted: 0,
      totalFocusTime: 0,
      flagged: false,
      tags: [],
      createdAt: dateUtils.now(),
      completedAt: parsed.completed ? dateUtils.now() : null,
      updatedAt: dateUtils.now(),
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
