import React, { useState } from 'react';
import { Bell, Calendar, Car, FileText, Globe, History, LayoutDashboard, LogOut, Menu, User } from 'lucide-react';
import { api } from '../../api';
import { useApp } from '../../context/AppContext';
import { initials } from '../../lib/labels';
import { useApiData } from '../../lib/useApiData';
import { useUnreadNotifications } from '../../lib/useUnreadNotifications';
import { NotificationsList } from '../notifications/NotificationsList';
import { Appointment, CustomerPage, CustomerProfile, Vehicle } from '../../types';
import { ErrorState, LoadingState } from '../ui/DesignSystem';
import { MenuButton, ResponsiveSidebar } from '../ui/ResponsiveSidebar';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { HistoryPage } from './pages/HistoryPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { ProfilePage } from './pages/ProfilePage';
import { PageTitle } from './pages/shared';
import { VehiclesPage } from './pages/VehiclesPage';

// `short` : libellé de la barre du bas sur mobile (les autres rubriques sont dans « Menu »)
const NAV: { id: CustomerPage; label: string; icon: React.ElementType; short?: string }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, short: 'Accueil' },
  { id: 'vehicles', label: 'Mes véhicules', icon: Car, short: 'Véhicules' },
  { id: 'appointments', label: 'Mes rendez-vous', icon: Calendar, short: 'Rendez-vous' },
  { id: 'invoices', label: 'Factures', icon: FileText, short: 'Factures' },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profil', icon: User },
];

/** Données partagées par les pages de l'espace client. */
export interface CustomerData {
  profile: CustomerProfile | null;
  vehicles: Vehicle[];
  appointments: Appointment[];
  reload: () => void;
}

export const CustomerPortal: React.FC = () => {
  const { customerPage, setCustomerPage: goTo, setPortalMode, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const setCustomerPage = (page: CustomerPage) => {
    setMenuOpen(false);
    goTo(page);
  };

  const profile = useApiData<CustomerProfile | null>(() => api.customers.me(), [], null);
  const vehicles = useApiData<Vehicle[]>(() => api.vehicles.list(), [], []);
  const appointments = useApiData<Appointment[]>(() => api.appointments.list(), [], []);
  // Les étapes avancent côté atelier : rafraîchissement périodique
  const unread = useUnreadNotifications(() => appointments.reload());

  const data: CustomerData = {
    profile: profile.data,
    vehicles: vehicles.data,
    appointments: appointments.data,
    reload: () => {
      profile.reload();
      vehicles.reload();
      appointments.reload();
      unread.reload();
    },
  };
  const loading = profile.loading && !profile.data;
  const error = profile.error || vehicles.error || appointments.error;

  return (
    <div className="min-h-screen flex bg-[#0B0C0E] text-[#F4F4F6]">
      <ResponsiveSidebar open={menuOpen} onClose={() => setMenuOpen(false)} label="Menu de l’espace client">
        <div>
          <div className="h-16 px-6 flex items-center border-b border-white/10">
            <button
              type="button"
              onClick={() => setPortalMode('public')}
              className="text-left font-display font-extrabold tracking-wider text-sm text-white"
            >
              PERFECTION <span className="text-[#D49A3D] block text-[10px] font-normal">BY BACHIR NDOUR</span>
            </button>
          </div>
          <nav className="p-4 space-y-1" aria-label="Espace client">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setCustomerPage(id)}
                aria-current={customerPage === id ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-3 lg:py-2.5 rounded-lg text-sm lg:text-xs font-medium transition-colors ${
                  customerPage === id
                    ? 'bg-[#D49A3D]/15 text-[#D49A3D] border border-[#D49A3D]/40 font-semibold'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {id === 'notifications' && unread.data > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#D49A3D] text-[#0B0C0E] text-[10px] font-bold flex items-center justify-center">
                    {unread.data}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-white/10 space-y-1">
          <button
            type="button"
            onClick={() => setPortalMode('public')}
            className="w-full flex items-center gap-2 px-3 py-3 lg:py-2 rounded-lg text-sm lg:text-xs text-neutral-400 hover:text-white hover:bg-white/5"
          >
            <Globe className="w-3.5 h-3.5 text-[#D49A3D]" /> Retour au site
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-3 lg:py-2 rounded-lg text-sm lg:text-xs text-neutral-400 hover:text-white hover:bg-white/5"
          >
            <LogOut className="w-3.5 h-3.5 text-[#D49A3D]" /> Se déconnecter
          </button>
        </div>
      </ResponsiveSidebar>

      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        <header className="h-16 bg-[#101216] border-b border-white/10 px-4 sm:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <MenuButton onClick={() => setMenuOpen(true)} />
            <span className="text-xs text-neutral-400 truncate">
              <span className="hidden sm:inline">Espace client · </span>
              <strong className="text-white">{NAV.find((n) => n.id === customerPage)?.label}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCustomerPage('notifications')}
              className="relative w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 text-neutral-300 hover:text-white"
              aria-label={`Notifications${unread.data ? ` (${unread.data} non lues)` : ''}`}
            >
              <Bell className="w-4 h-4" />
              {unread.data > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#D49A3D] text-[#0B0C0E] text-[10px] font-bold flex items-center justify-center">
                  {unread.data}
                </span>
              )}
            </button>
            {profile.data && (
              <button
                type="button"
                onClick={() => setCustomerPage('profile')}
                className="flex items-center gap-2.5 p-1.5 sm:pr-3 rounded-lg border border-white/10 hover:border-white/25"
                aria-label="Mon profil"
              >
                <span className="w-7 h-7 rounded-full bg-[#D49A3D] text-[#0B0C0E] font-bold text-xs flex items-center justify-center">
                  {initials(profile.data.name)}
                </span>
                <span className="hidden sm:inline text-xs font-medium text-white">{profile.data.name}</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {error && (
            <div className="mb-6">
              <ErrorState message={error} onRetry={data.reload} />
            </div>
          )}
          {loading ? (
            <LoadingState />
          ) : (
            <>
              {customerPage === 'dashboard' && <CustomerDashboard data={data} />}
              {customerPage === 'vehicles' && <VehiclesPage data={data} />}
              {customerPage === 'appointments' && <AppointmentsPage data={data} />}
              {customerPage === 'history' && <HistoryPage data={data} />}
              {customerPage === 'profile' && <ProfilePage data={data} />}
              {customerPage === 'invoices' && <InvoicesPage />}
              {customerPage === 'notifications' && (
                <>
                  <PageTitle title="Notifications" subtitle="Chaque étape de vos rendez-vous. Vous les recevez aussi par email." />
                  <NotificationsList
                    tone="dark"
                    onChanged={unread.reload}
                    onOpen={(n) => n.appointmentId && setCustomerPage('appointments')}
                  />
                </>
              )}
            </>
          )}
        </main>
      </div>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0B0C0E]/95 backdrop-blur-md border-t border-white/10 grid grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)]"
        aria-label="Navigation mobile"
      >
        {NAV.filter((n) => n.short).map(({ id, short, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setCustomerPage(id)}
            aria-current={customerPage === id ? 'page' : undefined}
            className={`h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
              customerPage === id ? 'text-[#D49A3D]' : 'text-neutral-400'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="truncate max-w-full">{short}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="relative h-16 flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-neutral-400"
        >
          <Menu className="w-5 h-5" />
          <span>Menu</span>
          {unread.data > 0 && <span className="absolute top-2.5 right-[calc(50%-16px)] w-2 h-2 rounded-full bg-[#D49A3D]" />}
        </button>
      </nav>
    </div>
  );
};
