import { describe, expect, it } from 'vitest';
import { privacyEnabled, redactPrivateText } from './privacy';
describe('streamer privacy decisions',()=>{
  it('honours manual choices regardless of recorder state',()=>{
    for(const state of ['checking','ready','unavailable'] as const) {
      expect(privacyEnabled('on',{state,apps:[]})).toBe(true);
      expect(privacyEnabled('off',{state,apps:['OBS Studio']})).toBe(false);
    }
  });
  it('hides while detection is pending or unavailable and follows supported apps in Auto',()=>{
    expect(privacyEnabled('auto',{state:'checking',apps:[]})).toBe(true);
    expect(privacyEnabled('auto',{state:'unavailable',apps:[]})).toBe(true);
    expect(privacyEnabled('auto',{state:'ready',apps:[]})).toBe(false);
    expect(privacyEnabled('auto',{state:'ready',apps:['OBS Studio']})).toBe(true);
  });
  it('removes whole emails, Windows and UNC paths, including paths with spaces',()=>{
    for(const value of ['private.person+work@example.com','C:\\Users\\Private Person\\client work','\\\\server\\private folder','C:/Users/Private/client','/home/private/work']) {
      const redacted=redactPrivateText(value);
      expect(redacted).not.toContain('private');
      expect(redacted).not.toContain('Private');
      expect(redacted).toContain('hidden');
    }
  });
  it('redacts exact saved labels without destroying unrelated words',()=>{
    expect(redactPrivateText('Project opened with Pro',['Pro'])).toBe('Project opened with [hidden]');
    expect(redactPrivateText('Using Client (2026)',['Client (2026)'])).toBe('Using [hidden]');
  });
});
