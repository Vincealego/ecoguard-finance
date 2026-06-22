import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Leaf, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { registerUser, loginUser } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';

const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo Marakwet', 'Embu', 'Garissa',
  'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
  'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos',
  'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', "Murang'a",
  'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
  'Samburu', 'Siaya', 'Taita Taveta', 'Tana River', 'Tharaka Nithi', 'Trans Nzoia',
  'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
];

function translateAuthError(err) {
  const code = err?.code || '';
  if (code.includes('email-already-in-use')) return 'An account with this email already exists.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Incorrect email or password.';
  }
  if (code.includes('weak-password')) return 'Password is too weak. Use at least 8 characters.';
  if (code.includes('invalid-email')) return 'Enter a valid email address.';
  if (code.includes('network-request-failed')) return 'Network error. Check your connection and try again.';
  return err?.message || 'Something went wrong. Please try again.';
}

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const redirectTo = location.state?.from || '/dashboard';

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user]);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    displayName: '', email: '', phone: '', county: '', password: '', confirmPassword: '',
  });

  const updateLogin = (key, value) => setLoginForm(prev => ({ ...prev, [key]: value }));
  const updateRegister = (key, value) => setRegisterForm(prev => ({ ...prev, [key]: value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginUser(loginForm);
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (registerForm.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await registerUser(registerForm);
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-surface">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Leaf size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-ink font-display">
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">EcoGuard Finance — Climate Finance & Resilience Platform</p>
        </div>

        <div className="card p-6 sm:p-8">
          <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
            {[['login', 'Sign In'], ['register', 'Create Account']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setMode(key); setError(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all duration-150 ${
                  mode === key ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email" className="input" required
                  value={loginForm.email}
                  onChange={e => updateLogin('email', e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10" required
                    value={loginForm.password}
                    onChange={e => updateLogin('password', e.target.value)}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in</> : 'Sign In'}
              </button>
              <p className="text-center text-sm text-slate-500">
                Don't have an account?{' '}
                <button type="button" onClick={() => setMode('register')} className="text-primary font-semibold hover:underline">
                  Create one
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="label">Full name</label>
                <input
                  type="text" className="input" required
                  value={registerForm.displayName}
                  onChange={e => updateRegister('displayName', e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email" className="input" required
                    value={registerForm.email}
                    onChange={e => updateRegister('email', e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel" className="input" required
                    value={registerForm.phone}
                    onChange={e => updateRegister('phone', e.target.value)}
                    placeholder="+254 700 000 000"
                  />
                </div>
              </div>
              <div>
                <label className="label">County</label>
                <select
                  className="input" required
                  value={registerForm.county}
                  onChange={e => updateRegister('county', e.target.value)}
                >
                  <option value="">Select county</option>
                  {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10" required minLength={8}
                    value={registerForm.password}
                    onChange={e => updateRegister('password', e.target.value)}
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input
                  type="password" className="input" required
                  value={registerForm.confirmPassword}
                  onChange={e => updateRegister('confirmPassword', e.target.value)}
                  placeholder="Re-enter your password"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account</> : 'Create Account'}
              </button>
              <p className="text-center text-sm text-slate-500">
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('login')} className="text-primary font-semibold hover:underline">
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-5 flex items-center justify-center gap-1.5">
          <CheckCircle2 size={12} /> Your information is encrypted in transit and at rest.
        </p>
      </div>
    </div>
  );
}
