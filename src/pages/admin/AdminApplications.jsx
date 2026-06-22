import { useState, useEffect } from 'react';
import {
  Search, CheckCircle2, XCircle, MessageCircleQuestion,
  X, Loader2, ChevronDown, Clock, FileText, Download,
  Eye, AlertCircle,
} from 'lucide-react';
import { subscribeToApplications, updateApplicationStatus, getApplicationDocuments } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { STATUS_META, APPLICATION_STATUSES } from '../../data/applicationStatus';

// ─── Tone → Tailwind badge classes ──────────────────────────────────────────
const TONE_BADGE = {
  slate:   'bg-slate-100 text-slate-700',
  blue:    'bg-blue-100 text-blue-700',
  indigo:  'bg-indigo-100 text-indigo-700',
  teal:    'bg-teal-100 text-teal-700',
  primary: 'bg-emerald-100 text-emerald-700',
  green:   'bg-green-100 text-green-700',
  red:     'bg-red-100 text-red-700',
};

// Human-readable label for a document key e.g. "kraPin" → "KRA PIN"
function docKeyLabel(key) {
  const map = {
    identity:           'National ID',
    kraPin:             'KRA PIN Certificate',
    bankStatement:      'Bank / M-Pesa Statement',
    passport:           'Passport Photo',
    saccoReg:           'SACCO Registration',
    audited:            'Audited Financial Statements',
    boardResolution:    'Board Resolution',
    officialId:         'Authorised Signatory ID',
    businessReg:        'Business Registration',
    directorId:         'Director / Owner ID',
    ngoReg:             'NGO / CBO Registration',
    annualReport:       'Annual Report',
    titleDeed:          'Title Deed / Search Certificate',
    landValuation:      'Land Valuation Report',
    logbook:            'Vehicle Logbook',
    vehicleValuation:   'Vehicle Valuation Report',
    insurance:          'Insurance Certificate',
    propertyValuation:  'Property Valuation Report',
    equipmentInvoice:   'Equipment Invoice / Ownership',
    equipmentValuation: 'Equipment Valuation Report',
  };
  return map[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

// ─── Document Viewer Modal ───────────────────────────────────────────────────
function DocViewer({ doc, onClose }) {
  if (!doc) return null;
  const isImage = doc.type?.startsWith('image/');
  const isPdf   = doc.type === 'application/pdf';
  const src     = doc.src || doc.url || doc.data;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="min-w-0">
            <p className="font-semibold text-ink text-sm truncate">{doc.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{doc.name} · {Math.round((doc.size || 0) / 1024)} KB</p>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {src && (
              <a
                href={src}
                download={doc.name}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Download size={13} /> Download
              </a>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4 min-h-[300px]">
          {src && isImage && (
            <img src={src} alt={doc.name} className="max-w-full max-h-full object-contain rounded shadow" />
          )}
          {src && isPdf && (
            <iframe src={src} title={doc.name} className="w-full rounded shadow bg-white" style={{ height: '65vh' }} />
          )}
          {src && !isImage && !isPdf && (
            <div className="text-center text-slate-500">
              <FileText size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium">Preview not available for this file type.</p>
              <a href={src} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 text-sm inline-flex items-center gap-2">
                <Download size={14} /> Open / Download
              </a>
            </div>
          )}
          {!src && (
            <div className="text-center text-slate-400">
              <FileText size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">File not available for preview.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Auto-refresh banner while docs are uploading ───────────────────────────
function DocsUploadingBanner({ applicationId, onDone }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    // Poll Firestore every 3 seconds to check if uploads finished
    const interval = setInterval(async () => {
      try {
        const snap = await getDoc(doc(db, 'applications', applicationId));
        if (snap.exists()) {
          const data = snap.data();
          if (!data.docsUploading) {
            clearInterval(interval);
            onDone(data.documents || {});
          }
        }
      } catch (e) { /* keep polling */ }
      setSeconds(s => s + 3);
    }, 3000);
    return () => clearInterval(interval);
  }, [applicationId]);

  return (
    <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 mb-3">
      <Loader2 size={13} className="animate-spin flex-shrink-0" />
      <span>Documents uploading in background — checking automatically every 3 seconds… ({seconds}s)</span>
    </div>
  );
}


function DocumentsPanel({ applicationId, documents }) {
  const [viewing, setViewing]           = useState(null);
  const [fallback, setFallback]         = useState({});
  const [loadingFallback, setLoading]   = useState(false);

  // For docs stored in Firestore sub-collection (Storage fallback), fetch their data
  useEffect(() => {
    const needsFallback = Object.entries(documents || {}).some(([, v]) => v?.stored === 'firestore');
    if (!needsFallback || !applicationId) return;
    setLoading(true);
    getApplicationDocuments(applicationId)
      .then(data => setFallback(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [applicationId, documents]);

  // Merge: Storage docs take priority; Firestore sub-collection fills the rest
  const merged = {};
  Object.entries(documents || {}).forEach(([key, doc]) => {
    if (doc?.url) {
      merged[key] = doc; // Storage URL available
    } else if (fallback[key]) {
      merged[key] = { ...doc, ...fallback[key] }; // Firestore data available
    } else if (doc?.name) {
      merged[key] = doc; // metadata only
    }
  });

  const entries = Object.entries(merged).filter(([, v]) => v?.name);

  if (loadingFallback) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
        <Loader2 size={15} className="animate-spin" /> Loading documents…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic px-1">No documents were submitted with this application.</p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {entries.map(([key, doc]) => {
          const src      = doc.url || doc.data;
          const hasError = !!doc.error;
          return (
            <div
              key={key}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 gap-3 border ${
                hasError ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText size={15} className={hasError ? 'text-red-400 flex-shrink-0' : 'text-slate-400 flex-shrink-0'} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink truncate">{docKeyLabel(key)}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {doc.name} {doc.size ? `· ${Math.round(doc.size / 1024)} KB` : ''}
                    {doc.stored === 'storage'   && <span className="ml-1 text-emerald-500">· Cloud</span>}
                    {doc.stored === 'firestore' && <span className="ml-1 text-blue-500">· Saved</span>}
                    {hasError && <span className="text-red-500 ml-1">· Upload error</span>}
                  </p>
                </div>
              </div>
              {src && !hasError ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setViewing({ ...doc, src, label: docKeyLabel(key) })}
                    className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                  >
                    <Eye size={12} /> View
                  </button>
                  <span className="text-slate-200">|</span>
                  <a
                    href={src}
                    download={doc.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-slate-500 font-semibold hover:underline"
                  >
                    <Download size={12} /> Save
                  </a>
                </div>
              ) : (
                <span className="text-xs text-slate-300 flex-shrink-0">
                  {hasError ? '⚠ Failed' : 'Processing…'}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {viewing && <DocViewer doc={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

// ─── Status History ──────────────────────────────────────────────────────────
function StatusHistory({ history }) {
  if (!history || history.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Clock size={12} /> Status History
      </h4>
      <div className="space-y-2">
        {[...history].reverse().map((h, i) => {
          const meta = STATUS_META[h.status] || STATUS_META.submitted;
          return (
            <div key={i} className="flex items-start gap-2.5 text-xs">
              <span className={`px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${TONE_BADGE[meta.tone]}`}>
                {meta.label}
              </span>
              <div className="min-w-0">
                {h.note && <p className="text-slate-600">{h.note}</p>}
                {h.date && <p className="text-slate-400 mt-0.5">{new Date(h.date).toLocaleString()}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Detail row helper — safe, never crashes on false/null entries ───────────
function DetailRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between px-3 py-2 gap-3">
      <span className="text-slate-500 flex-shrink-0 text-sm">{label}</span>
      <span className="font-medium text-ink text-right break-words max-w-[60%] text-sm">{value}</span>
    </div>
  );
}

// ─── Collateral detail rows — rendered safely per type ───────────────────────
function CollateralRows({ app }) {
  const d = app.collateralDetails || {};
  const type = app.collateralType;
  if (!type || type === 'none') return null;

  const rows = [];
  if (type === 'land') {
    rows.push(
      ['Title Deed / Plot No.', d.titleDeedNo],
      ['Land County', d.landCounty],
      ['Land Size', d.landSize ? `${d.landSize} ${d.landSizeUnit || 'acres'}` : null],
      ['Land Value (KSh)', d.landValue ? Number(d.landValue).toLocaleString() : null],
      ['Land Use', d.landUse],
      ['Encumbrances', d.landEncumbrance],
      ['Description', d.landDescription],
    );
  } else if (type === 'vehicle') {
    rows.push(
      ['Vehicle Type', d.vehicleType],
      ['Registration', d.vehicleReg],
      ['Make / Model', [d.vehicleMake, d.vehicleModel].filter(Boolean).join(' / ') || null],
      ['Year', d.vehicleYear],
      ['Vehicle Value (KSh)', d.vehicleValue ? Number(d.vehicleValue).toLocaleString() : null],
      ['Chassis / Engine No.', d.vehicleChassisNo],
      ['Condition', d.vehicleCondition],
    );
  } else if (type === 'property') {
    rows.push(
      ['Property Type', d.propertyType],
      ['Title / LR No.', d.propertyTitleNo],
      ['Property County', d.propertyCounty],
      ['Property Value (KSh)', d.propertyValue ? Number(d.propertyValue).toLocaleString() : null],
      ['Floor Area (m²)', d.propertyArea],
      ['Year Built', d.propertyYearBuilt],
      ['Address', d.propertyAddress],
      ['Encumbrances', d.propertyEncumbrance],
    );
  } else if (type === 'equipment') {
    rows.push(
      ['Equipment', d.equipmentDesc],
      ['Make / Brand', d.equipmentMake],
      ['Serial No.', d.equipmentSerial],
      ['Year of Purchase', d.equipmentYear],
      ['Equipment Value (KSh)', d.equipmentValue ? Number(d.equipmentValue).toLocaleString() : null],
      ['Condition', d.equipmentCondition],
    );
  }

  return (
    <>
      {rows.map(([label, value]) => (
        <DetailRow key={label} label={label} value={value} />
      ))}
    </>
  );
}

// ─── Tabbed Review Modal ─────────────────────────────────────────────────────
const TABS = ['Details', 'Collateral', 'Documents', 'Actions'];

function ReviewModal({ app, onClose, onAction }) {
  const [tab, setTab] = useState('Details');
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [current, setCurrent] = useState(app);

  // Keep local copy in sync with parent updates (e.g. real-time status change)
  useEffect(() => { setCurrent(app); }, [app]);

  const handleAction = async (newStatus, note) => {
    setActionLoading(true);
    try {
      await onAction(current.id, newStatus, note || reviewNote || `Status set to ${STATUS_META[newStatus]?.label}.`);
      setCurrent(prev => ({
        ...prev,
        status: newStatus,
        statusHistory: [
          ...(prev.statusHistory || []),
          { status: newStatus, date: new Date().toISOString(), note: note || reviewNote },
        ],
      }));
      setSuccessMsg(`✓ Status updated to "${STATUS_META[newStatus]?.label}"`);
      setReviewNote('');
    } catch (err) {
      setSuccessMsg('Error: ' + (err.message || 'Update failed. Try again.'));
    } finally {
      setActionLoading(false);
    }
  };

  const meta = STATUS_META[current.status] || STATUS_META.submitted;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-10 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col mb-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-ink text-xl font-display">{current.fullName}</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {current.loanProductLabel} · {current.county}
            </p>
            <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${TONE_BADGE[meta.tone]}`}>
              {meta.label}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-4 mt-1">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 gap-1">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {t}
              {t === 'Documents' && current.documents && Object.keys(current.documents).filter(k => current.documents[k]?.name).length > 0 && (
                <span className="ml-1.5 bg-primary text-white text-xs rounded-full px-1.5 py-0.5">
                  {Object.keys(current.documents).filter(k => current.documents[k]?.name).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: '65vh' }}>

          {/* ── Details tab ── */}
          {tab === 'Details' && (
            <div className="divide-y divide-slate-100 bg-slate-50 rounded-xl overflow-hidden">
              <DetailRow label="Project Title"    value={current.projectTitle} />
              <DetailRow label="Description"      value={current.projectDescription} />
              <DetailRow label="Applicant Type"   value={current.organizationType} />
              <DetailRow label="Amount Requested" value={current.amount ? `KSh ${Number(current.amount).toLocaleString()}` : null} />
              <DetailRow label="Tenure"           value={current.tenure} />
              <DetailRow label="Email"            value={current.email} />
              <DetailRow label="Phone"            value={current.phone} />
              <DetailRow label="Sub-county"       value={current.subCounty} />
              <DetailRow label="Address"          value={current.address} />
              <DetailRow label="Est. CO₂/yr"      value={current.estimatedCo2 ? `${Number(current.estimatedCo2).toLocaleString()} kg` : null} />
              <DetailRow label="Est. Jobs"        value={current.estimatedJobs} />
              <DetailRow label="Submitted"        value={
                current.createdAt?.toDate
                  ? current.createdAt.toDate().toLocaleString()
                  : current.createdAt
                  ? new Date(current.createdAt).toLocaleString()
                  : null
              } />

              {current.statusHistory?.length > 0 && (
                <div className="px-3 py-3">
                  <StatusHistory history={current.statusHistory} />
                </div>
              )}
            </div>
          )}

          {/* ── Collateral tab ── */}
          {tab === 'Collateral' && (
            <div>
              {(!current.collateralType || current.collateralType === 'none') ? (
                <p className="text-sm text-slate-400 italic">No collateral was offered for this application.</p>
              ) : (
                <div className="divide-y divide-slate-100 bg-slate-50 rounded-xl overflow-hidden">
                  <DetailRow
                    label="Collateral Type"
                    value={
                      { land: 'Land / Title Deed', vehicle: 'Motor Vehicle', property: 'Built Property', equipment: 'Equipment / Machinery' }[current.collateralType]
                    }
                  />
                  <CollateralRows app={current} />
                </div>
              )}
            </div>
          )}

          {/* ── Documents tab ── */}
          {tab === 'Documents' && (
            <div>
              {current.docsUploading && (
                <DocsUploadingBanner applicationId={current.id} onDone={(docs) => setCurrent(prev => ({ ...prev, documents: docs, docsUploading: false }))} />
              )}
              <DocumentsPanel applicationId={current.id} documents={current.documents} />
            </div>
          )}

          {/* ── Actions tab ── */}
          {tab === 'Actions' && (
            <div className="space-y-4">
              {successMsg && (
                <div className={`text-sm px-3 py-2.5 rounded-lg border ${
                  successMsg.startsWith('Error')
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {successMsg}
                </div>
              )}

              <div>
                <label className="label">Review Note (optional)</label>
                <textarea
                  className="input min-h-[80px] resize-none"
                  placeholder="Add a note explaining your decision or requesting more info…"
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <button
                  disabled={actionLoading}
                  onClick={() => handleAction('approved', reviewNote || 'Application approved by institutional reviewer.')}
                  className="btn-primary w-full justify-center"
                >
                  {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  Approve Application
                </button>

                <button
                  disabled={actionLoading}
                  onClick={() => handleAction('rejected', reviewNote || 'Application rejected by institutional reviewer.')}
                  className="btn-danger w-full justify-center"
                >
                  {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                  Reject Application
                </button>

                <button
                  disabled={actionLoading}
                  onClick={() => handleAction('under_review', reviewNote || 'Additional information requested from applicant.')}
                  className="btn-secondary w-full justify-center"
                >
                  {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <MessageCircleQuestion size={15} />}
                  Request More Information
                </button>

                <button
                  disabled={actionLoading}
                  onClick={() => handleAction('funded', reviewNote || 'Application marked as funded — disbursement confirmed.')}
                  className="btn-secondary w-full justify-center"
                >
                  {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  Mark as Funded / Disbursed
                </button>
              </div>

              {/* Advanced status override */}
              <div className="pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <ChevronDown size={13} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  Advanced: set any status manually
                </button>
                {showAdvanced && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {APPLICATION_STATUSES.map(s => (
                      <button
                        key={s}
                        disabled={actionLoading}
                        onClick={() => handleAction(s, reviewNote || `Status manually set to ${STATUS_META[s].label}.`)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                          current.status === s
                            ? 'border-primary text-primary font-semibold bg-primary-50'
                            : 'border-slate-200 hover:border-primary-300 hover:text-primary'
                        }`}
                      >
                        {STATUS_META[s].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main admin applications page ────────────────────────────────────────────
export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToApplications((data) => {
      setApplications(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filtered = applications.filter(a => {
    const q = search.toLowerCase();
    const matchesSearch = !search ||
      a.fullName?.toLowerCase().includes(q) ||
      a.county?.toLowerCase().includes(q) ||
      a.loanProductLabel?.toLowerCase().includes(q) ||
      a.projectTitle?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAction = async (applicationId, newStatus, note) => {
    await updateApplicationStatus(applicationId, newStatus, note);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink font-display">Applications</h1>
        <p className="text-slate-500 text-sm mt-1">Review, approve, and manage financing applications.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search by applicant, project, county, or product"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-56"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses ({applications.length})</option>
          {APPLICATION_STATUSES.map(s => {
            const count = applications.filter(a => a.status === s).length;
            return (
              <option key={s} value={s}>{STATUS_META[s].label} ({count})</option>
            );
          })}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Project</th>
              <th>County</th>
              <th>Product</th>
              <th>Amount (KSh)</th>
              <th>Submitted</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  <Loader2 size={22} className="animate-spin mx-auto mb-2" />
                  Loading applications…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  No applications match your filters.
                </td>
              </tr>
            ) : (
              filtered.map(app => {
                const meta = STATUS_META[app.status] || STATUS_META.submitted;
                const docCount = Object.values(app.documents || {}).filter(v => v?.name).length;
                return (
                  <tr key={app.id}>
                    <td className="font-medium">{app.fullName}</td>
                    <td className="max-w-[160px] truncate text-slate-600">{app.projectTitle}</td>
                    <td>{app.county}</td>
                    <td>{app.loanProductLabel}</td>
                    <td>{app.amount ? Number(app.amount).toLocaleString() : '—'}</td>
                    <td className="text-slate-500 text-xs">
                      {app.createdAt?.toDate
                        ? app.createdAt.toDate().toLocaleDateString()
                        : app.createdAt
                        ? new Date(app.createdAt).toLocaleDateString()
                        : '—'}
                    </td>
                    <td>
                      <span className={`badge ${TONE_BADGE[meta.tone]}`}>{meta.label}</span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelected(app)}
                        className="text-primary text-sm font-semibold hover:underline whitespace-nowrap"
                      >
                        Review {docCount > 0 && <span className="text-xs text-slate-400 font-normal">({docCount} docs)</span>}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {selected && (
        <ReviewModal
          app={selected}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
