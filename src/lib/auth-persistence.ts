const AUTH_PERSISTENCE_KEY = 'fleetease.auth.persistence.v1';
const LEGACY_SESSION_KEY = 'fleetease.auth.session.v1';
const SUPABASE_AUTH_KEY_PATTERN = /^sb-.+-auth-token$/;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function getPreferredStorage(): Storage | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(AUTH_PERSISTENCE_KEY) === 'session'
    ? window.sessionStorage
    : window.localStorage;
}

/**
 * Official supabase-js Storage adapter. The SDK owns token serialization,
 * refresh and cleanup; this adapter only selects the browser storage scope.
 */
export const supabaseAuthStorage = {
  getItem(key: string): string | null {
    return getPreferredStorage()?.getItem(key) ?? null;
  },
  setItem(key: string, value: string): void {
    getPreferredStorage()?.setItem(key, value);
  },
  removeItem(key: string): void {
    getPreferredStorage()?.removeItem(key);
  },
};

export function setAuthPersistencePreference(rememberMe: boolean): void {
  if (!isBrowser()) return;
  const preferred = rememberMe ? window.localStorage : window.sessionStorage;
  const other = rememberMe ? window.sessionStorage : window.localStorage;
  window.localStorage.setItem(AUTH_PERSISTENCE_KEY, rememberMe ? 'persistent' : 'session');

  // Do not leave an older token in the storage scope that is no longer active.
  for (let index = other.length - 1; index >= 0; index -= 1) {
    const key = other.key(index);
    if (key && SUPABASE_AUTH_KEY_PATTERN.test(key)) other.removeItem(key);
  }
  preferred.removeItem(LEGACY_SESSION_KEY);
  other.removeItem(LEGACY_SESSION_KEY);
}

export function clearSupabaseAuthStorage(): void {
  if (!isBrowser()) return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key && (SUPABASE_AUTH_KEY_PATTERN.test(key) || key === LEGACY_SESSION_KEY)) {
        storage.removeItem(key);
      }
    }
  }
  window.localStorage.removeItem(AUTH_PERSISTENCE_KEY);
}
