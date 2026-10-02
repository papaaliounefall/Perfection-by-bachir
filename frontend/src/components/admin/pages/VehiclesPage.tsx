import React, { useState } from 'react';
import { api } from '../../../api';
import { fuelLabel } from '../../../lib/labels';
import { useApiData } from '../../../lib/useApiData';
import { Vehicle } from '../../../types';
import { EmptyState, ErrorState, LoadingState, SmartImage } from '../../ui/DesignSystem';
import { PageHeader, panel, SearchInput } from './shared';

export const VehiclesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const vehicles = useApiData<Vehicle[]>(() => api.vehicles.list(), [], []);

  const q = search.trim().toLowerCase();
  const filtered = vehicles.data.filter(
    (v) => !q || [v.brand, v.model, v.registration, v.customerName].some((f) => f.toLowerCase().includes(q))
  );

  return (
    <div>
      <PageHeader title="Véhicules" subtitle="Tous les véhicules enregistrés et leur propriétaire." />
      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Immatriculation, marque, client…" />
      </div>
      {vehicles.error && <ErrorState message={vehicles.error} onRetry={vehicles.reload} />}
      {vehicles.loading ? (
        <LoadingState tone="light" />
      ) : filtered.length === 0 ? (
        <EmptyState tone="light" message="Aucun véhicule trouvé." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((v) => (
            <div key={v.id} className={`${panel} overflow-hidden`}>
              <div className="h-36">
                <SmartImage src={v.photo} alt={`${v.brand} ${v.model}`} className="w-full h-full object-cover" />
              </div>
              <div className="p-5 space-y-1 text-xs">
                <h2 className="text-base font-bold font-display">
                  {v.brand} {v.model}
                </h2>
                <p className="font-mono text-[#B87D24] font-semibold">{v.registration}</p>
                <p className="text-neutral-600">
                  Propriétaire : <strong className="text-[#111317]">{v.customerName}</strong>
                </p>
                <p className="text-neutral-500 font-mono">{[v.year, fuelLabel(v.fuel), v.color].filter(Boolean).join(' · ')}</p>
                {v.notes && <p className="text-neutral-500">{v.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
