import React from 'react';
import { COMPLETED_STATUSES, formatDate, formatFcfa, STATUS_LABELS } from '../../../lib/labels';
import { EmptyState, StatusIndicator } from '../../ui/DesignSystem';
import { CustomerData } from '../CustomerPortal';
import { PageTitle } from './shared';

export const HistoryPage: React.FC<{ data: CustomerData }> = ({ data }) => {
  const done = data.appointments.filter((a) => COMPLETED_STATUSES.includes(a.status));

  return (
    <div>
      <PageTitle title="Historique des prestations" subtitle="Les interventions terminées sur vos véhicules." />
      {done.length === 0 ? (
        <EmptyState message="Aucune prestation terminée pour le moment." />
      ) : (
        <div className="space-y-4">
          {done.map((a) => (
            <div key={a.id} className="bg-[#121418] border border-white/10 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono text-[#D49A3D]">
                  {formatDate(a.startAt)} · {a.reference}
                </span>
                <h2 className="text-lg font-bold text-white font-display mt-0.5">
                  {a.vehicleName} ({a.vehicleRegistration})
                </h2>
                <p className="text-sm text-neutral-300">
                  {a.serviceName}
                  {a.assignedEmployeeName ? ` · ${a.assignedEmployeeName}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-base font-bold font-mono text-white">{formatFcfa(a.price)}</span>
                <StatusIndicator status={STATUS_LABELS[a.status]} />
              </div>
            </div>
          ))}
          <p className="text-xs text-neutral-500">
            Les points de contrôle, produits utilisés et photos Avant / Après seront ajoutés avec le module atelier (phase 2).
          </p>
        </div>
      )}
    </div>
  );
};
