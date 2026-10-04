import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../../../api';
import { formatFcfa, isoDay } from '../../../lib/labels';
import { useApiData } from '../../../lib/useApiData';
import { AnalyticsSummary, StatsGroup } from '../../../types';
import { BarList, ColumnChart, ColumnDatum } from '../../charts/Charts';
import { ErrorState, LoadingState } from '../../ui/DesignSystem';
import { PageHeader, panel } from './shared';

const PRESETS = [
  { id: '7', label: '7 jours', days: 7 },
  { id: '30', label: '30 jours', days: 30 },
  { id: '90', label: '90 jours', days: 90 },
  { id: '365', label: '12 mois', days: 365 },
] as const;

const DAY = 86_400_000;
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY) + 1;

/** Regroupement adapté à la durée : jour (≤ 31 j), semaine (≤ 120 j), mois au-delà. */
const groupFor = (days: number): StatsGroup => (days <= 31 ? 'day' : days <= 120 ? 'week' : 'month');

const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const dayFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const longDayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

/** Toutes les périodes de l'intervalle, y compris celles sans encaissement (valeur 0). */
function revenueColumns(summary: AnalyticsSummary, group: StatsGroup): ColumnDatum[] {
  const amounts = new Map(summary.revenueSeries.map((p) => [p.period, p.amount]));
  const keys: string[] = [];
  if (group === 'day') {
    for (let d = summary.from; d <= summary.to; d = addDays(d, 1)) keys.push(d);
  } else if (group === 'week') {
    const start = new Date(`${summary.from}T00:00:00Z`);
    let d = addDays(summary.from, -((start.getUTCDay() + 6) % 7)); // lundi de la 1re semaine
    for (; d <= summary.to; d = addDays(d, 7)) keys.push(d);
  } else {
    let d = `${summary.from.slice(0, 7)}-01`;
    while (d <= summary.to) {
      keys.push(d);
      const [y, m] = d.split('-').map(Number);
      d = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    }
  }
  return keys.map((key) => {
    const date = new Date(`${key}T00:00:00Z`);
    return {
      key,
      axisLabel: group === 'month' ? monthFmt.format(date) : dayFmt.format(date),
      label: group === 'month' ? monthFmt.format(date) : group === 'week' ? `Semaine du ${dayFmt.format(date)}` : longDayFmt.format(date),
      value: amounts.get(key) ?? 0,
    };
  });
}

const StatTile: React.FC<{ label: string; value: string; hint?: string; hero?: boolean }> = ({ label, value, hint, hero }) => (
  <div className={`${panel} p-4 ${hero ? 'col-span-2' : ''}`}>
    <span className="text-xs text-neutral-500">{label}</span>
    <span className={`block mt-2 font-bold text-[#111317] ${hero ? 'text-3xl sm:text-4xl' : 'text-xl'}`}>{value}</span>
    {hint && <span className="block mt-1 text-[11px] text-neutral-500">{hint}</span>}
  </div>
);

export const StatisticsPage: React.FC = () => {
  const today = isoDay(new Date());
  const [preset, setPreset] = useState<string>('30');
  const [range, setRange] = useState({ from: addDays(today, -29), to: today });
  const [showTable, setShowTable] = useState(false);

  const group = groupFor(daysBetween(range.from, range.to));
  const summary = useApiData<AnalyticsSummary | null>(
    () => api.analytics.summary(range.from, range.to, group),
    [range.from, range.to, group],
    null
  );

  const pickPreset = (id: string, days: number) => {
    setPreset(id);
    setRange({ from: addDays(today, -(days - 1)), to: today });
  };

  const data = summary.data;
  const columns = useMemo(() => (data ? revenueColumns(data, group) : []), [data, group]);
  const groupLabel = { day: 'par jour', week: 'par semaine', month: 'par mois' }[group];
  const statuses = data
    ? Object.entries(data.appointments.byStatus)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
    : [];

  return (
    <div>
      <PageHeader title="Statistiques" subtitle="Calculées à partir des données réelles. Le chiffre d’affaires correspond aux paiements encaissés, remboursements déduits." />

      {/* Filtres : une seule ligne au-dessus de tout ce qu'ils filtrent */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 sm:pb-0" role="group" aria-label="Période">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={preset === p.id}
              onClick={() => pickPreset(p.id, p.days)}
              className={`shrink-0 px-3.5 py-2.5 sm:py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap ${
                preset === p.id ? 'bg-[#111317] text-white border-[#111317]' : 'bg-white text-neutral-600 border-neutral-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 min-[400px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:flex items-center gap-2 text-xs">
          <input
            type="date"
            aria-label="Du"
            value={range.from}
            max={range.to}
            onChange={(e) => {
              setPreset('custom');
              setRange((r) => ({ ...r, from: e.target.value }));
            }}
            className="min-w-0 w-full sm:w-auto px-2 sm:px-3 py-2.5 sm:py-1.5 rounded-lg border border-neutral-200 bg-white"
          />
          <span className="hidden min-[400px]:inline text-neutral-500">au</span>
          <input
            type="date"
            aria-label="Au"
            value={range.to}
            min={range.from}
            onChange={(e) => {
              setPreset('custom');
              setRange((r) => ({ ...r, to: e.target.value }));
            }}
            className="min-w-0 w-full sm:w-auto px-2 sm:px-3 py-2.5 sm:py-1.5 rounded-lg border border-neutral-200 bg-white"
          />
        </div>
        <div className="flex gap-2 lg:ml-auto">
          {(['appointments', 'payments'] as const).map((type) => (
            <a
              key={type}
              href={api.analytics.exportUrl(type, range.from, range.to)}
              className="flex-1 sm:flex-none min-h-10 inline-flex items-center justify-center gap-2 px-3.5 rounded-lg border border-neutral-300 bg-white text-xs font-semibold hover:bg-neutral-100"
            >
              <Download className="w-4 h-4" /> {type === 'appointments' ? 'Rendez-vous (CSV)' : 'Paiements (CSV)'}
            </a>
          ))}
        </div>
      </div>

      {summary.error && <ErrorState message={summary.error} onRetry={summary.reload} />}
      {!data ? (
        summary.loading && <LoadingState tone="light" />
      ) : (
        // Rechargement : on garde l'affichage précédent, atténué (pas de saut de mise en page)
        <div className={`space-y-6 transition-opacity ${summary.loading ? 'opacity-50' : ''}`} aria-busy={summary.loading}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile hero label="Chiffre d’affaires encaissé" value={formatFcfa(data.revenue)} />
            <StatTile label="Rendez-vous" value={String(data.appointments.total)} />
            <StatTile
              label="Taux d’annulation"
              value={`${data.appointments.cancellationRate.toLocaleString('fr-FR')} %`}
              hint={`${data.appointments.cancellations} annulé(s), refusé(s) ou absent(s)`}
            />
            <StatTile label="Nouveaux clients" value={String(data.newCustomers)} />
            <StatTile label="Clients récurrents" value={String(data.returningCustomers)} hint="Servis sur la période, 2 prestations ou plus" />
            <StatTile label="Véhicules traités" value={String(data.vehiclesTreated)} />
          </div>

          <section className={`${panel} p-5`}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold font-display">Chiffre d’affaires {groupLabel}</h2>
                <p className="text-xs text-neutral-500">Paiements encaissés (FCFA)</p>
              </div>
              <button type="button" onClick={() => setShowTable((v) => !v)} className="text-xs font-semibold text-[#B87D24] hover:underline whitespace-nowrap">
                {showTable ? 'Voir le graphique' : 'Voir le tableau'}
              </button>
            </div>
            {showTable ? (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-neutral-500 border-b border-neutral-200">
                      <th className="py-2 font-semibold">Période</th>
                      <th className="py-2 font-semibold text-right">Encaissé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {columns.map((c) => (
                      <tr key={c.key}>
                        <td className="py-1.5 capitalize">{c.label}</td>
                        <td className="py-1.5 text-right font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatFcfa(c.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ColumnChart
                data={columns}
                format={formatFcfa}
                ariaLabel={`Chiffre d’affaires ${groupLabel}, du ${range.from} au ${range.to}`}
                emptyMessage="Aucun encaissement sur la période."
              />
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className={`${panel} p-5`}>
              <h2 className="text-sm font-bold font-display mb-4">Encaissements par moyen de paiement</h2>
              <BarList
                data={data.revenueByMethod.map((m) => ({ label: m.method, value: m.amount, detail: `${m.count} paiement(s)` }))}
                format={formatFcfa}
                emptyMessage="Aucun encaissement sur la période."
              />
            </section>
            <section className={`${panel} p-5`}>
              <h2 className="text-sm font-bold font-display mb-4">Prestations les plus demandées</h2>
              <BarList
                data={data.popularServices.map((s) => ({ label: s.service, value: s.count }))}
                format={(v) => `${v} RDV`}
                emptyMessage="Aucun rendez-vous sur la période."
              />
            </section>
            <section className={`${panel} p-5 lg:col-span-2`}>
              <h2 className="text-sm font-bold font-display mb-4">Rendez-vous par statut</h2>
              <BarList data={statuses} format={(v) => String(v)} emptyMessage="Aucun rendez-vous sur la période." />
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
