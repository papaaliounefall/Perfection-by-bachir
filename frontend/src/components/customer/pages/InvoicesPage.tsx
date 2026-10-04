import React from 'react';
import { Download } from 'lucide-react';
import { api } from '../../../api';
import { formatDate, formatFcfa } from '../../../lib/labels';
import { useApiData } from '../../../lib/useApiData';
import { Invoice } from '../../../types';
import { EmptyState, ErrorState, LoadingState, StatusIndicator } from '../../ui/DesignSystem';
import { card, PageTitle } from './shared';

export const InvoicesPage: React.FC = () => {
  const invoices = useApiData<Invoice[]>(() => api.invoices.list(), [], []);

  return (
    <div>
      <PageTitle title="Mes factures" subtitle="Vos factures et l’état de leur règlement, téléchargeables en PDF." />
      {invoices.error && <ErrorState message={invoices.error} onRetry={invoices.reload} />}
      {invoices.loading ? (
        <LoadingState />
      ) : invoices.data.length === 0 ? (
        <EmptyState message="Aucune facture pour le moment." />
      ) : (
        <div className="space-y-4">
          {invoices.data.map((inv) => (
            <div key={inv.id} className={`${card} p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
              <div className="text-xs space-y-1">
                <p className="font-mono font-bold text-sm">{inv.number}</p>
                <p className="text-neutral-600">
                  {formatDate(inv.issuedAt)}
                  {inv.vehicle ? ` · ${inv.vehicle}` : ''}
                  {inv.appointmentReference ? ` · ${inv.appointmentReference}` : ''}
                </p>
                <p className="text-neutral-600">{inv.lines.map((l) => l.label).join(', ')}</p>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right text-xs">
                  <p className="font-mono font-bold text-base">{formatFcfa(inv.total)}</p>
                  {inv.balance > 0 && inv.status !== 'cancelled' && (
                    <p className="text-neutral-500 font-mono">Reste : {formatFcfa(inv.balance)}</p>
                  )}
                  <span className="inline-flex">
                    <StatusIndicator status={inv.statusLabel} tone="light" />
                  </span>
                </div>
                <a
                  href={inv.pdfUrl}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D49A3D] text-[#0B0C0E] text-xs font-semibold hover:bg-[#c38a30]"
                >
                  <Download className="w-4 h-4" /> PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
