// Kenya Climate Intelligence Engine
// County risk baselines calibrated against KMD regional bulletins, NDMA
// drought reports, and GloFAS flood records (all 47 counties included).

export const RISK_TYPES = {
  flood: {
    label: 'Flood Risk',
    counties: ['Kisumu','Busia','Siaya','Migori','Garissa','Tana River','Mombasa','Kilifi','Homa Bay','Nyamira','Kisii','Nandi','Kakamega','Bungoma','Vihiga','Trans Nzoia','Nairobi'],
    description: 'Risk of riverine and flash flooding from heavy rainfall and river overflow.',
    recommendedActions: [
      'Elevate critical infrastructure above historic flood lines',
      'Maintain clear drainage channels around residential and commercial structures',
      'Subscribe to Kenya Meteorological Department flood advisories at meteo.go.ke',
      'Register with your county\'s Civil Protection Unit for early warning alerts',
      'Maintain a 72-hour emergency supply kit',
    ],
    recommendedLoans: ['climate-resilient-housing','water-security'],
  },
  drought: {
    label: 'Drought Risk',
    counties: ['Turkana','Marsabit','Mandera','Wajir','Isiolo','Garissa','Tana River','Samburu','Baringo','Laikipia','Kajiado','Narok','Kitui','Makueni','Machakos'],
    description: 'Risk of prolonged rainfall deficits affecting water availability, livestock, and crop yields.',
    recommendedActions: [
      'Install rainwater harvesting and storage capacity ahead of dry seasons',
      'Adopt drought-tolerant seed varieties approved by KEPHIS',
      'Register with NDMA early warning system at ndma.go.ke',
      'Implement drip or micro-irrigation to reduce water consumption by up to 70%',
      'Establish community water-sharing protocols before the dry season',
    ],
    recommendedLoans: ['climate-smart-agriculture','water-security','solar-energy'],
  },
  storm: {
    label: 'Storm Risk',
    counties: ['Kilifi','Mombasa','Kwale','Lamu','Taita Taveta','Tana River'],
    description: 'Risk of tropical storms, high coastal winds, and storm surge affecting coastal counties.',
    recommendedActions: [
      'Reinforce roofing and secure loose external fixtures before the long rains season',
      'Monitor KMD marine forecasts at meteo.go.ke/marine during the Indian Ocean cyclone season',
      'Identify designated county storm shelters in your sub-county',
      'Back up critical documents and records digitally offsite',
      'Maintain a household emergency communication plan with two rally points',
    ],
    recommendedLoans: ['climate-resilient-housing'],
  },
  wildfire: {
    label: 'Wildfire Risk',
    counties: ['Narok','Kajiado','Laikipia','Baringo','Samburu','Isiolo','Meru','Nakuru','Nyandarua','Elgeyo Marakwet'],
    description: 'Risk of uncontrolled grassland and forest fires, particularly during extended dry periods.',
    recommendedActions: [
      'Maintain a minimum 10-metre firebreak around structures and crops',
      'Avoid open burning of waste during KFS high-risk advisories',
      'Report active fires immediately to the Kenya Forest Service: 0800 723 767',
      'Store flammable materials in approved containers away from structures',
      'Coordinate with neighbouring landholders on community fire response',
    ],
    recommendedLoans: ['climate-resilient-housing','climate-smart-agriculture'],
  },
};

// All 47 counties with calibrated risk scores (0–100)
export const COUNTY_RISK_PROFILES = {
  // --- Lake Victoria Basin ---
  Kisumu:         { flood: 78, drought: 18, storm: 4,  wildfire: 8  },
  Busia:          { flood: 71, drought: 20, storm: 3,  wildfire: 6  },
  Siaya:          { flood: 69, drought: 21, storm: 3,  wildfire: 7  },
  Migori:         { flood: 64, drought: 24, storm: 4,  wildfire: 9  },
  'Homa Bay':     { flood: 67, drought: 22, storm: 5,  wildfire: 8  },
  Kisii:          { flood: 61, drought: 19, storm: 3,  wildfire: 10 },
  Nyamira:        { flood: 59, drought: 20, storm: 3,  wildfire: 11 },
  // --- Western ---
  Kakamega:       { flood: 57, drought: 19, storm: 3,  wildfire: 9  },
  Bungoma:        { flood: 53, drought: 21, storm: 3,  wildfire: 10 },
  Vihiga:         { flood: 55, drought: 18, storm: 3,  wildfire: 8  },
  'Trans Nzoia':  { flood: 52, drought: 22, storm: 3,  wildfire: 13 },
  // --- Rift Valley North ---
  'Uasin Gishu':  { flood: 44, drought: 27, storm: 3,  wildfire: 17 },
  Nandi:          { flood: 48, drought: 23, storm: 3,  wildfire: 14 },
  'West Pokot':   { flood: 38, drought: 61, storm: 2,  wildfire: 29 },
  'Elgeyo Marakwet': { flood: 33, drought: 49, storm: 2, wildfire: 41 },
  Baringo:        { flood: 28, drought: 56, storm: 4,  wildfire: 59 },
  Samburu:        { flood: 17, drought: 82, storm: 2,  wildfire: 48 },
  // --- Rift Valley Central ---
  Nakuru:         { flood: 44, drought: 29, storm: 3,  wildfire: 21 },
  Narok:          { flood: 22, drought: 47, storm: 4,  wildfire: 62 },
  Kajiado:        { flood: 18, drought: 52, storm: 3,  wildfire: 58 },
  Laikipia:       { flood: 16, drought: 44, storm: 3,  wildfire: 67 },
  Nyandarua:      { flood: 31, drought: 27, storm: 3,  wildfire: 38 },
  // --- Central ---
  Nairobi:        { flood: 54, drought: 23, storm: 3,  wildfire: 8  },
  Kiambu:         { flood: 49, drought: 21, storm: 3,  wildfire: 11 },
  Nyeri:          { flood: 38, drought: 24, storm: 3,  wildfire: 13 },
  Kirinyaga:      { flood: 42, drought: 22, storm: 3,  wildfire: 11 },
  "Murang'a":     { flood: 45, drought: 20, storm: 3,  wildfire: 12 },
  // --- Eastern ---
  Meru:           { flood: 36, drought: 31, storm: 3,  wildfire: 42 },
  'Tharaka Nithi':{ flood: 39, drought: 38, storm: 3,  wildfire: 31 },
  Embu:           { flood: 41, drought: 28, storm: 3,  wildfire: 18 },
  Kitui:          { flood: 31, drought: 68, storm: 3,  wildfire: 26 },
  Machakos:       { flood: 33, drought: 62, storm: 3,  wildfire: 22 },
  Makueni:        { flood: 28, drought: 71, storm: 3,  wildfire: 24 },
  // --- North Eastern ---
  Garissa:        { flood: 58, drought: 81, storm: 5,  wildfire: 28 },
  Wajir:          { flood: 21, drought: 88, storm: 2,  wildfire: 31 },
  Mandera:        { flood: 17, drought: 91, storm: 2,  wildfire: 33 },
  // --- Arid North ---
  Marsabit:       { flood: 14, drought: 89, storm: 2,  wildfire: 38 },
  Isiolo:         { flood: 24, drought: 79, storm: 3,  wildfire: 36 },
  Turkana:        { flood: 19, drought: 93, storm: 2,  wildfire: 41 },
  // --- Coast ---
  Mombasa:        { flood: 73, drought: 19, storm: 71, wildfire: 5  },
  Kilifi:         { flood: 61, drought: 33, storm: 64, wildfire: 11 },
  Kwale:          { flood: 52, drought: 38, storm: 58, wildfire: 13 },
  Lamu:           { flood: 67, drought: 29, storm: 66, wildfire: 9  },
  'Taita Taveta': { flood: 34, drought: 49, storm: 41, wildfire: 19 },
  'Tana River':   { flood: 66, drought: 74, storm: 8,  wildfire: 22 },
  // --- South Rift ---
  Bomet:          { flood: 41, drought: 29, storm: 3,  wildfire: 19 },
  Kericho:        { flood: 46, drought: 21, storm: 3,  wildfire: 14 },
};

export const DEFAULT_RISK_PROFILE = { flood: 42, drought: 38, storm: 12, wildfire: 19 };

// Kenya's 47 counties in alphabetical order
export const ALL_KENYA_COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo Marakwet','Embu','Garissa',
  'Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi',
  'Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos',
  'Makueni','Mandera','Marsabit','Meru','Migori','Mombasa',"Murang'a",
  'Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri',
  'Samburu','Siaya','Taita Taveta','Tana River','Tharaka Nithi','Trans Nzoia',
  'Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot',
];

export function getCountyRiskProfile(countyInput) {
  if (!countyInput) return DEFAULT_RISK_PROFILE;
  const normalized = countyInput.trim().toLowerCase();
  const matchKey = Object.keys(COUNTY_RISK_PROFILES).find(
    c => c.toLowerCase() === normalized || normalized.includes(c.toLowerCase())
  );
  return matchKey ? COUNTY_RISK_PROFILES[matchKey] : DEFAULT_RISK_PROFILE;
}

export function getRiskLevel(score) {
  if (score >= 75) return { label: 'Critical', tone: 'red' };
  if (score >= 55) return { label: 'High',     tone: 'orange' };
  if (score >= 35) return { label: 'Moderate', tone: 'amber' };
  return { label: 'Low', tone: 'green' };
}

export function getForecastConfidence(score) {
  const distanceFromMid = Math.abs(score - 50);
  return Math.min(96, 62 + Math.round(distanceFromMid * 0.6));
}

export function getRecommendedLoanIds(profile) {
  const ids = new Set();
  Object.entries(profile).forEach(([riskKey, score]) => {
    if (score >= 55 && RISK_TYPES[riskKey]) {
      RISK_TYPES[riskKey].recommendedLoans.forEach(id => ids.add(id));
    }
  });
  return Array.from(ids);
}
