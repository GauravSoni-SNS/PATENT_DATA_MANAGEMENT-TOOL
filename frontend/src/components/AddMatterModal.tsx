import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useAddMatter, AddMatterTab } from '../context/AddMatterContext';
import { mattersApi, receiptsApi, clientsApi } from '../api/client';
import { Icon } from './Icon';
import { useReference } from '../lib/reference';

interface ParsedReceipt {
  matterNumber?: string;
  /** How the text was obtained and how well it was recognised. */
  readSource?: string;
  ocrConfidence?: number;
  confidence?: number;
  profileLabel?: string;
  missing?: string[];
  title?: string;
  jurisdiction?: string;
  stage?: string;
  triggerDate?: string;
  priorityDate?: string;
  clientName?: string;
  clientEmail?: string;
  cbrNumber?: string;
  officialFees?: number;
  currency?: string;
  officialAppNumber?: string;
  abstract?: string;
  receiptTitle?: string;
}

interface DeadlinePreview {
  ruleId: string;
  title: string;
  statutoryDueDate: string;
  isStatutoryBar?: boolean;
}

export function AddMatterModal() {
  const { jurisdictions, stages } = useReference();
  const { isOpen, initialTab, closeAddMatter } = useAddMatter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<AddMatterTab>('OCR');
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlinePreview[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [matterNumber, setMatterNumber] = useState('');
  const [jurisdiction, setJurisdiction] = useState('IN');
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [stage, setStage] = useState('PROVISIONAL');
  const [triggerDate, setTriggerDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: samples = [] } = useQuery({
    queryKey: ['receipt-samples'],
    queryFn: () => receiptsApi.samples().then((r) => r.data.data),
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setError('');
      setSuccess('');
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, initialTab]);

  const resetOcr = () => {
    setParsed(null);
    setDeadlines([]);
    setError('');
  };

  const resetManual = () => {
    setMatterNumber('');
    setJurisdiction('IN');
    setTitle('');
    setClientName('');
    setClientEmail('');
    setStage('PROVISIONAL');
    setTriggerDate(new Date().toISOString().split('T')[0]);
    setError('');
  };

  const handleClose = () => {
    resetOcr();
    resetManual();
    setSuccess('');
    closeAddMatter();
  };

  const parseSampleMutation = useMutation({
    mutationFn: (sampleId: string) => receiptsApi.parseSample(sampleId),
    onSuccess: (res) => {
      setParsed(res.data.data.parsed);
      setDeadlines(res.data.data.deadlines || []);
      setError('');
    },
    onError: () => setError('Failed to parse sample receipt.'),
  });

  const parseFileMutation = useMutation({
    mutationFn: (file: File) => receiptsApi.autoDocketPreview(file),
    onSuccess: (res) => {
      const preview = res.data.data.parsedPreview;
      setParsed(preview);
      setDeadlines(preview?.proposedDeadlines || []);
      setError('');
    },
    onError: () => setError('Failed to parse uploaded receipt.'),
  });

  const confirmOcrMutation = useMutation({
    mutationFn: () => receiptsApi.autoDocketConfirm({ parsed, leadAttorneyId: user?.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matters'] });
      qc.invalidateQueries({ queryKey: ['matters-kanban'] });
      qc.invalidateQueries({ queryKey: ['radar'] });
      qc.invalidateQueries({ queryKey: ['receipts'] });
      setSuccess('Matter auto-docketed successfully!');
      resetOcr();
      setTimeout(handleClose, 1500);
    },
    onError: (e: { response?: { data?: { error?: { message?: string } } } }) => {
      setError(e.response?.data?.error?.message || 'Auto-docket failed. Matter number may already exist.');
    },
  });

  const createManualMutation = useMutation({
    mutationFn: async () => {
      let clientId: string | undefined;
      if (clientName.trim()) {
        const clients = await clientsApi.list().then((r) => r.data.data as Array<{ id: string; name: string }>);
        const existing = clients.find((c) => c.name.toLowerCase() === clientName.trim().toLowerCase());
        if (existing) {
          clientId = existing.id;
        } else {
          const created = await clientsApi.create({
            name: clientName.trim(),
            contactEmail: clientEmail.trim() || undefined,
            code: clientName.trim().substring(0, 6).toUpperCase(),
          });
          clientId = created.data.data.id;
        }
      }

      return mattersApi.create({
        matterNumber: matterNumber.trim(),
        title: title.trim(),
        jurisdiction,
        currentStage: stage,
        filingDate: triggerDate,
        priorityDate: triggerDate,
        clientId,
        leadAttorneyId: user?.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['matters'] });
      qc.invalidateQueries({ queryKey: ['matters-kanban'] });
      qc.invalidateQueries({ queryKey: ['radar'] });
      setSuccess('Matter created with statutory deadlines!');
      resetManual();
      setTimeout(handleClose, 1500);
    },
    onError: (e: { response?: { data?: { error?: { message?: string } } } }) => {
      setError(e.response?.data?.error?.message || 'Failed to create matter.');
    },
  });

  const handleFile = (file: File) => {
    if (!file) return;
    parseFileMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const isBusy =
    parseSampleMutation.isPending ||
    parseFileMutation.isPending ||
    confirmOcrMutation.isPending ||
    createManualMutation.isPending;

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle" onClose={handleClose}>
      <div className="modal-box tc-card w-full max-w-3xl p-0 overflow-hidden max-h-[90vh]">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-rule bg-surface-card">
          <h3 className="font-bold text-lg sm:text-xl uppercase tracking-wide text-ink">
            {tab === "OCR" ? "Drop receipt / auto-docket" : "Add matter manually"}
          </h3>
          <form method="dialog">
            <button type="button" className="btn btn-sm btn-ghost border border-rule tc-btn" onClick={handleClose}>
              <Icon name="close" size={20} />
            </button>
          </form>
        </div>

        <div role="tablist" className="tabs tabs-boxed bg-paper-soft border-b border-rule px-2 sm:px-4 py-2 gap-1">
          <button
            type="button"
            role="tab"
            className={`tab text-sm border ${tab === 'OCR' ? 'tab-active border-rule tc-btn-primary' : 'border-transparent text-ink'}`}
            onClick={() => { setTab('OCR'); setError(''); }}
          >
            <Icon name="bolt" size={16} filled /> OCR auto-fill
          </button>
          <button
            type="button"
            role="tab"
            className={`tab text-sm border ${tab === 'MANUAL' ? 'tab-active border-rule tc-btn-primary' : 'border-transparent text-ink'}`}
            onClick={() => { setTab('MANUAL'); setError(''); resetOcr(); }}
          >
            <Icon name="edit_note" size={16} filled /> Manual entry
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)] text-ink">
          {success && (
            <div role="alert" className="alert alert-success border border-rule mb-4">
              <Icon name="check_circle" size={18} filled />
              <span className="font-semibold">{success}</span>
            </div>
          )}
          {error && (
            <div role="alert" className="alert alert-error border border-rule mb-4">
              <Icon name="error" size={18} filled />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {tab === 'OCR' && (
            <div className="space-y-4">
              <div role="alert" className="alert border border-rule bg-sage-soft text-ink">
                <span>🚀</span>
                <span className="text-sm">
                  Drop a government receipt (CBR, USPTO EFS, EPO Form 1001, FER order). Metadata and deadlines are auto-created in one click.
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />

              <div
                role="button"
                tabIndex={0}
                className={`tc-dropzone p-6 sm:p-10 text-center cursor-pointer ${dragOver ? 'drag-over' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                {parseFileMutation.isPending ? (
                  <span className="loading loading-spinner loading-lg text-sage" />
                ) : (
                  <>
                    <div className="text-3xl mb-2">📄</div>
                    <p className="font-bold uppercase text-sm sm:text-base">Drop receipt here or click to browse</p>
                    <p className="text-xs opacity-60 mt-1">PDF, TXT, DOC, PNG, JPG — max 10 MB</p>
                  </>
                )}
              </div>

              <div>
                <p className="text-xs font-bold uppercase mb-2 opacity-70">Or try a sample receipt</p>
                <div className="flex flex-wrap gap-2">
                  {samples.map((s: { id: string; label: string }) => (
                    <button
                      key={s.id}
                      type="button"
                      className="btn btn-sm tc-btn-quiet tc-btn font-semibold text-xs sm:text-sm"
                      onClick={() => parseSampleMutation.mutate(s.id)}
                      disabled={isBusy}
                    >
                      {parseSampleMutation.isPending ? <span className="loading loading-spinner loading-xs" /> : null}
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {parsed && (
                <div className="border border-rule p-4 bg-paper-soft space-y-3">
                  <h4 className="font-bold uppercase text-sm">Extracted review</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div><span className="opacity-60">Matter:</span> <strong>{parsed.matterNumber}</strong></div>
                    <div><span className="opacity-60">Jurisdiction:</span> <strong>{parsed.jurisdiction}</strong></div>
                    <div className="sm:col-span-2"><span className="opacity-60">Title:</span> <strong>{parsed.title}</strong></div>
                    <div><span className="opacity-60">Client:</span> <strong>{parsed.clientName || '—'}</strong></div>
                    <div><span className="opacity-60">CBR:</span> <strong className="font-mono">{parsed.cbrNumber || '—'}</strong></div>
                    <div><span className="opacity-60">Stage:</span> <strong>{parsed.stage?.replace(/_/g, ' ')}</strong></div>
                    <div><span className="opacity-60">Trigger date:</span> <strong className="font-mono">{parsed.triggerDate}</strong></div>
                  </div>
                  {parsed?.readSource?.startsWith('ocr') && (
                    <div className="tc-panel p-3 mb-3 flex items-start gap-2 text-[12px] text-ink">
                      <Icon name="visibility" size={16} className="text-sage mt-px shrink-0" />
                      <span>
                        Read by OCR from a scan
                        {typeof parsed.ocrConfidence === 'number' && (
                          <> at <strong>{Math.round(parsed.ocrConfidence * 100)}% confidence</strong></>
                        )}
                        . Character errors are common in scans, so check every field below against the document
                        before confirming.
                      </span>
                    </div>
                  )}
                  {typeof parsed?.confidence === 'number' && parsed.confidence < 0.5 && (
                    <div className="tc-panel p-3 mb-3 flex items-start gap-2 text-[12px] text-ink">
                      <Icon name="help" size={16} className="text-sage mt-px shrink-0" />
                      <span>
                        This document was not confidently recognised
                        {parsed.profileLabel ? <> as <strong>{parsed.profileLabel}</strong></> : null}. Field values may
                        be missing or wrong.
                      </span>
                    </div>
                  )}

                  {deadlines.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase mb-2">Proposed deadlines ({deadlines.length})</p>
                      <ul className="space-y-1 max-h-32 overflow-y-auto text-xs font-mono">
                        {deadlines.map((d) => (
                          <li key={d.ruleId} className="flex justify-between gap-2 border-b border-rule py-1">
                            <span>{d.title}</span>
                            <span className={d.isStatutoryBar ? 'text-error font-bold' : ''}>{d.statutoryDueDate}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'MANUAL' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend font-bold uppercase text-xs">Matter docket no *</legend>
                  <input type="text" className="input tc-input w-full" placeholder="IN-2026-PAT-00998" value={matterNumber} onChange={(e) => setMatterNumber(e.target.value)} />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend font-bold uppercase text-xs">Jurisdiction *</legend>
                  <select className="select tc-input w-full" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}>
                    {jurisdictions.map((j) => (
                      <option key={j.code} value={j.code}>{j.name}</option>
                    ))}
                  </select>
                </fieldset>
              </div>

              <fieldset className="fieldset">
                <legend className="fieldset-legend font-bold uppercase text-xs">Invention title *</legend>
                <input type="text" className="input tc-input w-full" placeholder="Next-Generation Solid-State Battery" value={title} onChange={(e) => setTitle(e.target.value)} />
              </fieldset>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend font-bold uppercase text-xs">Client name *</legend>
                  <input type="text" className="input tc-input w-full" placeholder="Solaria Quantum Labs" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend font-bold uppercase text-xs">Client email</legend>
                  <input type="email" className="input tc-input w-full" placeholder="legal@solaria.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                </fieldset>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend font-bold uppercase text-xs">Initial stage *</legend>
                  <select className="select tc-input w-full" value={stage} onChange={(e) => setStage(e.target.value)}>
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>{st.label}</option>
                    ))}
                  </select>
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend font-bold uppercase text-xs">Milestone date *</legend>
                  <input type="date" className="input tc-input w-full" value={triggerDate} onChange={(e) => setTriggerDate(e.target.value)} />
                </fieldset>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 px-4 sm:px-6 py-4 border-t border-rule bg-surface-card">
          <button type="button" className="btn tc-btn-quiet tc-btn font-semibold uppercase" onClick={handleClose} disabled={isBusy}>
            Cancel
          </button>
          {tab === 'OCR' ? (
            <button
              type="button"
              className="btn tc-btn-primary tc-btn"
              disabled={!parsed || confirmOcrMutation.isPending}
              onClick={() => confirmOcrMutation.mutate()}
            >
              {confirmOcrMutation.isPending ? <span className="loading loading-spinner loading-sm" /> : '🚀 Confirm & Auto-Docket'}
            </button>
          ) : (
            <button
              type="button"
              className="btn tc-btn-primary tc-btn"
              disabled={!matterNumber.trim() || !title.trim() || !clientName.trim() || createManualMutation.isPending}
              onClick={() => createManualMutation.mutate()}
            >
              {createManualMutation.isPending ? <span className="loading loading-spinner loading-sm" /> : 'Create Matter'}
            </button>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop bg-black/60">
        <button type="button" onClick={handleClose}>close</button>
      </form>
    </dialog>
  );
}
