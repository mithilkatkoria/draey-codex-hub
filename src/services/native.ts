import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
export const mockMode = import.meta.env.DEV && import.meta.env.VITE_DRAEY_MOCK_NATIVE === 'true';
export const nativeAvailable = isTauri();
export async function native<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (mockMode) { const { mock } = await import('./mock'); return mock(command, args) as Promise<T>; }
  if (!nativeAvailable) throw new Error('Open the Windows desktop build to connect profiles and retrieve live usage.');
  return invoke<T>(command, args);
}
export async function onNative<T>(event: string, handler: (payload: T) => void) { if (!nativeAvailable) return () => {}; return listen<T>(event, e => handler(e.payload)); }
