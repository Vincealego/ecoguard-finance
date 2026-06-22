import { useState, useEffect } from 'react';
import {
  Search, Send, CheckCircle2, XCircle, Loader2, Clock,
  Smartphone, Building2, X, DollarSign, AlertTriangle, Copy,
} from 'lucide-react';
import {
  subscribeToDisbursements, subscribeToApplications,
  recordDisbursement, updateDisbursementStatus,
} from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';

// ── Config ────────────────────────────────────────────────────────────────────
// When deployed on Railway, the backend and frontend are on the SAME server.
// So API calls go to the same domain — no separate URL needed.
// VITE_MPESA_BACKEND_URL is only needed when running backend separately locally.
const MPESA_BACKEND = import.meta.env.VITE_MPESA_BACKEND_URL || '';

// ── Channels — M-Pesa B2C, Bank, Manual only ─────────────────────────────────
const CHANNELS = [
  {
    id: 'mpesa',
    label: 'M-Pesa (B2C — Send to Phone)',
    icon: Smartphone,
    badge: 'bg-green-100 text-green-700',
    border: 'border-green-400 bg-green-50',
    description: 'Sends money DIRECTLY to the recipient\'s M-Pesa — they receive it instantly, no PIN needed.',
    phoneLabel: 'Recipient M-Pesa phone number',
    phonePlaceholder: '07XXXXXXXX',
    refLabel: 'Payment narrative',
    isReady: () => true, // Always ready — backend runs on same server on Railway
    setupHint: 'Start backend: cd ecoguard-backend && npm start',
  },
  {
    id: 'bank',
    label: 'Bank EFT / RTGS',
    icon: Building2,
    badge: 'bg-slate-100 text-slate-700',
    border: 'border-slate-300 bg-slate-50',
    description: 'Record a direct bank transfer — process it via your bank and record the reference here.',
    phoneLabel: 'Account number',
    phonePlaceholder: 'Bank account number',
    refLabel: 'Bank payment reference',
    isReady: () => true,
  },
  {
    id: 'manual',
    label: 'Manual / Cash',
    icon: DollarSign,
    badge: 'bg-amber-100 text-amber-700',
    border: 'border-amber-300 bg-amber-50',
    description: 'Record a cash or manual payment for audit and tracking purposes.',
    phoneLabel: 'Recipient ID / phone',
    phonePlaceholder: 'ID number or phone',
    refLabel: 'Receipt / voucher number',
    isReady: () => true,
  },
];

const STATUS_STYLE = {
  pending:    { label: 'Pending',    cls: 'bg-amber-100 text-amber-700'  },
  processing: { label: 'Processing', cls: 'bg-blue-100 text-blue-700'    },
  completed:  { label: 'Completed',  cls: 'bg-green-100 text-green-700'  },
  failed:     { label: 'Failed',     cls: 'bg-red-100 text-red-700'      },
};

// ── API call ──────────────────────────────────────────────────────────────────
async function sendB2C({ phone, amount, reference, remarks }) {
  // Relative URL works on Railway (same server). Set VITE_MPESA_BACKEND_URL for local dev only.
  const base = import.meta.env.VITE_MPESA_BACKEND_URL || '';
  const res = await fetch(`${base}/api/mpesa/b2c`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone:     phone.replace(/^\+/, '').replace(/^0/, '254'),
      amount:    Math.round(Number(amount)),
      reference: reference || `ECO-${Date.now()}`,
      remarks:   remarks   || 'EcoGuard Finance loan disbursement',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `B2C request failed: ${res.status}`);
  return data;
}

// ── Disburse Modal ────────────────────────────────────────────────────────────
function DisburseModal({ applications, onClose, adminUid }) {
  const [step, setStep]       = useState(1);
  const [app, setApp]         = useState(null);
  const [channel, setChannel] = useState(null);
  const [phone, setPhone]     = useState('');
  const [amount, setAmount]   = useState('');
  const [reference, setRef]   = useState('');
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState('');
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [done, setDone]       = useState(null);

  const approvedApps = applications.filter(a => ['approved','funded'].includes(a.status));
  const filtered     = approvedApps.filter(a =>
    !search ||
    a.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    a.projectTitle?.toLowerCase().includes(search.toLowerCase())
  );
  const ch = CHANNELS.find(c => c.id === channel);

  useEffect(() => {
    if (app) { setPhone(app.phone || ''); setAmount(app.amount || ''); }
  }, [app?.id]);

  const handleSubmit = async () => {
    if (!app || !channel || !amount || !phone) {
      setError('Please fill all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    let originatorId = '';

    try {
      if (channel === 'mpesa') {
        setLoadMsg('Sending funds to ' + phone + ' via M-Pesa B2C…');
        const res = await sendB2C({
          phone,
          amount,
          reference: reference || `ECO-${app.id.slice(0, 8)}`,
          remarks:   note || 'EcoGuard Finance loan disbursement',
        });
        originatorId = res.OriginatorConversationID || res.ConversationID || '';
        setLoadMsg('M-Pesa B2C sent ✓ — funds on their way…');
      }

      if (channel === 'bank')   setLoadMsg('Recording bank transfer…');
      if (channel === 'manual') setLoadMsg('Recording manual payment…');

      const disbId = await recordDisbursement({
        applicationId:   app.id,
        applicantName:   app.fullName,
        applicantPhone:  phone,
        applicantEmail:  app.email,
        amount,
        channel,
        reference:       reference || `ECO-${Date.now()}`,
        note,
        initiatedBy:     adminUid,
        mpesaCheckoutRequestId: originatorId,
      });

      const initStatus = channel === 'mpesa' ? 'processing' : 'pending';
      const initNote   = {
        mpesa:  'M-Pesa B2C payment sent — funds being transferred to recipient.',
        bank:   'Bank transfer recorded — mark done once bank confirms.',
        manual: 'Manual payment recorded — mark done once confirmed.',
      }[channel];

      await updateDisbursementStatus(disbId, initStatus, initNote);
      setDone({ disbId, channel, phone, amount });
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
      setLoadMsg('');
    }
  };

  // ── Success screen ──
  if (done) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h3 className="font-bold text-xl text-ink font-display mb-2">Payment Initiated</h3>
          {done.channel === 'mpesa' ? (
            <p className="text-slate-500 text-sm mb-6">
              KES {Number(done.amount).toLocaleString()} is being sent to <strong>{done.phone}</strong> via M-Pesa.
              The recipient will receive an M-Pesa notification shortly — no PIN required on their end.
            </p>
          ) : (
            <p className="text-slate-500 text-sm mb-6">
              Payment of KES {Number(done.amount).toLocaleString()} has been recorded.
              Mark it as <strong>Completed</strong> once the transfer is confirmed.
            </p>
          )}
          <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-ink text-lg font-display">New Disbursement</h3>
            <div className="flex gap-1 mt-2">
              {[1,2,3,4].map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-4"><X size={20} /></button>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4">

          {/* Step 1 — Select application */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-ink">Select approved application</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input pl-8 text-sm" placeholder="Search applicant or project…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <AlertTriangle size={22} className="mx-auto mb-2 opacity-50" />
                  No approved applications. Approve one first.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {filtered.map(a => (
                    <button key={a.id} onClick={() => setApp(a)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        app?.id === a.id ? 'border-primary bg-primary-50' : 'border-slate-200 hover:border-primary-300'
                      }`}>
                      <div className="font-semibold text-sm text-ink">{a.fullName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{a.projectTitle} · KSh {Number(a.amount||0).toLocaleString()}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{a.phone} · {a.county}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Channel */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-ink">Choose payment channel</p>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                <strong>Note:</strong> M-Pesa B2C sends money <em>directly</em> to the recipient — they receive it automatically with no PIN prompt needed. This is different from STK Push which charges the recipient.
              </div>
              {CHANNELS.map(c => {
                const Icon  = c.icon;
                const ready = c.isReady();
                return (
                  <button key={c.id} onClick={() => setChannel(c.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      channel === c.id ? c.border : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}>
                    <div className="flex items-start gap-3">
                      <Icon size={20} className={`mt-0.5 flex-shrink-0 ${ready ? '' : 'opacity-30'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{c.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            ready ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>{ready ? '✓ Ready' : 'Needs setup'}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>
                        {!ready && c.setupHint && (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1.5 font-mono">{c.setupHint}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 3 — Details */}
          {step === 3 && ch && (
            <div className="space-y-4">
              <div className={`p-3 rounded-lg border-2 text-sm font-semibold flex items-center gap-2 ${ch.border}`}>
                <ch.icon size={16} /> {ch.label}
              </div>
              <div>
                <label className="label">{ch.phoneLabel} <span className="text-red-500">*</span></label>
                <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder={ch.phonePlaceholder} />
                {channel === 'mpesa' && (
                  <p className="text-xs text-slate-400 mt-1">We'll convert 07XX → 2547XX automatically.</p>
                )}
              </div>
              <div>
                <label className="label">Amount (KES) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">KES</span>
                  <input type="number" className="input pl-12" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="label">{ch.refLabel}</label>
                <input className="input" value={reference} onChange={e => setRef(e.target.value)} placeholder="Auto-generated if blank" />
              </div>
              <div>
                <label className="label">Internal note</label>
                <textarea className="input min-h-[60px] resize-none text-sm" value={note} onChange={e => setNote(e.target.value)} placeholder="Tranche, reason, etc." />
              </div>
            </div>
          )}

          {/* Step 4 — Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 font-medium">
                ⚠ Confirm — this will send KES {Number(amount).toLocaleString()} directly to {phone}.
              </div>
              <div className="bg-slate-50 rounded-xl divide-y divide-slate-100 text-sm overflow-hidden">
                {[
                  ['Recipient',  app?.fullName],
                  ['Project',    app?.projectTitle],
                  ['Channel',    ch?.label],
                  ['Send to',    phone],
                  ['Amount',     `KES ${Number(amount).toLocaleString()}`],
                  reference && ['Reference', reference],
                  note      && ['Note', note],
                ].filter(Boolean).map(([lbl, val]) => (
                  <div key={lbl} className="flex justify-between px-4 py-3 gap-3">
                    <span className="text-slate-500">{lbl}</span>
                    <span className="font-semibold text-ink text-right break-all max-w-[60%]">{val}</span>
                  </div>
                ))}
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 whitespace-pre-line">
                  <div className="flex items-start gap-2"><AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />{error}</div>
                </div>
              )}
              {loadMsg && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 size={14} className="animate-spin" /> {loadMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          {step > 1
            ? <button onClick={() => { setStep(s => s - 1); setError(''); }} className="btn-ghost text-sm">← Back</button>
            : <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>}
          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={(step === 1 && !app) || (step === 2 && !channel) || (step === 3 && (!phone || !amount))}
              className="btn-primary text-sm"
            >
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="btn-primary text-sm min-w-[160px] justify-center">
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> {loadMsg ? 'Sending…' : 'Processing…'}</>
                : <><Send size={14} /> Send Payment</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminDisbursements() {
  const { user }                          = useAuth();
  const [disbursements, setDisbursements] = useState([]);
  const [applications, setApplications]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [statusFilter, setFilter]         = useState('all');
  const [showModal, setShowModal]         = useState(false);
  const [updating, setUpdating]           = useState(null);
  const [copied, setCopied]               = useState('');

  useEffect(() => {
    const u1 = subscribeToDisbursements(d => { setDisbursements(d); setLoading(false); });
    const u2 = subscribeToApplications(d => setApplications(d));
    return () => { u1(); u2(); };
  }, []);

  const filtered = disbursements.filter(d => {
    const q = search.toLowerCase();
    return (
      (!search || d.applicantName?.toLowerCase().includes(q) || d.reference?.toLowerCase().includes(q) || d.applicantPhone?.includes(q)) &&
      (statusFilter === 'all' || d.status === statusFilter)
    );
  });

  const totalDone       = disbursements.filter(d => d.status === 'completed').reduce((s, d) => s + (Number(d.amount)||0), 0);
  const totalInProgress = disbursements.filter(d => ['pending','processing'].includes(d.status)).reduce((s, d) => s + (Number(d.amount)||0), 0);

  const markStatus = async (id, status, detail) => {
    setUpdating(id);
    await updateDisbursementStatus(id, status, detail);
    setUpdating(null);
  };

  const copy = text => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink font-display">Disbursements</h1>
          <p className="text-slate-500 text-sm mt-1">Send funds via M-Pesa B2C, Bank transfer, or record manual payments.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Send size={15} /> New Disbursement
        </button>
      </div>

      {/* Backend status */}
      <div className={`mb-5 flex flex-wrap items-center gap-2 p-4 rounded-xl border text-sm ${
        MPESA_BACKEND ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}>
        <><CheckCircle2 size={14} /> M-Pesa B2C active — backend runs on same server. {MPESA_BACKEND && <span>Local: <code className="font-mono text-xs bg-green-100 px-1 rounded">{MPESA_BACKEND}</code></span>}</>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Disbursed',  value: `KES ${totalDone.toLocaleString()}`,        icon: CheckCircle2, cls: 'text-green-600' },
          { label: 'In Progress',      value: `KES ${totalInProgress.toLocaleString()}`,  icon: Clock,        cls: 'text-amber-600' },
          { label: 'Total Records',    value: disbursements.length,                         icon: DollarSign,   cls: 'text-primary'   },
        ].map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="card p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center ${cls}`}><Icon size={20} /></div>
            <div>
              <div className="text-xs text-slate-400">{label}</div>
              <div className="text-xl font-bold font-display text-ink mt-0.5">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-8 text-sm" placeholder="Search name, phone, or reference…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-44 text-sm" value={statusFilter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All ({disbursements.length})</option>
          {Object.entries(STATUS_STYLE).map(([k, v]) => (
            <option key={k} value={k}>{v.label} ({disbursements.filter(d => d.status === k).length})</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Channel</th>
              <th>Phone</th>
              <th>Amount (KES)</th>
              <th>Reference</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">
                <Loader2 size={20} className="animate-spin mx-auto mb-2" /> Loading…
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">No disbursements yet.</td></tr>
            ) : filtered.map(d => {
              const st  = STATUS_STYLE[d.status] || STATUS_STYLE.pending;
              const ch  = CHANNELS.find(c => c.id === d.channel);
              const Icon = ch?.icon || DollarSign;
              return (
                <tr key={d.id}>
                  <td>
                    <div className="font-medium">{d.applicantName}</div>
                    <div className="text-xs text-slate-400">{d.applicantEmail}</div>
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${ch?.badge || 'bg-slate-100 text-slate-600'}`}>
                      <Icon size={11} /> {ch?.label?.split(' ')[0] || d.channel}
                    </span>
                  </td>
                  <td className="font-mono text-xs">{d.applicantPhone}</td>
                  <td className="font-semibold">{Number(d.amount||0).toLocaleString()}</td>
                  <td>
                    {d.reference ? (
                      <button onClick={() => copy(d.reference)} className="font-mono text-xs text-slate-500 hover:text-primary flex items-center gap-1">
                        {d.reference.slice(0,14)}{d.reference.length > 14 ? '…' : ''}
                        {copied === d.reference ? <CheckCircle2 size={10} className="text-green-500" /> : <Copy size={10} />}
                      </button>
                    ) : '—'}
                  </td>
                  <td className="text-xs text-slate-500">
                    {d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('en-KE') : d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-KE') : '—'}
                  </td>
                  <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                  <td>
                    {['pending','processing'].includes(d.status) ? (
                      <div className="flex gap-2">
                        <button disabled={updating === d.id} onClick={() => markStatus(d.id, 'completed', 'Confirmed.')}
                          className="text-xs text-green-600 font-semibold hover:underline flex items-center gap-1">
                          {updating === d.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Done
                        </button>
                        <button disabled={updating === d.id} onClick={() => markStatus(d.id, 'failed', 'Failed or reversed.')}
                          className="text-xs text-red-500 font-semibold hover:underline flex items-center gap-1">
                          <XCircle size={11} /> Fail
                        </button>
                      </div>
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <DisburseModal applications={applications} onClose={() => setShowModal(false)} adminUid={user?.uid} />
      )}
    </div>
  );
}
