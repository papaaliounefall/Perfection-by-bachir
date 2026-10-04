import React, { useLayoutEffect, useRef, useState } from 'react';

/**
 * Graphiques maison, sans bibliothèque :
 * - une seule teinte (magnitude) — or de marque #B87D24, validé ≥ 3:1 sur blanc ;
 * - barres ≤ 24 px, bout arrondi 4 px, base carrée, quadrillage hairline discret ;
 * - infobulle au survol ET au focus clavier ; le texte n'emprunte jamais la couleur des données.
 */
export const SERIES = '#B87D24';
const SERIES_HOVER = '#9A6518';
const GRID = '#E5E7EB';
const INK_MUTED = '#6B7280';

const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

/** Graduations « propres » (0, 25 000, 50 000…) couvrant la valeur maximale. */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export interface ColumnDatum {
  key: string;
  axisLabel: string; // libellé court sous l'axe
  label: string; // libellé complet (infobulle, tableau)
  value: number;
}

/** Histogramme en colonnes (une série). */
export const ColumnChart: React.FC<{
  data: ColumnDatum[];
  format: (v: number) => string;
  ariaLabel: string;
  height?: number;
  emptyMessage?: string;
}> = ({ data, format, ariaLabel, height = 240, emptyMessage = 'Aucune donnée sur la période.' }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const margin = { top: 22, right: 8, bottom: 28, left: 52 };
  const plotW = Math.max(width - margin.left - margin.right, 0);
  const plotH = height - margin.top - margin.bottom;
  const max = Math.max(...data.map((d) => d.value), 0);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(Math.min(24, band - 2), 1); // ≤ 24 px, 2 px d'air entre colonnes
  const y = (v: number) => margin.top + plotH - (v / top) * plotH;
  // Libellés d'axe espacés : au plus ~8 visibles
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotW / 64))));
  const maxIndex = data.findIndex((d) => d.value === max && max > 0);

  const bar = (x: number, v: number) => {
    const h = Math.max(y(0) - y(v), v > 0 ? 2 : 0);
    const r = Math.min(4, barW / 2, h);
    const top = y(0) - h;
    // bout supérieur arrondi, base carrée posée sur l'axe
    return `M${x},${y(0)} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${y(0)} Z`;
  };

  const tip = active !== null ? data[active] : null;
  const tipX = active !== null ? margin.left + band * active + band / 2 : 0;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} onMouseLeave={() => setActive(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={margin.left} x2={width - margin.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={margin.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={INK_MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {compact.format(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = margin.left + band * i + (band - barW) / 2;
            return (
              <g key={d.key}>
                <path d={bar(x, d.value)} fill={active === i ? SERIES_HOVER : SERIES} />
                {i === maxIndex && (
                  <text x={x + barW / 2} y={y(d.value) - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="#111317">
                    {compact.format(d.value)}
                  </text>
                )}
                {i % labelEvery === 0 && (
                  <text x={margin.left + band * i + band / 2} y={height - 8} textAnchor="middle" fontSize={11} fill={INK_MUTED}>
                    {d.axisLabel}
                  </text>
                )}
                {/* Zone de survol/focus : toute la hauteur de la colonne, plus large que la barre */}
                <rect
                  x={margin.left + band * i}
                  y={margin.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${d.label} : ${format(d.value)}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  style={{ outline: 'none', cursor: 'default' }}
                />
              </g>
            );
          })}
        </svg>
      )}
      {width > 0 && max === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500 pointer-events-none">{emptyMessage}</p>
      )}
      {tip && (
        <div
          className="absolute z-10 pointer-events-none px-3 py-2 rounded-lg bg-[#111317] text-white shadow-lg text-xs whitespace-nowrap"
          style={{ left: Math.min(Math.max(tipX, 70), Math.max(width - 70, 70)), top: 0, transform: 'translateX(-50%)' }}
          role="status"
        >
          <span className="block font-bold font-mono">{format(tip.value)}</span>
          <span className="block text-neutral-300">{tip.label}</span>
        </div>
      )}
    </div>
  );
};

/** Barres horizontales (une série) : libellé, barre, valeur au bout. */
export const BarList: React.FC<{
  data: { label: string; value: number; detail?: string }[];
  format: (v: number) => string;
  emptyMessage?: string;
}> = ({ data, format, emptyMessage = 'Aucune donnée sur la période.' }) => {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (!data.length || max === 0) return <p className="py-6 text-center text-xs text-neutral-500">{emptyMessage}</p>;
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        // ≥ sm : trois colonnes (libellé | barre | montant) ; le montant ne déborde jamais
        // Mobile : libellé + montant sur une ligne, barre pleine largeur dessous
        <li key={d.label} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-xs">
          <span className="truncate text-[#111317]" title={d.label}>
            {d.label}
          </span>
          <span className="h-3 min-w-0 col-span-2 order-last sm:col-span-1 sm:order-none" aria-hidden="true">
            <span className="block h-3 rounded-r-[4px]" style={{ width: `${(d.value / max) * 100}%`, minWidth: 2, background: SERIES }} />
          </span>
          <span className="text-right whitespace-nowrap">
            <span className="block font-mono font-semibold text-[#111317]">{format(d.value)}</span>
            {d.detail && <span className="block text-[11px] text-neutral-500">{d.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
};
