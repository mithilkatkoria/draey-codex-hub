import { emptyStore, type Store } from '../types';
// Only dynamically imported in explicitly enabled development mode.
let state: Store = structuredClone(emptyStore);
const delay = (n: number) => new Promise(r => setTimeout(r, n));
const stamp = () => new Date().toISOString();
state.profiles = ['Pro', 'Plus 1', 'Plus 2', 'Plus 3'].map((name, i) => ({ id: String(i), name, plan: i ? 'plus' : 'pro', accent: ['violet', 'blue', 'mint', 'amber'][i], home: `C:\\Demo\\${i}\\home`, desktopData: `C:\\Demo\\${i}\\desktop`, managed: true, availability: i ? 'available' : 'friend-priority', createdAt: stamp(), lastUsedAt: null, connection: 'connected' }));
state.projects = [{ id: 'demo-project', name: 'Freebuff', path: 'C:\\Dev\\freebuff', preferredProfileId: '2', pinned: true, lastOpenedAt: null }];
export async function mock(command: string, args: Record<string, unknown> = {}): Promise<unknown> {
 if (command === 'load_state') return structuredClone(state);
 if (command === 'detect_codex') return { desktop: 'DEMO / Codex Desktop', cli: 'DEMO / Codex CLI', existingHome: null, isolation: 'DEMO MODE' };
 if (command === 'refresh_usage') { await delay(500 + Number(args.id) * 250); const i = Number(args.id); if (i === 3) throw new Error('Simulated offline profile'); return { windows: (i === 0 ? [10080] : [300,10080]).map((duration,j) => ({ id: `${i}:${j}`, label: duration === 300 ? 'Session' : 'Weekly', bucket: 'codex', remainingPercent: i === 1 && j === 0 ? 0 : [93,61,74][i], usedPercent: i === 1 && j === 0 ? 100 : 100-[93,61,74][i], resetsAt: Date.now()/1000+5400, durationMins: duration })), fetchedAt: stamp(), state: 'live', source: 'DEMO — simulated values', message: null }; }
 if (command === 'launch_profile') { await delay(900); return 'DEMO — no Codex process launched'; }
 if (command === 'save_settings') { state.settings = args.settings as Store['settings']; return state.settings; }
 if (command === 'diagnostics') return { demo: true, message: 'Native diagnostics are available in the desktop build.' };
 throw new Error('This action requires the real desktop build.');
}
