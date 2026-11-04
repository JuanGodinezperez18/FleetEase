import {
  clearSupabaseAuthStorage,
  setAuthPersistencePreference,
  supabaseAuthStorage,
} from '@/lib/auth-persistence';

describe('Supabase auth storage adapter', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('persists tokens in localStorage when remember-me is enabled', () => {
    setAuthPersistencePreference(true);
    supabaseAuthStorage.setItem('sb-test-auth-token', 'persistent-session');

    expect(window.localStorage.getItem('sb-test-auth-token')).toBe('persistent-session');
    expect(window.sessionStorage.getItem('sb-test-auth-token')).toBeNull();
  });

  it('keeps session-only tokens in the current tab storage', () => {
    setAuthPersistencePreference(false);
    supabaseAuthStorage.setItem('sb-test-auth-token', 'tab-session');

    expect(window.sessionStorage.getItem('sb-test-auth-token')).toBe('tab-session');
    expect(window.localStorage.getItem('sb-test-auth-token')).toBeNull();
  });

  it('removes stale tokens from the inactive storage scope when preference changes', () => {
    window.localStorage.setItem('sb-test-auth-token', 'old-persistent-session');
    setAuthPersistencePreference(false);

    expect(window.localStorage.getItem('sb-test-auth-token')).toBeNull();
    expect(window.localStorage.getItem('fleetease.auth.persistence.v1')).toBe('session');
  });

  it('clears SDK tokens from both browser storage scopes on sign-out', () => {
    window.localStorage.setItem('sb-test-auth-token', 'persistent-session');
    window.sessionStorage.setItem('sb-test-auth-token', 'tab-session');

    clearSupabaseAuthStorage();

    expect(window.localStorage.getItem('sb-test-auth-token')).toBeNull();
    expect(window.sessionStorage.getItem('sb-test-auth-token')).toBeNull();
  });
});
