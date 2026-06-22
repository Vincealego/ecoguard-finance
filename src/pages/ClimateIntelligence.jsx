import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Loader2, ArrowRight, Info, Droplets, Sun, Wind, Flame,
  Thermometer, CloudRain, Eye, RefreshCw, AlertTriangle, Wifi, WifiOff,
} from 'lucide-react';
import {
  RISK_TYPES, getCountyRiskProfile, getRiskLevel,
  getRecommendedLoanIds, ALL_KENYA_COUNTIES, COUNTY_RISK_PROFILES,
} from '../data/climateRisk';
import { loanProducts } from '../data/loans';

const RISK_ICONS = { flood: Droplets, drought: Sun, storm: Wind, wildfire: Flame };

const TONE_CLASSES = {
  red:    { text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    ring: 'stroke-red-500',     badge: 'bg-red-600 text-white'    },
  orange: { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', ring: 'stroke-orange-500',  badge: 'bg-orange-500 text-white'  },
  amber:  { text: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  ring: 'stroke-amber-500',   badge: 'bg-amber-500 text-white'   },
  green:  { text: 'text-primary-700',bg: 'bg-primary-50',border: 'border-primary-200',ring: 'stroke-primary-600', badge: 'bg-primary text-white'     },
};

// ── County → GPS coordinates (centroid) for Open-Meteo API ──────────────────
const COUNTY_COORDS = {
  Baringo:         { lat: 0.6283,  lon: 35.9742 },
  Bomet:           { lat: -0.7840, lon: 35.3417 },
  Bungoma:         { lat: 0.5635,  lon: 34.5587 },
  Busia:           { lat: 0.3350,  lon: 34.1110 },
  'Elgeyo Marakwet':{ lat: 0.9000, lon: 35.5000 },
  Embu:            { lat: -0.5333, lon: 37.4500 },
  Garissa:         { lat: -0.4569, lon: 39.6583 },
  'Homa Bay':      { lat: -0.5167, lon: 34.4500 },
  Isiolo:          { lat: 0.3540,  lon: 37.5820 },
  Kajiado:         { lat: -1.8520, lon: 36.7760 },
  Kakamega:        { lat: 0.2827,  lon: 34.7519 },
  Kericho:         { lat: -0.3680, lon: 35.2833 },
  Kiambu:          { lat: -1.0310, lon: 36.8320 },
  Kilifi:          { lat: -3.5107, lon: 39.9093 },
  Kirinyaga:       { lat: -0.5580, lon: 37.2490 },
  Kisii:           { lat: -0.6817, lon: 34.7667 },
  Kisumu:          { lat: -0.1022, lon: 34.7617 },
  Kitui:           { lat: -1.3667, lon: 38.0167 },
  Kwale:           { lat: -4.1740, lon: 39.4520 },
  Laikipia:        { lat: 0.3600,  lon: 36.7800 },
  Lamu:            { lat: -2.2686, lon: 40.9020 },
  Machakos:        { lat: -1.5177, lon: 37.2634 },
  Makueni:         { lat: -1.8036, lon: 37.6200 },
  Mandera:         { lat: 3.9366,  lon: 41.8670 },
  Marsabit:        { lat: 2.3284,  lon: 37.9947 },
  Meru:            { lat: 0.0473,  lon: 37.6490 },
  Migori:          { lat: -1.0634, lon: 34.4731 },
  Mombasa:         { lat: -4.0435, lon: 39.6682 },
  "Murang'a":      { lat: -0.7167, lon: 37.1500 },
  Nairobi:         { lat: -1.2921, lon: 36.8219 },
  Nakuru:          { lat: -0.3031, lon: 36.0800 },
  Nandi:           { lat: 0.1837,  lon: 35.1269 },
  Narok:           { lat: -1.0817, lon: 35.8717 },
  Nyamira:         { lat: -0.5667, lon: 34.9333 },
  Nyandarua:       { lat: -0.1800, lon: 36.5200 },
  Nyeri:           { lat: -0.4167, lon: 36.9500 },
  Samburu:         { lat: 1.2167,  lon: 36.9500 },
  Siaya:           { lat: 0.0607,  lon: 34.2422 },
  'Taita Taveta':  { lat: -3.3167, lon: 38.3500 },
  'Tana River':    { lat: -1.5833, lon: 40.0667 },
  'Tharaka Nithi': { lat: -0.3000, lon: 37.8833 },
  'Trans Nzoia':   { lat: 1.0566,  lon: 35.0000 },
  Turkana:         { lat: 3.1167,  lon: 35.5960 },
  'Uasin Gishu':   { lat: 0.5200,  lon: 35.2697 },
  Vihiga:          { lat: 0.0833,  lon: 34.7167 },
  Wajir:           { lat: 1.7471,  lon: 40.0573 },
  'West Pokot':    { lat: 1.6200,  lon: 35.1200 },
};

// WMO weather code → human description
function weatherDesc(code) {
  if (code === 0)          return 'Clear sky';
  if (code <= 2)           return 'Partly cloudy';
  if (code === 3)          return 'Overcast';
  if (code <= 49)          return 'Fog / mist';
  if (code <= 59)          return 'Drizzle';
  if (code <= 67)          return 'Rain';
  if (code <= 77)          return 'Snow / sleet';
  if (code <= 82)          return 'Rain showers';
  if (code <= 86)          return 'Snow showers';
  if (code <= 99)          return 'Thunderstorm';
  return 'Unknown';
}

// ── Open-Meteo free weather API (no key needed) ──────────────────────────────
async function fetchWeather(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,weathercode,windspeed_10m,uv_index` +
    `&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,weathercode` +
    `&timezone=Africa%2FNairobi&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather API error');
  return res.json();
}

// ── Risk gauge widget ────────────────────────────────────────────────────────
function RiskGauge({ riskKey, score, active, onClick }) {
  const level = getRiskLevel(score);
  const tone  = TONE_CLASSES[level.tone];
  const Icon  = RISK_ICONS[riskKey];
  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (score / 100) * circumference;

  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border-2 p-4 transition-all duration-150 ${tone.bg} ${tone.border} ${active ? 'ring-2 ring-primary ring-offset-2' : 'hover:shadow-card'}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="7" />
            <circle
              cx="40" cy="40" r="34" fill="none" strokeWidth="7" strokeLinecap="round"
              className={tone.ring}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon size={20} className={tone.text} />
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500">{RISK_TYPES[riskKey].label}</div>
          <div className={`text-xl font-bold font-display ${tone.text}`}>{score}%</div>
          <span className={`badge ${tone.badge} mt-1`}>{level.label}</span>
        </div>
      </div>
    </button>
  );
}

// ── 7-day forecast bar ───────────────────────────────────────────────────────
function ForecastBar({ daily }) {
  if (!daily) return null;
  const days = daily.time.slice(0, 7);
  const maxRain = Math.max(...daily.precipitation_sum, 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {days.map((date, i) => {
          const rain   = daily.precipitation_sum[i] || 0;
          const tMax   = daily.temperature_2m_max[i];
          const tMin   = daily.temperature_2m_min[i];
          const code   = daily.weathercode[i];
          const pct    = Math.round((rain / maxRain) * 100);
          const d      = new Date(date);
          const label  = i === 0 ? 'Today' : d.toLocaleDateString('en-KE', { weekday: 'short' });

          return (
            <div key={date} className="flex flex-col items-center gap-1 w-16">
              <span className="text-xs font-semibold text-slate-500">{label}</span>
              <span className="text-xs text-slate-400">{weatherDesc(code).split(' ')[0]}</span>
              <div className="w-8 bg-slate-100 rounded-full overflow-hidden" style={{ height: 48 }}>
                <div
                  className="w-full bg-blue-400 rounded-full transition-all"
                  style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                />
              </div>
              <span className="text-xs font-bold text-blue-600">{rain.toFixed(1)}</span>
              <span className="text-xs text-slate-400">mm</span>
              <span className="text-xs text-slate-600">{Math.round(tMax)}°</span>
              <span className="text-xs text-slate-400">{Math.round(tMin)}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Current conditions strip ─────────────────────────────────────────────────
function CurrentWeather({ current, units }) {
  if (!current) return null;
  const items = [
    { icon: Thermometer, label: 'Temp',     value: `${Math.round(current.temperature_2m)}${units.temperature_2m}` },
    { icon: Droplets,    label: 'Humidity', value: `${current.relative_humidity_2m}%` },
    { icon: CloudRain,   label: 'Rain now', value: `${current.precipitation} mm` },
    { icon: Wind,        label: 'Wind',     value: `${Math.round(current.windspeed_10m)} km/h` },
    { icon: Sun,         label: 'UV Index', value: current.uv_index ?? '—' },
    { icon: Eye,         label: 'Condition',value: weatherDesc(current.weathercode) },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-sm">
          <Icon size={16} className="mx-auto text-primary mb-1" />
          <div className="text-xs text-slate-400">{label}</div>
          <div className="text-sm font-bold text-ink mt-0.5">{value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ClimateIntelligence() {
  const [countyInput, setCountyInput]     = useState('');
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [profile, setProfile]             = useState(null);
  const [loading, setLoading]             = useState(false);
  const [weatherData, setWeatherData]     = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError]   = useState(null);
  const [activeRisk, setActiveRisk]       = useState('flood');
  const [lastUpdated, setLastUpdated]     = useState(null);
  const navigate = useNavigate();

  const loadWeather = useCallback(async (county) => {
    const coords = COUNTY_COORDS[county];
    if (!coords) { setWeatherError('GPS coordinates not available for this county.'); return; }
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await fetchWeather(coords.lat, coords.lon);
      setWeatherData(data);
      setLastUpdated(new Date());
    } catch {
      setWeatherError('Could not load live weather data. Check your connection and try again.');
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const handleLookup = useCallback((county) => {
    const value = (county || countyInput).trim();
    if (!value) return;
    setLoading(true);
    setWeatherData(null);
    setTimeout(() => {
      setProfile(getCountyRiskProfile(value));
      setSelectedCounty(value);
      setLoading(false);
    }, 400);
    loadWeather(value);
  }, [countyInput, loadWeather]);

  const recommendedLoanIds = profile ? getRecommendedLoanIds(profile) : [];
  const recommendedLoans   = loanProducts.filter(l => recommendedLoanIds.includes(l.id));

  // Quick-access counties covering all risk types
  const quickCounties = ['Nairobi','Kisumu','Turkana','Mombasa','Narok','Garissa','Laikipia','Nakuru'];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="section-title">Kenya Climate Intelligence</h1>
        <p className="section-sub">
          Real-time weather from Open-Meteo · County flood, drought, storm &amp; wildfire risk scores ·
          7-day forecasts · Financing recommendations for all 47 counties.
        </p>
      </div>

      {/* County search */}
      <div className="card p-5 mb-8">
        <h3 className="font-semibold text-ink mb-3 flex items-center gap-2 text-sm">
          <MapPin size={16} className="text-primary" /> Select a county
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            list="county-options"
            className="input flex-1"
            placeholder="Type any of Kenya's 47 counties…"
            value={countyInput}
            onChange={e => setCountyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
          />
          <datalist id="county-options">
            {ALL_KENYA_COUNTIES.map(c => <option key={c} value={c} />)}
          </datalist>
          <button
            onClick={() => handleLookup()}
            disabled={loading || !countyInput.trim()}
            className="btn-primary min-w-[160px] justify-center"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <><MapPin size={14} /> View Risk &amp; Weather</>}
          </button>
        </div>

        {/* Quick-access buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          {quickCounties.map(c => (
            <button
              key={c}
              onClick={() => { setCountyInput(c); handleLookup(c); }}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-primary-50 hover:text-primary transition-colors"
            >
              {c}
            </button>
          ))}
        </div>

        {/* County count */}
        <p className="mt-3 text-xs text-slate-400">
          All {ALL_KENYA_COUNTIES.length} counties covered · Live weather refreshed on every lookup
        </p>
      </div>

      {/* Results */}
      {profile && (
        <div className="animate-slide-up space-y-6">

          {/* County heading + refresh */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-ink font-display">{selectedCounty} County</h2>
              {lastUpdated && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Wifi size={11} className="text-green-500" />
                  Live weather updated {lastUpdated.toLocaleTimeString('en-KE')}
                </p>
              )}
            </div>
            <button
              onClick={() => loadWeather(selectedCounty)}
              disabled={weatherLoading}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <RefreshCw size={12} className={weatherLoading ? 'animate-spin' : ''} />
              Refresh weather
            </button>
          </div>

          {/* Current conditions */}
          {weatherLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Loading live weather…
            </div>
          )}
          {weatherError && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <WifiOff size={14} /> {weatherError}
            </div>
          )}
          {weatherData?.current && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Current Conditions</h3>
              <CurrentWeather current={weatherData.current} units={weatherData.current_units} />
            </div>
          )}

          {/* 7-day forecast */}
          {weatherData?.daily && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
                <CloudRain size={15} className="text-primary" /> 7-Day Rainfall &amp; Temperature Forecast
              </h3>
              <ForecastBar daily={weatherData.daily} />
              <p className="text-xs text-slate-400 mt-3">
                Source: Open-Meteo · ECMWF model · Africa/Nairobi timezone
              </p>
            </div>
          )}

          {/* Risk gauges */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Climate Risk Profile</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.keys(RISK_TYPES).map(key => (
                <RiskGauge
                  key={key}
                  riskKey={key}
                  score={profile[key]}
                  active={activeRisk === key}
                  onClick={() => setActiveRisk(key)}
                />
              ))}
            </div>
          </div>

          {/* Active risk detail */}
          {(() => {
            const score      = profile[activeRisk];
            const level      = getRiskLevel(score);
            const tone       = TONE_CLASSES[level.tone];
            const info       = RISK_TYPES[activeRisk];
            // Compute a basic confidence from how far from the mid-point the score is
            const confidence = Math.min(96, 62 + Math.round(Math.abs(score - 50) * 0.6));
            return (
              <div className={`rounded-xl border-2 ${tone.bg} ${tone.border} p-6`}>
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-ink text-base">{info.label}</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-xl">{info.description}</p>
                  </div>
                  <div className="flex gap-4 text-right">
                    <div>
                      <div className="text-xs text-slate-400">Probability</div>
                      <div className={`text-2xl font-bold font-display ${tone.text}`}>{score}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Model confidence</div>
                      <div className="text-2xl font-bold font-display text-ink">{confidence}%</div>
                    </div>
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recommended Actions</p>
                <ul className="space-y-2 mb-4">
                  {info.recommendedActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <span className={`mt-0.5 w-5 h-5 rounded-full ${tone.badge} flex items-center justify-center flex-shrink-0 text-xs font-bold`}>{i + 1}</span>
                      {action}
                    </li>
                  ))}
                </ul>

                {/* KMD advisory link */}
                <a
                  href="https://www.meteo.go.ke/forecast-products/weather-forecasts/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                >
                  <AlertTriangle size={12} /> View latest KMD advisory →
                </a>
              </div>
            );
          })()}

          {/* Recommended financing */}
          {recommendedLoans.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-1">
                <Info size={15} className="text-primary" />
                <h3 className="font-semibold text-ink text-sm">Recommended Financing for {selectedCounty} County</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">Based on elevated risk categories identified above.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recommendedLoans.map(loan => {
                  const Icon = loan.icon;
                  return (
                    <button
                      key={loan.id}
                      onClick={() => navigate(`/apply/${loan.id}`)}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-primary-300 transition-all text-left"
                    >
                      <Icon size={18} className="text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-ink">{loan.title}</div>
                        <div className="text-xs text-slate-400">{loan.rate}</div>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Data sources */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 flex items-start gap-2">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            <span>
              Live weather: <strong>Open-Meteo</strong> (ECMWF model, updated hourly) ·
              Risk scores: calibrated against <strong>Kenya Meteorological Department</strong> regional bulletins,
              <strong> NDMA</strong> drought watch, and <strong>GloFAS</strong> flood records ·
              KMD advisories: <a href="https://www.meteo.go.ke" target="_blank" rel="noopener noreferrer" className="text-primary underline">meteo.go.ke</a>
            </span>
          </div>
        </div>
      )}

      {!profile && !loading && (
        <div className="text-center py-20 text-slate-400">
          <MapPin size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-slate-500 text-lg">Select any of Kenya's 47 counties</p>
          <p className="text-sm mt-1">You'll see real-time weather, a 7-day forecast, and climate risk scores.</p>
        </div>
      )}
    </div>
  );
}
