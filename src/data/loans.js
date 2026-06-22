import { Sun, Zap, Recycle, Home, Sprout, Droplets } from 'lucide-react';

export const loanProducts = [
  {
    id: 'solar-energy',
    title: 'Solar Energy Loan',
    icon: Sun,
    image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80',
    description: 'Finance rooftop solar installations, battery storage, and solar water pumping systems for homes, farms, and businesses.',
    rate: '6.5% – 9.0%',
    maxFinancing: 5000000,
    minFinancing: 50000,
    tenure: '5 – 15 years',
    eligibility: [
      'Kenyan citizen or registered entity',
      'Property ownership or verified long-term lease',
      'Minimum credit score of 650',
      'Site assessment for installations above 10kW',
    ],
    climateImpact: {
      co2PerKsh: 0.04,
      jobsPerKsh: 0.00012,
      metric: 'kWh clean energy generated annually',
      metricPerKsh: 0.012,
    },
    category: 'Energy',
  },
  {
    id: 'electric-mobility',
    title: 'Electric Mobility Loan',
    icon: Zap,
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80',
    description: 'Acquire electric motorcycles, three-wheelers, and light commercial vehicles, with optional charging infrastructure financing.',
    rate: '7.9% – 11.5%',
    maxFinancing: 8000000,
    minFinancing: 30000,
    tenure: '3 – 7 years',
    eligibility: [
      'Valid driving license or PSV license for commercial use',
      'Transport SACCO or fleet operator registration accepted',
      'Minimum 20% deposit',
      'Insurance bundling required for commercial vehicles',
    ],
    climateImpact: {
      co2PerKsh: 0.06,
      jobsPerKsh: 0.00008,
      metric: 'litres of fuel displaced annually',
      metricPerKsh: 0.05,
    },
    category: 'Transport',
  },
  {
    id: 'climate-smart-agriculture',
    title: 'Climate Smart Agriculture Loan',
    icon: Sprout,
    image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80',
    description: 'Fund drip irrigation, greenhouse construction, drought-resistant inputs, and post-harvest storage to build farm resilience.',
    rate: '5.5% – 8.0%',
    maxFinancing: 3000000,
    minFinancing: 10000,
    tenure: '1 – 10 years',
    eligibility: [
      'Active cultivation on owned or leased land',
      'Smallholder farmers and registered cooperatives eligible',
      'No loan default in the preceding 24 months',
      'Harvest-based repayment schedules available',
    ],
    climateImpact: {
      co2PerKsh: 0.03,
      jobsPerKsh: 0.0004,
      metric: 'kg of food security secured annually',
      metricPerKsh: 0.02,
    },
    category: 'Agriculture',
  },
  {
    id: 'water-security',
    title: 'Water Security Loan',
    icon: Droplets,
    image: 'https://images.unsplash.com/photo-1538300342682-cf57afb97285?w=800&q=80',
    description: 'Develop boreholes, rainwater harvesting systems, water kiosks, and community sanitation infrastructure.',
    rate: '6.0% – 8.5%',
    maxFinancing: 20000000,
    minFinancing: 50000,
    tenure: '5 – 15 years',
    eligibility: [
      'Water Resource Users Associations and County Water Boards',
      'Registered community-based organisations and NGOs',
      'Demonstrated community governance structure',
      'County co-financing accepted',
    ],
    climateImpact: {
      co2PerKsh: 0.01,
      jobsPerKsh: 0.00015,
      metric: 'people with reliable water access',
      metricPerKsh: 0.0005,
    },
    category: 'Water',
  },
  {
    id: 'climate-resilient-housing',
    title: 'Climate Resilient Housing Loan',
    icon: Home,
    image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80',
    description: 'Build or retrofit homes with flood-resistant foundations, cool roofing, and rainwater harvesting integration.',
    rate: '9.0% – 12.0%',
    maxFinancing: 15000000,
    minFinancing: 100000,
    tenure: '10 – 25 years',
    eligibility: [
      'Verified land ownership or title documentation',
      'Construction must meet EcoGuard Green Building Standards',
      'Located within county-approved development zones',
      'Group housing schemes eligible',
    ],
    climateImpact: {
      co2PerKsh: 0.02,
      jobsPerKsh: 0.0003,
      metric: 'litres of water saved annually',
      metricPerKsh: 0.5,
    },
    category: 'Housing',
  },
  {
    id: 'waste-to-energy',
    title: 'Waste-to-Energy Loan',
    icon: Recycle,
    image: 'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=800&q=80',
    description: 'Finance biogas digesters, composting facilities, and plastic-to-fuel conversion plants for businesses and cooperatives.',
    rate: '8.2% – 11.0%',
    maxFinancing: 50000000,
    minFinancing: 200000,
    tenure: '7 – 20 years',
    eligibility: [
      'Approved Environmental Impact Assessment (EIA)',
      'Registered business, cooperative, or municipal entity',
      'Offtake agreement or verified revenue projections',
      'Collateral required: land, equipment, or receivables',
    ],
    climateImpact: {
      co2PerKsh: 0.09,
      jobsPerKsh: 0.00025,
      metric: 'tonnes of waste diverted annually',
      metricPerKsh: 0.00008,
    },
    category: 'Waste',
  },
];

export const categoryStyles = {
  Energy: { bg: 'bg-accent-50', text: 'text-accent-700', border: 'border-accent-200' },
  Transport: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Agriculture: { bg: 'bg-secondary-50', text: 'text-secondary-700', border: 'border-secondary-200' },
  Water: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  Housing: { bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-200' },
  Waste: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

export function calculateImpact(loanId, amount) {
  const loan = loanProducts.find(l => l.id === loanId);
  if (!loan || !amount) return { co2: 0, jobs: 0, metric: 0, metricLabel: '' };
  const n = parseFloat(amount);
  return {
    co2: Math.round(loan.climateImpact.co2PerKsh * n),
    jobs: Math.round(loan.climateImpact.jobsPerKsh * n * 10) / 10,
    metric: Math.round(loan.climateImpact.metricPerKsh * n),
    metricLabel: loan.climateImpact.metric,
  };
}
