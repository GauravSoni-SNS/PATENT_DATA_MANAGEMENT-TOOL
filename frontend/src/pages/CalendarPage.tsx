import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mattersApi } from '../api/client';
import { stageLabel } from '../lib/stages';
import { Icon } from '../components/Icon';

interface Deadline {
  id: string;
  title: string;
  statutoryDueDate: string;
  extendedDueDate?: string | null;
  status: string;
  urgencyTier?: string | null;
  isStatutoryBar: boolean;
  isExtendable: boolean;
  statutorySection?: string | null;
}

interface Matter {
  id: string;
  matterNumber: string;
  title: string;
  currentStage: string;
  jurisdiction: string;
  client?: { name: string };
  leadAttorney?: { name: string };
  deadlines: Deadline[];
}

interface CalEvent extends Deadline {
  matterNumber: string;
  matterTitle: string;
  clientName?: string;
  attorney?: string;
  stage: string;
  urgency: string;
  daysRemaining: number;
}

const DOW_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DOW_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DOW_MIN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const LEGEND = [
  { key: 'OVERDUE', label: 'Overdue' },
  { key: 'DAILY_CRITICAL', label: 'Due in 4 days or less' },
  { key: 'T_5_CRITICAL', label: 'Due within 5 days' },
  { key: 'T_15_URGENT', label: 'Due within 15 days' },
  { key: 'T_30_ADVISORY', label: 'Due within 30 days' },
  { key: 'SAFE_UPCOMING', label: 'Safe' },
];

/** Local-date key (YYYY-MM-DD) - never use toISOString here, it shifts by timezone. */
function key(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseKey(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function urgencyFor(days: number) {
  if (days < 0) return 'OVERDUE';
  if (days <= 4) return 'DAILY_CRITICAL';
  if (days <= 5) return 'T_5_CRITICAL';
  if (days <= 15) return 'T_15_URGENT';
  if (days <= 30) return 'T_30_ADVISORY';
  return 'SAFE_UPCOMING';
}

function longDate(k: string) {
  return parseKey(k).toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

/** Month + year picker popover. */
function MonthPicker({
  view,
  onPick,
}: {
  view: { y: number; m: number };
  onPick: (y: number, m: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(view.y);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setYear(view.y), [view.y, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="tc-month-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="font-bold text-ink-deep">{MONTHS[view.m]}</span>
        <span className="text-ink-muted font-medium">{view.y}</span>
        <Icon name="expand_more" size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="tc-month-pop" role="dialog" aria-label="Pick month and year">
          <div className="flex items-center justify-between mb-2.5">
            <button type="button" className="tc-icon-btn !w-8 !h-8" onClick={() => setYear((y) => y - 1)} aria-label="Previous year">
              <Icon name="chevron_left" size={16} />
            </button>
            <span className="font-mono text-sm font-semibold text-ink-deep">{year}</span>
            <button type="button" className="tc-icon-btn !w-8 !h-8" onClick={() => setYear((y) => y + 1)} aria-label="Next year">
              <Icon name="chevron_right" size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS_SHORT.map((label, i) => {
              const active = year === view.y && i === view.m;
              return (
                <button
                  key={label}
                  type="button"
                  className={`tc-month-cell ${active ? 'is-active' : ''}`}
                  onClick={() => { onPick(year, i); setOpen(false); }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const { data: matters = [], isLoading } = useQuery<Matter[]>({
    queryKey: ['matters-calendar'],
    queryFn: () => mattersApi.list({ jurisdiction: 'ALL', attorney: 'ALL', urgency: 'ALL' }).then((r) => r.data.data),
  });

  const { data: simulatedDate } = useQuery({
    queryKey: ['simulated-date'],
    queryFn: () => mattersApi.getSimulatedDate().then((r) => r.data.data.simulatedDate as string),
  });

  const today = simulatedDate ? parseKey(simulatedDate) : new Date();
  const [cursor, setCursor] = useState<{ y: number; m: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const view = cursor ?? { y: today.getFullYear(), m: today.getMonth() };

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const m of matters) {
      for (const d of m.deadlines || []) {
        if (d.status === 'CLEARED') continue;
        const due = d.extendedDueDate || d.statutoryDueDate;
        const days = daysBetween(today, parseKey(due));
        const ev: CalEvent = {
          ...d,
          matterNumber: m.matterNumber,
          matterTitle: m.title,
          clientName: m.client?.name,
          attorney: m.leadAttorney?.name,
          stage: m.currentStage,
          daysRemaining: days,
          urgency: urgencyFor(days),
        };
        const list = map.get(due) || [];
        list.push(ev);
        map.set(due, list);
      }
    }
    for (const list of map.values()) list.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return map;
  }, [matters, simulatedDate]);

  /** 6-week grid starting Monday */
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const offset = (first.getDay() + 6) % 7; // Mon = 0
    const start = new Date(view.y, view.m, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { date, k: key(date), outside: date.getMonth() !== view.m };
    });
  }, [view.y, view.m]);

  const monthEvents = useMemo(
    () => cells.filter((c) => !c.outside).flatMap((c) => eventsByDay.get(c.k) || []),
    [cells, eventsByDay]
  );

  const monthBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of monthEvents) counts[e.urgency] = (counts[e.urgency] || 0) + 1;
    return counts;
  }, [monthEvents]);

  const selectedEvents = selected ? eventsByDay.get(selected) || [] : [];
  const upcoming = useMemo(
    () => [...eventsByDay.values()].flat().filter((e) => e.daysRemaining >= 0).sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 5),
    [eventsByDay]
  );

  /** Functional update: rapid clicks must not read a stale cursor and lose steps. */
  const move = (delta: number) => {
    setCursor((prev) => {
      const base = prev ?? { y: today.getFullYear(), m: today.getMonth() };
      const d = new Date(base.y, base.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
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
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button type="button" className="tc-icon-btn" onClick={() => move(-1)} aria-label="Previous month">
          <Icon name="chevron_left" size={20} />
        </button>
        <button type="button" className="tc-icon-btn" onClick={() => move(1)} aria-label="Next month">
          <Icon name="chevron_right" size={20} />
        </button>

        <MonthPicker view={view} onPick={(y, m) => setCursor({ y, m })} />

        <button
          type="button"
          className="btn btn-sm tc-btn-quiet tc-btn gap-1.5"
          onClick={() => { setCursor(null); setSelected(key(today)); }}
        >
          <Icon name="today" size={16} />
          Today
        </button>

        <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2 text-xs text-ink-muted">
          <Icon name="event_note" size={16} />
          <span>
            <strong className="text-ink-deep">{monthEvents.length}</strong> deadline{monthEvents.length === 1 ? '' : 's'} in {MONTHS[view.m]}
          </span>
          {simulatedDate && (
            <span className="hidden sm:inline">
              &middot; today <span className="font-mono">{simulatedDate}</span>
            </span>
          )}
        </div>
      </div>

      {/* Indicator legend - counts for the month in view */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {LEGEND.map((l) => (
          <span key={l.key} className={`u-chip u-${l.key} ${monthBreakdown[l.key] ? '' : 'opacity-45'}`}>
            <span className="u-dot" />
            {l.label}
            <strong className="font-mono">{monthBreakdown[l.key] || 0}</strong>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px] gap-4">
        {/* Month grid */}
        <div className="tc-cal-grid">
          {DOW_FULL.map((full, i) => (
            <div key={full} className="tc-cal-dow">
              <span className="hidden lg:inline">{full}</span>
              <span className="hidden sm:inline lg:hidden">{DOW_SHORT[i]}</span>
              <span className="sm:hidden">{DOW_MIN[i]}</span>
            </div>
          ))}

          {cells.map(({ date, k, outside }) => {
            const events = eventsByDay.get(k) || [];
            const isToday = k === key(today);
            const shown = events.slice(0, 2);
            const worst = events[0]?.urgency;
            return (
              <button
                type="button"
                key={k}
                onClick={() => setSelected(k)}
                aria-label={`${longDate(k)}, ${events.length} deadline${events.length === 1 ? '' : 's'}`}
                aria-pressed={selected === k}
                className={`tc-cal-day ${outside ? 'is-outside' : ''} ${isToday ? 'is-today' : ''} ${selected === k ? 'is-selected' : ''}`}
              >
                <span className="tc-cal-daytop">
                  <span className="tc-cal-num">{date.getDate()}</span>
                  {isToday && <span className="tc-cal-todaytag">Today</span>}
                  {events.length > 0 && (
                    <span className={`tc-cal-count u-${worst}`}>
                      <span className="u-dot" />
                      {events.length}
                    </span>
                  )}
                </span>

                {shown.map((e) => (
                  <span key={e.id} className={`tc-cal-event u-${e.urgency}`} title={`${e.matterNumber} - ${e.title}`}>
                    <span>{e.matterNumber}</span>
                  </span>
                ))}
                {events.length > shown.length && (
                  <span className="tc-cal-more">+{events.length - shown.length} more</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Detail rail */}
        <aside className="tc-card p-4 space-y-3 self-start">
          {selected ? (
            <>
              <div className="flex items-center gap-2">
                <Icon name="event" size={18} className="text-sage" filled />
                <h3 className="text-sm font-bold text-ink-deep leading-tight">{longDate(selected)}</h3>
                <button
                  type="button"
                  className="tc-icon-btn !w-7 !h-7 ml-auto shrink-0"
                  onClick={() => setSelected(null)}
                  aria-label="Clear selection"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>

              {selectedEvents.length === 0 && (
                <p className="text-xs text-ink-muted py-6 text-center">No deadlines on this date.</p>
              )}

              {selectedEvents.map((e) => (
                <article key={e.id} className={`u-${e.urgency} border border-rule rounded-2xl p-3 space-y-2`}>
                  <div className="flex items-center gap-2">
                    <span className="tc-kanban-ref">{e.matterNumber}</span>
                    <span className={`u-chip u-${e.urgency} ml-auto`}>
                      <span className="u-dot" />
                      {e.daysRemaining < 0 ? `${Math.abs(e.daysRemaining)} days overdue` : `${e.daysRemaining} days left`}
                    </span>
                  </div>
                  <h4 className="text-[13px] font-semibold leading-snug text-ink">{e.title}</h4>
                  <p className="text-[11px] text-ink-muted leading-snug">{e.matterTitle}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="tc-stage">{stageLabel(e.stage)}</span>
                    {e.isStatutoryBar && (
                      <span className="u-chip u-OVERDUE">
                        <Icon name="gpp_maybe" size={13} />
                        Statutory bar
                      </span>
                    )}
                    {e.isExtendable && (
                      <span className="u-chip u-SAFE_UPCOMING">
                        <Icon name="more_time" size={13} />
                        Extendable
                      </span>
                    )}
                  </div>
                  {e.statutorySection && (
                    <p className="text-[10px] font-mono text-ink-muted pt-0.5">{e.statutorySection}</p>
                  )}
                </article>
              ))}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Icon name="upcoming" size={18} className="text-sage" filled />
                <h3 className="text-sm font-bold text-ink-deep">Next up</h3>
              </div>
              {upcoming.length === 0 && <p className="text-xs text-ink-muted py-6 text-center">Nothing pending.</p>}
              {upcoming.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    const due = e.extendedDueDate || e.statutoryDueDate;
                    const d = parseKey(due);
                    setCursor({ y: d.getFullYear(), m: d.getMonth() });
                    setSelected(due);
                  }}
                  className={`u-${e.urgency} w-full text-left border border-rule rounded-2xl p-3 hover:bg-sage-soft transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <span className="u-dot" />
                    <span className="tc-kanban-ref">{e.matterNumber}</span>
                    <span className="ml-auto font-mono text-[10px] text-ink-muted">
                      {e.extendedDueDate || e.statutoryDueDate}
                    </span>
                  </div>
                  <p className="text-[12px] font-semibold leading-snug mt-1.5 line-clamp-2 text-ink">{e.title}</p>
                  <p className="text-[11px] text-ink-muted mt-1">
                    {parseKey(e.extendedDueDate || e.statutoryDueDate).toLocaleDateString(undefined, { weekday: 'long' })}
                    {' '}&middot; {e.daysRemaining} days remaining
                  </p>
                </button>
              ))}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
