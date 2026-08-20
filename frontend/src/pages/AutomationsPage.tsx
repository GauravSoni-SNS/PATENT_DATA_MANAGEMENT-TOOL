import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/client';
import { Icon } from '../components/Icon';

export default function AutomationsPage() {
  const qc = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data.data),
  });

  const scanMutation = useMutation({
    mutationFn: () => notificationsApi.scan(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['radar'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-sage" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="tc-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start gap-4 text-ink">
          <div>
            <h2 className="text-lg sm:text-xl font-bold uppercase">Automations & Email Escalations</h2>
            <p className="text-sm opacity-70 mt-1">Tiered zero-fail alerts: T-30, T-15, T-5, daily countdown</p>
          </div>
          <button
            type="button"
            className="btn tc-btn-primary tc-btn w-full sm:w-auto"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
          >
            {scanMutation.isPending ? <span className="loading loading-spinner loading-sm" /> : null}
            {scanMutation.isPending ? 'Scanning…' : 'Run 08:00 AM Cron Scan'}
          </button>
        </div>
      </div>

      {scanMutation.isSuccess && (
        <div role="alert" className="alert alert-success border border-rule tc-card !py-3 text-ink">
          <Icon name="check_circle" size={18} filled />
          <span className="font-semibold">
            Cron completed: {(scanMutation.data?.data?.data?.notificationsGenerated ?? 0)} alerts generated
          </span>
        </div>
      )}

      <div className="space-y-3">
        {notifications.map((n: {
          id: string; tierLabel: string; subject: string; status: string;
          daysRemaining?: number; sentAt?: string; isEmergency: boolean;
          matter?: { matterNumber: string; title: string };
        }) => (
          <div
            key={n.id}
            className={`tc-card p-0 overflow-hidden border-l-[6px] ${n.isEmergency ? 'border-l-error' : 'border-l-warning'}`}
          >
            <div className="p-4 gap-2 text-ink">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <span className={`badge border border-rule font-bold ${n.isEmergency ? 'tc-badge-critical' : 'tc-badge-urgent'}`}>
                  {n.tierLabel}
                </span>
                <span className="text-xs font-bold opacity-60">{n.status}</span>
              </div>
              <div className="font-bold mt-2">{n.subject}</div>
              {n.matter && (
                <div className="text-sm opacity-70 mt-1 line-clamp-2">
                  {n.matter.matterNumber} — {n.matter.title.substring(0, 60)}…
                </div>
              )}
              <div className="flex flex-wrap gap-4 text-xs font-semibold opacity-60 mt-2">
                {n.daysRemaining != null && <span>{n.daysRemaining}d remaining</span>}
                {n.sentAt && <span>Sent {new Date(n.sentAt).toLocaleString()}</span>}
              </div>
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="tc-card">
            <div className="text-center py-12 opacity-50 font-bold text-ink">No notifications yet — run a cron scan</div>
          </div>
        )}
      </div>
    </div>
  );
}
