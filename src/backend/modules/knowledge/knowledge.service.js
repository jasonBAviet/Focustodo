import { knowledgeRepository } from './knowledge.repository.js';
import { webhookService } from '../webhooks/webhook.service.js';

export const VALID_PRIORITIES = ['high', 'medium', 'low', 'none'];
export const VALID_REPEATS = ['none', 'daily', 'weekly', 'monthly', 'custom'];

export function rowToKnowledge(r) {
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
  };
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
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

export class KnowledgeService {
  triggerWebhook(userId, eventType, data) {
    webhookService.dispatchToAll(userId, eventType, data);
  }

  async spawnNextOccurrence(knowledgeRow, userId) {
    const repeat = knowledgeRow.repeat ?? 'none';
    if (repeat === 'none') return null;
    const dueDate = knowledgeRow.due_date ?? knowledgeRow.dueDate ?? null;
    const repeatCustom = knowledgeRow.repeat_custom ?? knowledgeRow.repeatCustom ?? null;
    const nextDue = computeNextDue(dueDate, repeat, repeatCustom);
    if (!nextDue) return null;

    const tags = knowledgeRow.tags ?? [];
    return await knowledgeRepository.insertKnowledge({
      title: knowledgeRow.title,
      projectId: knowledgeRow.project_id ?? knowledgeRow.projectId ?? null,
      priority: knowledgeRow.priority ?? 'none',
      dueDate: nextDue,
      reminder: null,
      repeat,
      repeatCustom,
      note: knowledgeRow.note ?? '',
      subtasks: [],
      pomodoroEstimate: knowledgeRow.pomodoro_estimate ?? knowledgeRow.pomodoroEstimate ?? 1,
      flagged: false,
      tags: Array.isArray(tags) ? tags : [],
    }, userId);
  }

  async getKnowledges(userId, filters) {
    if (filters.priority && !VALID_PRIORITIES.includes(filters.priority)) {
      throw new Error(`priority phai la mot trong: ${VALID_PRIORITIES.join(', ')}`);
    }
    const result = await knowledgeRepository.getKnowledges(userId, filters);
    return {
      data: result.rows.map(rowToKnowledge),
      total: result.total,
      limit: result.limit,
      offset: result.offset
    };
  }

  async getKnowledgeById(id, userId) {
    const knowledge = await knowledgeRepository.getKnowledgeById(id, userId);
    if (!knowledge) throw new Error('Knowledge khong tim thay');
    return { data: rowToKnowledge(knowledge) };
  }

  async createKnowledge(userId, body) {
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      throw new Error('Truong "title" la bat buoc va khong duoc rong.');
    }
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      throw new Error(`priority phai la mot trong: ${VALID_PRIORITIES.join(', ')}`);
    }
    if (body.repeat && !VALID_REPEATS.includes(body.repeat)) {
      throw new Error(`repeat phai la mot trong: ${VALID_REPEATS.join(', ')}`);
    }

    if (body.projectId) {
      const proj = await knowledgeRepository.getProjectById(body.projectId, userId);
      if (!proj) {
        throw new Error(`Project "${body.projectId}" khong ton tai hoac khong thuoc quyen so huu.`);
      }
    }

    const knowledgeRow = await knowledgeRepository.insertKnowledge(body, userId);
    const knowledge = rowToKnowledge(knowledgeRow);
    this.triggerWebhook(userId, 'knowledge.created', knowledge);
    return { data: knowledge };
  }

  async completeKnowledge(id, userId, completed) {
    return await knowledgeRepository.runInTransaction(async (client) => {
      // Temporary workaround for transaction: we pass pool inside repository by default.
      // We will read knowledge normally
      const cur = await knowledgeRepository.getKnowledgeById(id, userId);
      if (!cur) throw new Error('Knowledge khong tim thay');

      const now = new Date().toISOString();
      const wasCompleted = cur.completed === true;
      const completedAt = completed ? cur.completed_at ?? now : null;

      const upd = await knowledgeRepository.updateKnowledgeCompleteStatus(id, userId, completed, completedAt, now);
      
      let spawned = null;
      if (completed && !wasCompleted && cur.repeat && cur.repeat !== 'none') {
        spawned = await this.spawnNextOccurrence(cur, userId);
      }
      const updatedKnowledge = rowToKnowledge(upd);
      if (completed && !wasCompleted) {
        this.triggerWebhook(userId, 'knowledge.completed', updatedKnowledge);
      } else {
        this.triggerWebhook(userId, 'knowledge.updated', updatedKnowledge);
      }
      return { data: updatedKnowledge, spawned: spawned ? rowToKnowledge(spawned) : null };
    });
  }

  async updateKnowledge(id, userId, body) {
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      throw new Error(`priority phai la mot trong: ${VALID_PRIORITIES.join(', ')}`);
    }
    if (body.repeat && !VALID_REPEATS.includes(body.repeat)) {
      throw new Error(`repeat phai la mot trong: ${VALID_REPEATS.join(', ')}`);
    }

    const cur = await knowledgeRepository.getKnowledgeById(id, userId);
    if (!cur) throw new Error('Knowledge khong tim thay');

    const now = new Date().toISOString();
    const wasCompleted = cur.completed === true;

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
    };

    const result = await knowledgeRepository.updateKnowledge(id, userId, updated);
    
    let spawned = null;
    if ('completed' in body && body.completed === true && !wasCompleted && cur.repeat && cur.repeat !== 'none') {
      spawned = await this.spawnNextOccurrence(cur, userId);
    }
    const updatedKnowledge = rowToKnowledge(result);
    if ('completed' in body && body.completed === true && !wasCompleted) {
      this.triggerWebhook(userId, 'knowledge.completed', updatedKnowledge);
    } else {
      this.triggerWebhook(userId, 'knowledge.updated', updatedKnowledge);
    }
    return { data: updatedKnowledge, spawned: spawned ? rowToKnowledge(spawned) : null };
  }

  async reorderKnowledges(userId, orderedIds) {
    if (!Array.isArray(orderedIds)) {
      throw new Error('orderedIds[] la bat buoc.');
    }
    await knowledgeRepository.reorderKnowledges(userId, orderedIds);
    return { status: 'ok', count: orderedIds.length };
  }

  async deleteKnowledge(id, userId) {
    const now = new Date().toISOString();
    const result = await knowledgeRepository.deleteKnowledge(id, userId, now);
    if (!result) throw new Error('Knowledge khong tim thay');
    const deletedKnowledge = rowToKnowledge(result);
    this.triggerWebhook(userId, 'knowledge.deleted', deletedKnowledge);
    return { data: { id: deletedKnowledge.id }, message: 'Da xoa knowledge thanh cong.' };
  }
}

export const knowledgeService = new KnowledgeService();
