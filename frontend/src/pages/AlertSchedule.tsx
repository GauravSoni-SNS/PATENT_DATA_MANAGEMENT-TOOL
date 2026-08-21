import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { Icon } from '../components/Icon';

interface Settings {
  schedule: 'EVE_OF' | 'HALVING' | 'DAILY';
  leadDays: number;
  runAtHour: number;
  runAtMinute: number;
  timezone: string;
  enabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  lastRunAt?: string | null;
  firesOnDays: number[];
  description: string;
}

const OPTIONS: Array<{ id: Settings['schedule']; title: string; detail: string }> = [
  {
    id: 'DAILY',
    title: 'Every day',
    detail: 'One alert each day from the lead time until the date.',
  },
  {
    id: 'HALVING',
    title: 'Halving countdown',
    detail: 'Lead time, then each halving of it: 10, 5, 2, 1, then the day itself.',
  },
  {
    id: 'EVE_OF',
    title: 'Day before and day of',
    detail: 'One alert the day before, one on the day. The quietest option.',
  },
];

/**
 * When alerts are raised and when the scan runs.
 *
 * Both are stored per firm rather than in environment variables, so the team
 * can change the rhythm without a redeploy.
 */
export function AlertSchedule() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<Settings>>({});
  const [flash, setFlash] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);

  const { data, isLoading } = useQuery<Settings>({
    queryKey: ['alert-settings'],
    queryFn: () => api.get('/notifications/settings').then((r) => r.data.data),
  });

  useEffect(() => setDraft({}), [data]);

  const announce = (text: string, tone: 'ok' | 'err') => {
    setFlash({ text, tone });
    window.setTimeout(() => setFlash(null), 4000);
  };

  const save = useMutation({
    mutationFn: (patch: Partial<Settings>) => api.patch('/notifications/settings', patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alert-settings'] });
      qc.invalidateQueries({ queryKey: ['notification-channels'] });
      announce('Schedule saved. The next run uses it.', 'ok');
    },
    onError: (e: { response?: { data?: { error?: { message?: string } } } }) =>
      announce(e?.response?.data?.error?.message || 'Could not save the schedule.', 'err'),
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-sage" />
      </div>
    );
  }

  const current = { ...data, ...draft };
  const dirty = Object.keys(draft).length > 0;
  const time = `${String(current.runAtHour).padStart(2, '0')}:${String(current.runAtMinute).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      {flash && (
        <div className={`tc-toast ${flash.tone === 'err' ? 'is-error' : ''}`} role="status">
          <Icon name={flash.tone === 'err' ? 'error' : 'check_circle'} size={18} filled />
          {flash.text}
        </div>
      )}

      <div className="tc-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="alarm" size={18} className="text-sage" filled />
          <h3 className="font-bold text-sm text-ink-deep">When alerts are raised</h3>
        </div>

        <div className="space-y-2">
          {OPTIONS.map((option) => (
            <label
              key={option.id}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                current.schedule === option.id ? 'border-sage bg-sage-soft' : 'border-rule hover:bg-sage-soft'
              }`}
            >
              <input
                type="radio"
                name="schedule"
                className="radio radio-sm mt-0.5"
                checked={current.schedule === option.id}
                onChange={() => setDraft((d) => ({ ...d, schedule: option.id }))}
              />
              <span>
                <span className="font-semibold text-sm text-ink">{option.title}</span>
                <span className="block text-[11px] text-ink-muted mt-0.5">{option.detail}</span>
              </span>
            </label>
          ))}
        </div>

        {current.schedule !== 'EVE_OF' && (
          <label className="flex items-center gap-3 text-sm text-ink">
            <span className="font-medium">Lead time</span>
            <input
              type="number"
              min={1}
              max={365}
              className="input input-sm tc-input w-24 font-mono"
              value={current.leadDays}
              onChange={(e) => setDraft((d) => ({ ...d, leadDays: Number(e.target.value) }))}
            />
            <span className="text-xs text-ink-muted">days before the deadline</span>
          </label>
        )}

        <p className="text-[12px] text-ink-muted">
          Alerts fire at <span className="font-mono text-ink">T-{(current.firesOnDays || []).join(', T-')}</span>. An
          overdue deadline alerts on every run regardless.
        </p>
      </div>

      <div className="tc-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="schedule" size={18} className="text-sage" filled />
          <h3 className="font-bold text-sm text-ink-deep">When the scan runs</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <span className="font-medium">Daily at</span>
            <input
              type="time"
              className="input input-sm tc-input font-mono w-32"
              value={time}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':').map(Number);
                setDraft((d) => ({ ...d, runAtHour: h, runAtMinute: m }));
              }}
            />
          </label>
          <span className="text-xs text-ink-muted font-mono">{current.timezone}</span>

          <label className="flex items-center gap-2 text-sm text-ink ml-auto cursor-pointer">
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={current.enabled}
              onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
            />
            <span className="font-medium">{current.enabled ? 'Automatic scanning on' : 'Automatic scanning off'}</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={current.emailEnabled}
              onChange={(e) => setDraft((d) => ({ ...d, emailEnabled: e.target.checked }))}
            />
            <Icon name="mail" size={16} />
            Email
          </label>
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={current.whatsappEnabled}
              onChange={(e) => setDraft((d) => ({ ...d, whatsappEnabled: e.target.checked }))}
            />
            <Icon name="chat" size={16} />
            WhatsApp
          </label>
        </div>

        {data.lastRunAt && (
          <p className="text-[11px] text-ink-muted">Last run {new Date(data.lastRunAt).toLocaleString()}</p>
        )}
      </div>

      <div className="tc-panel p-3 text-[12px] text-ink flex items-start gap-2">
        <Icon name="person" size={16} className="text-sage mt-px shrink-0" />
        <span>
          Each alert goes to the person who uploaded the matter, on the email and WhatsApp number held on their profile.
          Clients are never contacted by this tool.
        </span>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-sm tc-btn-quiet tc-btn" disabled={!dirty} onClick={() => setDraft({})}>
          Discard
        </button>
        <button
          type="button"
          className="btn btn-sm tc-btn-primary tc-btn"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate(draft)}
        >
          {save.isPending ? <span className="loading loading-spinner loading-xs" /> : null}
          Save schedule
        </button>
      </div>
    </div>
  );
}
