export type StreamerPreference = 'auto' | 'on' | 'off';
export type RecorderDetection = { state: 'checking' | 'ready' | 'unavailable'; apps: string[] };
export function privacyEnabled(preference: StreamerPreference, detection: RecorderDetection) {
  return preference === 'on' || (preference === 'auto' && (detection.state !== 'ready' || detection.apps.length > 0));
}
// Do not retain even the domain, username or final folder name on screen.
export function redactPrivateText(value: string, secrets: string[] = []) {
  let result = value;
  for (const secret of [...new Set(secrets.filter(Boolean))].sort((a,b) => b.length-a.length)) {
    result = result.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`, 'giu'), '[hidden]');
  }
  return result
    .replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email hidden]')
    .replace(/(?:[a-z]:[\\/]|\\\\)[^\r\n"<>|]*/gi, '[path hidden]')
    .replace(/(?:file:\/\/|\/(?:Users|home|mnt|tmp)\/)[^\r\n"<>]*/gi, '[path hidden]');
}
