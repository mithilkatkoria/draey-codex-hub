export type UsageState = 'live' | 'refreshing' | 'stale' | 'offline' | 'unavailable' | 'auth-required' | 'error';
export interface UsageWindow { id: string; label: string; bucket: string; usedPercent: number | null; remainingPercent: number | null; resetsAt: number | null; durationMins: number | null }
export interface ResetCredit { status: string; expiresAt: number | null; title: string }
export interface ResetCredits { availableCount: number | null; credits: ResetCredit[] | null }
export interface Snapshot { windows: UsageWindow[]; fetchedAt: string; source: string; state: UsageState; message: string | null; resetCredits?: ResetCredits | null }
export interface Profile { id: string; name: string; plan: 'plus' | 'pro' | 'other'; accent: string; home: string; desktopData: string; managed: boolean; availability: 'available' | 'reserved' | 'friend-priority'; createdAt: string; lastUsedAt: string | null; connection: string; accountEmail?: string | null; actualPlan?: string | null }
export interface Project { id: string; name: string; path: string; preferredProfileId: string | null; pinned: boolean; lastOpenedAt: string | null }
export interface Settings { desktopExe: string | null; cliExe: string | null; profileRoot: string | null; autoRefresh: boolean; refreshSeconds: number; refreshOnFocus: boolean; showStale: boolean; reducedMotion: boolean; density: string; minimizeToTray: boolean; startup: boolean; hideAfterLaunch: boolean }
export interface Store { version: number; profiles: Profile[]; projects: Project[]; settings: Settings; usageCache: Record<string, Snapshot> }
export interface Installation { desktop: string | null; cli: string | null; existingHome: string | null; isolation: string }
export const defaultSettings: Settings = { desktopExe: null, cliExe: null, profileRoot: null, autoRefresh: true, refreshSeconds: 60, refreshOnFocus: true, showStale: true, reducedMotion: false, density: 'comfortable', minimizeToTray: true, startup: false, hideAfterLaunch: false };
export const emptyStore: Store = { version: 1, profiles: [], projects: [], settings: defaultSettings, usageCache: {} };

export interface WorkspaceSwitch { id: string; stage: 'waiting' | 'restarting' | 'awaiting-quit' | 'switching'; message: string }
export interface WorkspaceStatus { home: string; activeProfileId: string | null; pending: WorkspaceSwitch | null }
