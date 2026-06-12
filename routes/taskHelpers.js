import { randomUUID } from 'crypto';

export function rowToTask(r) {
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
    isKnowledge: r.is_knowledge ?? false,
  };
}

export const VALID_PRIORITIES = ['high', 'medium', 'low', 'none'];
export const VALID_REPEATS = ['none', 'daily', 'weekly', 'monthly', 'custom'];

// position kế tiếp trong phạm vi 1 dự án của một user
export async function nextTaskPosition(db, projectId, userId) {
  const r = await db.query(
    `SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM tasks
     WHERE project_id IS NOT DISTINCT FROM $1 AND user_id = $2 AND (is_deleted = false OR is_deleted IS NULL)`,
    [projectId ?? null, userId],
  );
  return r.rows[0].pos;
}

// Tạo 1 task mới từ input (camelCase) kèm userId.
export async function insertTaskRow(db, input, userId) {
  const now = new Date().toISOString();
  const projectId = input.projectId ?? null;
  const position = input.position ?? (await nextTaskPosition(db, projectId, userId));
  const id = input.id ?? randomUUID();
  const result = await db.query(
    `INSERT INTO tasks
       (id, title, project_id, priority, due_date, reminder, repeat, repeat_custom,
        note, subtasks, pomodoro_estimate, pomodoro_completed, total_focus_time,
        completed, flagged, tags, position, created_at, completed_at, updated_at, is_knowledge, user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
     RETURNING *`,
    [
      id,
      String(input.title ?? '').trim(),
      projectId,
      input.priority ?? 'none',
      input.dueDate ?? null,
      input.reminder ?? null,
      input.repeat ?? 'none',
      input.repeatCustom ?? null,
      input.note ?? '',
      JSON.stringify(input.subtasks ?? []),
      input.pomodoroEstimate ?? 1,
      0,
      0,
      false,
      input.flagged ?? false,
      JSON.stringify(input.tags ?? []),
      position,
      now,
      null,
      now,
      input.isKnowledge ?? false,
      userId
    ],
  );
  return rowToTask(result.rows[0]);
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

export function computeNextDue(dueDate, repeat, repeatCustom) {
  if (repeat === 'custom' && repeatCustom && /FREQ=/i.test(repeatCustom)) {
    return nextOccurrenceFromRRule(repeatCustom, dueDate);
  }
  const base = parseDate(dueDate) ?? new Date();
  const d = new Date(base.getTime());
  let unit = null;
  let n = 1;
  if (repeat === 'daily') {
    unit = 'day';
    n = 1;
  } else if (repeat === 'weekly') {
    unit = 'day';
    n = 7;
  } else if (repeat === 'monthly') {
    unit = 'month';
    n = 1;
  } else if (repeat === 'custom') {
    const m = String(repeatCustom ?? '').match(/(\d+)\s*(day|week|month)/i);
    if (m) {
      n = parseInt(m[1], 10) || 1;
      const u = m[2].toLowerCase();
      if (u === 'month') unit = 'month';
      else {
        unit = 'day';
        if (u === 'week') n *= 7;
      }
    }
  }
  if (!unit) return null;
  if (unit === 'day') d.setUTCDate(d.getUTCDate() + n);
  else d.setUTCMonth(d.getUTCMonth() + n);
  return fmtDate(d);
}

const RRULE_WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function parseRRule(str) {
  const clean = String(str).replace(/^RRULE:/i, '').trim();
  const out = {};
  for (const seg of clean.split(';')) {
    const [k, v] = seg.split('=');
    if (k && v) out[k.trim().toUpperCase()] = v.trim();
  }
  return out;
}

function parseUntil(v) {
  if (!v) return null;
  const m = String(v).match(/^(\d{4})(\d{2})(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function nextOccurrenceFromRRule(rruleStr, fromDate) {
  const p = parseRRule(rruleStr);
  const freq = (p.FREQ || '').toUpperCase();
  if (!freq) return null;
  const interval = Math.max(1, parseInt(p.INTERVAL || '1', 10) || 1);
  const until = parseUntil(p.UNTIL);
  const base = parseDate(fromDate) ?? new Date();
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));

  let next = null;
  if (freq === 'DAILY') {
    next = new Date(d);
    next.setUTCDate(d.getUTCDate() + interval);
  } else if (freq === 'WEEKLY') {
    const days = (p.BYDAY || '')
      .split(',')
      .map((s) => RRULE_WEEKDAYS.indexOf(s.trim().toUpperCase()))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b);
    if (days.length === 0) {
      next = new Date(d);
      next.setUTCDate(d.getUTCDate() + interval * 7);
    } else {
      const cur = d.getUTCDay();
      const later = days.find((x) => x > cur);
      next = new Date(d);
      if (later !== undefined) {
        next.setUTCDate(d.getUTCDate() + (later - cur));
      } else {
        next.setUTCDate(d.getUTCDate() + (7 - cur) + days[0] + (interval - 1) * 7);
      }
    }
  } else if (freq === 'MONTHLY') {
    next = new Date(d);
    next.setUTCMonth(d.getUTCMonth() + interval);
  } else if (freq === 'YEARLY') {
    next = new Date(d);
    next.setUTCFullYear(d.getUTCFullYear() + interval);
  } else {
    return null;
  }
  if (until && next > until) return null;
  return fmtDate(next);
}

export async function spawnNextOccurrence(db, task, userId) {
  const repeat = task.repeat ?? 'none';
  if (repeat === 'none') return null;
  const dueDate = task.due_date ?? task.dueDate ?? null;
  const repeatCustom = task.repeat_custom ?? task.repeatCustom ?? null;
  const nextDue = computeNextDue(dueDate, repeat, repeatCustom);
  if (!nextDue) return null;

  const tags = task.tags ?? [];
  return insertTaskRow(db, {
    title: task.title,
    projectId: task.project_id ?? task.projectId ?? null,
    priority: task.priority ?? 'none',
    dueDate: nextDue,
    reminder: null,
    repeat,
    repeatCustom,
    note: task.note ?? '',
    subtasks: [],
    pomodoroEstimate: task.pomodoro_estimate ?? task.pomodoroEstimate ?? 1,
    flagged: false,
    tags: Array.isArray(tags) ? tags : [],
  }, userId);
}
