import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FileStack, CloudRain, BarChart3, Users, Leaf, LogOut, ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/admin/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/admin/applications',  label: 'Applications',  icon: FileStack       },
  { to: '/admin/disbursements', label: 'Disbursements', icon: Send            },
  { to: '/admin/climate',       label: 'Climate',       icon: CloudRain       },
  { to: '/admin/analytics',     label: 'Analytics',     icon: BarChart3       },
  { to: '/admin/users',         label: 'Users',         icon: Users           },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface flex">
      <aside className="w-60 bg-primary-950 text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <div className="w-8 h-8 bg-secondary-500 rounded-lg flex items-center justify-center">
            <Leaf size={16} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight font-display">EcoGuard</div>
            <div className="text-[10px] text-primary-300 uppercase tracking-wide">Admin Portal</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/10 text-white' : 'text-primary-200 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <NavLink to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary-200 hover:bg-white/5 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Exit Admin Portal
          </NavLink>
          <div className="px-3 py-2 text-xs text-primary-300 truncate">{user?.email}</div>
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary-200 hover:bg-white/5 hover:text-white transition-colors w-full">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-primary-950 text-white">
          <span className="font-semibold text-sm font-display">EcoGuard Admin</span>
          <NavLink to="/" className="text-xs text-primary-200">Exit</NavLink>
        </div>
        <div className="md:hidden flex overflow-x-auto bg-primary-900 text-white px-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap ${isActive ? 'text-white border-b-2 border-secondary-400' : 'text-primary-300'}`}
            >
              <Icon size={13} /> {label}
            </NavLink>
          ))}
        </div>
        <main className="p-5 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
