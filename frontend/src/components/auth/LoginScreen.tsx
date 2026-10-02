import React, { useEffect, useState } from 'react';
import { ArrowLeft, LogIn } from 'lucide-react';
import { DEMO_MODE, errorMessage } from '../../api';
import { useApp } from '../../context/AppContext';
import { ForgotPasswordForm } from './PasswordReset';

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg bg-[#0B0C0E] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D49A3D]';

/** Aide « comptes démo » : chargée dynamiquement, n'existe qu'en mode démo. */
const DemoAccountsHint: React.FC<{ onPick: (email: string, password: string) => void }> = ({ onPick }) => {
  const [data, setData] = useState<{ accounts: { email: string; label: string }[]; password: string } | null>(null);
  useEffect(() => {
    import('../../mocks/mockApi').then((m) => setData({ accounts: m.DEMO_ACCOUNTS, password: m.DEMO_PASSWORD }));
  }, []);
  if (!data) return null;
  return (
    <div className="mt-6 p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs text-amber-200 space-y-2">
      <p className="font-semibold">Comptes de démonstration (mot de passe : {data.password})</p>
      <div className="flex flex-wrap gap-2">
        {data.accounts.map((a) => (
          <button
            key={a.email}
            type="button"
            onClick={() => onPick(a.email, data.password)}
            className="px-3 py-1.5 rounded border border-amber-500/40 hover:bg-amber-500/20"
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export const LoginScreen: React.FC = () => {
  const { login, register, setPortalMode } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0B0C0E]">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => setPortalMode('public')}
          className="mb-6 inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Retour au site
        </button>

        <div className="bg-[#121418] border border-white/10 rounded-xl p-6 md:p-8">
          <p className="text-xs uppercase tracking-widest text-[#D49A3D] font-semibold">Perfection · Espace connecté</p>
          <h1 className="text-2xl font-bold text-white font-display mt-1">
            {mode === 'login' ? 'Connexion' : mode === 'forgot' ? 'Mot de passe oublié' : 'Créer mon compte client'}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {mode === 'login'
              ? 'Clients et équipe de l’atelier : vous serez dirigé vers votre espace.'
              : 'Suivez vos véhicules, vos rendez-vous et votre historique.'}
          </p>

          {mode === 'forgot' ? (
            <ForgotPasswordForm onBack={() => setMode('login')} />
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              {mode === 'register' && (
                <>
                  <div>
                    <label htmlFor="fullName" className="block text-xs text-neutral-300 mb-1.5">
                      Nom complet
                    </label>
                    <input
                      id="fullName"
                      required
                      autoComplete="name"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-xs text-neutral-300 mb-1.5">
                      Téléphone / WhatsApp
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                </>
              )}
              <div>
                <label htmlFor="email" className="block text-xs text-neutral-300 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs text-neutral-300 mb-1.5">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputClass}
                />
              </div>

              {error && (
                <p className="text-xs text-rose-400" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold text-sm hover:bg-[#e0a84b] disabled:opacity-60"
              >
                <LogIn className="w-4 h-4" />
                {submitting ? 'Veuillez patienter…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </button>

              <p className="text-xs text-neutral-400 text-center">
                  {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà inscrit ?'}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'login' ? 'register' : 'login');
                      setError(null);
                    }}
                    className="text-[#D49A3D] font-semibold hover:underline"
                  >
                    {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
                  </button>
              </p>
              {mode === 'register' && (
                <p className="text-[11px] text-neutral-500 text-center">
                  Les comptes de l’équipe sont créés par l’atelier.
                </p>
              )}
            </form>
          )}

          {mode === 'login' && (
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="mt-4 w-full text-xs text-neutral-400 hover:text-white"
            >
              Mot de passe oublié ?
            </button>
          )}

          {DEMO_MODE && (
            <DemoAccountsHint onPick={(email, password) => setForm({ ...form, email, password })} />
          )}
        </div>
      </div>
    </div>
  );
};
