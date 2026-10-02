import React, { useState } from 'react';
import { api } from '../../../api';
import { useApp } from '../../../context/AppContext';
import { formatDate, formatDateTime, formatFcfa, SEGMENT_LABELS, STATUS_LABELS } from '../../../lib/labels';
import { useApiData } from '../../../lib/useApiData';
import { Appointment, Customer, CustomerSegment, Vehicle } from '../../../types';
import { EmptyState, ErrorState, LoadingState, Modal, StatusIndicator } from '../../ui/DesignSystem';
import { darkInput, Field, ModalActions, PageHeader, panel, PrimaryButton, SearchInput, td, th, useDebounced } from './shared';

const EMPTY = { name: '', phone: '', email: '', address: '' };

const CustomerDetail: React.FC<{
  customer: Customer;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (c: Customer) => void;
}> = ({ customer, canEdit, onClose, onSaved }) => {
  const { run } = useApp();
  const [notes, setNotes] = useState(customer.internalNotes);
  const [segment, setSegment] = useState<CustomerSegment>(customer.segment);
  const vehicles = useApiData<Vehicle[]>(
    async () => (await api.vehicles.list()).filter((v) => v.customerId === customer.id),
    [customer.id],
    []
  );
  const appointments = useApiData<Appointment[]>(() => api.appointments.list({ customerId: customer.id }), [customer.id], []);

  const save = async () => {
    const saved = await run(() => api.customers.update(customer.id, { internalNotes: notes, segment }), 'Fiche client enregistrée');
    if (saved) onSaved(saved);
  };

  return (
    <Modal isOpen onClose={onClose} title={customer.name} subtitle={[customer.phone, customer.email].filter(Boolean).join(' · ')}>
      <div className="space-y-5 text-xs">
        <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-[#0B0C0E] border border-white/10">
          <div>
            <span className="text-neutral-400 block">Client depuis</span>
            <span className="text-white font-semibold">{formatDate(customer.createdAt)}</span>
          </div>
          <div>
            <span className="text-neutral-400 block">Prestations terminées</span>
            <span className="text-[#D49A3D] font-mono font-bold">{formatFcfa(customer.completedAmount)}</span>
          </div>
          <div>
            <span className="text-neutral-400 block">Compte en ligne</span>
            <span className="text-white">{customer.hasAccount ? 'Oui' : 'Non (réservation invité)'}</span>
          </div>
        </div>

        <div>
          <p className="text-neutral-300 font-semibold mb-2">Véhicules ({vehicles.data.length})</p>
          {vehicles.data.map((v) => (
            <p key={v.id} className="text-neutral-400">
              {v.brand} {v.model} · <span className="font-mono">{v.registration}</span>
            </p>
          ))}
        </div>

        <div>
          <p className="text-neutral-300 font-semibold mb-2">Rendez-vous ({appointments.data.length})</p>
          <div className="space-y-1">
            {appointments.data.slice(0, 8).map((a) => (
              <div key={a.id} className="flex justify-between gap-3 text-neutral-400">
                <span>
                  {formatDateTime(a.startAt)} · {a.serviceName}
                </span>
                <StatusIndicator status={STATUS_LABELS[a.status]} />
              </div>
            ))}
          </div>
        </div>

        {canEdit && (
          <>
            <Field label="Segment" htmlFor="segment">
              <select id="segment" value={segment} onChange={(e) => setSegment(e.target.value as CustomerSegment)} className={darkInput}>
                {Object.entries(SEGMENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes internes (invisibles pour le client)" htmlFor="c-notes">
              <textarea id="c-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={darkInput} />
            </Field>
            <div className="flex justify-end">
              <button type="button" onClick={save} className="px-5 py-2 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold">
                Enregistrer
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export const CustomersPage: React.FC = () => {
  const { user, run } = useApp();
  const canEdit = user!.role === 'manager' || user!.role === 'admin';
  const [search, setSearch] = useState('');
  const query = useDebounced(search);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const customers = useApiData<Customer[]>(() => api.customers.list(query), [query], []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await run(() => api.customers.create(form), 'Client ajouté');
    if (created) {
      setCreating(false);
      setForm(EMPTY);
      customers.reload();
    }
  };

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Recherche par nom, téléphone, email ou immatriculation."
        action={canEdit && <PrimaryButton onClick={() => setCreating(true)}>+ Ajouter un client</PrimaryButton>}
      />
      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Nom, téléphone, email, immatriculation…" />
      </div>

      {customers.error && <ErrorState message={customers.error} onRetry={customers.reload} />}
      <div className={`${panel} overflow-hidden`}>
        {customers.loading ? (
          <LoadingState tone="light" />
        ) : customers.data.length === 0 ? (
          <EmptyState tone="light" message="Aucun client trouvé." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-semibold">
                  <th className={th}>Client</th>
                  <th className={th}>Téléphone</th>
                  <th className={th}>Email</th>
                  <th className={th}>Dernière prestation</th>
                  <th className={th}>Segment</th>
                  <th className={`${th} text-right`}>Fiche</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {customers.data.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50">
                    <td className={`${td} font-bold`}>{c.name}</td>
                    <td className={`${td} font-mono text-neutral-600`}>{c.phone}</td>
                    <td className={`${td} text-neutral-600`}>{c.email}</td>
                    <td className={`${td} font-mono text-neutral-600`}>{formatDate(c.lastServiceAt)}</td>
                    <td className={td}>
                      <StatusIndicator status={SEGMENT_LABELS[c.segment]} tone="light" />
                    </td>
                    <td className={`${td} text-right`}>
                      <button
                        type="button"
                        onClick={() => setSelected(c)}
                        className="px-3 py-1.5 rounded border border-neutral-300 bg-white hover:bg-neutral-100 font-semibold"
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <CustomerDetail
          customer={selected}
          canEdit={canEdit}
          onClose={() => setSelected(null)}
          onSaved={(saved) => {
            setSelected(saved);
            customers.setData((list) => list.map((c) => (c.id === saved.id ? saved : c)));
          }}
        />
      )}

      <Modal isOpen={creating} onClose={() => setCreating(false)} title="Nouveau client">
        <form onSubmit={create} className="space-y-4 text-xs">
          <Field label="Nom complet *" htmlFor="nc-name">
            <input id="nc-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={darkInput} />
          </Field>
          <Field label="Téléphone *" htmlFor="nc-phone">
            <input
              id="nc-phone"
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={`${darkInput} font-mono`}
            />
          </Field>
          <Field label="Email *" htmlFor="nc-email">
            <input
              id="nc-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={darkInput}
            />
          </Field>
          <Field label="Adresse" htmlFor="nc-address">
            <input id="nc-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={darkInput} />
          </Field>
          <ModalActions onCancel={() => setCreating(false)} submitLabel="Créer le client" />
        </form>
      </Modal>
    </div>
  );
};
