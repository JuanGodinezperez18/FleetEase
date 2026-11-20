import { render, screen } from '@testing-library/react';
import { PortalRoleGuard } from '@/components/common/portal-role-guard';

let mockRole: string | null = 'admin';
let mockLoading = false;
const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace };
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }));
jest.mock('@/contexts/auth-provider', () => ({ useAuth: () => ({
  currentUser: mockRole ? { role: mockRole, uid: 'qa-user' } : null,
  loading: mockLoading,
}) }));

describe('live portal role boundary', () => {
  beforeEach(() => { mockRole='admin'; mockLoading=false; jest.clearAllMocks(); });
  it.each(['admin','editor','viewer','superAdmin','super_admin'])('keeps the dashboard available to %s', role => {
    mockRole=role;
    render(<PortalRoleGuard portal="dashboard"><button>Private action</button></PortalRoleGuard>);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
  it.each(['client','partner'] as const)('unmounts an open dashboard when the profile becomes %s', role => {
    const ui=<PortalRoleGuard portal="dashboard"><button>Private action</button></PortalRoleGuard>;
    const { rerender }=render(ui);
    mockRole=role;
    rerender(<PortalRoleGuard portal="dashboard"><button>Private action</button></PortalRoleGuard>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith(`/${role}`);
  });
  it.each(['client','partner'] as const)('redirects an open %s portal when the profile becomes admin', portal => {
    mockRole=portal;
    const { rerender }=render(<PortalRoleGuard portal={portal}><span>Portal content</span></PortalRoleGuard>);
    expect(screen.getByText('Portal content')).toBeInTheDocument();
    mockRole='admin';
    rerender(<PortalRoleGuard portal={portal}><span>Portal content</span></PortalRoleGuard>);
    expect(screen.queryByText('Portal content')).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });
  it('hides content after logout and rejects unknown roles', () => {
    mockRole=null;
    const { rerender }=render(<PortalRoleGuard portal="dashboard"><span>Private content</span></PortalRoleGuard>);
    expect(screen.queryByText('Private content')).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith('/login');
    mockRole='manager';
    rerender(<PortalRoleGuard portal="dashboard"><span>Private content</span></PortalRoleGuard>);
    expect(screen.queryByText('Private content')).not.toBeInTheDocument();
  });
  it('does not redirect while authentication is loading', () => {
    mockRole=null; mockLoading=true;
    render(<PortalRoleGuard portal="client"><span>Private content</span></PortalRoleGuard>);
    expect(screen.queryByText('Private content')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
