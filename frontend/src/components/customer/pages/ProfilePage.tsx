import React, { useEffect, useState } from 'react';
import { api } from '../../../api';
import { useApp } from '../../../context/AppContext';
import { CustomerData } from '../CustomerPortal';
import { PageTitle } from './shared';

const inputClass = 'w-full px-3.5 py-2.5 rounded-lg bg-[#0B0C0E] border border-white/15 text-sm text-white';

export const ProfilePage: React.FC<{ data: CustomerData }> = ({ data }) => {
  const { run } = useApp();
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data.profile) setForm({ name: data.profile.name, phone: data.profile.phone, address: data.profile.address });
  }, [data.profile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const saved = await run(() => api.customers.updateMe(form), 'Profil mis à jour');
    setSaving(false);
    if (saved) data.reload();
  };

  return (
    <div className="max-w-2xl">
      <PageTitle title="Mon profil" subtitle="Vos coordonnées de contact." />
      <form onSubmit={submit} className="bg-[#121418] border border-white/10 rounded-xl p-6 space-y-4">
        <div>
          <label htmlFor="p-name" className="block text-xs text-neutral-300 mb-1.5">
            Nom complet
          </label>
          <input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label htmlFor="p-phone" className="block text-xs text-neutral-300 mb-1.5">
            Téléphone / WhatsApp
          </label>
          <input
            id="p-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label htmlFor="p-email" className="block text-xs text-neutral-300 mb-1.5">
            Email (identifiant de connexion)
          </label>
          <input id="p-email" value={data.profile?.email ?? ''} disabled className={`${inputClass} opacity-60`} />
        </div>
        <div>
          <label htmlFor="p-address" className="block text-xs text-neutral-300 mb-1.5">
            Adresse
          </label>
          <input id="p-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold text-xs hover:bg-[#e0a84b] disabled:opacity-60"
        >
          Enregistrer
        </button>
      </form>
    </div>
  );
};
