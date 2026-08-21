import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/client';
import { Icon } from '../components/Icon';

interface Delivery {
  channel: 'email' | 'whatsapp';
  target: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  detail?: string;
}

/** Per-channel counts, so "DELIVERED" is backed by something visible. */
function DeliverySummary({ deliveries }: { deliveries?: Delivery[] }) {
  if (!deliveries?.length) {
    return (
      <span className="u-chip u-COMPLETED">
        <Icon name="schedule" size={13} />
        Not dispatched
      </span>
    );
  }
  const count = (channel: Delivery['channel'], status: Delivery['status']) =>
    deliveries.filter((d) => d.channel === channel && d.status === status).length;

  const chips: Array<{ key: string; icon: string; label: string; tone: string }> = [];
  for (const channel of ['email', 'whatsapp'] as const) {
    const icon = channel === 'email' ? 'mail' : 'chat';
    const sent = count(channel, 'SENT');
    const failed = count(channel, 'FAILED');
    const skipped = count(channel, 'SKIPPED');
    if (sent) chips.push({ key: channel + 's', icon, label: sent + ' sent', tone: 'u-SAFE_UPCOMING' });
    if (failed) chips.push({ key: channel + 'f', icon, label: failed + ' failed', tone: 'u-OVERDUE' });
    if (skipped) chips.push({ key: channel + 'k', icon, label: skipped + ' not configured', tone: 'u-COMPLETED' });
  }
  return (
    <>
      {chips.map((c) => (
        <span key={c.key} className={'u-chip ' + c.tone}>
          <Icon name={c.icon} size={13} />
          {c.label}
        </span>
      ))}
    </>
  );
}

export default function AutomationsPage() {
  const qc = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data.data),
  });

  const { data: channels } = useQuery({
    queryKey: ['notification-channels'],
    queryFn: () => notificationsApi.channels().then((r) => r.data.data),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.resend(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
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
            <p className="text-sm opacity-70 mt-1">{channels?.schedule ? `${channels.schedule.label} — alerts at T-${channels.schedule.firesOnDays.join(', T-')}, plus every day once overdue` : 'Tiered zero-fail alerts'}</p>
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

      <div className="flex flex-wrap items-center gap-2">
        <span className={`u-chip ${channels?.email?.configured ? 'u-SAFE_UPCOMING' : 'u-T_15_URGENT'}`}>
          <Icon name="mail" size={14} />
          Email {channels?.email?.configured ? (channels.email.reachable ? 'connected' : 'configured, unreachable') : 'not configured'}
        </span>
        <span className={`u-chip ${channels?.whatsapp?.configured ? 'u-SAFE_UPCOMING' : 'u-T_15_URGENT'}`}>
          <Icon name="chat" size={14} />
          WhatsApp {channels?.whatsapp?.configured ? `connected (${channels.whatsapp.optedInContacts ?? 0} opted in)` : 'not configured'}
        </span>
        {channels?.unreachableOnWhatsApp > 0 && (
          <span className="u-chip u-T_15_URGENT">
            <Icon name="phonelink_erase" size={14} />
            {channels.unreachableOnWhatsApp} recipients unreachable on WhatsApp
          </span>
        )}
        {(!channels?.email?.configured || !channels?.whatsapp?.configured) && (
          <span className="text-[11px] text-ink-muted">
            Alerts are recorded but not delivered until the missing channel is configured.
          </span>
        )}
      </div>

      {scanMutation.isSuccess && (
        <div role="alert" className="alert alert-success border border-rule tc-card !py-3 text-ink">
          <Icon name="check_circle" size={18} filled />
          <span className="font-semibold">
            Cron completed: {(scanMutation.data?.data?.data?.notificationsGenerated ?? 0)} alerts generated,{' '}
            {(scanMutation.data?.data?.data?.delivered ?? 0)} delivered
          </span>
        </div>
      )}

      <div className="space-y-3">
        {notifications.map((n: {
          id: string; tierLabel: string; subject: string; status: string;
          daysRemaining?: number; sentAt?: string; isEmergency: boolean;
          deliveries?: Delivery[];
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
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <DeliverySummary deliveries={n.deliveries} />
                {n.daysRemaining != null && (
                  <span className="text-xs font-semibold text-ink-muted">{n.daysRemaining}d remaining</span>
                )}
                {n.sentAt && (
                  <span className="text-xs text-ink-muted">Sent {new Date(n.sentAt).toLocaleString()}</span>
                )}
                <button
                  type="button"
                  className="btn btn-xs tc-btn-quiet tc-btn gap-1 ml-auto"
                  onClick={() => resendMutation.mutate(n.id)}
                  disabled={resendMutation.isPending}
                >
                  <Icon name="send" size={14} />
                  Resend
                </button>
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
