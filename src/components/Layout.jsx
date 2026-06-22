import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Leaf, LayoutDashboard, ShoppingBag, CloudRain, FileText, Menu, X, ChevronRight, User, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/marketplace', label: 'Financing Products', icon: ShoppingBag },
  { to: '/climate-intelligence', label: 'Climate Intelligence', icon: CloudRain },
  { to: '/apply', label: 'Apply', icon: FileText },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-sm">
                <Leaf className="text-white" size={18} />
              </div>
              <div className="leading-none">
                <div className="font-bold text-primary-800 text-base tracking-tight font-display">EcoGuard</div>
                <div className="text-xs text-slate-400 font-medium tracking-wide">Finance</div>
              </div>
            </button>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink
                  to="/admin/dashboard"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-secondary-700 hover:bg-secondary-50 transition-all duration-150"
                >
                  <ShieldCheck size={15} /> Admin Portal
                </NavLink>
              )}
            </nav>

            <div className="flex items-center gap-3">
              {user ? (
                <button
                  onClick={() => navigate('/profile')}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-700 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                  {user.displayName ? user.displayName.split(' ')[0] : 'Profile'}
                </button>
              ) : (
                <NavLink
                  to="/login"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-700 transition-colors"
                >
                  <LogIn size={15} /> Sign In
                </NavLink>
              )}
              <NavLink to="/apply" className="hidden sm:flex btn-primary text-sm py-2 px-4">
                Apply for Financing
                <ChevronRight size={14} />
              </NavLink>
              <button
                className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                onClick={() => setMobileOpen(v => !v)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/admin/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary-700 hover:bg-secondary-50"
              >
                <ShieldCheck size={16} /> Admin Portal
              </NavLink>
            )}
            <div className="pt-2 border-t border-slate-100 space-y-1">
              {user ? (
                <NavLink
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <User size={16} /> My Profile
                </NavLink>
              ) : (
                <NavLink
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <LogIn size={16} /> Sign In
                </NavLink>
              )}
              <NavLink
                to="/apply"
                onClick={() => setMobileOpen(false)}
                className="btn-primary w-full justify-center text-sm"
              >
                Apply for Financing <ChevronRight size={14} />
              </NavLink>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-primary-950 text-primary-100 pt-14 pb-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ISO badges row */}
          <div className="flex flex-wrap justify-center gap-3 mb-10 pb-10 border-b border-primary-800">
            {[
              { code: 'ISO 14001:2015', title: 'Environmental Management',         desc: 'Certified environmental management system aligned with global best practice.' },
              { code: 'ISO 50001:2018', title: 'Energy Management',                desc: 'Energy performance and efficiency management system certification.' },
              { code: 'ISO 27001:2022', title: 'Information Security',             desc: 'Latest information security management system standard (2022 revision).' },
              { code: 'ISO 9001:2015',  title: 'Quality Management',              desc: 'Quality management system ensuring consistent, high-quality service delivery.' },
              { code: 'ISO 31000:2018', title: 'Risk Management',                  desc: 'Enterprise risk management framework aligned with international guidance.' },
              { code: 'GRI Standards', title: 'Sustainability Reporting',           desc: 'Global Reporting Initiative standards for ESG and sustainability disclosures.' },
            ].map(({ code, title, desc }) => (
              <div
                key={code}
                title={desc}
                className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-primary-900/60 border border-primary-700/50 hover:border-primary-500 transition-colors cursor-default min-w-[120px]"
              >
                <span className="text-xs font-bold text-primary-300 tracking-wide">{code}</span>
                <span className="text-[10px] text-primary-400 text-center leading-tight">{title}</span>
                <div className="w-5 h-5 rounded-full bg-primary-700 flex items-center justify-center mt-1">
                  <ShieldCheck size={11} className="text-secondary-400" />
                </div>
              </div>
            ))}
          </div>

          {/* Main footer grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Leaf size={14} className="text-white" />
                </div>
                <span className="font-bold text-white font-display">EcoGuard Finance</span>
              </div>
              <p className="text-primary-300 text-sm leading-relaxed mb-4">
                Kenya's climate finance and resilience platform. Sustainable financing, real-time climate intelligence,
                and measurable environmental impact — all in one place.
              </p>
              <div className="flex gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary-800 text-primary-300">CBK Compliant</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary-800 text-primary-300">NEMA Registered</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">Financing Products</h4>
              <ul className="space-y-2 text-sm text-primary-300">
                {['Solar Energy Loan','Electric Mobility Loan','Climate Smart Agriculture','Water Security Loan','Climate Resilient Housing','Waste-to-Energy Loan'].map(p => (
                  <li key={p} className="hover:text-white transition-colors cursor-pointer">{p}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">Platform</h4>
              <ul className="space-y-2 text-sm text-primary-300">
                {['Climate Intelligence','Impact Methodology','Lending Policy','County Risk Profiles','M-Pesa Disbursements','Contact Support'].map(p => (
                  <li key={p} className="hover:text-white transition-colors cursor-pointer">{p}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">Data Sources</h4>
              <ul className="space-y-2 text-sm text-primary-300">
                <li><a href="https://www.meteo.go.ke" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Kenya Met Dept (KMD)</a></li>
                <li><a href="https://www.ndma.go.ke" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">NDMA Drought Watch</a></li>
                <li><a href="https://www.globalfloods.eu" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GloFAS Flood System</a></li>
                <li><a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Open-Meteo Weather API</a></li>
                <li><a href="https://www.nema.go.ke" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">NEMA Kenya</a></li>
                <li><a href="https://www.centralbank.go.ke" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Central Bank of Kenya</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-primary-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-primary-400">
            <span>© {new Date().getFullYear()} EcoGuard Finance Limited. All rights reserved. Nairobi, Kenya.</span>
            <div className="flex flex-wrap items-center gap-3 justify-center">
              <span className="flex items-center gap-1"><ShieldCheck size={11} className="text-secondary-400" /> ISO 27001:2022 Certified</span>
              <span className="text-primary-700">·</span>
              <span className="flex items-center gap-1"><ShieldCheck size={11} className="text-secondary-400" /> ISO 14001:2015 Certified</span>
              <span className="text-primary-700">·</span>
              <span>Bank-grade TLS 1.3 encryption</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
