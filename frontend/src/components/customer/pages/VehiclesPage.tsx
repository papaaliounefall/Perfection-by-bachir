import React, { useRef, useState } from 'react';
import { Camera, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../api';
import { useApp } from '../../../context/AppContext';
import { formatDateTime, FUEL_LABELS, fuelLabel, STATUS_LABELS } from '../../../lib/labels';
import { Fuel, VehicleInput } from '../../../types';
import { EmptyState, Modal, SmartImage, StatusIndicator } from '../../ui/DesignSystem';
import { CustomerData } from '../CustomerPortal';
import { card, PageTitle } from './shared';

const EMPTY: VehicleInput = { brand: '', model: '', registration: '', year: null, fuel: '', color: '', notes: '' };
const ACCEPTED = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

/** Vérification immédiate côté navigateur ; le serveur revérifie tout. */
const checkPhoto = (file: File) =>
  !ACCEPTED.split(',').includes(file.type)
    ? 'Formats acceptés : JPEG, PNG ou WebP.'
    : file.size > MAX_BYTES
    ? 'Image trop lourde (5 Mo maximum).'
    : null;
const inputClass = 'w-full px-3.5 py-2.5 rounded-lg bg-[#0B0C0E] border border-white/15 text-sm text-white';

export const VehiclesPage: React.FC<{ data: CustomerData }> = ({ data }) => {
  const { run, startBookingWithService, addToast } = useApp();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<VehicleInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const selected = data.vehicles.find((v) => v.id === selectedId) ?? data.vehicles[0];
  const vehicleAppointments = data.appointments.filter((a) => a.vehicleId === selected?.id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const created = await run(() => api.vehicles.create(form), 'Véhicule enregistré');
    if (created && photo) await run(() => api.vehicles.uploadPhoto(created.id, photo));
    setSaving(false);
    if (created) {
      setModalOpen(false);
      setForm(EMPTY);
      setPhoto(null);
      setSelectedId(created.id);
      data.reload();
    }
  };

  const changePhoto = async (file: File | undefined) => {
    if (!file || !selected) return;
    const problem = checkPhoto(file);
    if (problem) return addToast('Photo refusée', problem, 'warning');
    setUploading(true);
    const done = await run(() => api.vehicles.uploadPhoto(selected.id, file), 'Photo mise à jour');
    setUploading(false);
    if (done) data.reload();
  };

  const removePhoto = async () => {
    if (!selected || !window.confirm('Retirer la photo de ce véhicule ?')) return;
    const done = await run(() => api.vehicles.removePhoto(selected.id), 'Photo retirée');
    if (done) data.reload();
  };

  return (
    <div className="space-y-8">
      <PageTitle
        title="Mes véhicules"
        subtitle="Le carnet d’entretien digital de chacun de vos véhicules."
        action={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold text-xs hover:bg-[#e0a84b]"
          >
            <Plus className="w-4 h-4" /> Ajouter un véhicule
          </button>
        }
      />

      {data.vehicles.length === 0 ? (
        <EmptyState message="Aucun véhicule enregistré pour le moment." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {data.vehicles.map((veh) => (
            <button
              key={veh.id}
              type="button"
              onClick={() => setSelectedId(veh.id)}
              aria-pressed={veh.id === selected?.id}
              className={`${card} text-left overflow-hidden ${veh.id === selected?.id ? 'ring-2 ring-[#D49A3D]' : ''}`}
            >
              <div className="h-40">
                <SmartImage src={veh.photo} alt={`${veh.brand} ${veh.model}`} className="w-full h-full object-cover" />
              </div>
              <div className="p-5">
                <h2 className="text-base font-bold font-display">
                  {veh.brand} {veh.model}
                </h2>
                <p className="text-xs font-mono text-neutral-600 mt-0.5">{veh.registration}</p>
                <p className="text-xs text-neutral-500 font-mono mt-2">
                  {[veh.year, fuelLabel(veh.fuel), veh.color].filter(Boolean).join(' · ')}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className={`${card} p-6 space-y-4`}>
          <div className="flex flex-col sm:flex-row gap-5 border-b border-neutral-200 pb-4">
            <div className="sm:w-56 shrink-0 space-y-2">
              <div className="h-36 rounded-lg overflow-hidden border border-neutral-200">
                <SmartImage src={selected.photo} alt={`${selected.brand} ${selected.model}`} className="w-full h-full object-cover" />
              </div>
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPTED}
                className="hidden"
                aria-label="Choisir une photo du véhicule"
                onChange={(e) => {
                  changePhoto(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-semibold hover:bg-neutral-100 disabled:opacity-50"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {uploading ? 'Envoi…' : selected.photo ? 'Changer la photo' : 'Ajouter une photo'}
                </button>
                {selected.photo && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    aria-label="Retirer la photo"
                    className="px-2.5 rounded-lg border border-neutral-300 bg-white text-neutral-500 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold font-display">
                {selected.brand} {selected.model}
              </h2>
              <p className="text-xs text-neutral-500 font-mono">Carnet digital · {selected.registration}</p>
            </div>
            <button
              type="button"
              onClick={() => startBookingWithService()}
              className="px-4 py-2 rounded-lg bg-[#111317] text-white text-xs font-semibold hover:bg-neutral-800"
            >
              Réserver un soin
            </button>
            </div>
          </div>
          <h3 className="text-sm font-bold">Rendez-vous et prestations</h3>
          {vehicleAppointments.length === 0 ? (
            <p className="text-xs text-neutral-500">Aucun rendez-vous pour ce véhicule.</p>
          ) : (
            <div className="space-y-2">
              {vehicleAppointments.map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-white border border-neutral-200 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-sm">{a.serviceName}</p>
                    <p className="text-neutral-500 font-mono">
                      {formatDateTime(a.startAt)} · {a.reference}
                    </p>
                  </div>
                  <StatusIndicator status={STATUS_LABELS[a.status]} tone="light" />
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-neutral-500">
            Les photos Avant / Après prises par l’atelier seront ajoutées ici (phase 2).
          </p>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Ajouter un véhicule">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(
              [
                ['brand', 'Marque *', true],
                ['model', 'Modèle *', true],
                ['registration', 'Immatriculation *', true],
                ['color', 'Couleur', false],
              ] as const
            ).map(([field, label, required]) => (
              <div key={field}>
                <label htmlFor={`nv-${field}`} className="block text-xs text-neutral-300 mb-1">
                  {label}
                </label>
                <input
                  id={`nv-${field}`}
                  required={required}
                  value={form[field] ?? ''}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className={`${inputClass} ${field === 'registration' ? 'font-mono uppercase' : ''}`}
                />
              </div>
            ))}
            <div>
              <label htmlFor="nv-year" className="block text-xs text-neutral-300 mb-1">
                Année
              </label>
              <input
                id="nv-year"
                type="number"
                min={1950}
                value={form.year ?? ''}
                onChange={(e) => setForm({ ...form, year: e.target.value ? Number(e.target.value) : null })}
                className={`${inputClass} font-mono`}
              />
            </div>
            <div>
              <label htmlFor="nv-fuel" className="block text-xs text-neutral-300 mb-1">
                Motorisation
              </label>
              <select
                id="nv-fuel"
                value={form.fuel}
                onChange={(e) => setForm({ ...form, fuel: e.target.value as Fuel })}
                className={inputClass}
              >
                <option value="">Non précisé</option>
                {Object.entries(FUEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="nv-photo" className="block text-xs text-neutral-300 mb-1">
              Photo du véhicule (optionnel — JPEG, PNG ou WebP, 5 Mo max)
            </label>
            <input
              id="nv-photo"
              type="file"
              accept={ACCEPTED}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                const problem = file && checkPhoto(file);
                if (problem) {
                  addToast('Photo refusée', problem, 'warning');
                  e.target.value = '';
                  setPhoto(null);
                } else setPhoto(file);
              }}
              className="block w-full text-xs text-neutral-300 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-[#D49A3D] file:text-[#0B0C0E] file:font-semibold"
            />
            <p className="text-[11px] text-neutral-500 mt-1">
              La photo n’est visible que par vous et l’atelier. Sa position GPS éventuelle est supprimée.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-white/15 text-xs text-neutral-300">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold text-xs disabled:opacity-60">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
