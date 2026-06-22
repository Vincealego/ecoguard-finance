import { RISK_TYPES, COUNTY_RISK_PROFILES, getRiskLevel } from '../../data/climateRisk';

export default function AdminClimate() {
  const counties = Object.keys(COUNTY_RISK_PROFILES).sort();

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink font-display">Climate Intelligence Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Monitored risk categories and county-level scores across the platform.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Object.entries(RISK_TYPES).map(([key, info]) => (
          <div key={key} className="card p-5">
            <div className="text-sm font-semibold text-ink mb-1">{info.label}</div>
            <div className="text-2xl font-bold text-primary font-display mb-1">{info.counties.length}</div>
            <div className="text-xs text-slate-500">counties monitored</div>
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>County</th>
              <th>Flood</th>
              <th>Drought</th>
              <th>Storm</th>
              <th>Wildfire</th>
              <th>Highest Risk</th>
            </tr>
          </thead>
          <tbody>
            {counties.map(county => {
              const profile = COUNTY_RISK_PROFILES[county];
              const highest = Object.entries(profile).reduce((a, b) => (b[1] > a[1] ? b : a));
              const level = getRiskLevel(highest[1]);
              return (
                <tr key={county}>
                  <td className="font-medium">{county}</td>
                  <td>{profile.flood}%</td>
                  <td>{profile.drought}%</td>
                  <td>{profile.storm}%</td>
                  <td>{profile.wildfire}%</td>
                  <td>
                    <span className={`badge ${
                      level.tone === 'red' ? 'bg-red-100 text-red-700' :
                      level.tone === 'orange' ? 'bg-orange-100 text-orange-700' :
                      level.tone === 'amber' ? 'bg-amber-100 text-amber-700' :
                      'bg-primary-100 text-primary-700'
                    }`}>
                      {RISK_TYPES[highest[0]].label} · {level.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Risk scores shown are illustrative baselines. Production deployments integrate live feeds from
        the Kenya Meteorological Department, NDMA, and GloFAS.
      </p>
    </div>
  );
}
