import React, { useEffect } from 'react';
import { Menu, X } from 'lucide-react';

/**
 * Barre latérale des espaces connectés.
 * - ≥ 1024 px (lg) : fixe à gauche.
 * - < 1024 px (tablette, mobile) : panneau coulissant ouvert par le bouton menu,
 *   fermé par la croix, le voile, la touche Échap ou le choix d'une rubrique.
 */
export const ResponsiveSidebar: React.FC<{
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}> = ({ open, onClose, label, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // pas de défilement de la page derrière le panneau
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        aria-label={label}
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0B0C0E] border-r border-white/10 flex flex-col justify-between overflow-y-auto
          transition-[transform,visibility] duration-200 ease-out
          ${open ? 'translate-x-0 visible' : '-translate-x-full invisible'}
          lg:visible lg:static lg:translate-x-0 lg:w-64 lg:max-w-none lg:shrink-0 lg:z-auto`}
      >
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center text-neutral-300"
          aria-label="Fermer le menu"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </aside>
    </>
  );
};

export const MenuButton: React.FC<{ onClick: () => void; tone?: 'dark' | 'light' }> = ({ onClick, tone = 'dark' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Ouvrir le menu"
    className={`lg:hidden w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${
      tone === 'dark' ? 'border-white/10 text-neutral-200' : 'border-neutral-200 text-[#111317] bg-white'
    }`}
  >
    <Menu className="w-5 h-5" />
  </button>
);
