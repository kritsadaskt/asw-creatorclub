const FB_KEY_PREFIXES = ['fblst_', 'fblo_', 'fbs_', 'fb_'];

export function clearFacebookLocalStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;

      if (FB_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore individual removal failures
      }
    });
  } catch {
    // ignore failures reading localStorage (e.g. disabled in browser)
  }
}

export function installLocalStorageSafeGuard(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  const originalSetItem = window.localStorage.setItem.bind(window.localStorage);

  if ((window.localStorage as any).__aswSafeGuardInstalled) {
    return;
  }

  try {
    (window.localStorage as any).__aswSafeGuardInstalled = true;
  } catch {
    // non-critical, continue
  }

  window.localStorage.setItem = function (key: string, value: string): void {
    try {
      originalSetItem(key, value);
    } catch (err: any) {
      if (
        err &&
        (err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        clearFacebookLocalStorage();
        try {
          originalSetItem(key, value);
        } catch {
          // swallow on second failure; nothing else we can do
        }
      } else {
        throw err;
      }
    }
  };
}

