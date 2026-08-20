import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useAddMatter } from '../context/AddMatterContext';
import { notificationsApi, mattersApi } from '../api/client';
import { AddMatterModal } from './AddMatterModal';
import { Icon } from './Icon';
import { ThemeSwitcher } from './ThemeSwitcher';
import { DatePicker } from './DatePicker';

const NAV = [
  { to: '/board', label: 'Board', icon: 'table_rows' },
  { to: '/kanban', label: 'Kanban', icon: 'view_kanban' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar_month' },
  { to: '/automations', label: 'Automations', icon: 'bolt' },
  { to: '/receipts', label: 'Receipts', icon: 'receipt_long' },
  { to: '/calculator', label: 'Calculator', icon: 'calculate' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { openAddMatter } = useAddMatter();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: radar } = useQuery({
    queryKey: ['radar'],
    queryFn: () => notificationsApi.radar().then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: simulated } = useQuery({
    queryKey: ['simulated-date'],
    queryFn: () => mattersApi.getSimulatedDate().then((r) => r.data.data.simulatedDate as string),
  });

  /** Changing the simulated clock changes every urgency calculation - refetch everything. */
  const setSimulated = useMutation({
    mutationFn: (date: string) => mattersApi.setSimulatedDate(date),
    onSuccess: () => qc.invalidateQueries(),
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <AddMatterModal />
      <div className="drawer lg:drawer-open min-h-screen bg-base-100">
        <input id="app-drawer" type="checkbox" className="drawer-toggle" />

        <div className="drawer-content flex flex-col min-h-screen">
          {/* Escalation strip */}
          <div className="bg-secondary text-secondary-content px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
              <span className="text-[11px] sm:text-xs font-semibold tracking-wide truncate">
                Zero-fail escalation engine active
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="u-chip u-DAILY_CRITICAL !bg-white/10 !text-white !border-white/25">
                <span className="u-dot" /> {radar?.dailyCritical || 0} daily
              </span>
              <span className="u-chip u-T_5_CRITICAL !bg-white/10 !text-white !border-white/25">
                <span className="u-dot" /> {radar?.critical5d || 0} 5-day
              </span>
              <span className="u-chip u-T_15_URGENT !bg-white/10 !text-white !border-white/25">
                <span className="u-dot" /> {radar?.urgent15d || 0} 15-day
              </span>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium">
                <Icon name="history_toggle_off" size={16} />
                <span className="hidden sm:inline">Simulate</span>
                <DatePicker
                  label="Simulated date"
                  value={simulated || ''}
                  onChange={(d) => setSimulated.mutate(d)}
                  className="tc-datefield-invert"
                />
              </div>
            </div>
          </div>

          <header className="navbar bg-base-100 border-b border-rule px-3 sm:px-4 min-h-14 gap-2">
            <label htmlFor="app-drawer" className="tc-icon-btn lg:hidden">
              <Icon name="menu" size={20} />
            </label>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate">Patent Docket Radar</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ThemeSwitcher />
              <button
                type="button"
                className="btn btn-sm tc-btn-quiet tc-btn gap-1.5 hidden sm:inline-flex"
                onClick={() => openAddMatter('OCR')}
              >
                <Icon name="bolt" size={18} filled />
                Auto-docket
              </button>
              <button
                type="button"
                className="btn btn-sm tc-btn-primary tc-btn gap-1.5"
                onClick={() => openAddMatter('MANUAL')}
              >
                <Icon name="add" size={18} />
                Add matter
              </button>
              <span className="text-sm font-medium hidden md:inline truncate max-w-[120px]">{user?.firstName}</span>
              <button type="button" className="tc-icon-btn" onClick={handleLogout} aria-label="Log out">
                <Icon name="logout" size={18} />
              </button>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>

        <div className="drawer-side z-40">
          <label htmlFor="app-drawer" aria-label="close sidebar" className="drawer-overlay" />
          <aside className="min-h-full w-56 sm:w-64 bg-surface-card border-r border-rule flex flex-col">
            <div className="p-4 border-b border-rule">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-primary text-primary-content grid place-items-center">
                  <Icon name="gavel" size={20} filled />
                </span>
                <div>
                  <div className="font-bold text-sm text-ink-deep leading-tight">LexPatent</div>
                  <div className="text-xs text-ink-muted">IP docketing</div>
                </div>
              </div>
            </div>
            <ul className="menu p-2 flex-1 gap-0.5 font-medium text-ink">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => `tc-nav-link ${isActive ? 'is-active' : ''}`}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon name={item.icon} size={20} filled={isActive} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="p-4 border-t border-rule">
              <div className="flex items-center gap-3">
                <img
                  src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.firstName}&background=3F6B33&color=fff`}
                  alt=""
                  className="w-9 h-9 rounded-full border border-rule object-cover"
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate text-ink">{user?.firstName} {user?.lastName}</div>
                  <div className="text-[11px] text-ink-muted truncate">{user?.role?.toLowerCase()}</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
