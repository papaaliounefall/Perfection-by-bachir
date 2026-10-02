import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  CLOSED_STATUSES,
  COMPLETED_STATUSES,
  formatDateTime,
  STATUS_LABELS,
  UPCOMING_STATUSES,
} from '../../../lib/labels';
import { Appointment } from '../../../types';
import { EmptyState, SmartImage, StatusIndicator } from '../../ui/DesignSystem';
import { CustomerData } from '../CustomerPortal';
import { AppointmentDetailModal, card, PageTitle } from './shared';

const TABS = [
  { id: 'upcoming', label: 'À venir', statuses: UPCOMING_STATUSES },
  { id: 'completed', label: 'Terminés', statuses: COMPLETED_STATUSES },
  { id: 'cancelled', label: 'Annulés', statuses: CLOSED_STATUSES },
] as const;

export const AppointmentsPage: React.FC<{ data: CustomerData }> = ({ data }) => {
  const { startBookingWithService } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('upcoming');
  const [detail, setDetail] = useState<Appointment | null>(null);

  const statuses = TABS.find((t) => t.id === tab)!.statuses as readonly string[];
  const list = data.appointments.filter((a) => statuses.includes(a.status));

  return (
    <div>
      <PageTitle
        title="Mes rendez-vous"
        action={
          <button
            type="button"
            onClick={() => startBookingWithService()}
            className="px-4 py-2.5 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold text-xs hover:bg-[#e0a84b]"
          >
            + Nouveau rendez-vous
          </button>
        }
      />

      <div className="flex items-center gap-2 bg-[#14161B] p-1.5 rounded-xl border border-white/10 w-fit mb-6" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold ${
              tab === t.id ? 'bg-[#F8F8FA] text-[#111317]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState message="Aucun rendez-vous dans cette catégorie." />
      ) : (
        <div className="space-y-4">
          {list.map((apt) => (
            <div key={apt.id} className={`${card} p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
              <div className="flex items-center gap-4">
                <SmartImage src={apt.vehiclePhoto} alt={apt.vehicleName} className="w-24 h-16 rounded-lg object-cover shrink-0" />
                <div>
                  <p className="text-xs font-mono text-neutral-500">
                    {formatDateTime(apt.startAt)} · Réf. {apt.reference}
                  </p>
                  <h2 className="text-base sm:text-lg font-bold font-display mt-0.5">{apt.serviceName}</h2>
                  <p className="text-xs text-neutral-600">
                    {apt.vehicleName} ({apt.vehicleRegistration})
                  </p>
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3">
                <StatusIndicator status={STATUS_LABELS[apt.status]} tone="light" />
                <button
                  type="button"
                  onClick={() => setDetail(apt)}
                  className="px-4 py-2 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 text-xs font-semibold"
                >
                  Voir détails
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AppointmentDetailModal appointment={detail} onClose={() => setDetail(null)} onChanged={data.reload} />
    </div>
  );
};
