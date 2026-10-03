import React, { useRef, useState } from 'react';
import { Camera, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { api } from '../../../api';
import { useApp } from '../../../context/AppContext';
import { useApiData } from '../../../lib/useApiData';
import { Appointment, AppointmentPhoto, PhotoKind, WorkshopStep } from '../../../types';
import { darkInput } from './shared';

const KINDS: { id: PhotoKind; label: string }[] = [
  { id: 'inspection', label: 'Inspection à la réception' },
  { id: 'before', label: 'Avant' },
  { id: 'after', label: 'Après' },
];
const ACCEPTED = 'image/jpeg,image/png,image/webp';

/** Étapes de traitement à cocher + photos d'intervention (dans la fiche « Gérer »). */
export const WorkshopPanel: React.FC<{ apt: Appointment; onProgress: (steps: WorkshopStep[], progress: number | null) => void }> = ({
  apt,
  onProgress,
}) => {
  const { run, addToast } = useApp();
  const [busyStep, setBusyStep] = useState<number | null>(null);
  const photos = useApiData<AppointmentPhoto[]>(() => api.workshop.photos(apt.id), [apt.id], []);
  const [kind, setKind] = useState<PhotoKind>(apt.status === 'received' ? 'inspection' : apt.status === 'in_progress' ? 'before' : 'after');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const editable = apt.status === 'in_progress';
  const done = apt.steps.filter((s) => s.done).length;

  const toggle = async (step: WorkshopStep) => {
    setBusyStep(step.id);
    const progress = await run(() => api.workshop.setStep(apt.id, step.id, !step.done));
    setBusyStep(null);
    if (progress !== undefined) {
      onProgress(
        apt.steps.map((s) => (s.id === step.id ? { ...s, done: !s.done, doneAt: !s.done ? new Date().toISOString() : null } : s)),
        progress
      );
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.split(',').includes(file.type)) return addToast('Photo refusée', 'Formats acceptés : JPEG, PNG ou WebP.', 'warning');
    if (file.size > 5 * 1024 * 1024) return addToast('Photo refusée', 'Image trop lourde (5 Mo maximum).', 'warning');
    setUploading(true);
    const added = await run(() => api.workshop.uploadPhoto(apt.id, file, kind, caption), 'Photo ajoutée');
    setUploading(false);
    if (added) {
      photos.setData((list) => [...list, added]);
      setCaption('');
    }
  };

  const remove = async (photo: AppointmentPhoto) => {
    if (!window.confirm('Supprimer cette photo ?')) return;
    const ok = await run(async () => {
      await api.workshop.deletePhoto(apt.id, photo.id);
      return true;
    }, 'Photo supprimée');
    if (ok) photos.setData((list) => list.filter((p) => p.id !== photo.id));
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-neutral-300 font-semibold">Étapes de traitement</p>
          {apt.steps.length > 0 && (
            <span className="font-mono text-neutral-400">
              {done}/{apt.steps.length}
            </span>
          )}
        </div>
        {apt.steps.length === 0 ? (
          <p className="text-neutral-500">Les étapes sont créées au dépôt du véhicule (« Véhicule déposé »).</p>
        ) : (
          <>
            <ul className="space-y-2">
              {apt.steps.map((step) => (
                <li key={step.id}>
                  <button
                    type="button"
                    disabled={!editable || busyStep === step.id}
                    onClick={() => toggle(step)}
                    aria-pressed={step.done}
                    className={`w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors disabled:cursor-default ${
                      step.done ? 'border-emerald-500/40 bg-emerald-500/10 text-white' : 'border-white/10 bg-[#0B0C0E] text-neutral-300'
                    } ${editable ? 'hover:border-[#D49A3D]/60' : 'opacity-80'}`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-neutral-500 shrink-0" />
                    )}
                    <span className="flex-1">
                      {step.order}. {step.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {!editable && (
              <p className="text-neutral-500 mt-2">
                Les étapes se cochent pendant le traitement (statut « En cours »), par le technicien affecté ou un manager.
              </p>
            )}
          </>
        )}
      </section>

      <section>
        <p className="text-neutral-300 font-semibold mb-2">Photos d’intervention</p>
        {photos.data.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {photos.data.map((photo) => (
              <figure key={photo.id} className="relative rounded-lg overflow-hidden border border-white/10 bg-[#0B0C0E]">
                <a href={photo.url} target="_blank" rel="noopener">
                  <img src={photo.url} alt={photo.caption || photo.kindLabel} className="w-full h-24 object-cover" loading="lazy" />
                </a>
                <figcaption className="px-2 py-1 text-[11px] text-neutral-300 truncate">
                  <span className="text-[#D49A3D]">{photo.kindLabel}</span>
                  {photo.caption && ` · ${photo.caption}`}
                </figcaption>
                <button
                  type="button"
                  onClick={() => remove(photo)}
                  aria-label="Supprimer la photo"
                  className="absolute top-1 right-1 w-8 h-8 rounded-md bg-black/70 text-neutral-300 hover:text-rose-400 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </figure>
            ))}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <select aria-label="Type de photo" value={kind} onChange={(e) => setKind(e.target.value as PhotoKind)} className={`${darkInput} sm:w-auto`}>
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
          <input
            aria-label="Légende (optionnel)"
            placeholder="Légende (ex. rayure aile avant)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className={darkInput}
          />
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED}
            capture="environment"
            className="hidden"
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
            className="min-h-11 inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold whitespace-nowrap disabled:opacity-60"
          >
            <Camera className="w-4 h-4" /> {uploading ? 'Envoi…' : 'Prendre / ajouter'}
          </button>
        </div>
        <p className="text-neutral-500 mt-2">Visibles par le client propriétaire dans son dossier. Position GPS supprimée.</p>
      </section>
    </div>
  );
};
