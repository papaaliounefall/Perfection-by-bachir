import React, { useMemo, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../api';
import { useApp } from '../../../context/AppContext';
import { formatDate, formatDateTime, formatFcfa } from '../../../lib/labels';
import { useApiData } from '../../../lib/useApiData';
import { Appointment, Invoice, InvoiceLineInput, InvoiceStatus } from '../../../types';
import { EmptyState, ErrorState, LoadingState, Modal, StatusIndicator } from '../../ui/DesignSystem';
import { PaymentForm } from './CounterPayment';
import { darkInput, Field, PageHeader, panel, PrimaryButton, SearchInput, td, th } from './shared';

const FILTERS: { id: 'all' | InvoiceStatus; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'pending', label: 'En attente' },
  { id: 'partial', label: 'Partiellement payées' },
  { id: 'paid', label: 'Payées' },
  { id: 'cancelled', label: 'Annulées' },
];

const InvoiceStatusBadge: React.FC<{ invoice: Invoice }> = ({ invoice }) => (
  <StatusIndicator status={invoice.statusLabel} tone="light" />
);

/** Détail d'une facture : paiements, encaissement, remboursement, annulation, PDF. */
const InvoiceDetail: React.FC<{ invoice: Invoice; onClose: () => void; onChanged: () => void }> = ({
  invoice,
  onClose,
  onChanged,
}) => {
  const { run } = useApp();
  const active = invoice.status !== 'cancelled';

  const refund = async (paymentId: number) => {
    const reason = window.prompt('Motif du remboursement :');
    if (!reason) return;
    const ok = await run(async () => {
      await api.payments.refund(paymentId, reason);
      return true;
    }, 'Paiement remboursé');
    if (ok) onChanged();
  };

  const cancel = async () => {
    const reason = window.prompt(`Motif de l’annulation de la facture ${invoice.number} :`);
    if (!reason) return;
    const done = await run(() => api.invoices.cancel(invoice.id, reason), 'Facture annulée');
    if (done) onChanged();
  };

  return (
    <Modal isOpen onClose={onClose} title={`Facture ${invoice.number}`} subtitle={`${invoice.customerName} · ${formatDate(invoice.issuedAt)}`}>
      <div className="space-y-5 text-xs">
        <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 space-y-2">
          {invoice.vehicle && <p className="text-neutral-400">{invoice.vehicle}{invoice.appointmentReference && ` · ${invoice.appointmentReference}`}</p>}
          <ul className="divide-y divide-white/10">
            {invoice.lines.map((l, i) => (
              <li key={i} className="py-2 flex justify-between gap-3">
                <span className="text-neutral-200">
                  {l.label} {l.quantity > 1 && <span className="text-neutral-500">× {l.quantity}</span>}
                </span>
                <span className="font-mono text-white">{formatFcfa(l.total)}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 border-t border-white/10 space-y-1 font-mono">
            {invoice.discount > 0 && (
              <p className="flex justify-between text-neutral-400">
                <span>Remise</span>- {formatFcfa(invoice.discount)}
              </p>
            )}
            <p className="flex justify-between text-white font-bold">
              <span>Total</span>
              {formatFcfa(invoice.total)}
            </p>
            <p className="flex justify-between text-neutral-400">
              <span>Payé</span>
              {formatFcfa(invoice.paidAmount)}
            </p>
            <p className="flex justify-between text-[#D49A3D] font-bold">
              <span>Reste à payer</span>
              {formatFcfa(invoice.balance)}
            </p>
          </div>
        </div>

        {invoice.status === 'cancelled' && (
          <p className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300">Facture annulée — {invoice.cancelReason}</p>
        )}

        {invoice.payments.length > 0 && (
          <section>
            <p className="text-neutral-300 font-semibold mb-2">Paiements</p>
            <ul className="space-y-2">
              {invoice.payments.map((p) => (
                <li key={p.id} className={`flex flex-wrap items-center justify-between gap-2 ${p.refunded ? 'opacity-60' : ''}`}>
                  <span className="text-neutral-300">
                    {formatDateTime(p.receivedAt)} · {p.method}
                    {p.reference && ` · réf. ${p.reference}`}
                    {p.recordedBy && <span className="text-neutral-500"> · par {p.recordedBy}</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={`font-mono text-white ${p.refunded ? 'line-through' : ''}`}>{formatFcfa(p.amount)}</span>
                    {p.refunded ? (
                      <span className="text-rose-400">Remboursé</span>
                    ) : (
                      <button type="button" onClick={() => refund(p.id)} className="min-h-9 px-3 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/10">
                        Rembourser
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {active && invoice.balance > 0 && (
          <section>
            <p className="text-neutral-300 font-semibold mb-2">Encaisser</p>
            <PaymentForm key={invoice.balance} invoiceId={invoice.id} balance={invoice.balance} submitLabel="Encaisser" onPaid={onChanged} />
          </section>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
          <a
            href={invoice.pdfUrl}
            target="_blank"
            rel="noopener"
            className="flex-1 min-h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 text-white hover:bg-white/5 font-semibold"
          >
            <Download className="w-4 h-4" /> PDF
          </a>
          {active && invoice.paidAmount === 0 && (
            <button type="button" onClick={cancel} className="flex-1 min-h-11 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 font-semibold">
              Annuler la facture
            </button>
          )}
        </div>
        {active && invoice.paidAmount > 0 && (
          <p className="text-neutral-500">Pour annuler cette facture, remboursez d’abord ses paiements.</p>
        )}
      </div>
    </Modal>
  );
};

/** Établir une facture pour une prestation terminée (devis, lignes supplémentaires, remise). */
export const CreateInvoiceModal: React.FC<{
  candidates: Appointment[];
  preselected?: Appointment;
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
}> = ({ candidates, preselected, onClose, onCreated }) => {
  const { run } = useApp();
  const [appointmentId, setAppointmentId] = useState<number | null>(preselected?.id ?? candidates[0]?.id ?? null);
  const appointment = candidates.find((a) => a.id === appointmentId) ?? preselected;
  const [lines, setLines] = useState<InvoiceLineInput[]>(() => [
    { label: appointment?.serviceName ?? '', quantity: 1, unitPrice: appointment?.price ?? 0 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const total = Math.max(subtotal - discount, 0);
  const valid = appointment && lines.every((l) => l.label.trim() && l.quantity >= 1 && l.unitPrice >= 0) && subtotal > 0 && discount <= subtotal;

  const pick = (id: number) => {
    setAppointmentId(id);
    const a = candidates.find((c) => c.id === id);
    setLines([{ label: a?.serviceName ?? '', quantity: 1, unitPrice: a?.price ?? 0 }]);
  };
  const setLine = (i: number, patch: Partial<InvoiceLineInput>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;
    setBusy(true);
    const created = await run(() => api.invoices.create({ appointmentId: appointment.id, lines, discount, notes }), 'Facture établie');
    setBusy(false);
    if (created) onCreated(created);
  };

  return (
    <Modal isOpen onClose={onClose} title="Établir une facture" subtitle="Prestation terminée sans facture (par exemple sur devis).">
      {candidates.length === 0 && !preselected ? (
        <p className="text-xs text-neutral-400">Toutes les prestations terminées ont déjà une facture.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4 text-xs">
          <Field label="Rendez-vous" htmlFor="inv-apt">
            <select id="inv-apt" value={appointmentId ?? ''} onChange={(e) => pick(Number(e.target.value))} className={darkInput}>
              {(preselected && !candidates.some((c) => c.id === preselected.id) ? [preselected, ...candidates] : candidates).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.reference} · {a.customerName} · {a.serviceName} · {formatDate(a.startAt)}
                </option>
              ))}
            </select>
          </Field>

          <div className="space-y-2">
            <p className="text-neutral-300">Lignes</p>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  aria-label="Désignation"
                  placeholder="Désignation"
                  value={line.label}
                  onChange={(e) => setLine(i, { label: e.target.value })}
                  className={`${darkInput} col-span-12 sm:col-span-6`}
                />
                <input
                  aria-label="Quantité"
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => setLine(i, { quantity: Number(e.target.value) })}
                  className={`${darkInput} col-span-3 sm:col-span-2 font-mono`}
                />
                <input
                  aria-label="Prix unitaire (FCFA)"
                  type="number"
                  min={0}
                  step={500}
                  value={line.unitPrice}
                  onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) })}
                  className={`${darkInput} col-span-7 sm:col-span-3 font-mono`}
                />
                <button
                  type="button"
                  disabled={lines.length === 1}
                  onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                  aria-label="Retirer la ligne"
                  className="col-span-2 sm:col-span-1 h-10 flex items-center justify-center rounded-lg border border-white/10 text-neutral-400 hover:text-rose-400 disabled:opacity-30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLines((ls) => [...ls, { label: '', quantity: 1, unitPrice: 0 }])}
              className="inline-flex items-center gap-1.5 text-[#D49A3D] font-semibold"
            >
              <Plus className="w-4 h-4" /> Ajouter une ligne
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Remise (FCFA)" htmlFor="inv-discount">
              <input id="inv-discount" type="number" min={0} step={500} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className={`${darkInput} font-mono`} />
            </Field>
            <div className="p-3 rounded-lg bg-[#0B0C0E] border border-white/10 font-mono">
              <p className="flex justify-between text-neutral-400"><span>Sous-total</span>{formatFcfa(subtotal)}</p>
              <p className="flex justify-between text-white font-bold mt-1"><span>Total</span>{formatFcfa(total)}</p>
            </div>
          </div>
          <Field label="Mentions (optionnel, imprimées sur la facture)" htmlFor="inv-notes">
            <textarea id="inv-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={darkInput} />
          </Field>
          {discount > subtotal && <p className="text-rose-400">La remise dépasse le montant de la facture.</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="min-h-11 px-4 rounded-lg border border-white/15 text-neutral-300">
              Annuler
            </button>
            <button type="submit" disabled={!valid || busy} className="min-h-11 px-5 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold disabled:opacity-50">
              {busy ? 'Enregistrement…' : `Établir la facture (${formatFcfa(total)})`}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export const InvoicesPage: React.FC = () => {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const invoices = useApiData<Invoice[]>(() => api.invoices.list(), [], []);
  // Prestations terminées sans facture active (devis, ou facture annulée)
  const candidates = useApiData<Appointment[]>(
    async () => (await api.appointments.list({ status: ['done', 'delivered'] })).filter((a) => !a.invoice),
    [],
    []
  );

  const q = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      invoices.data.filter(
        (inv) =>
          (filter === 'all' || inv.status === filter || (filter === 'cancelled' && inv.status === 'refunded')) &&
          (!q || [inv.number, inv.customerName, inv.vehicle ?? '', inv.appointmentReference ?? ''].some((f) => f.toLowerCase().includes(q)))
      ),
    [invoices.data, filter, q]
  );
  const outstanding = invoices.data.filter((i) => i.status === 'pending' || i.status === 'partial').reduce((s, i) => s + i.balance, 0);
  const selected = invoices.data.find((i) => i.id === selectedId) ?? null;

  const refresh = () => {
    invoices.reload();
    candidates.reload();
  };

  return (
    <div>
      <PageHeader
        title="Factures"
        subtitle="Créées automatiquement à la validation des prestations. Établissez ici les factures sur devis."
        action={
          <PrimaryButton onClick={() => setCreating(true)}>
            + Établir une facture{candidates.data.length > 0 ? ` (${candidates.data.length} à faire)` : ''}
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className={`${panel} p-4`}>
          <span className="text-xs text-neutral-500">Reste à encaisser</span>
          <span className="block mt-2 text-xl font-bold font-mono text-[#B87D24]">{formatFcfa(outstanding)}</span>
        </div>
        <div className={`${panel} p-4`}>
          <span className="text-xs text-neutral-500">Prestations à facturer</span>
          <span className="block mt-2 text-xl font-bold font-mono">{candidates.data.length}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Numéro, client, véhicule…" />
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 sm:pb-0">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`shrink-0 px-3.5 py-2.5 sm:py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap ${
                filter === f.id ? 'bg-[#111317] text-white border-[#111317]' : 'bg-white text-neutral-600 border-neutral-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {invoices.error && <ErrorState message={invoices.error} onRetry={invoices.reload} />}
      <div className={`${panel} overflow-hidden`}>
        {invoices.loading ? (
          <LoadingState tone="light" />
        ) : visible.length === 0 ? (
          <EmptyState tone="light" message="Aucune facture pour ces critères." />
        ) : (
          <>
            <ul className="md:hidden divide-y divide-neutral-200">
              {visible.map((inv) => (
                <li key={inv.id}>
                  <button type="button" onClick={() => setSelectedId(inv.id)} className="w-full text-left p-4 space-y-1.5 text-xs">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-sm">{inv.number}</span>
                      <InvoiceStatusBadge invoice={inv} />
                    </span>
                    <span className="block font-semibold">{inv.customerName}</span>
                    <span className="block text-neutral-500">
                      {formatDate(inv.issuedAt)} · {inv.vehicle ?? '—'}
                    </span>
                    <span className="flex justify-between font-mono">
                      <span>{formatFcfa(inv.total)}</span>
                      {inv.balance > 0 && inv.status !== 'cancelled' && <span className="text-[#B87D24]">reste {formatFcfa(inv.balance)}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-semibold">
                    <th className={th}>Facture</th>
                    <th className={th}>Client</th>
                    <th className={th}>Véhicule</th>
                    <th className={`${th} text-right`}>Total</th>
                    <th className={`${th} text-right`}>Reste</th>
                    <th className={th}>Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {visible.map((inv) => (
                    <tr key={inv.id} onClick={() => setSelectedId(inv.id)} className="hover:bg-neutral-50 cursor-pointer">
                      <td className={td}>
                        <button type="button" className="font-mono font-bold hover:underline" onClick={() => setSelectedId(inv.id)}>
                          {inv.number}
                        </button>
                        <span className="block text-neutral-500 font-mono">{formatDate(inv.issuedAt)}</span>
                      </td>
                      <td className={`${td} font-semibold`}>{inv.customerName}</td>
                      <td className={`${td} text-neutral-600`}>{inv.vehicle ?? '—'}</td>
                      <td className={`${td} text-right font-mono font-bold`}>{formatFcfa(inv.total)}</td>
                      <td className={`${td} text-right font-mono ${inv.balance > 0 && inv.status !== 'cancelled' ? 'text-[#B87D24] font-semibold' : 'text-neutral-400'}`}>
                        {inv.status === 'cancelled' ? '—' : formatFcfa(inv.balance)}
                      </td>
                      <td className={td}>
                        <InvoiceStatusBadge invoice={inv} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {selected && <InvoiceDetail invoice={selected} onClose={() => setSelectedId(null)} onChanged={refresh} />}
      {creating && (
        <CreateInvoiceModal
          candidates={candidates.data}
          onClose={() => setCreating(false)}
          onCreated={(invoice) => {
            setCreating(false);
            refresh();
            setSelectedId(invoice.id);
          }}
        />
      )}
    </div>
  );
};
