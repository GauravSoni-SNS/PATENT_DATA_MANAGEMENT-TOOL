import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, notificationsApi } from '../api/client';
import { Icon } from './../components/Icon';
import { AlertSchedule } from './AlertSchedule';

interface Person {
  id: string;
  label: string;
  sublabel: string;
  email?: string | null;
  phone?: string | null;
  kind: 'user' | 'client';
}

/** Digits only, so a stored "+91 90000 00104" matches a gateway's "919000000104". */
function digits(v?: string | null) {
  return (v || '').replace(/[^\d]/g, '');
}

function PhoneRow({
  person,
  reachable,
  onSave,
  saving,
}: {
  person: Person;
  reachable: boolean | null;
  onSave: (phone: string) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(person.phone || '');
  const dirty = digits(value) !== digits(person.phone);

  return (
    <tr className="border-b border-rule">
      <td>
        <div className="font-semibold text-sm text-ink">{person.label}</div>
        <div className="text-[11px] text-ink-muted">{person.sublabel}</div>
      </td>
      <td className="text-xs text-ink-muted hidden md:table-cell">{person.email || '—'}</td>
      <td>
        <input
          type="tel"
          className="input input-sm tc-input w-full max-w-[190px] font-mono text-xs"
          placeholder="+91 90000 00000"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </td>
      <td className="hidden sm:table-cell">
        {!digits(value) ? (
          <span className="u-chip u-COMPLETED">No number</span>
        ) : reachable === null ? (
          <span className="u-chip u-COMPLETED">Unknown</span>
        ) : reachable ? (
          <span className="u-chip u-SAFE_UPCOMING">
            <Icon name="check" size={13} />
            Reachable
          </span>
        ) : (
          <span className="u-chip u-T_15_URGENT">
            <Icon name="phonelink_erase" size={13} />
            Not opted in
          </span>
        )}
      </td>
      <td className="text-right">
        <button
          type="button"
          className="btn btn-xs tc-btn-primary tc-btn"
          disabled={!dirty || saving}
          onClick={() => onSave(value)}
        >
          Save
        </button>
      </td>
    </tr>
  );
}

/**
 * Who receives alerts, and whether each channel can actually reach them.
 *
 * A WhatsApp number is only useful if that person has messaged the business
 * account, so the number and its reachability belong on the same screen.
 */
export function AlertRecipients() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['recipients'],
    queryFn: () => dashboardApi.recipients().then((r) => r.data.data),
  });

  const { data: channels } = useQuery({
    queryKey: ['notification-channels'],
    queryFn: () => notificationsApi.channels().then((r) => r.data.data),
  });

  const announce = (text: string, tone: 'ok' | 'err') => {
    setFlash({ text, tone });
    window.setTimeout(() => setFlash(null), 4000);
  };

  const saveUser = useMutation({
    mutationFn: ({ id, phone }: { id: string; phone: string }) => dashboardApi.setUserPhone(id, phone),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipients'] });
      qc.invalidateQueries({ queryKey: ['notification-channels'] });
      announce('Number saved.', 'ok');
    },
    onError: (e: { response?: { data?: { error?: { message?: string } } } }) =>
      announce(e?.response?.data?.error?.message || 'Could not save that number.', 'err'),
  });

  const saveClient = useMutation({
    mutationFn: ({ id, phone }: { id: string; phone: string }) => dashboardApi.setClientPhone(id, phone),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipients'] });
      qc.invalidateQueries({ queryKey: ['notification-channels'] });
      announce('Number saved.', 'ok');
    },
    onError: (e: { response?: { data?: { error?: { message?: string } } } }) =>
      announce(e?.response?.data?.error?.message || 'Could not save that number.', 'err'),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-sage" />
      </div>
    );
  }

  const reachableSet = new Set<string>(
    (channels?.recipients || [])
      .filter((r: { whatsappReachable?: boolean | null }) => r.whatsappReachable)
      .map((r: { phone?: string | null }) => digits(r.phone))
  );
  const whatsappKnown = channels?.whatsapp?.reachable === true;

  const users: Person[] = (data?.users || []).map((u: { id: string; firstName: string; lastName: string; email: string; phone?: string; role: string }) => ({
    id: u.id,
    label: `${u.firstName} ${u.lastName}`,
    sublabel: u.role.toLowerCase(),
    email: u.email,
    phone: u.phone,
    kind: 'user' as const,
  }));

  const clients: Person[] = (data?.clients || []).map((c: { id: string; name: string; contactPerson?: string; contactEmail?: string; contactPhone?: string }) => ({
    id: c.id,
    label: c.name,
    sublabel: c.contactPerson || 'client contact',
    email: c.contactEmail,
    phone: c.contactPhone,
    kind: 'client' as const,
  }));

  const table = (title: string, people: Person[], onSave: (p: Person, phone: string) => void, saving: boolean) => (
    <div className="tc-card overflow-hidden p-0">
      <div className="px-4 py-3 border-b border-rule flex items-center gap-2">
        <Icon name={title === 'Team' ? 'groups' : 'business'} size={18} className="text-sage" filled />
        <h3 className="font-bold text-sm text-ink-deep">{title}</h3>
        <span className="tc-kanban-count ml-auto">{people.length}</span>
      </div>
      <div className="tc-table-wrap">
        <table className="table">
          <thead>
            <tr className="border-b border-rule">
              <th>Name</th>
              <th className="hidden md:table-cell">Email</th>
              <th>WhatsApp number</th>
              <th className="hidden sm:table-cell">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <PhoneRow
                key={p.id}
                person={p}
                reachable={!whatsappKnown ? null : digits(p.phone) ? reachableSet.has(digits(p.phone)) : null}
                saving={saving}
                onSave={(phone) => onSave(p, phone)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {flash && (
        <div className={`tc-toast ${flash.tone === 'err' ? 'is-error' : ''}`} role="status">
          <Icon name={flash.tone === 'err' ? 'error' : 'check_circle'} size={18} filled />
          {flash.text}
        </div>
      )}

      <div className="tc-panel p-3 text-[12px] text-ink flex items-start gap-2">
        <Icon name="info" size={16} className="text-sage mt-px shrink-0" />
        <span>
          WhatsApp can only message someone who has messaged the firm's business number first, and only for 24 hours
          after their last message. A number marked <strong>Not opted in</strong> will receive email but not WhatsApp.
        </span>
      </div>
      <AlertSchedule />


      {table('Team', users, (p, phone) => saveUser.mutate({ id: p.id, phone }), saveUser.isPending)}
      {table('Client contacts', clients, (p, phone) => saveClient.mutate({ id: p.id, phone }), saveClient.isPending)}
    </div>
  );
}
