import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { rulesApi } from '../api/client';

export default function CalculatorPage() {
  const [triggerEvent, setTriggerEvent] = useState('PROVISIONAL_FILED');
  const [triggerDate, setTriggerDate] = useState('2025-09-02');
  const [jurisdiction, setJurisdiction] = useState('IN');
  const [results, setResults] = useState<Array<{ ruleId: string; title: string; statutoryDueDate: string; isStatutoryBar: boolean; statutorySection?: string }>>([]);

  const calcMutation = useMutation({
    mutationFn: () => rulesApi.calculate({ triggerEvent, triggerDate, jurisdiction }),
    onSuccess: (res) => setResults(res.data.data.deadlines),
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-ink-deep">
        <h2 className="text-lg sm:text-xl font-bold uppercase">Statutory Rules Calculator</h2>
        <p className="text-sm opacity-80 mt-1">Compute jurisdiction-specific patent prosecution deadlines</p>
      </div>

      <div className="tc-card p-4 sm:p-6 text-ink">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <fieldset className="fieldset">
            <legend className="fieldset-legend font-bold uppercase text-xs">Trigger event</legend>
            <select value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} className="select select-bordered tc-input w-full">
              <option value="PROVISIONAL_FILED">Provisional filed</option>
              <option value="COMPLETE_FILED">Complete filed</option>
              <option value="FER_OA_ISSUED">FER / Office action issued</option>
              <option value="HEARING_SCHEDULED">Hearing scheduled</option>
              <option value="NOTICE_OF_ALLOWANCE">Notice of allowance</option>
              <option value="PATENT_GRANTED">Patent granted</option>
            </select>
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend font-bold uppercase text-xs">Trigger date</legend>
            <input type="date" value={triggerDate} onChange={(e) => setTriggerDate(e.target.value)} className="input input-bordered tc-input w-full" />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend font-bold uppercase text-xs">Jurisdiction</legend>
            <select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} className="select select-bordered tc-input w-full">
              <option value="IN">India (IPO)</option>
              <option value="US">United States (USPTO)</option>
              <option value="EP">Europe (EPO)</option>
              <option value="WO">PCT (WIPO)</option>
            </select>
          </fieldset>
        </div>
        <button
          type="button"
          className="btn mt-4 tc-btn-primary tc-btn w-full sm:w-auto"
          onClick={() => calcMutation.mutate()}
          disabled={calcMutation.isPending}
        >
          {calcMutation.isPending ? <span className="loading loading-spinner loading-sm" /> : 'Calculate deadlines'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="tc-card overflow-hidden p-0">
          <div className="tc-table-wrap">
            <table className="table table-zebra tc-surface text-ink">
              <thead>
                <tr className="border-b border-rule">
                  <th className="font-bold uppercase text-xs">Rule ID</th>
                  <th className="font-bold uppercase text-xs">Deadline</th>
                  <th className="font-bold uppercase text-xs">Due date</th>
                  <th className="font-bold uppercase text-xs hidden sm:table-cell">Bar</th>
                  <th className="font-bold uppercase text-xs hidden md:table-cell">Statute</th>
                </tr>
              </thead>
              <tbody>
                {results.map((d) => (
                  <tr key={d.ruleId} className="border-b border-rule">
                    <td className="font-mono text-xs sm:text-sm">{d.ruleId}</td>
                    <td className="text-sm">{d.title}</td>
                    <td className={`font-bold text-sm ${d.isStatutoryBar ? 'text-error' : ''}`}>{d.statutoryDueDate}</td>
                    <td className="hidden sm:table-cell">{d.isStatutoryBar ? <span className="tc-badge-critical badge text-xs">YES</span> : 'No'}</td>
                    <td className="text-sm hidden md:table-cell">{d.statutorySection || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
