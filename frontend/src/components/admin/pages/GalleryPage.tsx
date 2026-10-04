import React, { useState } from 'react';
import { Eye, EyeOff, Pencil, Star, Trash2 } from 'lucide-react';
import { api } from '../../../api';
import { useApp } from '../../../context/AppContext';
import { CATEGORY_LABELS, formatDate } from '../../../lib/labels';
import { useApiData } from '../../../lib/useApiData';
import { ManagedHighlight, ManagedProject, ManagedTestimonial, ProjectInput, ServiceCategory } from '../../../types';
import { BeforeAfterSlider, EmptyState, ErrorState, LoadingState, Modal } from '../../ui/DesignSystem';
import { darkInput, Field, ModalActions, PageHeader, panel, PrimaryButton } from './shared';

const ACCEPTED = 'image/jpeg,image/png,image/webp';
const TABS = [
  { id: 'projects', label: 'Réalisations' },
  { id: 'testimonials', label: 'Avis clients' },
  { id: 'highlights', label: 'Chiffres clés' },
] as const;

const PublishedBadge: React.FC<{ published: boolean }> = ({ published }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
      published ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'
    }`}
  >
    {published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
    {published ? 'Publié sur le site' : 'Brouillon (non visible)'}
  </span>
);

const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }> = ({ label, className = '', children, ...props }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    {...props}
    className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-40 ${className}`}
  >
    {children}
  </button>
);

/** Un appel sans résultat qui a réussi renvoie true (run renvoie undefined en cas d'échec). */
const ok = async (fn: () => Promise<unknown>) => {
  await fn();
  return true;
};

// ---------- Réalisations ----------

const EMPTY_PROJECT: ProjectInput = {
  title: '',
  vehicleLabel: '',
  category: 'polishing',
  description: '',
  servicesPerformed: '',
  durationLabel: '',
  completedOn: null,
  isPublished: false,
  featured: false,
};

const ProjectForm: React.FC<{ project?: ManagedProject; onClose: () => void; onSaved: () => void }> = ({ project, onClose, onSaved }) => {
  const { run } = useApp();
  const [form, setForm] = useState<ProjectInput>(project ? { ...project } : EMPTY_PROJECT);
  const [before, setBefore] = useState<File | null>(null);
  const [after, setAfter] = useState<File | null>(null);
  const [consent, setConsent] = useState(!!project);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<ProjectInput>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const saved = await run(
      () => (project ? api.gallery.updateProject(project.id, form) : api.gallery.createProject(form, before!, after!)),
      project ? 'Réalisation modifiée' : 'Réalisation ajoutée'
    );
    setBusy(false);
    if (saved) onSaved();
  };

  const fileInput = (id: string, label: string, onPick: (f: File | null) => void) => (
    <Field label={label} htmlFor={id}>
      <input
        id={id}
        type="file"
        accept={ACCEPTED}
        required
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className="block w-full text-xs text-neutral-300 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-[#D49A3D] file:text-[#0B0C0E] file:font-semibold"
      />
    </Field>
  );

  return (
    <Modal isOpen onClose={onClose} title={project ? 'Modifier la réalisation' : 'Nouvelle réalisation Avant / Après'}>
      <form onSubmit={submit} className="space-y-4 text-xs">
        {project && <BeforeAfterSlider beforeImage={project.beforeUrl} afterImage={project.afterUrl} altTitle={project.title} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Titre *" htmlFor="pj-title">
            <input id="pj-title" required value={form.title} onChange={(e) => set({ title: e.target.value })} className={darkInput} />
          </Field>
          <Field label="Véhicule *" htmlFor="pj-vehicle">
            <input id="pj-vehicle" required placeholder="Ex : Toyota Land Cruiser 300 noir" value={form.vehicleLabel} onChange={(e) => set({ vehicleLabel: e.target.value })} className={darkInput} />
          </Field>
          <Field label="Catégorie" htmlFor="pj-cat">
            <select id="pj-cat" value={form.category} onChange={(e) => set({ category: e.target.value as ServiceCategory })} className={darkInput}>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Réalisé le" htmlFor="pj-date">
            <input id="pj-date" type="date" value={form.completedOn ?? ''} onChange={(e) => set({ completedOn: e.target.value || null })} className={darkInput} />
          </Field>
          <Field label="Prestations réalisées" htmlFor="pj-services">
            <input id="pj-services" placeholder="Polissage, Céramique" value={form.servicesPerformed} onChange={(e) => set({ servicesPerformed: e.target.value })} className={darkInput} />
          </Field>
          <Field label="Durée" htmlFor="pj-duration">
            <input id="pj-duration" placeholder="Ex : 6 heures" value={form.durationLabel} onChange={(e) => set({ durationLabel: e.target.value })} className={darkInput} />
          </Field>
        </div>
        <Field label="Description" htmlFor="pj-desc">
          <textarea id="pj-desc" rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} className={darkInput} />
        </Field>
        {!project && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fileInput('pj-before', 'Photo AVANT *', setBefore)}
            {fileInput('pj-after', 'Photo APRÈS *', setAfter)}
          </div>
        )}
        {!project && (
          <label className="flex items-start gap-2 text-neutral-300">
            <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4" />
            J’ai l’accord du propriétaire du véhicule pour publier ces photos (plaque masquée si nécessaire).
          </label>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-neutral-300">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => set({ isPublished: e.target.checked })} className="w-4 h-4" />
            Publier sur le site
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} className="w-4 h-4" />
            Mettre en avant sur l’accueil
          </label>
        </div>
        <ModalActions onCancel={onClose} submitLabel={project ? 'Enregistrer' : 'Ajouter'} busy={busy || (!project && (!before || !after || !consent))} />
      </form>
    </Modal>
  );
};

const ProjectsTab: React.FC = () => {
  const { run } = useApp();
  const projects = useApiData<ManagedProject[]>(() => api.gallery.projects(), [], []);
  const [editing, setEditing] = useState<ManagedProject | 'new' | null>(null);

  const patch = async (p: ManagedProject, change: Partial<ProjectInput>, message: string) => {
    const saved = await run(() => api.gallery.updateProject(p.id, change), message);
    if (saved) projects.setData((list) => list.map((x) => (x.id === saved.id ? saved : x)));
  };
  const remove = async (p: ManagedProject) => {
    if (!window.confirm(`Supprimer définitivement « ${p.title} » et ses photos ?`)) return;
    if (await run(() => ok(() => api.gallery.deleteProject(p.id)), 'Réalisation supprimée')) projects.setData((l) => l.filter((x) => x.id !== p.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PrimaryButton onClick={() => setEditing('new')}>+ Nouvelle réalisation</PrimaryButton>
      </div>
      {projects.error && <ErrorState message={projects.error} onRetry={projects.reload} />}
      {projects.loading ? (
        <LoadingState tone="light" />
      ) : projects.data.length === 0 ? (
        <EmptyState tone="light" message="Aucune réalisation. Ajoutez votre premier Avant / Après." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.data.map((p) => (
            <article key={p.id} className={`${panel} overflow-hidden flex flex-col`}>
              <div className="grid grid-cols-2 h-36">
                <img src={p.beforeUrl} alt={`${p.title} — avant`} loading="lazy" className="w-full h-full object-cover" />
                <img src={p.afterUrl} alt={`${p.title} — après`} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className="p-4 flex-1 flex flex-col gap-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold">{p.title}</h3>
                  {p.featured && <Star className="w-4 h-4 text-[#B87D24] fill-[#D49A3D] shrink-0" aria-label="Mis en avant" />}
                </div>
                <p className="text-neutral-500">
                  {p.vehicleLabel} · {CATEGORY_LABELS[p.category]}
                  {p.completedOn && ` · ${formatDate(p.completedOn)}`}
                </p>
                <PublishedBadge published={p.isPublished} />
                <div className="mt-auto pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => patch(p, { isPublished: !p.isPublished }, p.isPublished ? 'Retirée du site' : 'Publiée sur le site')}
                    className={`flex-1 min-h-10 rounded-lg text-xs font-semibold ${
                      p.isPublished ? 'border border-neutral-300 bg-white hover:bg-neutral-100' : 'bg-[#111317] text-white hover:bg-neutral-800'
                    }`}
                  >
                    {p.isPublished ? 'Dépublier' : 'Publier'}
                  </button>
                  <IconButton label={p.featured ? 'Retirer de la mise en avant' : 'Mettre en avant'} onClick={() => patch(p, { featured: !p.featured }, p.featured ? 'Plus en avant' : 'Mise en avant')}>
                    <Star className={`w-4 h-4 ${p.featured ? 'text-[#B87D24] fill-[#D49A3D]' : ''}`} />
                  </IconButton>
                  <IconButton label="Modifier" onClick={() => setEditing(p)}>
                    <Pencil className="w-4 h-4" />
                  </IconButton>
                  <IconButton label="Supprimer" onClick={() => remove(p)} className="hover:text-rose-600">
                    <Trash2 className="w-4 h-4" />
                  </IconButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <ProjectForm
          project={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            projects.reload();
          }}
        />
      )}
    </div>
  );
};

// ---------- Avis clients ----------

const EMPTY_TESTIMONIAL = { author: '', role: '', vehicleLabel: '', quote: '', consentObtained: false, isPublished: false };

const TestimonialsTab: React.FC = () => {
  const { run } = useApp();
  const items = useApiData<ManagedTestimonial[]>(() => api.gallery.testimonials(), [], []);
  const [editing, setEditing] = useState<{ id?: number; data: Omit<ManagedTestimonial, 'id'> } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const saved = await run(() => api.gallery.saveTestimonial(editing.data, editing.id), 'Avis enregistré');
    setBusy(false);
    if (saved) {
      setEditing(null);
      items.reload();
    }
  };
  const togglePublish = async (t: ManagedTestimonial) => {
    const { id, ...data } = t;
    const saved = await run(() => api.gallery.saveTestimonial({ ...data, isPublished: !t.isPublished }, id), t.isPublished ? 'Avis retiré du site' : 'Avis publié');
    if (saved) items.setData((l) => l.map((x) => (x.id === saved.id ? saved : x)));
  };
  const remove = async (t: ManagedTestimonial) => {
    if (!window.confirm(`Supprimer l’avis de ${t.author} ?`)) return;
    if (await run(() => ok(() => api.gallery.deleteTestimonial(t.id)), 'Avis supprimé')) items.setData((l) => l.filter((x) => x.id !== t.id));
  };
  const set = (patch: Partial<Omit<ManagedTestimonial, 'id'>>) =>
    setEditing((e) => {
      if (!e) return e;
      const data = { ...e.data, ...patch };
      if (!data.consentObtained) data.isPublished = false; // pas de publication sans accord
      return { ...e, data };
    });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PrimaryButton onClick={() => setEditing({ data: EMPTY_TESTIMONIAL })}>+ Nouvel avis</PrimaryButton>
      </div>
      {items.error && <ErrorState message={items.error} onRetry={items.reload} />}
      {items.loading ? (
        <LoadingState tone="light" />
      ) : items.data.length === 0 ? (
        <EmptyState tone="light" message="Aucun avis. Ajoutez les témoignages de vos clients, avec leur accord." />
      ) : (
        <ul className="space-y-3">
          {items.data.map((t) => (
            <li key={t.id} className={`${panel} p-4 flex flex-col sm:flex-row sm:items-start gap-3 text-xs`}>
              <div className="flex-1 space-y-1.5">
                <p className="text-sm text-[#111317]">« {t.quote} »</p>
                <p className="text-neutral-500">
                  <strong className="text-[#111317]">{t.author}</strong>
                  {t.role && ` · ${t.role}`}
                  {t.vehicleLabel && ` · ${t.vehicleLabel}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <PublishedBadge published={t.isPublished} />
                  {!t.consentObtained && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">Accord du client manquant</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!t.consentObtained && !t.isPublished}
                  onClick={() => togglePublish(t)}
                  title={!t.consentObtained ? 'Accord du client requis pour publier' : undefined}
                  className="min-h-10 px-4 rounded-lg text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-100 disabled:opacity-40"
                >
                  {t.isPublished ? 'Dépublier' : 'Publier'}
                </button>
                <IconButton label="Modifier" onClick={() => setEditing({ id: t.id, data: { ...t } })}>
                  <Pencil className="w-4 h-4" />
                </IconButton>
                <IconButton label="Supprimer" onClick={() => remove(t)} className="hover:text-rose-600">
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <Modal isOpen onClose={() => setEditing(null)} title={editing.id ? 'Modifier l’avis' : 'Nouvel avis client'}>
          <form onSubmit={save} className="space-y-4 text-xs">
            <Field label="Avis *" htmlFor="t-quote">
              <textarea id="t-quote" rows={4} required value={editing.data.quote} onChange={(e) => set({ quote: e.target.value })} className={darkInput} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Auteur *" htmlFor="t-author">
                <input id="t-author" required value={editing.data.author} onChange={(e) => set({ author: e.target.value })} className={darkInput} />
              </Field>
              <Field label="Précision" htmlFor="t-role">
                <input id="t-role" placeholder="Ex : client depuis 2025" value={editing.data.role} onChange={(e) => set({ role: e.target.value })} className={darkInput} />
              </Field>
              <Field label="Véhicule" htmlFor="t-vehicle">
                <input id="t-vehicle" value={editing.data.vehicleLabel} onChange={(e) => set({ vehicleLabel: e.target.value })} className={darkInput} />
              </Field>
            </div>
            <label className="flex items-start gap-2 text-neutral-300">
              <input type="checkbox" checked={editing.data.consentObtained} onChange={(e) => set({ consentObtained: e.target.checked })} className="mt-0.5 w-4 h-4" />
              Le client a donné son accord écrit pour la publication de cet avis.
            </label>
            <label className={`flex items-center gap-2 ${editing.data.consentObtained ? 'text-neutral-300' : 'text-neutral-600'}`}>
              <input
                type="checkbox"
                disabled={!editing.data.consentObtained}
                checked={editing.data.isPublished}
                onChange={(e) => set({ isPublished: e.target.checked })}
                className="w-4 h-4"
              />
              Publier sur le site {!editing.data.consentObtained && '(accord requis)'}
            </label>
            <ModalActions onCancel={() => setEditing(null)} submitLabel="Enregistrer" busy={busy} />
          </form>
        </Modal>
      )}
    </div>
  );
};

// ---------- Chiffres clés ----------

const HighlightsTab: React.FC = () => {
  const { run } = useApp();
  const items = useApiData<ManagedHighlight[]>(() => api.gallery.highlights(), [], []);
  const [form, setForm] = useState({ value: '', label: '' });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await run(
      () => api.gallery.saveHighlight({ ...form, isPublished: false, sortOrder: items.data.length }),
      'Chiffre ajouté (non publié)'
    );
    if (saved) {
      setForm({ value: '', label: '' });
      items.reload();
    }
  };
  const toggle = async (h: ManagedHighlight) => {
    if (!h.isPublished && !window.confirm(`Publier « ${h.value} ${h.label} » ? Ce chiffre doit être vérifié : il sera présenté comme réel.`)) return;
    const { id, ...data } = h;
    const saved = await run(() => api.gallery.saveHighlight({ ...data, isPublished: !h.isPublished }, id), h.isPublished ? 'Chiffre retiré du site' : 'Chiffre publié');
    if (saved) items.setData((l) => l.map((x) => (x.id === saved.id ? saved : x)));
  };
  const remove = async (h: ManagedHighlight) => {
    if (!window.confirm(`Supprimer « ${h.value} ${h.label} » ?`)) return;
    if (await run(() => ok(() => api.gallery.deleteHighlight(h.id)), 'Chiffre supprimé')) items.setData((l) => l.filter((x) => x.id !== h.id));
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-600">
        Affichés sur l’accueil (3 au maximum conseillés). Ne publiez que des chiffres vérifiés : ils sont présentés comme réels.
      </p>
      <form onSubmit={add} className={`${panel} p-4 grid grid-cols-1 sm:grid-cols-[8rem_1fr_auto] gap-3 items-end text-xs`}>
        <label className="block">
          <span className="block text-neutral-600 mb-1">Valeur</span>
          <input required placeholder="1 200+" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-neutral-300" />
        </label>
        <label className="block">
          <span className="block text-neutral-600 mb-1">Libellé</span>
          <input required placeholder="véhicules traités depuis 2024" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-neutral-300" />
        </label>
        <PrimaryButton type="submit" className="min-h-10">Ajouter</PrimaryButton>
      </form>
      {items.error && <ErrorState message={items.error} onRetry={items.reload} />}
      {items.loading ? (
        <LoadingState tone="light" />
      ) : items.data.length === 0 ? (
        <EmptyState tone="light" message="Aucun chiffre clé." />
      ) : (
        <ul className="space-y-2">
          {items.data.map((h) => (
            <li key={h.id} className={`${panel} p-4 flex flex-wrap items-center justify-between gap-3 text-xs`}>
              <span>
                <strong className="text-lg font-bold text-[#111317] mr-2">{h.value}</strong>
                {h.label}
              </span>
              <span className="flex items-center gap-2">
                <PublishedBadge published={h.isPublished} />
                <button type="button" onClick={() => toggle(h)} className="min-h-10 px-4 rounded-lg text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-100">
                  {h.isPublished ? 'Dépublier' : 'Publier'}
                </button>
                <IconButton label="Supprimer" onClick={() => remove(h)} className="hover:text-rose-600">
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const GalleryPage: React.FC = () => {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('projects');
  return (
    <div>
      <PageHeader title="Galerie et contenus" subtitle="Ce qui est publié ici apparaît sur le site public. Rien n’est visible sans publication." />
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 mb-6" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2.5 rounded-lg text-xs font-semibold border whitespace-nowrap ${
              tab === t.id ? 'bg-[#111317] text-white border-[#111317]' : 'bg-white text-neutral-600 border-neutral-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'projects' && <ProjectsTab />}
      {tab === 'testimonials' && <TestimonialsTab />}
      {tab === 'highlights' && <HighlightsTab />}
    </div>
  );
};
