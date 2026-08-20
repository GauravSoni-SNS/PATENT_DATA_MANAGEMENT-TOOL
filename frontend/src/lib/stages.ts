/** Human-readable labels for prosecution stages (API returns SCREAMING_SNAKE ids). */
export const STAGE_IDS = [
  'INTAKE', 'PROVISIONAL', 'COMPLETE', 'PUBLICATION_RFE',
  'EXAMINATION_FER', 'HEARING', 'ALLOWANCE_GRANT', 'ANNUITY_MAINTENANCE',
] as const;

const STAGE_LABELS: Record<string, string> = {
  INTAKE: 'Intake',
  PROVISIONAL: 'Provisional',
  COMPLETE: 'Complete',
  PUBLICATION_RFE: 'Publication & RFE',
  EXAMINATION_FER: 'Examination / FER',
  HEARING: 'Hearing',
  ALLOWANCE_GRANT: 'Allowance & Grant',
  ANNUITY_MAINTENANCE: 'Annuity & Maintenance',
};

export function stageLabel(id: string): string {
  return STAGE_LABELS[id] || id.replace(/_/g, ' ');
}
