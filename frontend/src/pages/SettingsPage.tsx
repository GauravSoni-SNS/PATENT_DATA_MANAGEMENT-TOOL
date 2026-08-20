import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icon';

type TabId = 'profile' | 'notifications' | 'security' | 'workspace';

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>('profile');
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'success' | 'error'>('idle');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [criticalSms, setCriticalSms] = useState(false);
  const [autoDocket, setAutoDocket] = useState(true);

  const handleSave = async () => {
    setSaving(true);
    setSaveState('idle');
    await new Promise((r) => setTimeout(r, 1200));
    setSaving(false);
    setSaveState('success');
    setTimeout(() => setSaveState('idle'), 3000);
  };

  const handleErrorDemo = async () => {
    setSaving(true);
    setSaveState('idle');
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaveState('error');
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
    { id: 'workspace', label: 'Workspace' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="text-ink-deep">
        <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide">Settings</h2>
        <p className="text-sm opacity-80 mt-1">Manage your account, alerts, and workspace preferences.</p>
      </div>

      {saveState === 'success' && (
        <div role="alert" className="alert alert-success border border-rule">
          <Icon name="check_circle" size={18} filled />
          <span className="font-bold">Settings saved successfully.</span>
        </div>
      )}
      {saveState === 'error' && (
        <div role="alert" className="alert alert-error border border-rule">
          <Icon name="error" size={18} filled />
          <span className="font-bold">Failed to save settings. Please try again.</span>
        </div>
      )}

      <div role="tablist" className="tabs tabs-boxed tc-card  p-1 gap-1 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            className={`tab text-sm border flex-1 sm:flex-none ${tab === t.id ? 'tab-active border-rule tc-btn-primary' : 'border-transparent text-ink'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="tc-card text-ink">
          <div className="card-body gap-4 p-4 sm:p-6">
            <h3 className="card-title font-black uppercase text-base">Profile</h3>
            <div role="alert" className="alert alert-info border border-rule">
              <span>ℹ</span>
              <span className="text-sm">Profile changes sync to your firm directory within 24 hours.</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend font-bold uppercase text-xs">First name</legend>
                <input type="text" className="input input-bordered tc-input" defaultValue={user?.firstName || ''} />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend font-bold uppercase text-xs">Last name</legend>
                <input type="text" className="input input-bordered tc-input" defaultValue={user?.lastName || ''} />
              </fieldset>
              <fieldset className="fieldset md:col-span-2">
                <legend className="fieldset-legend font-bold uppercase text-xs">Email</legend>
                <input type="email" className="input input-bordered tc-input" defaultValue={user?.email || ''} />
              </fieldset>
              <fieldset className="fieldset md:col-span-2">
                <legend className="fieldset-legend font-bold uppercase text-xs">Role (read-only)</legend>
                <input type="text" className="input input-bordered tc-input" value={user?.role || ''} disabled />
              </fieldset>
            </div>
            <div className="card-actions justify-end gap-2">
              <button type="button" className="btn btn-sm tc-btn-quiet tc-btn" disabled>
                Reset
              </button>
              <button
                type="button"
                className="btn tc-btn-primary tc-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <span className="loading loading-spinner loading-sm" /> : null}
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="tc-card text-ink">
          <div className="card-body gap-4 p-4 sm:p-6">
            <h3 className="card-title font-black uppercase text-base">Notification preferences</h3>
            <div role="alert" className="alert alert-warning border border-rule">
              <span>⚠</span>
              <span className="text-sm font-semibold">Critical alerts (T-5 and daily countdown) cannot be fully disabled per firm policy.</span>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-4 p-3 border border-rule bg-base-200">
                <div>
                  <div className="font-bold">Email escalation alerts</div>
                  <div className="text-xs opacity-70">T-30, T-15, T-5 tier notifications</div>
                </div>
                <input type="checkbox" className="toggle toggle-primary border border-rule" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-4 p-3 border border-rule bg-base-200">
                <div>
                  <div className="font-bold">Daily digest at 08:00 AM</div>
                  <div className="text-xs opacity-70">Morning radar summary for your matters</div>
                </div>
                <input type="checkbox" className="toggle toggle-secondary border border-rule" checked={dailyDigest} onChange={(e) => setDailyDigest(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-4 p-3 border border-rule bg-base-200 opacity-60">
                <div>
                  <div className="font-bold">SMS for daily critical</div>
                  <div className="text-xs">Requires verified mobile — coming soon</div>
                </div>
                <input type="checkbox" className="toggle toggle-error border border-rule" checked={criticalSms} onChange={(e) => setCriticalSms(e.target.checked)} disabled />
              </label>
            </div>
            <div className="card-actions justify-end">
              <button type="button" className="btn btn-secondary border border-rule tc-btn" onClick={handleSave} disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : 'Save notifications'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="tc-card text-ink">
          <div className="card-body gap-4 p-4 sm:p-6">
            <h3 className="card-title font-black uppercase text-base">Security</h3>
            <fieldset className="fieldset">
              <legend className="fieldset-legend font-bold uppercase text-xs">Current password</legend>
              <input type="password" className="input input-bordered tc-input" placeholder="••••••••" />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend font-bold uppercase text-xs">New password</legend>
              <input type="password" className="input input-bordered tc-input" placeholder="Min. 12 characters" />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend font-bold uppercase text-xs">Confirm new password</legend>
              <input type="password" className="input input-bordered tc-input input-error" placeholder="Mismatch demo" />
              <p className="text-error text-xs font-bold mt-1">Passwords do not match.</p>
            </fieldset>
            <div className="card-actions justify-between flex-wrap gap-2">
              <button type="button" className="btn btn-error btn-outline border border-rule font-bold" onClick={handleErrorDemo} disabled={saving}>
                Demo error state
              </button>
              <button type="button" className="btn tc-btn-primary tc-btn" onClick={handleSave} disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : 'Update password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'workspace' && (
        <div className="tc-card text-ink">
          <div className="card-body gap-4 p-4 sm:p-6">
            <h3 className="card-title font-black uppercase text-base">Workspace</h3>
            <fieldset className="fieldset">
              <legend className="fieldset-legend font-bold uppercase text-xs">Default jurisdiction</legend>
              <select className="select select-bordered tc-input w-full" defaultValue="IN">
                <option value="IN">India (IPO)</option>
                <option value="US">United States (USPTO)</option>
                <option value="EP">Europe (EPO)</option>
                <option value="WO">PCT (WIPO)</option>
              </select>
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend font-bold uppercase text-xs">Firm name</legend>
              <input type="text" className="input input-bordered tc-input" defaultValue="LexPatent IP LLP" />
            </fieldset>
            <label className="flex items-center justify-between gap-4 p-3 border border-rule">
              <div>
                <div className="font-bold">Auto-docket from receipts</div>
                <div className="text-xs opacity-70">Parse CBR receipts and create matters automatically</div>
              </div>
              <input type="checkbox" className="toggle toggle-success border border-rule" checked={autoDocket} onChange={(e) => setAutoDocket(e.target.checked)} />
            </label>
            <div role="alert" className="alert alert-success border border-rule">
              <Icon name="check_circle" size={18} filled />
              <span className="text-sm">Workspace configuration is valid and synced.</span>
            </div>
            <div className="card-actions justify-end">
              <button type="button" className="btn tc-btn-primary tc-btn" onClick={handleSave} disabled={saving}>
                Save workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
