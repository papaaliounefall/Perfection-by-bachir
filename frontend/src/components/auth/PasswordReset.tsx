import React, { useState } from 'react';
import { api, errorMessage } from '../../api';

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg bg-[#0B0C0E] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D49A3D]';

/** Lien reçu par email : /?reset_uid=…&reset_token=… */
export const readResetParams = () => {
  const params = new URLSearchParams(window.location.search);
  const uid = params.get('reset_uid');
  const token = params.get('reset_token');
  return uid && token ? { uid, token } : null;
};

/** Demande d'un lien (depuis l'écran de connexion). */
export const ForgotPasswordForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.auth.requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return sent ? (
    <div className="mt-6 space-y-4 text-sm text-neutral-300">
      <p>Si un compte existe pour <strong className="text-white">{email}</strong>, un lien de réinitialisation vient d’être envoyé (valable 2 heures).</p>
      <button type="button" onClick={onBack} className="text-[#D49A3D] text-xs font-semibold hover:underline">
        Retour à la connexion
      </button>
    </div>
  ) : (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="forgot-email" className="block text-xs text-neutral-300 mb-1.5">
          Email du compte
        </label>
        <input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>
      {error && <p className="text-xs text-rose-400" role="alert">{error}</p>}
      <button type="submit" className="w-full py-3 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold text-sm hover:bg-[#e0a84b]">
        Recevoir un lien
      </button>
      <button type="button" onClick={onBack} className="w-full text-xs text-neutral-400 hover:text-white">
        Retour à la connexion
      </button>
    </form>
  );
};

/** Choix du nouveau mot de passe (après clic sur le lien de l'email). */
export const ResetPasswordScreen: React.FC<{ uid: string; token: string; onDone: () => void }> = ({ uid, token, onDone }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('Les deux mots de passe ne correspondent pas.');
    try {
      await api.auth.confirmPasswordReset(uid, token, password);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const finish = () => {
    window.history.replaceState(null, '', window.location.pathname); // retire le jeton de l'URL
    onDone();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0B0C0E]">
      <div className="w-full max-w-md bg-[#121418] border border-white/10 rounded-xl p-6 md:p-8">
        <p className="text-xs uppercase tracking-widest text-[#D49A3D] font-semibold">Perfection · Espace connecté</p>
        <h1 className="text-2xl font-bold text-white font-display mt-1">Nouveau mot de passe</h1>
        {done ? (
          <div className="mt-6 space-y-4 text-sm text-neutral-300">
            <p>Votre mot de passe a été modifié. Vous pouvez vous connecter.</p>
            <button type="button" onClick={finish} className="w-full py-3 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold">
              Se connecter
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="np" className="block text-xs text-neutral-300 mb-1.5">Nouveau mot de passe</label>
              <input id="np" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="np2" className="block text-xs text-neutral-300 mb-1.5">Confirmer</label>
              <input id="np2" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
            </div>
            {error && <p className="text-xs text-rose-400" role="alert">{error}</p>}
            <button type="submit" className="w-full py-3 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold text-sm">
              Enregistrer
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
