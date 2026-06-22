import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, ChevronRight, ChevronLeft, Loader2, AlertCircle,
  Upload, FileText, X, Car, MapPin, Building2, Package,
} from 'lucide-react';
import { loanProducts, calculateImpact } from '../data/loans';
import { submitApplication } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { RequireAuth } from '../components/RouteGuards';

// ─── Step definitions ────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Applicant Information' },
  { id: 2, label: 'Project Details' },
  { id: 3, label: 'Location' },
  { id: 4, label: 'Financing & Collateral' },
  { id: 5, label: 'Documents & Proof of Identity' },
  { id: 6, label: 'Climate Impact' },
  { id: 7, label: 'Review & Submit' },
];

const KENYA_COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo Marakwet','Embu','Garissa',
  'Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi',
  'Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos',
  'Makueni','Mandera','Marsabit','Meru','Migori','Mombasa',"Murang'a",
  'Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri',
  'Samburu','Siaya','Taita Taveta','Tana River','Tharaka Nithi','Trans Nzoia',
  'Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot',
];

// Collateral types with their specific sub-fields
const COLLATERAL_TYPES = [
  { value: 'land', label: 'Land / Title Deed', icon: MapPin },
  { value: 'vehicle', label: 'Motor Vehicle / Logbook', icon: Car },
  { value: 'property', label: 'Built Property', icon: Building2 },
  { value: 'equipment', label: 'Equipment / Machinery', icon: Package },
  { value: 'none', label: 'No Collateral', icon: null },
];

const VEHICLE_TYPES = [
  'Saloon / Sedan','SUV / 4WD','Pickup Truck','Lorry / Truck',
  'Matatu / Minibus','Bus','Motorcycle','Tractor','Other',
];

const PROPERTY_TYPES = [
  'Residential House','Commercial Building','Apartment Block',
  'Warehouse / Godown','Shop / Stall','Other',
];

// ─── File upload helper ──────────────────────────────────────────────────────
// We store files as base64 strings in Firestore (suitable for < ~500KB docs
// such as ID scans). For larger files you would swap this for Firebase Storage.
// Compress images > 1 MB to keep Firestore docs manageable
async function compressImage(file, maxWidth = 1600, quality = 0.82) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            const reader2 = new FileReader();
            reader2.onload = () => resolve(reader2.result);
            reader2.readAsDataURL(blob);
          },
          'image/jpeg',
          quality,
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function fileToBase64(file) {
  // Images: optionally compress; everything else: read as-is
  if (file.type.startsWith('image/') && file.size > 800 * 1024) {
    const data = await compressImage(file);
    // Report compressed size estimate
    const compressedBytes = Math.round((data.length * 3) / 4);
    return { name: file.name, size: compressedBytes, type: 'image/jpeg', data };
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve({ name: file.name, size: file.size, type: file.type, data: reader.result });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Normalise accept string so browsers always recognise it
// e.g. '.pdf' → 'application/pdf,.pdf'  |  'image/*,.pdf' → kept as-is
function normaliseAccept(accept) {
  if (!accept) return 'image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx';
  return accept
    .split(',')
    .map(s => s.trim())
    .flatMap(s => {
      if (s === '.pdf') return ['application/pdf', '.pdf'];
      if (s === '.doc' || s === '.docx') return ['application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document', s];
      return [s];
    })
    .join(',');
}

function FilePicker({ label, hint, accept, value, onChange, required }) {
  const ref = useRef();
  const [converting, setConverting] = useState(false);
  const [fileError, setFileError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');

    // 10 MB hard cap (we compress images so real stored size will be smaller)
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File is too large (max 10 MB). Please compress or split the document and try again.');
      e.target.value = '';
      return;
    }

    setConverting(true);
    try {
      const result = await fileToBase64(file);
      onChange(result);
    } catch (err) {
      setFileError('Could not read the file. Please try a different format (JPG, PNG, or PDF).');
    } finally {
      setConverting(false);
      e.target.value = ''; // reset so same file can be re-selected if needed
    }
  };

  const friendlyHint = 'JPG · PNG · PDF · Word · Max 10 MB';

  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="text-xs text-slate-400 mb-2">{hint}</p>}

      {value ? (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <FileText size={18} className="text-emerald-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink truncate">{value.name}</p>
            <p className="text-xs text-slate-400">{(value.size / 1024).toFixed(0)} KB · uploaded ✓</p>
          </div>
          <button type="button" onClick={() => { onChange(null); setFileError(''); }} className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setFileError(''); ref.current?.click(); }}
          disabled={converting}
          className="w-full border-2 border-dashed border-slate-300 rounded-lg px-4 py-5 flex flex-col items-center gap-2 hover:border-primary-400 hover:bg-primary-50/40 transition-all text-slate-500 hover:text-primary disabled:opacity-50"
        >
          {converting ? <Loader2 size={22} className="animate-spin" /> : <Upload size={22} />}
          <span className="text-sm font-medium">{converting ? 'Processing…' : 'Click or drag to upload'}</span>
          <span className="text-xs text-slate-400">{friendlyHint}</span>
        </button>
      )}

      {fileError && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <span>⚠</span> {fileError}
        </p>
      )}

      <input
        ref={ref}
        type="file"
        accept={normaliseAccept(accept)}
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

// ─── Collateral sub-forms ────────────────────────────────────────────────────
function LandCollateralFields({ data, onChange }) {
  const f = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4 mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <h4 className="text-sm font-semibold text-ink flex items-center gap-2"><MapPin size={15} className="text-primary" /> Land Details</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Title deed / Plot number <span className="text-red-500">*</span></label>
          <input className="input" placeholder="e.g. LR/123/456 or Plot 789" value={data.titleDeedNo || ''} onChange={e => f('titleDeedNo', e.target.value)} />
        </div>
        <div>
          <label className="label">County of land <span className="text-red-500">*</span></label>
          <select className="input" value={data.landCounty || ''} onChange={e => f('landCounty', e.target.value)}>
            <option value="">Select county</option>
            {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Acreage / Size <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            <input type="number" min="0" step="0.01" className="input" placeholder="e.g. 2.5" value={data.landSize || ''} onChange={e => f('landSize', e.target.value)} />
            <select className="input w-28 flex-shrink-0" value={data.landSizeUnit || 'acres'} onChange={e => f('landSizeUnit', e.target.value)}>
              <option value="acres">Acres</option>
              <option value="hectares">Hectares</option>
              <option value="sqm">Sq. metres</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Estimated market value (KSh) <span className="text-red-500">*</span></label>
          <input type="number" min="0" className="input" placeholder="e.g. 3000000" value={data.landValue || ''} onChange={e => f('landValue', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Land description / Location details</label>
          <textarea className="input min-h-[70px] resize-none" placeholder="Describe the parcel, nearest landmark, road access, etc." value={data.landDescription || ''} onChange={e => f('landDescription', e.target.value)} />
        </div>
        <div>
          <label className="label">Land use type</label>
          <select className="input" value={data.landUse || ''} onChange={e => f('landUse', e.target.value)}>
            <option value="">Select</option>
            {['Agricultural','Residential','Commercial','Mixed Use','Industrial','Other'].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Encumbrances / Existing charges?</label>
          <select className="input" value={data.landEncumbrance || 'none'} onChange={e => f('landEncumbrance', e.target.value)}>
            <option value="none">None</option>
            <option value="mortgage">Existing mortgage</option>
            <option value="caveat">Caveat lodged</option>
            <option value="other">Other charge</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function VehicleCollateralFields({ data, onChange }) {
  const f = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4 mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <h4 className="text-sm font-semibold text-ink flex items-center gap-2"><Car size={15} className="text-primary" /> Vehicle Details</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Vehicle type <span className="text-red-500">*</span></label>
          <select className="input" value={data.vehicleType || ''} onChange={e => f('vehicleType', e.target.value)}>
            <option value="">Select type</option>
            {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Registration / Number plate <span className="text-red-500">*</span></label>
          <input className="input" placeholder="e.g. KCB 123A" value={data.vehicleReg || ''} onChange={e => f('vehicleReg', e.target.value.toUpperCase())} />
        </div>
        <div>
          <label className="label">Make (manufacturer)</label>
          <input className="input" placeholder="e.g. Toyota, Isuzu" value={data.vehicleMake || ''} onChange={e => f('vehicleMake', e.target.value)} />
        </div>
        <div>
          <label className="label">Model</label>
          <input className="input" placeholder="e.g. Hilux, NPR" value={data.vehicleModel || ''} onChange={e => f('vehicleModel', e.target.value)} />
        </div>
        <div>
          <label className="label">Year of manufacture</label>
          <input type="number" min="1970" max={new Date().getFullYear()} className="input" placeholder="e.g. 2019" value={data.vehicleYear || ''} onChange={e => f('vehicleYear', e.target.value)} />
        </div>
        <div>
          <label className="label">Estimated market value (KSh) <span className="text-red-500">*</span></label>
          <input type="number" min="0" className="input" placeholder="e.g. 1500000" value={data.vehicleValue || ''} onChange={e => f('vehicleValue', e.target.value)} />
        </div>
        <div>
          <label className="label">Engine / Chassis number</label>
          <input className="input" placeholder="Optional but recommended" value={data.vehicleChassisNo || ''} onChange={e => f('vehicleChassisNo', e.target.value)} />
        </div>
        <div>
          <label className="label">Vehicle condition</label>
          <select className="input" value={data.vehicleCondition || ''} onChange={e => f('vehicleCondition', e.target.value)}>
            <option value="">Select</option>
            {['Excellent','Good','Fair','Poor'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function PropertyCollateralFields({ data, onChange }) {
  const f = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4 mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <h4 className="text-sm font-semibold text-ink flex items-center gap-2"><Building2 size={15} className="text-primary" /> Built Property Details</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Property type <span className="text-red-500">*</span></label>
          <select className="input" value={data.propertyType || ''} onChange={e => f('propertyType', e.target.value)}>
            <option value="">Select</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Title deed / LR Number <span className="text-red-500">*</span></label>
          <input className="input" placeholder="e.g. LR/123 or Plot 789" value={data.propertyTitleNo || ''} onChange={e => f('propertyTitleNo', e.target.value)} />
        </div>
        <div>
          <label className="label">County <span className="text-red-500">*</span></label>
          <select className="input" value={data.propertyCounty || ''} onChange={e => f('propertyCounty', e.target.value)}>
            <option value="">Select county</option>
            {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Estimated value (KSh) <span className="text-red-500">*</span></label>
          <input type="number" min="0" className="input" placeholder="e.g. 8000000" value={data.propertyValue || ''} onChange={e => f('propertyValue', e.target.value)} />
        </div>
        <div>
          <label className="label">Floor area (sq. metres)</label>
          <input type="number" min="0" className="input" placeholder="e.g. 120" value={data.propertyArea || ''} onChange={e => f('propertyArea', e.target.value)} />
        </div>
        <div>
          <label className="label">Year built</label>
          <input type="number" min="1900" max={new Date().getFullYear()} className="input" placeholder="e.g. 2015" value={data.propertyYearBuilt || ''} onChange={e => f('propertyYearBuilt', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Physical address / Description</label>
          <textarea className="input min-h-[70px] resize-none" placeholder="Street, estate, nearest landmark…" value={data.propertyAddress || ''} onChange={e => f('propertyAddress', e.target.value)} />
        </div>
        <div>
          <label className="label">Existing encumbrances?</label>
          <select className="input" value={data.propertyEncumbrance || 'none'} onChange={e => f('propertyEncumbrance', e.target.value)}>
            <option value="none">None</option>
            <option value="mortgage">Existing mortgage</option>
            <option value="charge">Bank charge</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function EquipmentCollateralFields({ data, onChange }) {
  const f = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-4 mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <h4 className="text-sm font-semibold text-ink flex items-center gap-2"><Package size={15} className="text-primary" /> Equipment / Machinery Details</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Equipment description <span className="text-red-500">*</span></label>
          <input className="input" placeholder="e.g. Solar water pump, Generator" value={data.equipmentDesc || ''} onChange={e => f('equipmentDesc', e.target.value)} />
        </div>
        <div>
          <label className="label">Serial / ID number</label>
          <input className="input" placeholder="Manufacturer serial number" value={data.equipmentSerial || ''} onChange={e => f('equipmentSerial', e.target.value)} />
        </div>
        <div>
          <label className="label">Make / Brand</label>
          <input className="input" placeholder="e.g. Grundfos, Cummins" value={data.equipmentMake || ''} onChange={e => f('equipmentMake', e.target.value)} />
        </div>
        <div>
          <label className="label">Year of purchase</label>
          <input type="number" min="1990" max={new Date().getFullYear()} className="input" placeholder={String(new Date().getFullYear())} value={data.equipmentYear || ''} onChange={e => f('equipmentYear', e.target.value)} />
        </div>
        <div>
          <label className="label">Estimated current value (KSh) <span className="text-red-500">*</span></label>
          <input type="number" min="0" className="input" placeholder="e.g. 500000" value={data.equipmentValue || ''} onChange={e => f('equipmentValue', e.target.value)} />
        </div>
        <div>
          <label className="label">Condition</label>
          <select className="input" value={data.equipmentCondition || ''} onChange={e => f('equipmentCondition', e.target.value)}>
            <option value="">Select</option>
            {['New','Excellent','Good','Fair','Needs Repair'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Document requirements by org type ──────────────────────────────────────
// ── Part A: Identity / org documents (who you are) ──────────────────────────
function getIdentityDocs(orgType) {
  if (orgType === 'individual') return [
    { key: 'identity',      label: 'National ID — front & back scan',          hint: 'Clear photo or PDF scan of both sides of your National ID card.',                       accept: 'image/*,.pdf', required: true  },
    { key: 'kraPin',        label: 'KRA PIN Certificate',                       hint: 'Download your KRA PIN certificate from iTax.',                                          accept: 'image/*,.pdf', required: true  },
    { key: 'bankStatement', label: 'Bank / M-Pesa statement (last 3 months)',   hint: 'Shows your income and cash-flow. Export from your bank app or print to PDF.',           accept: 'image/*,.pdf', required: true  },
    { key: 'passport',      label: 'Passport photo',                            hint: 'Recent colour passport-size photograph.',                                               accept: 'image/*',      required: false },
  ];
  if (orgType === 'sacco') return [
    { key: 'saccoReg',       label: 'SACCO Registration Certificate',           hint: 'Official SASRA or Co-operative registration certificate.',                              accept: 'image/*,.pdf', required: true  },
    { key: 'kraPin',         label: 'SACCO KRA PIN Certificate',                hint: 'Organisation KRA PIN from iTax.',                                                      accept: 'image/*,.pdf', required: true  },
    { key: 'audited',        label: 'Audited financial statements (latest)',     hint: 'Last 1–2 years audited accounts signed by a CPA.',                                     accept: '.pdf',         required: true  },
    { key: 'boardResolution',label: 'Board resolution / Authority letter',      hint: 'Resolution authorising this loan application, signed by the Board.',                   accept: 'image/*,.pdf', required: true  },
    { key: 'officialId',     label: 'Authorised signatory National ID',         hint: 'ID of the person signing on behalf of the SACCO.',                                     accept: 'image/*,.pdf', required: true  },
    { key: 'bankStatement',  label: 'SACCO bank statement (last 6 months)',     hint: 'Main operating account bank statement.',                                               accept: 'image/*,.pdf', required: false },
  ];
  if (orgType === 'sme') return [
    { key: 'businessReg',   label: 'Business Registration Certificate',         hint: 'Certificate from the Registrar of Companies or Business Name Registration.',           accept: 'image/*,.pdf', required: true  },
    { key: 'kraPin',        label: 'Business KRA PIN Certificate',              hint: 'Organisation PIN from iTax.',                                                          accept: 'image/*,.pdf', required: true  },
    { key: 'directorId',    label: 'Director / Owner National ID',              hint: 'ID of the principal director or business owner.',                                      accept: 'image/*,.pdf', required: true  },
    { key: 'bankStatement', label: 'Business bank statement (last 6 months)',   hint: 'Shows revenue and cash-flow trends.',                                                  accept: 'image/*,.pdf', required: true  },
    { key: 'audited',       label: 'Financial statements / Management accounts',hint: 'Audited accounts or latest management accounts.',                                      accept: '.pdf',         required: false },
  ];
  if (orgType === 'ngo') return [
    { key: 'ngoReg',         label: 'NGO / CBO Registration Certificate',       hint: 'Certificate from the NGO Co-ordination Board or relevant authority.',                  accept: 'image/*,.pdf', required: true  },
    { key: 'kraPin',         label: 'Organisation KRA PIN Certificate',         hint: 'Organisation PIN from iTax.',                                                          accept: 'image/*,.pdf', required: true  },
    { key: 'boardResolution',label: 'Board resolution / Authority letter',      hint: 'Signed resolution from your governing body authorising this loan.',                    accept: 'image/*,.pdf', required: true  },
    { key: 'officialId',     label: 'Authorised signatory National ID',         hint: 'ID of the person signing on behalf of the organisation.',                              accept: 'image/*,.pdf', required: true  },
    { key: 'bankStatement',  label: 'Organisation bank statement (last 6 months)',hint: 'Operating account statement.',                                                       accept: 'image/*,.pdf', required: false },
    { key: 'annualReport',   label: 'Latest annual report / activity report',   hint: 'Evidence of organisational activities and impact.',                                    accept: '.pdf',         required: false },
  ];
  return [];
}

// ── Part B: Collateral documents (what you're offering as security) ──────────
function getCollateralDocs(collateralType) {
  if (collateralType === 'land') return [
    { key: 'titleDeed',     label: 'Title deed / Search certificate',           hint: 'Upload a copy of the title deed or a recent lands registry search certificate.',       accept: 'image/*,.pdf', required: true  },
    { key: 'landValuation', label: 'Land valuation report',                     hint: 'Valuation report from a registered valuer confirming the market value.',               accept: 'image/*,.pdf', required: false },
  ];
  if (collateralType === 'vehicle') return [
    { key: 'logbook',       label: 'Vehicle logbook (both sides)',               hint: 'Clear scan or photo of the front and back of the vehicle logbook.',                   accept: 'image/*,.pdf', required: true  },
    { key: 'vehicleValuation', label: 'Vehicle valuation / inspection report',  hint: 'Valuation from a licensed motor vehicle valuer or garage.',                           accept: 'image/*,.pdf', required: false },
    { key: 'insurance',     label: 'Current insurance certificate',              hint: 'Comprehensive insurance certificate showing vehicle is insured.',                     accept: 'image/*,.pdf', required: false },
  ];
  if (collateralType === 'property') return [
    { key: 'titleDeed',     label: 'Title deed / Lease agreement',              hint: 'Copy of the title deed or lease for the property being offered.',                     accept: 'image/*,.pdf', required: true  },
    { key: 'propertyValuation', label: 'Property valuation report',             hint: 'Valuation report from a registered valuer confirming the market value.',               accept: 'image/*,.pdf', required: false },
  ];
  if (collateralType === 'equipment') return [
    { key: 'equipmentInvoice', label: 'Purchase invoice / ownership certificate', hint: 'Original invoice or certificate proving ownership of the equipment.',               accept: 'image/*,.pdf', required: true  },
    { key: 'equipmentValuation', label: 'Equipment valuation report',           hint: 'Valuation or inspection report from a qualified assessor.',                           accept: 'image/*,.pdf', required: false },
  ];
  return []; // 'none' — no collateral docs needed
}

// ── Combined: returns two named groups so the UI can render section headers ──
function getDocGroups(orgType, collateralType) {
  return {
    identity:   { title: 'Proof of Identity / Organisation', docs: getIdentityDocs(orgType) },
    collateral: { title: 'Collateral / Security Documents',  docs: getCollateralDocs(collateralType) },
  };
}

// Flat list of all required doc keys — used for validation
function getRequiredDocKeys(orgType, collateralType) {
  const groups = getDocGroups(orgType, collateralType);
  return [...groups.identity.docs, ...groups.collateral.docs]
    .filter(d => d.required)
    .map(d => d.key);
}

// ─── Main form ───────────────────────────────────────────────────────────────
function ApplyForm() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState(null);
  const [error, setError] = useState(null);

  // Core form fields
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', idNumber: '',
    loanProduct: loanId || '',
    projectTitle: '', projectDescription: '', organizationType: 'individual',
    county: '', subCounty: '', address: '',
    amount: '', tenure: '',
    agreeTerms: false,
  });

  // Collateral state — type + type-specific sub-fields
  const [collateralType, setCollateralType] = useState('');
  const [collateralDetails, setCollateralDetails] = useState({});

  // Document uploads: keyed by doc requirement key
  const [docs, setDocs] = useState({});

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        fullName: prev.fullName || user.displayName || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
        county: prev.county || user.county || '',
      }));
    }
  }, [user]);

  const selectedLoan = loanProducts.find(l => l.id === form.loanProduct);
  const impact = calculateImpact(form.loanProduct, form.amount);
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const setDoc = (key, value) => setDocs(prev => ({ ...prev, [key]: value }));

  const docGroups = getDocGroups(form.organizationType, collateralType);

  // ── Collateral value helper for review panel
  const collateralValue = (() => {
    if (collateralType === 'land') return collateralDetails.landValue;
    if (collateralType === 'vehicle') return collateralDetails.vehicleValue;
    if (collateralType === 'property') return collateralDetails.propertyValue;
    if (collateralType === 'equipment') return collateralDetails.equipmentValue;
    return null;
  })();

  const collateralLabel = COLLATERAL_TYPES.find(c => c.value === collateralType)?.label || '—';

  // ── Validation per step
  const validateStep = () => {
    if (step === 1) return form.fullName && form.email && form.phone;
    if (step === 2) return form.loanProduct && form.projectTitle && form.projectDescription;
    if (step === 3) return form.county && form.address;
    if (step === 4) {
      if (!form.amount || !form.tenure || !collateralType) return false;
      // Validate required collateral sub-fields
      if (collateralType === 'land') return collateralDetails.titleDeedNo && collateralDetails.landCounty && collateralDetails.landSize && collateralDetails.landValue;
      if (collateralType === 'vehicle') return collateralDetails.vehicleType && collateralDetails.vehicleReg && collateralDetails.vehicleValue;
      if (collateralType === 'property') return collateralDetails.propertyType && collateralDetails.propertyTitleNo && collateralDetails.propertyCounty && collateralDetails.propertyValue;
      if (collateralType === 'equipment') return collateralDetails.equipmentDesc && collateralDetails.equipmentValue;
      return true; // none
    }
    if (step === 5) {
      const requiredKeys = getRequiredDocKeys(form.organizationType, collateralType);
      return requiredKeys.every(k => !!docs[k]);
    }
    if (step === 6) return form.amount && form.loanProduct;
    if (step === 7) return form.agreeTerms;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const id = await submitApplication({
        ...form,
        userId: user.uid,
        estimatedCo2: impact.co2,
        estimatedJobs: impact.jobs,
        loanProductLabel: selectedLoan?.title,
        collateralType,
        collateralDetails,
        documents: docs,
      });
      setApplicationId(id);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen
  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-ink mb-2 font-display">Application Submitted</h2>
        <p className="text-slate-500 mb-2">Your application reference number is</p>
        <code className="block bg-slate-100 text-ink font-mono text-sm px-4 py-2 rounded-lg mb-6 break-all">{applicationId}</code>

        <div className="card p-5 mb-6 text-left">
          <h3 className="font-semibold text-ink mb-3 text-sm">Estimated Climate Impact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xl font-bold text-primary font-display">{impact.co2.toLocaleString()}</div>
              <div className="text-xs text-slate-500">kg CO2 reduced / year</div>
            </div>
            <div>
              <div className="text-xl font-bold text-primary font-display">{impact.jobs}</div>
              <div className="text-xs text-slate-500">Jobs supported</div>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-8">
          Your application will be reviewed by our team. You can track its status at any time from your dashboard.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/dashboard')} className="btn-primary">Go to Dashboard</button>
          <button onClick={() => navigate('/marketplace')} className="btn-secondary">View More Products</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink font-display">
          {selectedLoan ? 'Apply: ' + selectedLoan.title : 'Apply for Financing'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{STEPS[step - 1].label} — Step {step} of {STEPS.length}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-1 last:flex-initial">
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step > s.id ? 'bg-primary text-white' :
              step === s.id ? 'bg-primary text-white ring-4 ring-primary-100' :
              'bg-slate-100 text-slate-400'
            }`}>
              {step > s.id ? <CheckCircle2 size={13} /> : s.id}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 rounded ${step > s.id ? 'bg-primary' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="card p-6 sm:p-8">

        {/* ── STEP 1: Applicant Information ─────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="label">Full name <span className="text-red-500">*</span></label>
              <input className="input" value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Enter your full legal name" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Email address <span className="text-red-500">*</span></label>
                <input type="email" className="input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label className="label">Phone number <span className="text-red-500">*</span></label>
                <input type="tel" className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+254 700 000 000" />
              </div>
            </div>
            <div>
              <label className="label">National ID number</label>
              <input className="input" value={form.idNumber} onChange={e => set('idNumber', e.target.value)} placeholder="Enter your ID / Passport number" />
            </div>
          </div>
        )}

        {/* ── STEP 2: Project Details ───────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="label">Financing product <span className="text-red-500">*</span></label>
              <select className="input" value={form.loanProduct} onChange={e => set('loanProduct', e.target.value)}>
                <option value="">Select a financing product</option>
                {loanProducts.map(l => (
                  <option key={l.id} value={l.id}>{l.title} ({l.rate})</option>
                ))}
              </select>
            </div>
            {selectedLoan && (
              <div className="bg-primary-50 border border-primary-100 rounded-lg p-3 text-sm text-primary-800">
                Range: KSh {selectedLoan.minFinancing.toLocaleString()} – {selectedLoan.maxFinancing.toLocaleString()} · Tenure: {selectedLoan.tenure}
              </div>
            )}
            <div>
              <label className="label">Project title <span className="text-red-500">*</span></label>
              <input className="input" value={form.projectTitle} onChange={e => set('projectTitle', e.target.value)} placeholder="Short, descriptive title" />
            </div>
            <div>
              <label className="label">Project description <span className="text-red-500">*</span></label>
              <textarea className="input min-h-[100px] resize-none" value={form.projectDescription} onChange={e => set('projectDescription', e.target.value)} placeholder="Describe the project, its objectives, and expected outcomes" />
            </div>
            <div>
              <label className="label">Applicant type <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {[
                  { val: 'individual', label: 'Individual' },
                  { val: 'sme', label: 'SME / Business' },
                  { val: 'sacco', label: 'SACCO / Co-operative' },
                  { val: 'ngo', label: 'NGO / Community Org.' },
                ].map(({ val, label }) => (
                  <button
                    key={val} type="button"
                    onClick={() => set('organizationType', val)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                      form.organizationType === val
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Location ─────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="label">County <span className="text-red-500">*</span></label>
              <select className="input" value={form.county} onChange={e => set('county', e.target.value)}>
                <option value="">Select county</option>
                {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sub-county</label>
              <input className="input" value={form.subCounty} onChange={e => set('subCounty', e.target.value)} placeholder="Enter sub-county" />
            </div>
            <div>
              <label className="label">Project site address <span className="text-red-500">*</span></label>
              <textarea className="input min-h-[80px] resize-none" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Physical location, nearest landmark, road" />
            </div>
          </div>
        )}

        {/* ── STEP 4: Financing & Collateral ───────────────────────── */}
        {step === 4 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <label className="label">Requested financing amount (KSh) <span className="text-red-500">*</span></label>
              <input
                type="number" className="input"
                min={selectedLoan?.minFinancing || 10000}
                max={selectedLoan?.maxFinancing || 50000000}
                value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder="Enter amount"
              />
              {selectedLoan && (
                <p className="text-xs text-slate-400 mt-1.5">
                  Eligible range: KSh {selectedLoan.minFinancing.toLocaleString()} – {selectedLoan.maxFinancing.toLocaleString()}
                </p>
              )}
            </div>
            <div>
              <label className="label">Preferred repayment tenure <span className="text-red-500">*</span></label>
              <select className="input" value={form.tenure} onChange={e => set('tenure', e.target.value)}>
                <option value="">Select tenure</option>
                {['1 year','2 years','3 years','5 years','7 years','10 years','15 years','20 years','25 years'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Collateral type selection */}
            <div>
              <label className="label">Collateral / Security type <span className="text-red-500">*</span></label>
              <p className="text-xs text-slate-400 mb-3">
                Select the primary asset you are offering as security. Each type has specific details that must be provided.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COLLATERAL_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value} type="button"
                    onClick={() => { setCollateralType(value); setCollateralDetails({}); setCollateralDoc(null); }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      collateralType === value
                        ? 'border-primary bg-primary-50 text-primary'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300'
                    }`}
                  >
                    {Icon && <Icon size={20} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Collateral sub-fields */}
            {collateralType === 'land' && <LandCollateralFields data={collateralDetails} onChange={setCollateralDetails} />}
            {collateralType === 'vehicle' && <VehicleCollateralFields data={collateralDetails} onChange={setCollateralDetails} />}
            {collateralType === 'property' && <PropertyCollateralFields data={collateralDetails} onChange={setCollateralDetails} />}
            {collateralType === 'equipment' && <EquipmentCollateralFields data={collateralDetails} onChange={setCollateralDetails} />}
            {collateralType === 'none' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                Applications without collateral are assessed on cash-flow and creditworthiness. Approval limits may be lower.
              </div>
            )}

          </div>
        )}

        {/* ── STEP 5: Documents & Proof of Identity ────────────────── */}
        {step === 5 && (
          <div className="space-y-6 animate-fade-in">

            {/* Identity / Org section */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">🪪</span>
                <h3 className="text-sm font-bold text-ink">{docGroups.identity.title}</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Required for{' '}
                <span className="font-semibold text-slate-600">
                  {form.organizationType === 'individual' ? 'Individual applicants' :
                   form.organizationType === 'sacco' ? 'SACCOs / Co-operatives' :
                   form.organizationType === 'sme' ? 'SMEs / Businesses' :
                   'NGOs / Community Organisations'}
                </span>.
                Accepted: JPG, PNG, PDF · Max 5 MB per file.
              </p>
              <div className="space-y-4">
                {docGroups.identity.docs.map(req => (
                  <FilePicker
                    key={req.key}
                    label={req.label}
                    hint={req.hint}
                    accept={req.accept}
                    value={docs[req.key] || null}
                    onChange={v => setDoc(req.key, v)}
                    required={req.required}
                  />
                ))}
              </div>
            </div>

            {/* Collateral docs section — only shown when a collateral type that needs docs is selected */}
            {docGroups.collateral.docs.length > 0 && (
              <div>
                <div className="border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">📄</span>
                    <h3 className="text-sm font-bold text-ink">{docGroups.collateral.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Required for your chosen collateral:{' '}
                    <span className="font-semibold text-slate-600">{collateralLabel}</span>.
                  </p>
                  <div className="space-y-4">
                    {docGroups.collateral.docs.map(req => (
                      <FilePicker
                        key={req.key}
                        label={req.label}
                        hint={req.hint}
                        accept={req.accept}
                        value={docs[req.key] || null}
                        onChange={v => setDoc(req.key, v)}
                        required={req.required}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* No collateral docs needed */}
            {collateralType === 'none' && (
              <div className="border-t border-slate-100 pt-6">
                <p className="text-sm text-slate-400 italic">No collateral documents required — you selected "No Collateral".</p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 6: Climate Impact ────────────────────────────────── */}
        {step === 6 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-ink">Estimated Climate & Social Impact</h3>
            <p className="text-xs text-slate-500">Based on your loan product and requested amount, here are the projected environmental and social outcomes.</p>

            {form.amount && form.loanProduct ? (
              <div className="bg-secondary-50 border border-secondary-100 rounded-xl p-5">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary-700 font-display">{impact.co2.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">kg CO2 reduced / yr</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary-700 font-display">{impact.jobs}</div>
                    <div className="text-xs text-slate-500 mt-1">Jobs supported</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary-700 font-display">{impact.metric.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">{impact.metricLabel}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-400">Estimates are based on sector-average impact formulas. Actual results will be verified after disbursement.</p>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-400">
                Please complete the financing amount in Step 4 to see impact estimates.
              </div>
            )}
          </div>
        )}

        {/* ── STEP 7: Review & Submit ───────────────────────────────── */}
        {step === 7 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-ink mb-1">Application Summary</h3>

            <div className="bg-slate-50 rounded-xl divide-y divide-slate-100 text-sm">
              {[
                ['Applicant', form.fullName],
                ['Email', form.email],
                ['Phone', form.phone],
                ['Org. type', form.organizationType],
                ['Financing product', selectedLoan?.title],
                ['Project', form.projectTitle],
                ['County', form.county],
                ['Amount requested', form.amount ? 'KSh ' + Number(form.amount).toLocaleString() : '-'],
                ['Tenure', form.tenure],
                ['Collateral type', collateralLabel],
                collateralValue ? ['Collateral value', 'KSh ' + Number(collateralValue).toLocaleString()] : null,
              ].filter(Boolean).map(([label, value]) => (
                <div key={label} className="flex justify-between px-4 py-2.5 gap-3">
                  <span className="text-slate-500 flex-shrink-0">{label}</span>
                  <span className="font-medium text-ink text-right max-w-[60%]">{value || '-'}</span>
                </div>
              ))}
            </div>

            {/* Documents summary */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Documents uploaded</h4>
              <div className="bg-slate-50 rounded-xl divide-y divide-slate-100 text-sm">
                {[...docGroups.identity.docs, ...docGroups.collateral.docs].map(req => (
                  <div key={req.key} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <span className="text-slate-500 text-xs">{req.label}</span>
                    {docs[req.key] ? (
                      <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} /> {docs[req.key].name}
                      </span>
                    ) : (
                      <span className={`text-xs ${req.required ? 'text-red-400' : 'text-slate-300'}`}>
                        {req.required ? '⚠ Required — missing' : 'Not provided'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Impact summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'kg CO2/yr', value: impact.co2.toLocaleString() },
                { label: 'Jobs', value: impact.jobs },
                { label: impact.metricLabel?.split(' ').slice(0, 2).join(' ') || 'Impact', value: impact.metric.toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-primary-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-primary font-display">{value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <label className="flex items-start gap-3 cursor-pointer pt-1">
              <input
                type="checkbox" className="mt-1 w-4 h-4 accent-primary flex-shrink-0"
                checked={form.agreeTerms} onChange={e => set('agreeTerms', e.target.checked)}
              />
              <span className="text-sm text-slate-600 leading-relaxed">
                I confirm that all information and documents provided are accurate and genuine. I agree to the
                EcoGuard Finance Terms of Service and Lending Policy.
              </span>
            </label>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={15} /> {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} className="btn-ghost">
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <button onClick={() => navigate('/marketplace')} className="btn-ghost">
              <ChevronLeft size={16} /> Marketplace
            </button>
          )}

          {step < STEPS.length ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!validateStep()}
              className="btn-primary"
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!validateStep() || submitting}
              className="btn-primary min-w-[180px] justify-center"
            >
              {submitting
                ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
                : <>Submit Application <ChevronRight size={16} /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Apply() {
  return (
    <RequireAuth>
      <ApplyForm />
    </RequireAuth>
  );
}
