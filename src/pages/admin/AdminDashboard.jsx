import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileStack, Clock, CheckCircle2, XCircle, Wallet, Leaf, ArrowRight } from 'lucide-react';
import { subscribeToApplications } from '../../lib/firebase';
import { STATUS_META } from '../../data/applicationStatus';

export default function AdminDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeToApplications((data) => {
      setApplications(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const total = applications.length;
  const pending = applications.filter(a => ['submitted', 'under_review', 'credit_assessment', 'climate_assessment'].includes(a.status)).length;
  const approved = applications.filter(a => a.status === 'approved' || a.status === 'funded').length;
  const rejected = applications.filter(a => a.status === 'rejected').length;
  const portfolioValue = applications
    .filter(a => a.status === 'approved' || a.status === 'funded')
    .reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
  const co2Impact = applications.reduce((acc, a) => acc + (Number(a.estimatedCo2) || 0), 0);

  const recent = applications.slice(0, 6);

  const cards = [
    { label: 'Total Applications', value: total, icon: FileStack, color: 'bg-primary-50 text-primary' },
    { label: 'Pending Reviews', value: pending, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Approved Loans', value: approved, icon: CheckCircle2, color: 'bg-secondary-50 text-secondary-600' },
    { label: 'Rejected Loans', value: rejected, icon: XCircle, color: 'bg-red-50 text-red-600' },
    { label: 'Portfolio Value', value: `KSh ${(portfolioValue / 1000000).toFixed(2)}M`, icon: Wallet, color: 'bg-blue-50 text-blue-600' },
    { label: 'CO2 Impact', value: `${(co2Impact / 1000).toFixed(1)}t`, icon: Leaf, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-ink font-display">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Institutional overview of applications, portfolio value, and climate impact.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon size={17} />
            </div>
            <div className="text-2xl font-bold text-ink font-display">{loading ? '—' : value}</div>
            <div className="text-sm font-medium text-slate-600">{label}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-ink text-sm">Recent Applications</h2>
          <button onClick={() => navigate('/admin/applications')} className="text-primary text-sm font-semibold hover:underline flex items-center gap-1">
            View all <ArrowRight size={13} />
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 skeleton rounded-lg" />)}</div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No applications submitted yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map(app => {
              const meta = STATUS_META[app.status] || STATUS_META.submitted;
              return (
                <div key={app.id} className="flex items-center justify-between py-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-ink truncate">{app.fullName}</div>
                    <div className="text-xs text-slate-400">{app.loanProductLabel} · {app.county}</div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-slate-500 text-xs">KSh {Number(app.amount).toLocaleString()}</span>
                    <span className="badge bg-slate-100 text-slate-700">{meta.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
