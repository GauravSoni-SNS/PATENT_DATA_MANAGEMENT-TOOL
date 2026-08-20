import { useQuery } from '@tanstack/react-query';
import { receiptsApi } from '../api/client';
import { useAddMatter } from '../context/AddMatterContext';

export default function ReceiptsPage() {
  const { openAddMatter } = useAddMatter();

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => receiptsApi.list().then((r) => r.data.data),
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
        <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4 text-ink">
          <h2 className="text-lg sm:text-xl font-bold uppercase">Government Proof Vault</h2>
          <button
            type="button"
            className="btn tc-btn-primary tc-btn w-full sm:w-auto"
            onClick={() => openAddMatter('OCR')}
          >
            Drop Receipt / Auto-Docket
          </button>
        </div>
      </div>

      <div className="tc-card overflow-hidden p-0">
        <div className="tc-table-wrap">
          <table className="table table-zebra tc-surface">
            <thead>
              <tr className="border-b border-rule">
                <th className="font-bold uppercase text-xs">File</th>
                <th className="font-bold uppercase text-xs hidden sm:table-cell">Type</th>
                <th className="font-bold uppercase text-xs">CBR</th>
                <th className="font-bold uppercase text-xs hidden md:table-cell">Matter</th>
                <th className="font-bold uppercase text-xs hidden lg:table-cell">Uploaded</th>
                <th className="font-bold uppercase text-xs">Fees</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {receipts.map((r: { id: string; fileName: string; receiptType: string; cbrNumber?: string; matter?: { matterNumber: string }; createdAt: string; officialFees?: number; currency?: string }) => (
                <tr key={r.id} className="border-b border-rule">
                  <td className="font-semibold text-sm max-w-[140px] truncate">{r.fileName}</td>
                  <td className="hidden sm:table-cell"><span className="tc-stage">{r.receiptType.replace(/_/g, " ").toLowerCase()}</span></td>
                  <td className="font-mono text-xs sm:text-sm">{r.cbrNumber || '—'}</td>
                  <td className="hidden md:table-cell text-sm">{r.matter?.matterNumber || '—'}</td>
                  <td className="text-sm hidden lg:table-cell">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="text-sm">{r.officialFees ? `${r.currency} ${r.officialFees}` : '—'}</td>
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 opacity-50 font-bold">No receipts uploaded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
