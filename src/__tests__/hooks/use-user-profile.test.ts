import { useInvalidateUserProfile, useUpdateUserProfileCache, useUserProfile, USER_PROFILE_QUERY_KEY } from '@/hooks/use-user-profile';

const mockUseQuery = jest.fn();
const mockInvalidate = jest.fn();
const mockSetQueryData = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useQueryClient: () => ({
    invalidateQueries: mockInvalidate,
    setQueryData: mockSetQueryData,
  }),
}));

// Firebase mocks
const mockGetDoc = jest.fn();
const mockDoc = jest.fn();
const mockGetIdTokenResult = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
}));

jest.mock('@/lib/firebase', () => ({ db: {} }));

describe('useUserProfile hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('propaga configuración básica a useQuery', () => {
    mockUseQuery.mockReturnValue('result');
    const fakeUser = { uid: 'u1' } as any;
    const result = useUserProfile(fakeUser, { enabled: true });

    expect(result).toBe('result');
    expect(mockUseQuery).toHaveBeenCalled();
    const call = mockUseQuery.mock.calls[0][0];
    expect(call.queryKey).toEqual([USER_PROFILE_QUERY_KEY, 'u1']);
    expect(call.enabled).toBe(true);
  });

  it('invalidates cache para el usuario indicado', () => {
    const invalidate = useInvalidateUserProfile();
    invalidate('user-123');
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: [USER_PROFILE_QUERY_KEY, 'user-123'] });
  });

  it('actualiza caché con updater proporcionado', () => {
    const updater = jest.fn();
    const updateCache = useUpdateUserProfileCache();
    updateCache('user-321', updater);
    expect(mockSetQueryData).toHaveBeenCalledWith([USER_PROFILE_QUERY_KEY, 'user-321'], updater);
  });
});
