import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mattersApi } from '../api/client';
import { useReference } from '../lib/reference';
import { Icon } from '../components/Icon';

interface Matter {
  id: string;
  matterNumber: string;
  title: string;
  currentStage: string;
  jurisdiction: string;
  client?: { name: string };
  leadAttorney?: { name: string };
  daysRemaining?: number | null;
  urgency?: { key: string; label: string };
  nearestDeadline?: { title: string; statutoryDueDate: string } | null;
}


function initials(name?: string) {
  if (!name) return '--';
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function dueLabel(days?: number | null) {
  if (days == null) return 'Cleared';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  return `${days}d left`;
}

function MatterCard({
  m,
  index,
  dragging,
  onDragStart,
  onDragEnd,
  onKeyMove,

  stageLabel,

  jurisdictionLabel,
}: {
  m: Matter;
  index: number;
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onKeyMove: (dir: -1 | 1) => void;

  stageLabel: (id: string) => string;

  jurisdictionLabel: (code: string) => string;
}) {
  const urgencyKey = m.urgency?.key || 'COMPLETED';
  return (
    <article
      className={`tc-kanban-card tc-rise u-${urgencyKey} ${dragging ? 'is-dragging' : ''}`}
      style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
      draggable
      onDragStart={(e) => onDragStart(e)}
      onDragEnd={onDragEnd}
      tabIndex={0}
      role="button"
      aria-roledescription="Draggable matter card"
      aria-label={`${m.matterNumber}, stage ${stageLabel(m.currentStage)}. Use Ctrl with arrow keys to move stage.`}
      onKeyDown={(e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); onKeyMove(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); onKeyMove(-1); }
      }}
    >
      <div className="flex items-center gap-2">
        <Icon name="drag_indicator" size={15} className="tc-kanban-grip" />
        <span className="tc-kanban-ref">{m.matterNumber}</span>
        <span className="ml-auto text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
          {jurisdictionLabel(m.jurisdiction)}
        </span>
      </div>

      <h3 className="text-[13px] font-semibold leading-snug mt-1.5 line-clamp-2 text-ink">{m.title}</h3>

      {m.client?.name && <p className="text-[11px] text-ink-muted mt-1 truncate">{m.client.name}</p>}

      {m.nearestDeadline && (
        <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-ink-muted">
          <Icon name="flag" size={14} className="mt-px shrink-0" />
          <span className="line-clamp-2 leading-snug">{m.nearestDeadline.title}</span>
        </div>
      )}

      <div className="mt-3 pt-2.5 border-t border-rule flex items-center gap-2">
        <span className={`u-chip u-${urgencyKey}`}>
          <span className="u-dot" />
          {dueLabel(m.daysRemaining)}
        </span>
        {m.nearestDeadline && (
          <span className="font-mono text-[10px] text-ink-muted">{m.nearestDeadline.statutoryDueDate}</span>
        )}
        <span className="tc-avatar ml-auto" title={m.leadAttorney?.name}>{initials(m.leadAttorney?.name)}</span>
      </div>
    </article>
  );
}

export default function KanbanPage() {
  const qc = useQueryClient();
  const { stageIds: STAGE_IDS, stageLabel, jurisdictionLabel } = useReference();
  const [hideEmpty, setHideEmpty] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);

  const { data: matters = [], isLoading } = useQuery<Matter[]>({
    queryKey: ['matters-kanban'],
    queryFn: () => mattersApi.list({ jurisdiction: 'ALL', attorney: 'ALL', urgency: 'ALL' }).then((r) => r.data.data),
  });

  /**
   * Forward moves go through advance-stage so the rules engine docket the new
   * stage's statutory deadlines. Backward moves are corrections of a
   * mis-docketed stage, so they only patch the stage - generating deadlines
   * again would duplicate them.
   */
  const moveStage = useMutation({
    mutationFn: async ({ id, to, forward }: { id: string; to: string; forward: boolean }) => {
      if (forward) await mattersApi.advanceStage(id, to);
      else await mattersApi.setStage(id, to);
    },
    onMutate: async ({ id, to }) => {
      await qc.cancelQueries({ queryKey: ['matters-kanban'] });
      const prev = qc.getQueryData<Matter[]>(['matters-kanban']);
      qc.setQueryData<Matter[]>(['matters-kanban'], (old) =>
        (old || []).map((m) => (m.id === id ? { ...m, currentStage: to } : m))
      );
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['matters-kanban'], ctx.prev);
      setToast({ text: 'Could not move that matter. Nothing was changed.', tone: 'err' });
    },
    onSuccess: (_d, { to, forward }) => {
      setToast({
        text: forward
          ? `Moved to ${stageLabel(to)} - statutory deadlines docketed.`
          : `Stage corrected to ${stageLabel(to)}.`,
        tone: 'ok',
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['matters-kanban'] });
      qc.invalidateQueries({ queryKey: ['matters'] });
      qc.invalidateQueries({ queryKey: ['radar'] });
      window.setTimeout(() => setToast(null), 4000);
    },
  });

  const columns = useMemo(
    () =>
      STAGE_IDS.map((stage) => {
        const cards = matters.filter((m) => m.currentStage === stage);
        const atRisk = cards.filter((m) => (m.daysRemaining ?? 999) <= 15).length;
        return { stage, cards, atRisk };
      }),
    [matters]
  );

  const visible = hideEmpty ? columns.filter((c) => c.cards.length > 0) : columns;

  const drop = (id: string, to: string) => {
    const matter = matters.find((m) => m.id === id);
    if (!matter || matter.currentStage === to) return;
    const forward = STAGE_IDS.indexOf(to) >
      STAGE_IDS.indexOf(matter.currentStage);
    moveStage.mutate({ id, to, forward });
  };

  const keyMove = (m: Matter, dir: -1 | 1) => {
    const i = STAGE_IDS.indexOf(m.currentStage);
    const next = STAGE_IDS[i + dir];
    if (next) drop(m.id, next);
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
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-deep">Prosecution pipeline</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            {matters.length} active matters &middot; drag a card to change stage, or focus one and press Ctrl + arrow keys
          </p>
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs font-medium text-ink-muted cursor-pointer">
          <input
            type="checkbox"
            className="toggle toggle-xs"
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.target.checked)}
          />
          Hide empty stages
        </label>
      </div>

      {toast && (
        <div className={`tc-toast ${toast.tone === 'err' ? 'is-error' : ''}`} role="status">
          <Icon name={toast.tone === 'err' ? 'error' : 'check_circle'} size={18} filled />
          {toast.text}
        </div>
      )}

      <div className="tc-kanban">
        {visible.map(({ stage, cards, atRisk }) => (
          <section
            key={stage}
            className={`tc-kanban-col ${dragOver === stage ? 'is-dropping' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver((s) => (s === stage ? null : s));
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData('text/plain') || dragId;
              if (id) drop(id, stage);
              setDragId(null);
            }}
          >
            <header className="tc-kanban-head">
              <div className="tc-kanban-title">
                <Icon name="label" size={16} filled className="text-sage" />
                <span className="truncate">{stageLabel(stage)}</span>
                <span className="tc-kanban-count">{cards.length}</span>
              </div>
              <div className="tc-kanban-meter" aria-hidden>
                <span style={{ width: cards.length ? `${(atRisk / cards.length) * 100}%` : '0%' }} />
              </div>
              <p className="text-[10px] text-ink-muted mt-1.5">
                {atRisk ? `${atRisk} within 15 days` : 'No near-term exposure'}
              </p>
            </header>

            <div className="tc-kanban-body">
              {cards.map((m, i) => (
                <MatterCard
                  key={m.id}
                  stageLabel={stageLabel}
                  jurisdictionLabel={jurisdictionLabel}
                  m={m}
                  index={i}
                  dragging={dragId === m.id}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', m.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDragId(m.id);
                  }}
                  onDragEnd={() => { setDragId(null); setDragOver(null); }}
                  onKeyMove={(dir) => keyMove(m, dir)}
                />
              ))}
              {cards.length === 0 && (
                <div className="tc-kanban-empty">
                  <Icon name="inbox" size={18} className="text-ink-muted" />
                  <div className="mt-1">{dragOver === stage ? 'Drop to move here' : 'No matters'}</div>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
