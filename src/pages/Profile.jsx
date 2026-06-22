import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Phone, MapPin, Calendar, LogOut,
  Shield, FileText, TrendingUp, ChevronRight, CheckCircle, Loader2, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Profile() {
  const { user, loading, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
  }, [loading, user]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <Loader2 size={28} className="animate-spin text-primary mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  const initials = (user.displayName || user.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const joinDate = user.createdAt?.toDate
    ? user.createdAt.toDate().toLocaleDateString('en-KE', { year: 'numeric', month: 'long' })
    : 'Recently joined';

  const quickLinks = [
    { icon: FileText, label: 'My Applications', sub: 'Track status of all your applications', path: '/dashboard' },
    { icon: TrendingUp, label: 'Browse Financing Products', sub: 'Explore available products', path: '/marketplace' },
    { icon: Shield, label: 'Climate Intelligence', sub: 'Check risk alerts for your county', path: '/climate-intelligence' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="mb-6">
        <h1 className="section-title">My Profile</h1>
        <p className="section-sub">Manage your EcoGuard Finance account.</p>
      </div>

      <div className="card p-6 mb-5">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-black flex-shrink-0 shadow-md font-display">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-ink leading-tight font-display">
                  {user.displayName || 'EcoGuard User'}
                </h2>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="badge bg-primary-100 text-primary-700">
                    <CheckCircle size={10} /> Verified Member
                  </span>
                  {isAdmin && (
                    <span className="badge bg-secondary-100 text-secondary-700">
                      <ShieldCheck size={10} /> Administrator
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {[
                { icon: Mail, val: user.email },
                { icon: Phone, val: user.phone || 'Not provided' },
                { icon: MapPin, val: user.county ? `${user.county} County` : 'Not provided' },
                { icon: Calendar, val: `Member since ${joinDate}` },
              ].map(({ icon: Icon, val }) => (
                <div key={val} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <Icon size={14} className="text-slate-400 flex-shrink-0" />
                  <span>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="w-full card p-4 mb-5 flex items-center gap-3 hover:bg-secondary-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-secondary-100 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={18} className="text-secondary-700" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-ink text-sm">Open Admin Portal</div>
            <div className="text-xs text-slate-400">Review applications and view platform analytics</div>
          </div>
          <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
        </button>
      )}

      <div className="card divide-y divide-slate-100 mb-5">
        {quickLinks.map(({ icon: Icon, label, sub, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-primary-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-ink text-sm">{label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
            </div>
            <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
          </button>
        ))}
      </div>

      <div className="card p-4 mb-5">
        <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Account ID</p>
        <code className="text-xs text-slate-600 font-mono break-all">{user.uid}</code>
      </div>

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-red-50 text-red-600 font-semibold rounded-xl border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
      >
        <LogOut size={16} />
        {loggingOut ? 'Signing out…' : 'Sign Out'}
      </button>
    </div>
  );
}
