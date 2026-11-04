import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { SupabaseAuthProvider, useAuth } from '@/contexts/auth-provider-supabase';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: jest.fn(), onAuthStateChange: jest.fn() } },
}));
jest.mock('@/lib/auth', () => ({}));
jest.mock('@/components/common/GlobalLoader', () => ({ GlobalLoader: () => 'Loading profile' }));
jest.mock('@/components/auth/mfa-challenge', () => ({ MfaChallenge: () => null }));
jest.mock('@/lib/logger', () => ({ logger: { debug: jest.fn(), error: jest.fn() } }));

function AuthState() {
  const { loading, currentUser } = useAuth();
  return <div>{loading ? 'Loading profile' : currentUser ? `Ready: ${currentUser.name}` : 'Anonymous'}</div>;
}

describe('authenticated boot without a cached profile', () => {
  const originalFetch = global.fetch;
  let resolveProfile: (value: unknown) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'test-token', user: { id: 'user-1' } } }, error: null,
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
    global.fetch = jest.fn(() => new Promise(resolve => { resolveProfile = resolve; })) as jest.Mock;
  });

  afterEach(() => { global.fetch = originalFetch; });

  it('keeps protected layouts loading until the verified profile is available', async () => {
    render(<SupabaseAuthProvider><AuthState /></SupabaseAuthProvider>);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/auth/profile', expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })));
    expect(screen.getByText('Loading profile')).toBeInTheDocument();
    expect(screen.queryByText('Anonymous')).not.toBeInTheDocument();
    await act(async () => {
      resolveProfile({ ok: true, json: async () => ({ profile: { id: 'user-1', name: 'Test Admin', role: 'admin', company_id: 'company-1', is_deleted: false } }) });
    });
    expect(screen.getByText('Ready: Test Admin')).toBeInTheDocument();
  });

  it('releases loading as anonymous if the profile request is rejected', async () => {
    render(<SupabaseAuthProvider><AuthState /></SupabaseAuthProvider>);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await act(async () => { resolveProfile({ ok: false, status: 401 }); });
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
  });
});
