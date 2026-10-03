import React, { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { api } from '../../../api';
import { useApp } from '../../../context/AppContext';
import { CATEGORY_LABELS, priceLabel } from '../../../lib/labels';
import { PricingType, ServiceCategory, ServiceInput, ServiceItem } from '../../../types';
import { Modal } from '../../ui/DesignSystem';
import { darkInput, Field, ModalActions, PageHeader, panel, PrimaryButton, td, th } from './shared';

const NEW_SERVICE: ServiceInput = {
  name: '',
  category: 'detailing',
  shortDescription: '',
  description: '',
  pricingType: 'from',
  price: null,
  durationMinutes: 120,
  durationLabel: '',
  image: '',
  benefits: [],
  processSteps: [],
  available: true,
  sortOrder: 0,
};

export const ServicesPage: React.FC = () => {
  const { services, reloadServices, run } = useApp();
  const [editing, setEditing] = useState<(ServiceInput & { id?: number }) | null>(null);
  const [saving, setSaving] = useState(false);

  const toggle = async (srv: ServiceItem) => {
    const done = await run(
      () => api.services.update(srv.id, { available: !srv.available }),
      srv.available ? `${srv.name} suspendue (plus réservable)` : `${srv.name} réactivée`
    );
    if (done) reloadServices();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const { id, ...input } = editing;
    const payload = { ...input, price: input.pricingType === 'quote' ? null : input.price };
    const done = await run(
      () => (id ? api.services.update(id, payload) : api.services.create(payload)),
      id ? 'Prestation modifiée' : 'Prestation créée'
    );
    setSaving(false);
    if (done) {
      setEditing(null);
      reloadServices();
    }
  };

  return (
    <div>
      <PageHeader
        title="Prestations"
        subtitle="Une prestation suspendue n’est plus réservable mais reste dans l’historique."
        action={<PrimaryButton onClick={() => setEditing({ ...NEW_SERVICE, sortOrder: services.length })}>+ Ajouter une prestation</PrimaryButton>}
      />

      <div className={`${panel} overflow-hidden`}>
        <ul className="md:hidden divide-y divide-neutral-200">
          {services.map((srv) => (
            <li key={srv.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{srv.name}</p>
                  <p className="text-xs text-neutral-500">
                    {CATEGORY_LABELS[srv.category]} · {srv.durationMinutes} min
                  </p>
                  <p className="text-xs font-mono font-bold mt-1">{priceLabel(srv)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const { slug: _slug, ...rest } = srv;
                    setEditing(rest);
                  }}
                  className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg border border-neutral-200"
                  aria-label={`Modifier ${srv.name}`}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-neutral-600">Réservable en ligne</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={srv.available}
                  onClick={() => toggle(srv)}
                  className={`w-12 h-7 rounded-full p-0.5 flex items-center ${srv.available ? 'bg-[#D49A3D] justify-end' : 'bg-neutral-300 justify-start'}`}
                  aria-label={`Réservable : ${srv.name}`}
                >
                  <span className="w-6 h-6 rounded-full bg-white shadow" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-semibold">
                <th className={th}>Prestation</th>
                <th className={th}>Catégorie</th>
                <th className={th}>Durée planifiée</th>
                <th className={th}>Tarif</th>
                <th className={th}>Réservable</th>
                <th className={`${th} text-right`}>Modifier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {services.map((srv) => (
                <tr key={srv.id} className="hover:bg-neutral-50">
                  <td className={td}>
                    <p className="font-bold text-sm">{srv.name}</p>
                    <p className="text-neutral-500 line-clamp-1 max-w-md">{srv.shortDescription}</p>
                  </td>
                  <td className={`${td} text-neutral-600`}>{CATEGORY_LABELS[srv.category]}</td>
                  <td className={`${td} font-mono`}>
                    {srv.durationMinutes} min
                    {srv.durationLabel && <span className="block text-neutral-500">affiché : {srv.durationLabel}</span>}
                  </td>
                  <td className={`${td} font-mono font-bold`}>{priceLabel(srv)}</td>
                  <td className={td}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={srv.available}
                      onClick={() => toggle(srv)}
                      className={`w-11 h-6 rounded-full p-0.5 flex items-center ${srv.available ? 'bg-[#D49A3D] justify-end' : 'bg-neutral-300 justify-start'}`}
                      aria-label={`Réservable : ${srv.name}`}
                    >
                      <span className="w-5 h-5 rounded-full bg-white shadow" />
                    </button>
                  </td>
                  <td className={`${td} text-right`}>
                    <button
                      type="button"
                      onClick={() => {
                        const { slug: _slug, ...rest } = srv;
                        setEditing(rest);
                      }}
                      className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-100"
                      aria-label={`Modifier ${srv.name}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Modifier la prestation' : 'Nouvelle prestation'}>
        {editing && (
          <form onSubmit={save} className="space-y-4 text-xs">
            <Field label="Nom *" htmlFor="s-name">
              <input id="s-name" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={darkInput} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Catégorie" htmlFor="s-cat">
                <select
                  id="s-cat"
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value as ServiceCategory })}
                  className={darkInput}
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tarification" htmlFor="s-pricing">
                <select
                  id="s-pricing"
                  value={editing.pricingType}
                  onChange={(e) => setEditing({ ...editing, pricingType: e.target.value as PricingType })}
                  className={darkInput}
                >
                  <option value="fixed">Prix fixe</option>
                  <option value="from">À partir de</option>
                  <option value="quote">Sur devis</option>
                </select>
              </Field>
              {editing.pricingType !== 'quote' && (
                <Field label="Prix (FCFA) *" htmlFor="s-price">
                  <input
                    id="s-price"
                    type="number"
                    min={0}
                    step={500}
                    required
                    value={editing.price ?? ''}
                    onChange={(e) => setEditing({ ...editing, price: e.target.value ? Number(e.target.value) : null })}
                    className={`${darkInput} font-mono`}
                  />
                </Field>
              )}
              <Field label="Durée planifiée (minutes) *" htmlFor="s-minutes">
                <input
                  id="s-minutes"
                  type="number"
                  min={15}
                  step={15}
                  required
                  value={editing.durationMinutes}
                  onChange={(e) => setEditing({ ...editing, durationMinutes: Number(e.target.value) })}
                  className={`${darkInput} font-mono`}
                />
              </Field>
              <Field label="Durée affichée" htmlFor="s-label">
                <input
                  id="s-label"
                  placeholder="Ex : 2h - 4h"
                  value={editing.durationLabel}
                  onChange={(e) => setEditing({ ...editing, durationLabel: e.target.value })}
                  className={darkInput}
                />
              </Field>
            </div>
            <Field label="Résumé" htmlFor="s-short">
              <textarea
                id="s-short"
                rows={2}
                value={editing.shortDescription}
                onChange={(e) => setEditing({ ...editing, shortDescription: e.target.value })}
                className={darkInput}
              />
            </Field>
            <Field label="Description détaillée" htmlFor="s-desc">
              <textarea
                id="s-desc"
                rows={4}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className={darkInput}
              />
            </Field>
            <p className="text-neutral-500">
              La durée planifiée bloque le planning et détermine les créneaux proposés à la réservation.
            </p>
            <ModalActions onCancel={() => setEditing(null)} submitLabel="Enregistrer" busy={saving} />
          </form>
        )}
      </Modal>
    </div>
  );
};
