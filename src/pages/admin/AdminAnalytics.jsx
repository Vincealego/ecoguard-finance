import { useState, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line,
} from 'recharts';
import { subscribeToApplications, subscribeToDisbursements } from '../../lib/firebase';
import { TrendingUp, TrendingDown, DollarSign, Users, Leaf, Send } from 'lucide-react';

const COLORS = ['#0B6E4F','#1F9D55','#F59E0B','#3B82F6','#8B5CF6','#06B6D4','#EF4444','#F97316'];

function fmt(n) { return Number(n).toLocaleString('en-KE'); }
function fmtK(n) { return n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(0)+'K' : String(n); }

const tooltipStyle = { borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 };

function StatCard({ label, value, sub, icon: Icon, trend, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary',
    green:   'bg-green-50 text-green-600',
    amber:   'bg-amber-50 text-amber-600',
    blue:    'bg-blue-50 text-blue-600',
    red:     'bg-red-50 text-red-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-ink font-display">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  );
}

export default function AdminAnalytics() {
  const [applications,  setApplications]  = useState([]);
  const [disbursements, setDisbursements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let appsLoaded = false, disbLoaded = false;
    const check = () => { if (appsLoaded && disbLoaded) setLoading(false); };
    const u1 = subscribeToApplications(d  => { setApplications(d);  appsLoaded = true;  check(); });
    const u2 = subscribeToDisbursements(d => { setDisbursements(d); disbLoaded = true; check(); });
    return () => { u1(); u2(); };
  }, []);

  // ── Key metrics ────────────────────────────────────────────────────────────
  const totalApplied    = applications.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const totalApproved   = applications.filter(a => ['approved','funded'].includes(a.status)).reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const totalDisbursed  = disbursements.filter(d => d.status === 'completed').reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const totalPending    = disbursements.filter(d => ['pending','processing'].includes(d.status)).reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const totalCo2        = applications.reduce((s, a) => s + (Number(a.estimatedCo2) || 0), 0);
  const totalJobs       = applications.reduce((s, a) => s + (Number(a.estimatedJobs) || 0), 0);
  const approvalRate    = applications.length ? Math.round((applications.filter(a => ['approved','funded'].includes(a.status)).length / applications.length) * 100) : 0;

  // ── Loan product distribution ──────────────────────────────────────────────
  const loanDistribution = (() => {
    const counts = {};
    applications.forEach(a => {
      const label = a.loanProductLabel || 'Other';
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  // ── County financing (applications) ───────────────────────────────────────
  const countyFinancing = (() => {
    const totals = {};
    applications.forEach(a => {
      if (!a.county) return;
      totals[a.county] = (totals[a.county] || 0) + (Number(a.amount) || 0);
    });
    return Object.entries(totals)
      .map(([county, amount]) => ({ county, amount: Math.round(amount / 1000) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  })();

  // ── Monthly cashflow — applications requested vs actually disbursed ─────
  const monthlyCashflow = (() => {
    const byMonth = {};

    applications.forEach(a => {
      const d   = a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt ? new Date(a.createdAt) : null;
      if (!d) return;
      const key = d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
      if (!byMonth[key]) byMonth[key] = { month: key, applied: 0, approved: 0, disbursed: 0, ts: d.getTime() };
      byMonth[key].applied  += Number(a.amount) || 0;
      if (['approved','funded'].includes(a.status)) byMonth[key].approved += Number(a.amount) || 0;
    });

    disbursements.forEach(d => {
      if (d.status !== 'completed') return;
      const dt  = d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt ? new Date(d.createdAt) : null;
      if (!dt) return;
      const key = dt.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
      if (!byMonth[key]) byMonth[key] = { month: key, applied: 0, approved: 0, disbursed: 0, ts: dt.getTime() };
      byMonth[key].disbursed += Number(d.amount) || 0;
    });

    return Object.values(byMonth)
      .sort((a, b) => a.ts - b.ts)
      .map(m => ({
        month:     m.month,
        Applied:   Math.round(m.applied   / 1000),
        Approved:  Math.round(m.approved  / 1000),
        Disbursed: Math.round(m.disbursed / 1000),
      }));
  })();

  // ── Disbursements by channel ───────────────────────────────────────────────
  const disbByChannel = (() => {
    const totals = {};
    disbursements.filter(d => d.status === 'completed').forEach(d => {
      const ch = d.channel || 'other';
      totals[ch] = (totals[ch] || 0) + (Number(d.amount) || 0);
    });
    const labels = { mpesa: 'M-Pesa', pesaflow: 'PesaFlow', bank: 'Bank', manual: 'Manual', other: 'Other' };
    return Object.entries(totals).map(([ch, amount]) => ({ name: labels[ch] || ch, value: amount }));
  })();

  // ── Approval status breakdown ──────────────────────────────────────────────
  const approvalBreakdown = (() => {
    const counts = { Approved: 0, Funded: 0, Rejected: 0, 'Under Review': 0, Submitted: 0 };
    applications.forEach(a => {
      if (a.status === 'approved')     counts['Approved']++;
      else if (a.status === 'funded')  counts['Funded']++;
      else if (a.status === 'rejected')counts['Rejected']++;
      else if (a.status === 'under_review') counts['Under Review']++;
      else counts['Submitted']++;
    });
    return Object.entries(counts).filter(([,v]) => v > 0).map(([name, value]) => ({ name, value }));
  })();

  // ── Monthly applications count ─────────────────────────────────────────────
  const monthlyApps = (() => {
    const counts = {};
    applications.forEach(a => {
      const d   = a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt ? new Date(a.createdAt) : null;
      if (!d) return;
      const key = d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' });
      counts[key] = (counts[key] || { month: key, count: 0, ts: d.getTime() });
      counts[key].count++;
    });
    return Object.values(counts).sort((a, b) => a.ts - b.ts);
  })();

  // ── Climate impact by product ──────────────────────────────────────────────
  const climateImpact = (() => {
    const totals = {};
    applications.forEach(a => {
      const label = a.loanProductLabel || 'Other';
      totals[label] = (totals[label] || 0) + (Number(a.estimatedCo2) || 0);
    });
    return Object.entries(totals)
      .map(([name, co2]) => ({ name, co2: Math.round(co2) }))
      .sort((a, b) => b.co2 - a.co2);
  })();

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink font-display">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time portfolio metrics — applications, disbursements, and climate impact.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {[1,2,3,4].map(i => <div key={i} className="card h-28 animate-pulse bg-slate-50" />)}
        </div>
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Applied (KES)"   value={fmtK(totalApplied)}   sub={`${applications.length} applications`}                  icon={DollarSign} color="primary" />
            <StatCard label="Total Approved (KES)"  value={fmtK(totalApproved)}  sub={`${approvalRate}% approval rate`}                       icon={TrendingUp} color="green"   />
            <StatCard label="Total Disbursed (KES)" value={fmtK(totalDisbursed)} sub={`${disbursements.filter(d=>d.status==='completed').length} completed payments`} icon={Send} color="blue" />
            <StatCard label="Pending Disbursement"  value={fmtK(totalPending)}   sub={`${disbursements.filter(d=>['pending','processing'].includes(d.status)).length} in progress`} icon={Users} color="amber" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="CO₂ Reduction (kg/yr)" value={fmtK(totalCo2)}  sub="Estimated annual impact" icon={Leaf}     color="green"   />
            <StatCard label="Jobs Supported"         value={fmtK(totalJobs)} sub="Across all projects"    icon={Users}    color="primary" />
            <StatCard label="Avg Loan Size (KES)"    value={fmtK(applications.length ? Math.round(totalApplied/applications.length) : 0)} sub="Mean application amount" icon={DollarSign} color="blue" />
            <StatCard label="Active Applicants"      value={new Set(applications.map(a=>a.userId)).size} sub="Unique users with applications" icon={Users} color="amber" />
          </div>

          {/* ── Charts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Monthly cashflow — the key fix */}
            <div className="card p-5 lg:col-span-2">
              <h3 className="font-semibold text-ink text-sm mb-1">Monthly Cashflow (KES thousands)</h3>
              <p className="text-xs text-slate-400 mb-4">Applications requested vs approved vs actually disbursed — all three in one view.</p>
              {monthlyCashflow.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No cashflow data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyCashflow} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}K`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`KES ${fmt(v)}K`, n]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Applied"   fill="#CBD5E1" radius={[3,3,0,0]} />
                    <Bar dataKey="Approved"  fill="#0B6E4F" radius={[3,3,0,0]} />
                    <Bar dataKey="Disbursed" fill="#F59E0B" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Loan distribution */}
            <div className="card p-5">
              <h3 className="font-semibold text-ink text-sm mb-4">Applications by Loan Product</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={loanDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name.split(' ')[0]} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {loanDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Approval breakdown */}
            <div className="card p-5">
              <h3 className="font-semibold text-ink text-sm mb-4">Application Status Breakdown</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={approvalBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {approvalBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* County financing */}
            <div className="card p-5">
              <h3 className="font-semibold text-ink text-sm mb-4">Top Counties by Financing (KES thousands)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={countyFinancing} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}K`} />
                  <YAxis type="category" dataKey="county" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={75} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [`KES ${fmt(v)}K`]} />
                  <Bar dataKey="amount" fill="#0B6E4F" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Disbursements by channel */}
            <div className="card p-5">
              <h3 className="font-semibold text-ink text-sm mb-4">Disbursements by Channel (KES)</h3>
              {disbByChannel.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No completed disbursements yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={disbByChannel} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                      {disbByChannel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={v => [`KES ${fmt(v)}`]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Climate impact */}
            <div className="card p-5">
              <h3 className="font-semibold text-ink text-sm mb-4">Est. CO₂ Reduction by Product (kg/yr)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={climateImpact}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={55} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                  <Tooltip contentStyle={tooltipStyle} formatter={v => [`${fmt(v)} kg`, 'CO₂/yr']} />
                  <Bar dataKey="co2" fill="#1F9D55" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly applications trend */}
            <div className="card p-5 lg:col-span-2">
              <h3 className="font-semibold text-ink text-sm mb-4">Monthly Application Volume</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyApps}>
                  <defs>
                    <linearGradient id="appsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0B6E4F" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0B6E4F" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="count" name="Applications" stroke="#0B6E4F" strokeWidth={2} fill="url(#appsGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
