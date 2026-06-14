// ============================================================
// RRULE (RFC5545 subset) client-side: build / parse / describe.
// Editor always saves repeat='custom' + repeatCustom=RRULE (except 'none').
// Engine calculating next occurrence is on the server (routes/taskHelpers.js).
// ============================================================
export type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Recurrence {
  freq: Freq;
  interval: number;
  byday: string[]; // ['MO','WE',...] only used for WEEKLY
  until: string | null; // 'YYYY-MM-DD'
}

export const WEEKDAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
export const WEEKDAY_LABELS: Record<string, string> = {
  MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun',
};
const FREQ_UNIT: Record<Freq, string> = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' };

export function buildRRule(r: Recurrence): string {
  const parts = [`FREQ=${r.freq}`];
  if (r.interval && r.interval > 1) parts.push(`INTERVAL=${r.interval}`);
  if (r.freq === 'WEEKLY' && r.byday.length) parts.push(`BYDAY=${r.byday.join(',')}`);
  if (r.until) parts.push(`UNTIL=${r.until.replace(/-/g, '')}`);
  return parts.join(';');
}

export function parseRRule(str: string): Recurrence {
  const p: Record<string, string> = {};
  String(str)
    .replace(/^RRULE:/i, '')
    .split(';')
    .forEach((seg) => {
      const [k, v] = seg.split('=');
      if (k && v) p[k.toUpperCase()] = v;
    });
  const freqRaw = (p.FREQ || '').toUpperCase();
  const freq = (['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freqRaw) ? freqRaw : 'DAILY') as Freq;
  const interval = Math.max(1, parseInt(p.INTERVAL || '1', 10) || 1);
  const byday = (p.BYDAY || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  let until: string | null = null;
  if (p.UNTIL) {
    const m = p.UNTIL.match(/^(\d{4})(\d{2})(\d{2})/);
    if (m) until = `${m[1]}-${m[2]}-${m[3]}`;
  }
  return { freq, interval, byday, until };
}

// Convert current repeat/repeatCustom to Recurrence to initialize editor.
export function toRecurrence(repeat: string, repeatCustom: string | null): Recurrence | null {
  if (!repeat || repeat === 'none') return null;
  if (repeat === 'custom' && repeatCustom && /FREQ=/i.test(repeatCustom)) return parseRRule(repeatCustom);
  const map: Record<string, Freq> = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY' };
  return { freq: map[repeat] ?? 'DAILY', interval: 1, byday: [], until: null };
}

export function describeRecurrence(repeat: string, repeatCustom: string | null): string {
  const r = toRecurrence(repeat, repeatCustom);
  if (!r) return 'None';
  const unit = FREQ_UNIT[r.freq];
  let s = r.interval > 1 ? `Every ${r.interval} ${unit}s` : `Every ${unit}`;
  if (r.freq === 'WEEKLY' && r.byday.length) {
    s += ` on ${r.byday.map((d) => WEEKDAY_LABELS[d] ?? d).join(', ')}`;
  }
  if (r.until) s += ` until ${r.until}`;
  return s;
}
