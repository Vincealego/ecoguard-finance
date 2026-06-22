import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { FileText, Leaf, Users, AlertTriangle, Plus, ArrowRight, RefreshCw, Droplets } from 'lucide-react';
import { getApplicationsForUser } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { RequireAuth } from '../components/RouteGuards';
import { STATUS_META, TIMELINE_STEPS, statusIndex } from '../data/applicationStatus';
import { loanProducts } from '../data/loans';
import { RISK_TYPES, getCountyRiskProfile, getRiskLevel } from '../data/climateRisk';

const TONE_BORDER = {
  slate: 'border-slate-300', blue: 'border-blue-400', indigo: 'border-indigo-400',
  teal: 'border-teal-400', primary: 'border-primary', green: 'border-secondary-500', red: 'border-red-400',
};
const TONE_BADGE = {
  slate: 'bg-slate-100 text-slate-700', blue: 'bg-blue-100 text-blue-700', indigo: 'bg-indigo-100 text-indigo-700',
  teal: 'bg-teal-100 text-teal-700', primary: 'bg-primary-100 text-primary-700', green: 'bg-secondary-100 text-secondary-700',
  red: 'bg-red-100 text-red-700',
};

const PIE_COLORS = ['#0B6E4F', '#1F9D55', '#F59E0B', '#3B82F6', '#8B5CF6', '#06B6D4'];

function StatusTimeline({ status }) {
  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
        <AlertTriangle size={14} /> Application rejected
      </div>
    );
  }
  const currentIndex = statusIndex(status);
  return (
    <div className="flex items-center gap-1">
      {TIMELINE_STEPS.map((step, i) => (
        <div key={step} className="flex items-center flex-1 last:flex-initial">
          <div
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${i <= currentIndex ? 'bg-primary' : 'bg-slate-200'}`}
            title={STATUS_META[step].label}
          />
          {i < TIMELINE_STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 ${i < currentIndex ? 'bg-primary' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function DashboardContent() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getApplicationsForUser(user.uid);
      setApplications(data);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const totalCo2 = applications.reduce((acc, a) => acc + (Number(a.estimatedCo2) || 0), 0);
  const totalJobs = applications.reduce((acc, a) => acc + (Number(a.estimatedJobs) || 0), 0);
  const totalApproved = applications
    .filter(a => a.status === 'approved' || a.status === 'funded')
    .reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
  const waterSaved = applications
    .filter(a => a.loanProduct === 'water-security' || a.loanProduct === 'climate-resilient-housing')
    .reduce((acc, a) => acc + (Number(a.amount) || 0) * 0.5, 0);

  const trendData = (() => {
    const getTime = (v) => {
      if (!v) return 0;
      if (typeof v.toMillis === 'function') return v.toMillis();
      return new Date(v).getTime();
    };
    const sorted = [...applications].sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt));
    let running = 0;
    return sorted.map((a, i) => {
      running += Number(a.estimatedCo2) || 0;
      return { name: `App ${i + 1}`, co2: running };
    });
  })();

  const productMix = (() => {
    const counts = {};
    applications.forEach(a => {
      const label = a.loanProductLabel || 'Other';
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const userCountyRisk = user.county ? getCountyRiskProfile(user.county) : null;
  const relevantAlerts = userCountyRisk
    ? Object.entries(userCountyRisk).filter(([, score]) => score >= 55)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="section-title">
            {user.displayName ? `Welcome back, ${user.displayName.split(' ')[0]}` : 'Financing Dashboard'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Track your applications, climate alerts, and financing impact.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="btn-ghost text-sm"><RefreshCw size={14} /> Refresh</button>
          <button onClick={() => navigate('/apply')} className="btn-primary text-sm"><Plus size={15} /> New Application</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center mb-3"><FileText size={17} className="text-primary" /></div>
          <div className="text-2xl font-bold text-ink font-display">{applications.length}</div>
          <div className="text-sm font-medium text-slate-600">Applications Submitted</div>
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 rounded-lg bg-secondary-50 flex items-center justify-center mb-3"><Leaf size={17} className="text-secondary-600" /></div>
          <div className="text-2xl font-bold text-ink font-display">{(totalCo2 / 1000).toFixed(1)}t</div>
          <div className="text-sm font-medium text-slate-600">CO2 Reduction</div>
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 rounded-lg bg-cyan-50 flex items-center justify-center mb-3"><Droplets size={17} className="text-cyan-600" /></div>
          <div className="text-2xl font-bold text-ink font-display">{(waterSaved / 1000).toFixed(0)}K L</div>
          <div className="text-sm font-medium text-slate-600">Water Saved</div>
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center mb-3"><Users size={17} className="text-purple-600" /></div>
          <div className="text-2xl font-bold text-ink font-display">{Math.round(totalJobs)}</div>
          <div className="text-sm font-medium text-slate-600">Jobs Created</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-ink text-base">My Applications</h2>
              <button onClick={() => navigate('/marketplace')} className="text-primary text-sm font-semibold hover:underline flex items-center gap-1">
                Browse products <ArrowRight size={13} />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card p-5 skeleton h-28" />)}</div>
            ) : applications.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="font-medium text-slate-700 mb-1">No applications yet</p>
                <p className="text-sm text-slate-400 mb-4">Apply for financing to get started.</p>
                <button onClick={() => navigate('/apply')} className="btn-primary text-sm mx-auto">Apply Now <ArrowRight size={13} /></button>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map(app => {
                  const meta = STATUS_META[app.status] || STATUS_META.submitted;
                  return (
                    <div key={app.id} className={`card p-4 border-l-4 ${TONE_BORDER[meta.tone]}`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-ink text-sm truncate">{app.projectTitle}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{app.loanProductLabel} - {app.county}</p>
                        </div>
                        <span className={`badge ${TONE_BADGE[meta.tone]} flex-shrink-0`}>{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-4 mb-3 text-sm">
                        <span className="font-semibold text-primary">KSh {Number(app.amount).toLocaleString()}</span>
                        <span className="text-slate-400 text-xs">{app.tenure}</span>
                      </div>
                      <StatusTimeline status={app.status} />
                      <p className="text-xs text-slate-400 mt-2">{meta.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {applications.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-ink text-sm mb-4">Cumulative CO2 Reduction (kg)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="co2Gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0B6E4F" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0B6E4F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
                  <Area type="monotone" dataKey="co2" stroke="#0B6E4F" strokeWidth={2} fill="url(#co2Gradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-ink text-sm mb-3">Climate Alerts {user.county ? `- ${user.county}` : ''}</h3>
            {!user.county ? (
              <p className="text-sm text-slate-400">Add your county in your profile to see relevant alerts.</p>
            ) : relevantAlerts.length === 0 ? (
              <p className="text-sm text-slate-400">No elevated climate risks detected for your county.</p>
            ) : (
              <div className="space-y-2.5">
                {relevantAlerts.map(([riskKey, score]) => {
                  const level = getRiskLevel(score);
                  return (
                    <div key={riskKey} className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50">
                      <AlertTriangle size={15} className="text-accent-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-ink">{RISK_TYPES[riskKey].label} - {level.label}</div>
                        <div className="text-xs text-slate-500">{score}% probability</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={() => navigate('/climate-intelligence')} className="w-full mt-3 btn-secondary text-sm py-2 justify-center">
              View Climate Intelligence <ArrowRight size={13} />
            </button>
          </div>

          {productMix.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-ink text-sm mb-3">Applications by Product</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={productMix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {productMix.map((entry, i) => <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {productMix.map((entry, i) => (
                  <span key={entry.name} className="text-xs flex items-center gap-1.5 text-slate-500">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {entry.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5 bg-primary-950 text-white border-0">
            <h3 className="font-semibold text-primary-200 text-sm mb-4 uppercase tracking-wide">Financing Summary</h3>
            <div className="text-2xl font-bold font-display">KSh {(totalApproved / 1000000).toFixed(2)}M</div>
            <div className="text-primary-300 text-xs mt-0.5">Approved financing</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
