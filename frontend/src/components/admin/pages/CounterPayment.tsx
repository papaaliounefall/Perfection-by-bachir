import React, { useState } from 'react';
import { api } from '../../../api';
import { useApp } from '../../../context/AppContext';
import { formatFcfa } from '../../../lib/labels';
import { Appointment, PaymentMethod } from '../../../types';
import { Modal } from '../../ui/DesignSystem';
import { darkInput, Field } from './shared';

export const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: 'Espèces' },
  { id: 'wave', label: 'Wave' },
  { id: 'orange_money', label: 'Orange Money' },
  { id: 'card', label: 'Carte bancaire' },
  { id: 'transfer', label: 'Virement' },
];

/** Formulaire d'encaissement (manager ou technicien au comptoir). */
export const PaymentForm: React.FC<{
  invoiceId: number;
  balance: number;
  submitLabel: string;
  onPaid: () => void;
}> = ({ invoiceId, balance, submitLabel, onPaid }) => {
  const { run } = useApp();
  const [amount, setAmount] = useState(balance);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const done = await run(async () => {
      await api.invoices.recordPayment(invoiceId, amount, method, reference);
      return true;
    }, `${formatFcfa(amount)} encaissés`);
    setBusy(false);
    if (done) onPaid();
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Montant (FCFA)" htmlFor="pay-amount">
          <input
            id="pay-amount"
            type="number"
            min={1}
            max={balance}
            required
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className={`${darkInput} font-mono`}
          />
        </Field>
        <Field label="Moyen de paiement" htmlFor="pay-method">
          <select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={darkInput}>
            {METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {method !== 'cash' && (
        <Field label="Référence de transaction (optionnel)" htmlFor="pay-ref">
          <input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} className={darkInput} />
        </Field>
      )}
      <button
        type="submit"
        disabled={busy || amount < 1 || amount > balance}
        className="w-full min-h-11 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold disabled:opacity-50"
      >
        {busy ? 'Enregistrement…' : submitLabel}
      </button>
    </form>
  );
};

/** Restitution au comptoir : affiche le reste à payer et propose d'encaisser avant de rendre le véhicule. */
export const HandoverModal: React.FC<{
  apt: Appointment;
  onClose: () => void;
  onDelivered: (updated: Appointment) => void;
}> = ({ apt, onClose, onDelivered }) => {
  const { run } = useApp();
  const [balance, setBalance] = useState(apt.invoice?.balance ?? 0);
  const [busy, setBusy] = useState(false);

  const deliver = async (withBalance: boolean) => {
    const question = apt.invoice
      ? `Rendre le véhicule avec ${formatFcfa(balance)} restant à payer ? Ce sera noté dans l’historique.`
      : 'Rendre le véhicule sans facture établie ?';
    if (withBalance && !window.confirm(question)) return;
    setBusy(true);
    const updated = await run(() => api.appointments.transition(apt.id, 'deliver'), `${apt.reference} : véhicule restitué`);
    setBusy(false);
    if (updated) onDelivered(updated);
  };

  return (
    <Modal isOpen onClose={onClose} title="Restitution du véhicule" subtitle={`${apt.vehicleName} — ${apt.customerName}`}>
      <div className="space-y-5 text-xs">
        {!apt.invoice ? (
          <p className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200">
            Aucune facture pour ce rendez-vous (prestation sur devis ?). Le manager doit l’établir pour encaisser.
          </p>
        ) : balance > 0 ? (
          <>
            <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 flex items-center justify-between">
              <span className="text-neutral-400">
                Facture {apt.invoice.number}
                <span className="block text-neutral-500">Total {formatFcfa(apt.invoice.total)}</span>
              </span>
              <span className="text-right">
                <span className="block text-neutral-400">Reste à payer</span>
                <span className="text-lg font-mono font-bold text-[#D49A3D]">{formatFcfa(balance)}</span>
              </span>
            </div>
            <PaymentForm
              invoiceId={apt.invoice.id}
              balance={balance}
              submitLabel="Encaisser"
              onPaid={async () => {
                // Recalcule le reste après encaissement (paiement partiel possible)
                const fresh = (await api.appointments.list({ customerId: apt.customerId })).find((a) => a.id === apt.id);
                setBalance(fresh?.invoice?.balance ?? 0);
              }}
            />
          </>
        ) : (
          <p className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
            Facture {apt.invoice.number} entièrement payée.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
          {balance > 0 || !apt.invoice ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => deliver(true)}
              className="flex-1 min-h-11 rounded-lg border border-amber-500/50 text-amber-300 hover:bg-amber-500/10 font-semibold disabled:opacity-50"
            >
              Restituer sans paiement complet
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => deliver(false)}
              className="flex-1 min-h-11 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold disabled:opacity-50"
            >
              Restituer le véhicule
            </button>
          )}
          <button type="button" onClick={onClose} className="min-h-11 px-5 rounded-lg border border-white/15 text-neutral-300">
            Annuler
          </button>
        </div>
      </div>
    </Modal>
  );
};
