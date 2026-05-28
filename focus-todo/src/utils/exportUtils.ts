import { dateUtils } from './dateUtils';
import type { Task } from '../types';

export interface CSVRow {
  ID: string;
  Title: string;
  Project: string;
  Priority: string;
  'Due Date': string;
  Status: string;
  'Pomodoro Estimated': number;
  'Pomodoro Completed': number;
  'Focus Time (min)': number;
  Note: string;
  'Created At': string;
}

const CSV_HEADERS: (keyof CSVRow)[] = [
  'ID', 'Title', 'Project', 'Priority', 'Due Date',
  'Status', 'Pomodoro Estimated', 'Pomodoro Completed',
  'Focus Time (min)', 'Note', 'Created At',
];

function escapeCsv(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function tasksToCSV(tasks: Task[], getProjectName: (id: string | null) => string): string {
  const headerRow = CSV_HEADERS.map(escapeCsv).join(',');

  const dataRows = tasks.map((task) => {
    const row: CSVRow = {
      ID: task.id,
      Title: task.title,
      Project: getProjectName(task.projectId),
      Priority: task.priority,
      'Due Date': task.dueDate ? dateUtils.format(task.dueDate) : '',
      Status: task.completed ? 'Completed' : 'Active',
      'Pomodoro Estimated': task.pomodoroEstimate,
      'Pomodoro Completed': task.pomodoroCompleted,
      'Focus Time (min)': task.totalFocusTime,
      Note: task.note,
      'Created At': dateUtils.format(task.createdAt),
    };
    return CSV_HEADERS.map((h) => escapeCsv(row[h])).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  // BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTasks(
  tasks: Task[],
  getProjectName: (id: string | null) => string
): void {
  const csv = tasksToCSV(tasks, getProjectName);
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `focus-todo-export-${date}.csv`);
}
