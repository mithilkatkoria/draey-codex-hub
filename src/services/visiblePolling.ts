/** Suspend presentation polling in the tray; native authentication work is separate. */
export function visiblePolling(action: () => unknown | Promise<unknown>, interval: number) {
  let stopped = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function run() {
    if (stopped || running || document.visibilityState !== 'visible') return;
    running = true;
    try { await action(); }
    catch { /* The caller owns its error state. Keep later polls available. */ }
    finally {
      running = false;
      if (!stopped && document.visibilityState === 'visible') schedule();
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => void run(), interval);
  }

  function visibilityChanged() {
    clearTimeout(timer);
    if (document.visibilityState === 'visible') void run();
  }

  if (document.visibilityState === 'visible') schedule();
  document.addEventListener('visibilitychange', visibilityChanged);
  return () => {
    stopped = true;
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', visibilityChanged);
  };
}
