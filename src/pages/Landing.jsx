import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, TrendingUp, Activity, Users, Building2, Quote } from 'lucide-react';
import { loanProducts } from '../data/loans';

const metrics = [
  { value: 'KSh 58.4M', label: 'Financed' },
  { value: '482', label: 'Projects Supported' },
  { value: '2,430 tCO₂', label: 'Reduced' },
  { value: '12', label: 'Counties Covered' },
];

const successStories = [
  {
    name: 'Amani Smallholder Cooperative',
    county: 'Kisumu County',
    quote: 'Drip irrigation financing through EcoGuard let us cut water use by half while expanding cultivated land by a third.',
    metric: '38 farmers reached',
  },
  {
    name: 'Baraka Transport SACCO',
    county: 'Nakuru County',
    quote: 'We transitioned eleven matatus to electric mobility, reducing fuel costs and giving our members predictable monthly repayments.',
    metric: '11 vehicles electrified',
  },
  {
    name: 'Tumaini Housing Group',
    county: 'Kilifi County',
    quote: 'Climate-resilient retrofits protected forty households through the last storm season with zero structural damage.',
    metric: '40 households retrofitted',
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 text-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-secondary-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-secondary-400/15 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6 font-display">
              Climate Finance for a Resilient Kenya
            </h1>
            <p className="text-lg sm:text-xl text-primary-100 leading-relaxed mb-9 max-w-2xl">
              Access sustainable financing, climate intelligence, and measurable environmental impact
              through one integrated platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate('/apply')} className="btn-accent px-6 py-3.5 text-base">
                Apply for Financing <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/climate-intelligence')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 text-white font-semibold rounded-lg border border-white/25 hover:bg-white/15 transition-all duration-150 backdrop-blur-sm text-base"
              >
                Explore Climate Intelligence
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-bold text-primary font-display">{value}</div>
                <div className="text-sm font-medium text-slate-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <h2 className="section-title">Financing Products</h2>
            <p className="section-sub">Six sustainable financing instruments tailored to Kenya's climate priorities.</p>
          </div>
          <button onClick={() => navigate('/marketplace')} className="btn-secondary">
            View all products <ArrowRight size={15} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loanProducts.slice(0, 3).map((loan) => {
            const Icon = loan.icon;
            return (
              <div key={loan.id} className="card overflow-hidden cursor-pointer group" onClick={() => navigate(`/marketplace`)}>
                <div className="h-40 overflow-hidden">
                  <img src={loan.image} alt={loan.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} className="text-primary" />
                    <h3 className="font-semibold text-ink">{loan.title}</h3>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed mb-3">{loan.description}</p>
                  <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-100">
                    <span className="font-semibold text-primary">{loan.rate}</span>
                    <span className="text-slate-400">up to KSh {(loan.maxFinancing / 1000000).toFixed(1)}M</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-primary-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4 font-display">Climate Intelligence built for Kenya</h2>
              <p className="text-primary-200 leading-relaxed mb-6">
                Our risk engine evaluates flood, drought, storm, and wildfire exposure across Kenyan counties,
                then automatically surfaces the financing products best suited to building resilience in each context.
              </p>
              <button onClick={() => navigate('/climate-intelligence')} className="btn-accent">
                View county risk profiles <ArrowRight size={15} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Activity, label: 'Flood Risk', counties: '6 counties monitored' },
                { icon: TrendingUp, label: 'Drought Risk', counties: '5 counties monitored' },
                { icon: ShieldCheck, label: 'Storm Risk', counties: '4 counties monitored' },
                { icon: Users, label: 'Wildfire Risk', counties: '4 counties monitored' },
              ].map(({ icon: Icon, label, counties }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <Icon size={18} className="text-secondary-400 mb-2" />
                  <div className="font-semibold text-sm">{label}</div>
                  <div className="text-xs text-primary-300 mt-0.5">{counties}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="section-title">Success Stories</h2>
          <p className="section-sub">Real outcomes from EcoGuard-financed projects across Kenya.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {successStories.map((story) => (
            <div key={story.name} className="card p-6">
              <Quote size={20} className="text-primary-200 mb-3" />
              <p className="text-sm text-slate-600 leading-relaxed mb-4">{story.quote}</p>
              <div className="pt-4 border-t border-slate-100">
                <div className="font-semibold text-ink text-sm">{story.name}</div>
                <div className="text-xs text-slate-400">{story.county}</div>
                <div className="text-xs font-semibold text-primary mt-1.5">{story.metric}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-r from-primary to-secondary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl md:text-2xl font-bold font-display">Ready to finance your climate project?</h3>
            <p className="text-primary-100 mt-1.5">Apply in minutes and track your application from review to disbursement.</p>
          </div>
          <button
            onClick={() => navigate('/apply')}
            className="flex-shrink-0 inline-flex items-center gap-2 px-7 py-3.5 bg-white text-primary font-semibold rounded-lg hover:bg-primary-50 transition-colors"
          >
            Apply for Financing <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-wrap justify-center gap-8 items-center text-slate-400">
          {['Central Bank of Kenya compliant', 'NEMA registered', 'ISO 27001 aligned', 'County partnership ready'].map(item => (
            <div key={item} className="flex items-center gap-2 text-sm font-medium">
              <Building2 size={15} />
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
