import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mattersApi } from '../api/client';
import { stageLabel } from '../lib/stages';
import { useAddMatter } from '../context/AddMatterContext';
import { Icon } from '../components/Icon';

const URGENCY_GROUPS = [
  { key: 'OVERDUE', label: 'Overdue / Lapsed' },
  { key: 'DAILY_CRITICAL', label: 'Daily Critical (T-4 to T-0)' },
  { key: 'T_5_CRITICAL', label: '5-Day Red Critical' },
  { key: 'T_15_URGENT', label: '15-Day Orange Warning' },
  { key: 'T_30_ADVISORY', label: '30-Day Amber Advisory' },
  { key: 'SAFE_UPCOMING', label: 'Safe / Upcoming' },
];

function urgencyBadgeClass(key: string) {
  const map: Record<string, string> = {
    OVERDUE: 'tc-badge-critical badge',
    DAILY_CRITICAL: 'tc-badge-critical badge',
    T_5_CRITICAL: 'tc-badge-critical badge',
    T_15_URGENT: 'tc-badge-urgent badge',
    T_30_ADVISORY: 'badge tc-badge-quiet',
    SAFE_UPCOMING: 'tc-badge-safe badge',
  };
  return map[key] || 'tc-badge-safe badge';
}

export default function BoardPage() {
  const { openAddMatter } = useAddMatter();
  const [search, setSearch] = useState('');
  const [urgency, setUrgency] = useState('ALL');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const { data: matters = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['matters', search, urgency],
    queryFn: () => mattersApi.list({ search, urgency, jurisdiction: 'ALL', attorney: 'ALL' }).then((r) => r.data.data),
  });

  const grouped = URGENCY_GROUPS.map((g) => ({
    ...g,
    matters: matters.filter((m: { urgency?: { key: string } }) => m.urgency?.key === g.key),
  })).filter((g) => g.matters.length > 0 || g.key === 'DAILY_CRITICAL' || g.key === 'T_5_CRITICAL');

  const handleExport = async () => {
    const res = await mattersApi.exportCsv();
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lexpatent-docket-export.csv';
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-sage" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="tc-card p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          <input
            placeholder="Search matters…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-bordered tc-input flex-1 min-w-0 sm:max-w-xs"
          />
          <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="select select-bordered tc-input w-full sm:max-w-xs">
            <option value="ALL">All urgency levels</option>
            {URGENCY_GROUPS.map((g) => (
              <option key={g.key} value={g.key}>{g.label}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="tc-icon-btn shrink-0"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Refresh matters"
              title="Refresh matters"
            >
              <Icon name="refresh" size={18} className={isFetching ? 'tc-spin' : ''} />
            </button>
            <button type="button" className="btn btn-sm tc-btn-quiet tc-btn gap-1.5 flex-1 sm:flex-none" onClick={handleExport}>
              <Icon name="download" size={17} />
              Export CSV
            </button>
            <button type="button" className="btn btn-sm tc-btn-primary tc-btn gap-1.5 sm:hidden flex-1" onClick={() => openAddMatter('MANUAL')}>
              <Icon name="add" size={17} />
              Add matter
            </button>
          </div>
        </div>
      </div>

      {grouped.map((group) => (
        <div key={group.key} className="tc-card overflow-hidden p-0">
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 bg-paper-soft border-b border-rule font-bold uppercase text-xs sm:text-sm text-left text-ink hover:bg-sage-soft"
            onClick={() => setCollapsed({ ...collapsed, [group.key]: !collapsed[group.key] })}
          >
            <Icon name={collapsed[group.key] ? "chevron_right" : "expand_more"} size={18} className="shrink-0" />
            <span className="flex-1 truncate">{group.label}</span>
            <span className="badge bg-neutral text-neutral-content border border-rule shrink-0">{group.matters.length}</span>
          </button>
          {!collapsed[group.key] && (
            <div className="tc-table-wrap">
              <table className="table table-zebra tc-surface">
                <thead>
                  <tr className="border-b border-rule text-ink">
                    <th className="font-bold uppercase text-xs">Matter</th>
                    <th className="font-bold uppercase text-xs">Client</th>
                    <th className="font-bold uppercase text-xs hidden sm:table-cell">Jurisdiction</th>
                    <th className="font-bold uppercase text-xs hidden md:table-cell">Stage</th>
                    <th className="font-bold uppercase text-xs hidden lg:table-cell">Nearest deadline</th>
                    <th className="font-bold uppercase text-xs">Due</th>
                    <th className="font-bold uppercase text-xs">Days</th>
                    <th className="font-bold uppercase text-xs hidden sm:table-cell">Urgency</th>
                    <th className="font-bold uppercase text-xs hidden lg:table-cell">Attorney</th>
                  </tr>
                </thead>
                <tbody>
                  {group.matters.map((m: {
                    id: string; matterNumber: string; title: string; jurisdiction: string;
                    currentStage: string; client?: { name: string }; nearestDeadline?: { title: string; statutoryDueDate: string };
                    daysRemaining?: number; urgency?: { key: string; label: string };
                    leadAttorney?: { name: string };
                  }) => (
                    <tr key={m.id} className="border-b border-rule text-ink">
                      <td>
                        <div className="font-bold text-sm">{m.matterNumber}</div>
                        <div className="text-xs opacity-70 line-clamp-2">{m.title.substring(0, 60)}…</div>
                      </td>
                      <td className="text-sm">{m.client?.name || '—'}</td>
                      <td className="hidden sm:table-cell"><span className="badge badge-outline border-rule font-semibold text-xs">{m.jurisdiction}</span></td>
                      <td className="hidden md:table-cell"><span className="tc-stage">{stageLabel(m.currentStage)}</span></td>
                      <td className="text-sm hidden lg:table-cell">{m.nearestDeadline?.title || 'Cleared'}</td>
                      <td className="font-mono text-xs sm:text-sm">{m.nearestDeadline?.statutoryDueDate || '—'}</td>
                      <td className="font-bold">{m.daysRemaining ?? '—'}</td>
                      <td className="hidden sm:table-cell"><span className={`${urgencyBadgeClass(m.urgency?.key || '')} text-xs`}>{m.urgency?.label || 'Safe'}</span></td>
                      <td className="text-sm hidden lg:table-cell">{m.leadAttorney?.name || '—'}</td>
                    </tr>
                  ))}
                  {group.matters.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-8 opacity-50 font-semibold">No matters in this group</td>
                    </tr>
                  )}
                  <tr className="tc-add-row" onClick={() => openAddMatter('OCR')}>
                    <td colSpan={9} className="text-center py-3 font-bold uppercase text-sm">
                      <Icon name="add_circle" size={18} className="mr-2 align-text-bottom" />
                      Drop Patent Receipt / Add Matter to this group
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
