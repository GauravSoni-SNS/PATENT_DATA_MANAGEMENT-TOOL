import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { STAGE_IDS, stageLabel as fallbackStageLabel } from './stages';

export interface StageRef {
  id: string;
  label: string;
  order: number;
}

export interface JurisdictionRef {
  code: string;
  name: string;
}

/**
 * Stages, jurisdictions and firm identity come from the API rather than being
 * duplicated in the UI: the rules engine already defines them, and a second
 * copy here would drift the moment a stage is added.
 *
 * The compiled-in list is used only until the first response arrives, so the
 * board still renders on a cold load.
 */
export function useReference() {
  const rules = useQuery({
    queryKey: ['reference-rules'],
    queryFn: () => api.get('/rules').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const firm = useQuery({
    queryKey: ['reference-firm'],
    queryFn: () => api.get('/dashboard/firm').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const stageMap = (rules.data?.stages || {}) as Record<string, { id: string; label: string; order: number }>;
  const stages: StageRef[] = Object.values(stageMap).sort((a, b) => a.order - b.order);

  const jurisdictionMap = (rules.data?.jurisdictions || {}) as Record<string, { name: string }>;
  const jurisdictions: JurisdictionRef[] = Object.entries(jurisdictionMap).map(([code, v]) => ({
    code,
    name: v.name,
  }));

  return {
    isLoading: rules.isLoading,
    stages,
    stageIds: stages.length ? stages.map((s) => s.id) : ([...STAGE_IDS] as string[]),
    jurisdictions,
    firm: firm.data as { name?: string; timezone?: string } | undefined,
    stageLabel: (id: string) => stageMap[id]?.label ?? fallbackStageLabel(id),
    jurisdictionLabel: (code: string) => jurisdictionMap[code]?.name ?? code,
  };
}
