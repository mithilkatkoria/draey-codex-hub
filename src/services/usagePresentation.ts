import type { Profile, UsageWindow } from '../types';

export function presentWindows(profile: Profile, windows: UsageWindow[]) {
  const isCore = (w: UsageWindow) => w.id.startsWith('codex:') || w.bucket.toLowerCase() === 'codex';
  const pro = (profile.actualPlan ?? profile.plan).toLowerCase().startsWith('pro');
  const priority = (w: UsageWindow) => pro && w.durationMins === 10080 ? -1 : w.durationMins ?? Number.MAX_SAFE_INTEGER;
  const core = windows.filter(isCore).sort((a,b) => priority(a)-priority(b));
  const additional = windows.filter(w => !isCore(w)).sort((a,b) => a.bucket.localeCompare(b.bucket) || priority(a)-priority(b));
  return { core, additional };
}

export function resetRemaining(epoch: number | null, now: number) {
  if (epoch == null || !Number.isFinite(epoch)) return 'Not reported';
  const mins = Math.ceil((epoch*1000-now)/60000);
  if (mins <= 0) return 'Due · refresh to confirm';
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins/60)}h ${mins%60}m`;
  return `${Math.floor(mins/1440)}d ${Math.floor(mins%1440/60)}h`;
}

export function resetDate(epoch: number | null) {
  return epoch == null ? '' : new Date(epoch*1000).toLocaleString(undefined, { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
}
