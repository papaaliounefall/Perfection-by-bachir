import React, { useState } from 'react';
import { api } from '../../../api';
import { useApp } from '../../../context/AppContext';
import { formatFcfa, formatTime, isoDay } from '../../../lib/labels';
import { useApiData } from '../../../lib/useApiData';
import { CashReport } from '../../../types';
import { EmptyState, ErrorState, LoadingState } from '../../ui/DesignSystem';
import { PageHeader, panel } from './shared';

/** Journal de caisse : ce qui a été encaissé dans la journée, par moyen et par personne. */
export const PaymentsPage: React.FC = () => {
  const { run } = useApp();
  const [date, setDate] = useState(isoDay(new Date()));
  const report = useApiData<CashReport | null>(() => api.payments.cashReport(date), [date], null);

  const refund = async (id: number) => {
    const reason = window.prompt('Motif du remboursement :');
    if (!reason) return;
    const ok = await run(async () => {
      await api.payments.refund(id, reason);
      return true;
    }, 'Paiement remboursé');
    if (ok) report.reload();
  };

  const data = report.data;
  return (
    <div>
      <PageHeader
        title="Journal de caisse"
        subtitle="Encaissements de la journée, signés par la personne qui les a enregistrés. À rapprocher de la caisse le soir."
        action={
          <input
            type="date"
            aria-label="Jour"
            value={date}
            max={isoDay(new Date())}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-xs"
          />
        }
      />
      {report.error && <ErrorState message={report.error} onRetry={report.reload} />}
      {report.loading && !data ? (
        <LoadingState tone="light" />
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`${panel} p-4`}>
              <span className="text-xs text-neutral-500">Total encaissé</span>
              <span className="block mt-2 text-xl font-bold font-mono">{formatFcfa(data.total)}</span>
            </div>
            <div className={`${panel} p-4`}>
              <span className="text-xs text-neutral-500">Dont espèces (à retrouver en caisse)</span>
              <span className="block mt-2 text-xl font-bold font-mono text-[#B87D24]">{formatFcfa(data.cashTotal)}</span>
            </div>
            {data.byMethod
              .filter((m) => m.method !== 'Espèces')
              .slice(0, 2)
              .map((m) => (
                <div key={m.method} className={`${panel} p-4`}>
                  <span className="text-xs text-neutral-500">{m.method}</span>
                  <span className="block mt-2 text-xl font-bold font-mono">{formatFcfa(m.amount)}</span>
                </div>
              ))}
          </div>

          {data.byPerson.length > 0 && (
            <div className={`${panel} p-5`}>
              <h2 className="text-sm font-bold font-display mb-3">Par personne</h2>
              <ul className="divide-y divide-neutral-100 text-xs">
                {data.byPerson.map((p) => (
                  <li key={p.person} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{p.person}</span>
                    <span className="font-mono text-neutral-600">
                      {p.count} paiement(s) · {formatFcfa(p.amount)} · espèces {formatFcfa(p.cash)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={`${panel} overflow-hidden`}>
            {data.payments.length === 0 ? (
              <EmptyState tone="light" message="Aucun encaissement ce jour-là." />
            ) : (
              <ul className="divide-y divide-neutral-200 text-xs">
                {data.payments.map((p) => (
                  <li key={p.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${p.refunded ? 'opacity-60' : ''}`}>
                    <div className="space-y-0.5">
                      <p className="font-semibold">
                        {formatTime(p.receivedAt)} · {p.customerName}
                      </p>
                      <p className="text-neutral-500 font-mono">
                        {p.invoiceNumber} · {p.method}
                        {p.reference && ` · réf. ${p.reference}`} · par {p.recordedBy ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono font-bold text-sm ${p.refunded ? 'line-through' : ''}`}>{formatFcfa(p.amount)}</span>
                      {p.refunded ? (
                        <span className="text-rose-600 font-semibold">Remboursé</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => refund(p.id)}
                          className="min-h-10 px-3 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold"
                        >
                          Rembourser
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
