import React, { useState } from 'react';
import { api } from '../../../api';
import { useApp } from '../../../context/AppContext';
import { formatDateTime, formatFcfa, STATUS_LABELS } from '../../../lib/labels';
import { Appointment } from '../../../types';
import { Modal, StatusIndicator } from '../../ui/DesignSystem';

export const card = 'bg-[#F8F8FA] text-[#111317] rounded-xl border border-neutral-200';

export const PageTitle: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({
  title,
  subtitle,
  action,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">{title}</h1>
      {subtitle && <p className="text-xs sm:text-sm text-neutral-400 mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="w-full h-2.5 bg-neutral-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
    <div className="h-full bg-[#D49A3D] rounded-full transition-all duration-300" style={{ width: `${value}%` }} />
  </div>
);

/** Détail d'un rendez-vous ; l'annulation n'est proposée que si le serveur l'autorise. */
export const AppointmentDetailModal: React.FC<{
  appointment: Appointment | null;
  onClose: () => void;
  onChanged: () => void;
}> = ({ appointment, onClose, onChanged }) => {
  const { run } = useApp();
  const [busy, setBusy] = useState(false);
  if (!appointment) return null;
  const canCancel = appointment.allowedActions.includes('cancel');

  const cancel = async () => {
    if (!window.confirm('Confirmer l’annulation de ce rendez-vous ?')) return;
    setBusy(true);
    const done = await run(() => api.appointments.transition(appointment.id, 'cancel'), 'Rendez-vous annulé');
    setBusy(false);
    if (done) {
      onChanged();
      onClose();
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Rendez-vous ${appointment.reference}`}>
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#0B0C0E] border border-white/10">
          <div>
            <span className="text-neutral-400 block">Prestation</span>
            <span className="text-white font-bold text-sm">{appointment.serviceName}</span>
          </div>
          <div>
            <span className="text-neutral-400 block">Statut</span>
            <StatusIndicator status={STATUS_LABELS[appointment.status]} />
          </div>
          <div>
            <span className="text-neutral-400 block">Véhicule</span>
            <span className="text-white font-semibold">
              {appointment.vehicleName} ({appointment.vehicleRegistration})
            </span>
          </div>
          <div>
            <span className="text-neutral-400 block">Date & heure</span>
            <span className="text-white font-mono">{formatDateTime(appointment.startAt)}</span>
          </div>
          <div>
            <span className="text-neutral-400 block">Technicien</span>
            <span className="text-white">{appointment.assignedEmployeeName ?? 'Pas encore affecté'}</span>
          </div>
          <div>
            <span className="text-neutral-400 block">Tarif estimé</span>
            <span className="text-[#D49A3D] font-mono font-bold text-sm">{formatFcfa(appointment.price)}</span>
          </div>
        </div>
        {appointment.customerNotes && (
          <p className="text-neutral-300">
            <span className="text-neutral-400">Vos instructions : </span>
            {appointment.customerNotes}
          </p>
        )}
        {!canCancel && ['pending', 'confirmed', 'rescheduled'].includes(appointment.status) && (
          <p className="text-neutral-400">
            L’annulation en ligne n’est plus possible à l’approche du rendez-vous : contactez l’atelier.
          </p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          {canCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={cancel}
              className="px-4 py-2 rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-medium disabled:opacity-50"
            >
              Annuler ce rendez-vous
            </button>
          )}
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold">
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
};
