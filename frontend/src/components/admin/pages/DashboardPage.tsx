import React from 'react';
import { api } from '../../../api';
import { useApp } from '../../../context/AppContext';
import { formatDateTime, formatTime, isoDay, STATUS_LABELS } from '../../../lib/labels';
import { useApiData } from '../../../lib/useApiData';
import { Appointment, DashboardSummary } from '../../../types';
import { EmptyState, ErrorState, LoadingState, StatusIndicator } from '../../ui/DesignSystem';
import { PageHeader, panel } from './shared';

const AppointmentRows: React.FC<{ items: Appointment[]; withDate?: boolean }> = ({ items, withDate }) => (
  <div className="divide-y divide-neutral-200">
    {items.map((apt) => (
      <div key={apt.id} className="py-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono font-bold shrink-0">{withDate ? formatDateTime(apt.startAt) : formatTime(apt.startAt)}</span>
          <div className="min-w-0">
            <p className="font-bold truncate">
              {apt.vehicleName} · {apt.customerName}
            </p>
            <p className="text-neutral-500 truncate">{apt.serviceName}</p>
          </div>
        </div>
        <StatusIndicator status={STATUS_LABELS[apt.status]} tone="light" />
      </div>
    ))}
  </div>
);

export const DashboardPage: React.FC = () => {
  const { setAdminPage } = useApp();
  const today = isoDay(new Date());
  const summary = useApiData<DashboardSummary | null>(() => api.dashboard.summary(), [], null);
  const todays = useApiData<Appointment[]>(() => api.appointments.list({ date: today }), [today], []);
  const pending = useApiData<Appointment[]>(() => api.appointments.list({ status: ['pending'] }), [], []);

  const kpis = summary.data
    ? [
        { label: 'Rendez-vous aujourd’hui', value: summary.data.appointmentsToday },
        { label: 'À confirmer', value: summary.data.toConfirm },
        { label: 'Véhicules à l’atelier', value: summary.data.inWorkshop },
        { label: 'Prestations en cours', value: summary.data.inProgress },
        { label: 'Terminées aujourd’hui', value: summary.data.completedToday },
        { label: 'Nouveaux clients (30 j)', value: summary.data.newCustomers30d },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Tableau de bord" subtitle="Indicateurs calculés en temps réel à partir du planning." />

      {summary.error && <ErrorState message={summary.error} onRetry={summary.reload} />}
      {summary.loading && !summary.data ? (
        <LoadingState tone="light" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className={`${panel} p-4`}>
              <span className="text-xs text-neutral-500 font-medium">{kpi.label}</span>
              <span className="block mt-3 text-xl font-bold font-mono">{kpi.value}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-neutral-500">
        Le chiffre d’affaires apparaîtra avec le module Finances (phase 3), calculé à partir des paiements enregistrés.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${panel} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold font-display">Planning du jour</h2>
            <button type="button" onClick={() => setAdminPage('appointments')} className="text-xs font-semibold text-[#B87D24] hover:underline">
              Tout gérer →
            </button>
          </div>
          {todays.loading ? (
            <LoadingState tone="light" />
          ) : todays.data.length === 0 ? (
            <EmptyState tone="light" message="Aucun rendez-vous aujourd’hui." />
          ) : (
            <AppointmentRows items={[...todays.data].sort((a, b) => a.startAt.localeCompare(b.startAt))} />
          )}
        </div>

        <div className={`${panel} p-6`}>
          <h2 className="text-base font-bold font-display mb-4">Demandes à confirmer ({pending.data.length})</h2>
          {pending.loading ? (
            <LoadingState tone="light" />
          ) : pending.data.length === 0 ? (
            <EmptyState tone="light" message="Aucune demande en attente." />
          ) : (
            <AppointmentRows items={pending.data.slice(0, 8)} withDate />
          )}
        </div>
      </div>
    </div>
  );
};
