import React from 'react';
import { Calendar, Car, Clock } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import {
  COMPLETED_STATUSES,
  formatDate,
  formatDateTime,
  IN_WORKSHOP_STATUSES,
  STATUS_LABELS,
  UPCOMING_STATUSES,
} from '../../../lib/labels';
import { SmartImage, StatusIndicator } from '../../ui/DesignSystem';
import { CustomerData } from '../CustomerPortal';
import { card, ProgressBar } from './shared';

export const CustomerDashboard: React.FC<{ data: CustomerData }> = ({ data }) => {
  const { setCustomerPage, startBookingWithService } = useApp();
  const { profile, vehicles, appointments } = data;

  const byDateAsc = [...appointments].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const next = byDateAsc.find(
    (a) => UPCOMING_STATUSES.includes(a.status) && !IN_WORKSHOP_STATUSES.includes(a.status) && a.startAt >= new Date().toISOString()
  );
  const inWorkshop = appointments.filter((a) => IN_WORKSHOP_STATUSES.includes(a.status));
  const lastDone = appointments.find((a) => COMPLETED_STATUSES.includes(a.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
          Bonjour{profile ? `, ${profile.name.split(' ')[0]}` : ''} !
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">Le suivi de vos véhicules et de vos rendez-vous.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        <div className={`${card} p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
              <Calendar className="w-4 h-4 text-[#B87D24]" /> Prochain rendez-vous
            </div>
            {next ? (
              <>
                <p className="text-lg font-bold font-mono mt-3">{formatDateTime(next.startAt)}</p>
                <p className="text-xs text-neutral-600 mt-1">
                  {next.serviceName} · {next.vehicleName}
                </p>
                <div className="mt-1">
                  <StatusIndicator status={STATUS_LABELS[next.status]} tone="light" />
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-500 mt-3">Aucun rendez-vous à venir</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => (next ? setCustomerPage('appointments') : startBookingWithService())}
            className="mt-4 self-start px-4 py-2 rounded-lg bg-[#D49A3D] text-[#0B0C0E] text-xs font-semibold hover:bg-[#c38a30]"
          >
            {next ? 'Voir mes rendez-vous' : 'Prendre rendez-vous'}
          </button>
        </div>

        <div className={`${card} p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
              <Car className="w-4 h-4 text-[#B87D24]" /> Mes véhicules
            </div>
            {vehicles[0] ? (
              <div className="flex items-center gap-3.5 mt-3">
                <SmartImage src={vehicles[0].photo} alt={vehicles[0].model} className="w-20 h-14 rounded-lg object-cover shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">
                    {vehicles[0].brand} {vehicles[0].model}
                  </p>
                  <p className="text-xs font-mono text-neutral-500">{vehicles[0].registration}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-500 mt-3">Aucun véhicule enregistré</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCustomerPage('vehicles')}
            className="mt-4 self-start text-xs font-semibold text-[#B87D24] hover:underline"
          >
            Gérer mes véhicules ({vehicles.length}) →
          </button>
        </div>

        <div className={`${card} p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
              <Clock className="w-4 h-4 text-[#B87D24]" /> Dernière prestation terminée
            </div>
            {lastDone ? (
              <>
                <p className="text-lg font-bold font-mono mt-3">{formatDate(lastDone.startAt)}</p>
                <p className="text-xs text-neutral-600 mt-1">
                  {lastDone.serviceName} · {lastDone.vehicleName}
                </p>
              </>
            ) : (
              <p className="text-sm text-neutral-500 mt-3">Aucune prestation terminée</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCustomerPage('history')}
            className="mt-4 self-start text-xs font-semibold text-[#B87D24] hover:underline"
          >
            Voir l’historique →
          </button>
        </div>
      </div>

      {inWorkshop.length > 0 && (
        <div className={`${card} p-6`}>
          <h2 className="text-base font-bold font-display mb-4">Actuellement à l’atelier</h2>
          <div className="space-y-4">
            {inWorkshop.map((a) => (
              <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-5 bg-white p-4 rounded-xl border border-neutral-200">
                <SmartImage src={a.vehiclePhoto} alt={a.vehicleName} className="w-full sm:w-36 h-28 rounded-lg object-cover shrink-0" />
                <div className="flex-1 w-full space-y-2.5">
                  <div className="flex items-center justify-between">
                    <StatusIndicator status={STATUS_LABELS[a.status]} tone="light" />
                    <span className="text-sm font-bold font-mono">{a.progress ?? 0} %</span>
                  </div>
                  <h3 className="text-base font-bold">
                    {a.serviceName} — {a.vehicleName}
                  </h3>
                  <ProgressBar value={a.progress ?? 0} />
                  {a.steps.length > 0 && (
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      {a.steps.map((s) => (
                        <li key={s.id} className={s.done ? 'text-emerald-700' : 'text-neutral-500'}>
                          {s.done ? '✓' : '○'} {s.title}
                        </li>
                      ))}
                    </ul>
                  )}
                  {a.status === 'done' ? (
                    <p className="text-sm font-semibold text-emerald-700">
                      Votre véhicule est prêt : vous pouvez venir le récupérer à l’atelier.
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Avancement selon les étapes validées par l’atelier
                      {a.assignedEmployeeName ? ` · Technicien : ${a.assignedEmployeeName}` : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
