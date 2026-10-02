import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Wrench,
  MoveHorizontal,
  X,
  Car,
  ShieldCheck,
  Loader2,
  Hammer,
  FlaskConical,
} from 'lucide-react';
import { DEMO_MODE } from '../../api';
import { useApp } from '../../context/AppContext';

/**
 * Resilient Image component complying with Zero-Broken-Image Policy
 */
export const SmartImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`bg-gradient-to-br from-[#16181D] via-[#101216] to-[#0B0C0E] flex flex-col items-center justify-center p-6 text-center border border-white/10 ${className}`}
      >
        <Car className="w-8 h-8 text-[#D49A3D] mb-2 opacity-80" />
        <span className="text-xs text-neutral-400 font-medium line-clamp-1">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

/**
 * Semantic Status Indicator (No static pill enclosures; uses icon + explicit text label)
 */
export const StatusIndicator: React.FC<{
  status: string;
  tone?: 'dark' | 'light';
}> = ({ status, tone = 'dark' }) => {
  const getConfig = () => {
    switch (status) {
      case 'Confirmé':
      case 'Terminé':
      case 'Restitué':
      case 'Payé':
      case 'Prêt':
      case 'Actif':
      case 'VIP':
      case 'Disponible':
        return {
          icon: CheckCircle2,
          colorClass: tone === 'dark' ? 'text-emerald-400' : 'text-emerald-700',
        };
      case 'Véhicule reçu':
      case 'En cours':
      case 'Contrôle final':
      case 'Occupé':
      case 'Partiellement payé':
        return {
          icon: Wrench,
          colorClass: tone === 'dark' ? 'text-[#D49A3D]' : 'text-amber-700',
        };
      case 'À confirmer':
      case 'Reporté':
      case 'En attente':
      case 'En pause':
      case 'Nouveau':
        return {
          icon: Clock,
          colorClass: tone === 'dark' ? 'text-amber-400' : 'text-amber-700',
        };
      case 'Annulé':
      case 'Refusé':
      case 'Absent':
        return {
          icon: XCircle,
          colorClass: tone === 'dark' ? 'text-rose-400' : 'text-rose-700',
        };
      default:
        return {
          icon: AlertCircle,
          colorClass: tone === 'dark' ? 'text-neutral-400' : 'text-neutral-600',
        };
    }
  };

  const { icon: Icon, colorClass } = getConfig();

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${colorClass}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{status}</span>
    </span>
  );
};

/**
 * Interactive Before / After Comparison Slider
 */
export const BeforeAfterSlider: React.FC<{
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  altTitle: string;
  className?: string;
}> = ({
  beforeImage,
  afterImage,
  beforeLabel = 'Avant',
  afterLabel = 'Après',
  altTitle,
  className = 'aspect-[16/10]',
}) => {
  const [position, setPosition] = useState(48);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setPosition(percent);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) handleMove(e.touches[0].clientX);
    };
    const onStop = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('mouseup', onStop);
      window.addEventListener('touchend', onStop);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onStop);
      window.removeEventListener('touchend', onStop);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => {
        setIsDragging(true);
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        if (e.touches[0]) handleMove(e.touches[0].clientX);
      }}
      className={`relative overflow-hidden select-none cursor-ew-resize rounded-xl border border-white/10 bg-[#121316] ${className}`}
      role="slider"
      aria-label={`Comparaison avant et après pour ${altTitle}`}
      aria-valuenow={position}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') setPosition((p) => Math.max(5, p - 5));
        if (e.key === 'ArrowRight') setPosition((p) => Math.min(95, p + 5));
      }}
    >
      {/* AFTER IMAGE (couche de base) */}
      <SmartImage
        src={afterImage}
        alt={`${altTitle} - Après traitement`}
        className="w-full h-full object-cover"
      />

      {/* BEFORE IMAGE (couche découpée ; photo affichée telle quelle, sans retouche) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <SmartImage
          src={beforeImage}
          alt={`${altTitle} - Avant traitement`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Bottom Scrim & Labels */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

      <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/75 border border-white/15 rounded text-xs font-medium text-neutral-200 pointer-events-none">
        {beforeLabel}
      </div>
      <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/75 border border-[#D49A3D]/40 rounded text-xs font-medium text-[#D49A3D] pointer-events-none">
        {afterLabel}
      </div>

      {/* Divider Line & Handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-[#D49A3D] shadow-[0_0_12px_rgba(212,154,61,0.8)] pointer-events-none"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#0B0C0E] border-2 border-[#D49A3D] text-[#D49A3D] flex items-center justify-center shadow-lg">
          <MoveHorizontal className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

/**
 * Reusable Accessible Modal
 */
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-2xl' }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-xl bg-[#14161A] border border-white/12 text-[#F4F4F6] shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#14161A]/95 backdrop-blur-xs border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white font-display">{title}</h3>
            {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:border-white/25 transition-colors"
            aria-label="Fermer la fenêtre"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

/**
 * Toast Notifications Container
 */
export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === 'warning' ? 'alert' : 'status'}
          className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl bg-[#16181D] border text-white shadow-2xl ${
            toast.type === 'warning' ? 'border-rose-500/50' : 'border-[#D49A3D]/40'
          }`}
        >
          <div className="flex items-start gap-3">
            {toast.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-[#D49A3D] shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-semibold text-white">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">
                  {toast.description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="text-neutral-400 hover:text-white p-1"
            aria-label="Fermer la notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

/** États de chargement / erreur / vide pour les listes issues de l'API. */
export const LoadingState: React.FC<{ label?: string; tone?: 'dark' | 'light' }> = ({
  label = 'Chargement…',
  tone = 'dark',
}) => (
  <div
    className={`flex items-center gap-2 py-8 justify-center text-xs ${
      tone === 'dark' ? 'text-neutral-400' : 'text-neutral-500'
    }`}
    role="status"
  >
    <Loader2 className="w-4 h-4 animate-spin" />
    <span>{label}</span>
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="p-4 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center justify-between gap-3" role="alert">
    <span className="flex items-center gap-2">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {message}
    </span>
    {onRetry && (
      <button type="button" onClick={onRetry} className="underline font-semibold shrink-0">
        Réessayer
      </button>
    )}
  </div>
);

export const EmptyState: React.FC<{ message: string; tone?: 'dark' | 'light' }> = ({ message, tone = 'dark' }) => (
  <p className={`py-8 text-center text-xs ${tone === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>{message}</p>
);

/** Module prévu dans une phase ultérieure du cahier des charges. */
export const ComingSoon: React.FC<{ title: string; phase: string; description: string; tone?: 'dark' | 'light' }> = ({
  title,
  phase,
  description,
  tone = 'dark',
}) => (
  <div
    className={`rounded-xl p-8 border text-center max-w-xl mx-auto ${
      tone === 'dark' ? 'bg-[#121418] border-white/10' : 'bg-white border-neutral-200'
    }`}
  >
    <Hammer className="w-8 h-8 text-[#D49A3D] mx-auto mb-3" />
    <p className="text-[11px] uppercase tracking-widest text-[#B87D24] font-semibold">{phase}</p>
    <h1 className={`text-xl font-bold font-display mt-1 ${tone === 'dark' ? 'text-white' : 'text-[#111317]'}`}>{title}</h1>
    <p className={`text-xs mt-2 leading-relaxed ${tone === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>{description}</p>
  </div>
);

/** Bandeau affiché en permanence en mode démonstration. */
export const DemoBanner: React.FC = () =>
  DEMO_MODE ? (
    <div className="bg-amber-500 text-[#0B0C0E] text-[11px] font-semibold text-center py-1 px-4 flex items-center justify-center gap-2">
      <FlaskConical className="w-3.5 h-3.5" />
      Mode démonstration — données fictives, rien n’est enregistré
    </div>
  ) : null;
