import React from 'react';
import { api } from '../../../api';
import { useApp } from '../../../context/AppContext';
import { EMPLOYEE_STATUS_LABELS } from '../../../lib/labels';
import { useApiData } from '../../../lib/useApiData';
import { Employee, EmployeeStatus } from '../../../types';
import { EmptyState, ErrorState, LoadingState, StatusIndicator } from '../../ui/DesignSystem';
import { PageHeader, panel } from './shared';

export const TeamPage: React.FC = () => {
  const { run } = useApp();
  const team = useApiData<Employee[]>(() => api.employees.list(), [], []);

  const setStatus = async (member: Employee, status: EmployeeStatus) => {
    const updated = await run(() => api.employees.setStatus(member.id, status));
    if (updated) team.setData((list) => list.map((m) => (m.id === updated.id ? updated : m)));
  };

  return (
    <div>
      <PageHeader
        title="Équipe"
        subtitle="Disponibilité et rendez-vous du jour. Les comptes se créent dans l’administration Django."
      />
      {team.error && <ErrorState message={team.error} onRetry={team.reload} />}
      {team.loading ? (
        <LoadingState tone="light" />
      ) : team.data.length === 0 ? (
        <EmptyState tone="light" message="Aucun membre d’équipe enregistré." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {team.data.map((member) => (
            <div key={member.id} className={`${panel} p-6 space-y-4 ${member.isActive ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold font-display">{member.name}</h2>
                  <p className="text-xs text-[#B87D24] font-semibold">{member.jobTitle}</p>
                  {member.specialty && <p className="text-xs text-neutral-500 mt-1">{member.specialty}</p>}
                </div>
                <StatusIndicator status={EMPLOYEE_STATUS_LABELS[member.status]} tone="light" />
              </div>
              <p className="text-xs font-mono flex justify-between border-t border-neutral-100 pt-3">
                <span className="text-neutral-500">Rendez-vous aujourd’hui</span>
                <strong>{member.todayAppointments}</strong>
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(EMPLOYEE_STATUS_LABELS) as EmployeeStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={member.status === st}
                    onClick={() => setStatus(member, st)}
                    className={`py-1.5 rounded text-[11px] font-medium border ${
                      member.status === st
                        ? 'bg-[#111317] text-white border-[#111317]'
                        : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {EMPLOYEE_STATUS_LABELS[st]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
