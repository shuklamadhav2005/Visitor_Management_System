import { useState } from 'react';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Shield,
  UserCircle2,
  XCircle,
  UserPlus,
  Users,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function AppShell() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const firstLetter = (user?.name || 'U').trim().charAt(0).toUpperCase();

  const roleLabel = {
    security: 'Security Guard',
    user: 'Resident',
    admin: 'Administrator',
  }[user?.role || 'user'];

  const roleColor = {
    security: '#3b82f6',
    user: '#10b981',
    admin: '#f59e0b',
  }[user?.role || 'user'];

  const navigation = {
    security: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/visitors/add', label: 'Add Visitor', icon: UserPlus },
      { to: '/visitors/requests', label: 'Visitor Requests', icon: ListChecks },
      { to: '/visitors/all', label: 'All Visitors', icon: Users },
      { to: '/profile', label: 'Profile', icon: UserCircle2 },
    ],
    user: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/approved', label: 'Approved', icon: CheckCircle2 },
      { to: '/rejected', label: 'Rejected', icon: XCircle },
      { to: '/profile', label: 'Profile', icon: UserCircle2 },
    ],
    admin: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/visitors/logs', label: 'All Visitors', icon: ListChecks },
      { to: '/admin/users', label: 'Users Management', icon: Users },
      { to: '/admin/security-guards', label: 'Security Guards', icon: Shield },
      { to: '/admin/reports', label: 'Reports / Analytics', icon: BarChart3 },
      { to: '/profile', label: 'Profile', icon: UserCircle2 },
    ],
  }[user?.role || 'user'];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="navbar-brand">
          <div className="brand-mark">VMS</div>
          <div>
            <h2>Smart Visitor System</h2>
            <p>Secure entry control, approvals, and reporting</p>
          </div>
        </div>
        <div className="navbar-user">
          <div className="user-info user-info-compact">
            <div className="user-avatar" style={{ backgroundColor: roleColor }} aria-hidden="true">
              {firstLetter}
            </div>
            <span className="user-role user-role-inline" style={{ borderColor: roleColor, color: roleColor }}>
              <Shield size={14} /> {roleLabel}
            </span>
          </div>
          <button type="button" className="logout-button" onClick={logout}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <div className="shell-body">
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <div className="sidebar-header">
            <div className="sidebar-title">
              <span className="eyebrow">Navigation</span>
              <h3>{roleLabel}</h3>
            </div>
            <button
              type="button"
              className="sidebar-toggle sidebar-toggle--header desktop-only"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          <nav className="side-nav">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={`${item.to}-${item.label}`} to={item.to} end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <span className="sidebar-footer-label">Signed in as</span>
            <strong>{user?.email}</strong>
          </div>
        </aside>

        <main className="main-panel">
          <section className="content-grid">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
