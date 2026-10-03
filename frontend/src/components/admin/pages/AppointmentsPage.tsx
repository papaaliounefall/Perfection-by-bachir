import React, { useEffect, useState } from 'react';
import { api } from '../../../api';
import { useApp } from '../../../context/AppContext';
import {
  ACTION_LABELS,
  CLOSED_STATUSES,
  COMPLETED_STATUSES,
  DESTRUCTIVE_ACTIONS,
  formatDateTime,
  formatFcfa,
  IN_WORKSHOP_STATUSES,
  isoDay,
  STATUS_LABELS,
} from '../../../lib/labels';
import { useApiData } from '../../../lib/useApiData';
import { Appointment, AppointmentAction, AppointmentStatus, Employee, TimeSlot } from '../../../types';
import { EmptyState, ErrorState, LoadingState, Modal, StatusIndicator } from '../../ui/DesignSystem';
import { darkInput, Field, PageHeader, panel, td, th } from './shared';

const FILTERS: { label: string; statuses?: AppointmentStatus[] }[] = [
  { label: 'Tous' },
  { label: 'À confirmer', statuses: ['pending', 'rescheduled'] },
  { label: 'Confirmés', statuses: ['confirmed'] },
  { label: 'À l’atelier', statuses: IN_WORKSHOP_STATUSES },
  { label: 'Terminés', statuses: COMPLETED_STATUSES },
  { label: 'Clos', statuses: CLOSED_STATUSES },
];

const RESCHEDULABLE: AppointmentStatus[] = ['pending', 'confirmed', 'rescheduled'];

const ActionButtons: React.FC<{ apt: Appointment; onDone: (updated: Appointment) => void; align?: 'start' | 'end' }> = ({
  apt,
  onDone,
  align = 'end',
}) => {
  const { run } = useApp();
  const [busy, setBusy] = useState(false);

  const act = async (action: AppointmentAction) => {
    if (DESTRUCTIVE_ACTIONS.includes(action) && !window.confirm(`${ACTION_LABELS[action]} le rendez-vous ${apt.reference} ?`)) return;
    setBusy(true);
    const updated = await run(() => api.appointments.transition(apt.id, action), `${apt.reference} : ${ACTION_LABELS[action]}`);
    setBusy(false);
    if (updated) onDone(updated);
  };

  return (
    <div className={`flex flex-wrap gap-2 lg:gap-1.5 ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
      {apt.allowedActions.map((action) => (
        <button
          key={action}
          type="button"
          disabled={busy}
          onClick={() => act(action)}
          className={`min-h-10 lg:min-h-0 px-3.5 lg:px-2.5 py-2 lg:py-1 rounded-lg lg:rounded text-xs lg:text-[11px] font-semibold disabled:opacity-50 ${
            DESTRUCTIVE_ACTIONS.includes(action)
              ? 'border border-rose-300 text-rose-700 hover:bg-rose-50'
              : 'bg-[#111317] text-white hover:bg-neutral-800'
          }`}
        >
          {ACTION_LABELS[action]}
        </button>
      ))}
    </div>
  );
};

const ManageModal: React.FC<{
  apt: Appointment;
  employees: Employee[];
  isManager: boolean;
  onClose: () => void;
  onUpdated: (a: Appointment) => void;
}> = ({ apt, employees, isManager, onClose, onUpdated }) => {
  const { run } = useApp();
  const [notes, setNotes] = useState(apt.internalNotes ?? '');
  const [employeeId, setEmployeeId] = useState<string>(apt.assignedEmployeeId ? String(apt.assignedEmployeeId) : '');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    setNewTime('');
    if (newDate) api.availability.slots(apt.serviceId, newDate).then(setSlots).catch(() => setSlots([]));
    else setSlots([]);
  }, [newDate, apt.serviceId]);

  const apply = async (action: () => Promise<Appointment>, message: string) => {
    const updated = await run(action, message);
    if (updated) onUpdated(updated);
  };

  return (
    <Modal isOpen onClose={onClose} title={`Rendez-vous ${apt.reference}`} subtitle={`${apt.vehicleName} — ${apt.serviceName}`}>
      <div className="space-y-6 text-xs">
        <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[#0B0C0E] border border-white/10">
          <div>
            <span className="text-neutral-400 block">Client</span>
            <span className="text-white font-semibold">{apt.customerName}</span>
            <span className="block text-neutral-400 font-mono">{apt.customerPhone}</span>
          </div>
          <div>
            <span className="text-neutral-400 block">Créneau</span>
            <span className="text-white font-mono">{formatDateTime(apt.startAt)}</span>
            <span className="block">
              <StatusIndicator status={STATUS_LABELS[apt.status]} />
            </span>
          </div>
          {apt.customerNotes && (
            <p className="col-span-2 text-neutral-300">
              <span className="text-neutral-400">Instructions du client : </span>
              {apt.customerNotes}
            </p>
          )}
        </div>

        {isManager && (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              apply(() => api.appointments.assign(apt.id, employeeId ? Number(employeeId) : null), 'Affectation enregistrée');
            }}
          >
            <div className="flex-1">
              <Field label="Technicien affecté" htmlFor="assign">
                <select id="assign" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={darkInput}>
                  <option value="">Non affecté</option>
                  {employees
                    .filter((m) => m.isActive)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.jobTitle}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
            <button type="submit" className="px-4 py-2.5 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold">
              Affecter
            </button>
          </form>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply(() => api.appointments.updateNotes(apt.id, notes), 'Notes enregistrées');
          }}
          className="space-y-2"
        >
          <Field label="Notes internes (jamais visibles par le client)" htmlFor="notes">
            <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={darkInput} />
          </Field>
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 rounded-lg border border-white/15 text-white hover:bg-white/5">
              Enregistrer les notes
            </button>
          </div>
        </form>

        {isManager && RESCHEDULABLE.includes(apt.status) && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newDate && newTime) apply(() => api.appointments.reschedule(apt.id, newDate, newTime), 'Rendez-vous reporté');
            }}
            className="space-y-2"
          >
            <p className="text-neutral-300 font-semibold">Reporter</p>
            <div className="flex flex-wrap items-end gap-2">
              <input
                type="date"
                aria-label="Nouvelle date"
                min={isoDay(new Date())}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className={`${darkInput} w-auto`}
              />
              <select
                aria-label="Nouvel horaire"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                disabled={!slots.length}
                className={`${darkInput} w-auto`}
              >
                <option value="">{newDate ? (slots.length ? 'Horaire' : 'Aucun créneau') : '—'}</option>
                {slots
                  .filter((s) => s.available)
                  .map((s) => (
                    <option key={s.time} value={s.time}>
                      {s.time}
                    </option>
                  ))}
              </select>
              <button type="submit" disabled={!newTime} className="px-4 py-2.5 rounded-lg border border-white/15 text-white disabled:opacity-40">
                Reporter
              </button>
            </div>
          </form>
        )}

        {apt.history && apt.history.length > 0 && (
          <div>
            <p className="text-neutral-300 font-semibold mb-2">Historique</p>
            <ol className="space-y-1.5 text-neutral-400">
              {apt.history.map((h, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>
                    {h.action === 'create' ? 'Création' : ACTION_LABELS[h.action as AppointmentAction] ?? h.action}
                    {h.toStatus && h.fromStatus !== h.toStatus && ` → ${STATUS_LABELS[h.toStatus as AppointmentStatus]}`}
                    {h.note && <span className="text-neutral-500"> · {h.note}</span>}
                  </span>
                  <span className="font-mono shrink-0">
                    {formatDateTime(h.createdAt)}
                    {h.changedBy ? ` · ${h.changedBy}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Modal>
  );
};

export const AppointmentsPage: React.FC = () => {
  const { user } = useApp();
  const isManager = user!.role === 'manager' || user!.role === 'admin';
  const [filter, setFilter] = useState(FILTERS[0]);
  const [date, setDate] = useState('');
  const [editing, setEditing] = useState<Appointment | null>(null);

  const appointments = useApiData<Appointment[]>(
    () => api.appointments.list({ status: filter.statuses, date: date || undefined }),
    [filter, date],
    []
  );
  const employees = useApiData<Employee[]>(() => (isManager ? api.employees.list() : Promise.resolve([])), [isManager], []);

  const replace = (updated: Appointment) => {
    appointments.setData((list) => list.map((a) => (a.id === updated.id ? updated : a)));
    if (editing?.id === updated.id) setEditing(updated);
  };

  return (
    <div>
      <PageHeader
        title="Rendez-vous"
        subtitle={
          isManager
            ? 'Confirmez, faites progresser et affectez les rendez-vous. Seules les actions autorisées sont proposées.'
            : 'Vos prestations, les véhicules attendus aujourd’hui au comptoir et ceux prêts à être restitués.'
        }
      />

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-2 mb-6">
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1 sm:pb-0">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`shrink-0 px-4 py-2.5 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap ${
              filter === f ? 'bg-[#111317] text-white border-[#111317]' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
            }`}
          >
            {f.label}
          </button>
        ))}
        </div>
        <div className="flex items-center gap-3 sm:ml-auto">
          <input
            type="date"
            aria-label="Filtrer par date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 sm:py-1.5 rounded-lg border border-neutral-200 bg-white text-xs"
          />
          {date && (
            <button type="button" onClick={() => setDate('')} className="text-xs text-neutral-500 underline whitespace-nowrap">
              Toutes les dates
            </button>
          )}
        </div>
      </div>

      {appointments.error && <ErrorState message={appointments.error} onRetry={appointments.reload} />}
      <div className={`${panel} overflow-hidden`}>
        {appointments.loading ? (
          <LoadingState tone="light" />
        ) : appointments.data.length === 0 ? (
          <EmptyState tone="light" message="Aucun rendez-vous pour ces critères." />
        ) : (
          <>
          <ul className="lg:hidden divide-y divide-neutral-200">
            {appointments.data.map((apt) => (
              <li key={apt.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold">{formatDateTime(apt.startAt)}</p>
                    <p className="font-mono text-[11px] text-neutral-400">{apt.reference}</p>
                  </div>
                  <StatusIndicator status={STATUS_LABELS[apt.status]} tone="light" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <p>
                    <span className="block text-neutral-500">Client</span>
                    <span className="font-semibold">{apt.customerName}</span>{' '}
                    <a href={`tel:${apt.customerPhone}`} className="font-mono text-[#B87D24] underline">
                      {apt.customerPhone}
                    </a>
                  </p>
                  <p>
                    <span className="block text-neutral-500">Véhicule</span>
                    {apt.vehicleName} <span className="font-mono text-neutral-500">{apt.vehicleRegistration}</span>
                  </p>
                  <p>
                    <span className="block text-neutral-500">Prestation</span>
                    {apt.serviceName} <span className="font-mono text-neutral-500">· {formatFcfa(apt.price)}</span>
                  </p>
                  <p>
                    <span className="block text-neutral-500">Technicien</span>
                    {apt.assignedEmployeeName ?? 'Non affecté'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButtons apt={apt} onDone={replace} align="start" />
                  <button
                    type="button"
                    onClick={() => setEditing(apt)}
                    className="min-h-10 px-3.5 py-2 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 text-xs font-semibold"
                  >
                    Gérer
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-semibold">
                  <th className={th}>Date</th>
                  <th className={th}>Client</th>
                  <th className={th}>Véhicule</th>
                  <th className={th}>Prestation</th>
                  <th className={th}>Technicien</th>
                  <th className={th}>Statut</th>
                  <th className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {appointments.data.map((apt) => (
                  <tr key={apt.id} className="hover:bg-neutral-50 align-top">
                    <td className={`${td} font-mono whitespace-nowrap`}>
                      {formatDateTime(apt.startAt)}
                      <span className="block text-neutral-400">{apt.reference}</span>
                    </td>
                    <td className={`${td} font-semibold`}>
                      {apt.customerName}
                      <span className="block font-mono font-normal text-neutral-500">{apt.customerPhone}</span>
                    </td>
                    <td className={td}>
                      {apt.vehicleName}
                      <span className="block font-mono text-neutral-500">{apt.vehicleRegistration}</span>
                    </td>
                    <td className={td}>
                      {apt.serviceName}
                      <span className="block font-mono text-neutral-500">{formatFcfa(apt.price)}</span>
                    </td>
                    <td className={`${td} text-neutral-600`}>{apt.assignedEmployeeName ?? 'Non affecté'}</td>
                    <td className={td}>
                      <StatusIndicator status={STATUS_LABELS[apt.status]} tone="light" />
                    </td>
                    <td className={`${td} text-right space-y-1.5`}>
                      <ActionButtons apt={apt} onDone={replace} />
                      <button
                        type="button"
                        onClick={() => setEditing(apt)}
                        className="px-2.5 py-1 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-[11px] font-semibold"
                      >
                        Gérer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {editing && (
        <ManageModal
          apt={editing}
          employees={employees.data}
          isManager={isManager}
          onClose={() => setEditing(null)}
          onUpdated={replace}
        />
      )}
    </div>
  );
};
