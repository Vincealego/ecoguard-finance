import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Search, Leaf } from 'lucide-react';
import { loanProducts, categoryStyles } from '../data/loans';

const categories = ['All', 'Energy', 'Transport', 'Agriculture', 'Water', 'Housing', 'Waste'];

export default function Marketplace() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filtered = loanProducts.filter(loan => {
    const matchesCategory = selectedCategory === 'All' || loan.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      loan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatAmount = (n) => n >= 1000000 ? `KSh ${(n / 1000000).toFixed(1)}M` : `KSh ${(n / 1000).toFixed(0)}K`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="section-title">Financing Products</h1>
        <p className="section-sub">Sustainable financing instruments designed for Kenya's climate priorities, with eligibility and impact details for every product.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search financing products"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                selectedCategory === cat
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-primary-300 hover:text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(loan => {
          const Icon = loan.icon;
          const style = categoryStyles[loan.category];
          return (
            <div key={loan.id} className="card overflow-hidden flex flex-col">
              <div className="h-44 overflow-hidden">
                <img src={loan.image} alt={loan.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className={`badge ${style.bg} ${style.text} ${style.border} border`}>{loan.category}</span>
                  <span className="text-lg font-bold text-primary font-display">{loan.rate}</span>
                </div>
                <h3 className="font-semibold text-ink text-base mb-1.5 flex items-center gap-1.5">
                  <Icon size={15} className="text-primary flex-shrink-0" />
                  {loan.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">{loan.description}</p>

                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <div className="text-xs text-slate-400 mb-0.5">Maximum financing</div>
                    <div className="font-semibold text-ink">{formatAmount(loan.maxFinancing)}</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <div className="text-xs text-slate-400 mb-0.5">Tenure</div>
                    <div className="font-semibold text-ink">{loan.tenure}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Eligibility</p>
                  <ul className="space-y-1.5">
                    {loan.eligibility.slice(0, 2).map(e => (
                      <li key={e} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 size={12} className="text-primary mt-0.5 flex-shrink-0" />
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-secondary-700 bg-secondary-50 rounded-lg px-3 py-2 mb-4">
                  <Leaf size={12} className="flex-shrink-0" />
                  Estimated {loan.climateImpact.metric}
                </div>

                <button
                  onClick={() => navigate(`/apply/${loan.id}`)}
                  className="btn-primary w-full justify-center mt-auto"
                >
                  Apply Now <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400">
            <p className="font-medium">No financing products match your search.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="mt-3 text-primary font-semibold text-sm hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
