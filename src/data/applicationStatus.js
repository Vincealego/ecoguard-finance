// Shared application status workflow — single source of truth for the
// applicant-facing dashboard, the admin application table, and Firestore writes.

export const APPLICATION_STATUSES = [
  'submitted',
  'under_review',
  'credit_assessment',
  'climate_assessment',
  'approved',
  'funded',
  'rejected',
];

export const STATUS_META = {
  submitted: {
    label: 'Submitted',
    description: 'Your application has been received and queued for review.',
    tone: 'slate',
  },
  under_review: {
    label: 'Under Review',
    description: 'A loan officer is reviewing your application details.',
    tone: 'blue',
  },
  credit_assessment: {
    label: 'Credit Assessment',
    description: 'Your creditworthiness and repayment capacity are being assessed.',
    tone: 'indigo',
  },
  climate_assessment: {
    label: 'Climate Assessment',
    description: 'Your project is being evaluated for climate impact and resilience criteria.',
    tone: 'teal',
  },
  approved: {
    label: 'Approved',
    description: 'Your application has been approved and is being prepared for disbursement.',
    tone: 'primary',
  },
  funded: {
    label: 'Funded',
    description: 'Financing has been disbursed. Your repayment schedule is now active.',
    tone: 'green',
  },
  rejected: {
    label: 'Rejected',
    description: 'Your application was not approved at this time.',
    tone: 'red',
  },
};

// Ordered index used to render the visual progress timeline; "rejected"
// is treated as a terminal branch rather than a step on the main line.
export const TIMELINE_STEPS = APPLICATION_STATUSES.filter(s => s !== 'rejected');

export function statusIndex(status) {
  return TIMELINE_STEPS.indexOf(status);
}
