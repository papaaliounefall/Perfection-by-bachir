import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Bell,
  Calendar,
  Car,
  CreditCard,
  FileText,
  Globe,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Settings,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useUnreadNotifications } from '../../lib/useUnreadNotifications';
import { NotificationsList, UnreadBadge } from '../notifications/NotificationsList';
import { formatDayLong, initials, isoDay } from '../../lib/labels';
import { AdminPage, Role } from '../../types';
import { ComingSoon } from '../ui/DesignSystem';
import { MenuButton, ResponsiveSidebar } from '../ui/ResponsiveSidebar';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { GalleryPage } from './pages/GalleryPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { ServicesPage } from './pages/ServicesPage';
import { TeamPage } from './pages/TeamPage';
import { VehiclesPage } from './pages/VehiclesPage';

const MANAGERS: Role[] = ['manager', 'admin'];
const STAFF: Role[] = ['technician', 'manager', 'admin'];

const NAV: { group: string; items: { id: AdminPage; label: string; icon: React.ElementType; roles: Role[] }[] }[] = [
  {
    group: '',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: MANAGERS },
      { id: 'notifications', label: 'Notifications', icon: Bell, roles: STAFF },
    ],
  },
  {
    group: 'Activité',
    items: [
      { id: 'appointments', label: 'Rendez-vous', icon: Calendar, roles: STAFF },
      { id: 'customers', label: 'Clients', icon: Users, roles: STAFF },
      { id: 'vehicles', label: 'Véhicules', icon: Car, roles: STAFF },
    ],
  },
  {
    group: 'Atelier',
    items: [
      { id: 'services', label: 'Prestations', icon: Wrench, roles: MANAGERS },
      { id: 'team', label: 'Équipe', icon: UserCheck, roles: MANAGERS },
    ],
  },
  {
    group: 'Finances',
    items: [
      { id: 'payments', label: 'Journal de caisse', icon: CreditCard, roles: MANAGERS },
      { id: 'invoices', label: 'Factures', icon: FileText, roles: MANAGERS },
    ],
  },
  {
    group: 'Contenu & analyse',
    items: [
      { id: 'gallery', label: 'Galerie', icon: ImageIcon, roles: MANAGERS },
      { id: 'statistics', label: 'Statistiques', icon: BarChart3, roles: MANAGERS },
      { id: 'settings', label: 'Paramètres', icon: Settings, roles: ['admin'] },
    ],
  },
];

const ROLE_LABELS: Record<Role, string> = {
  client: 'Client',
  technician: 'Technicien',
  manager: 'Manager',
  admin: 'Administrateur',
};

export const AdminDashboard: React.FC = () => {
  const { adminPage, setAdminPage: goTo, setPortalMode, user, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const setAdminPage = (page: typeof adminPage) => {
    setMenuOpen(false);
    goTo(page);
  };
  const role = user!.role;
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter(
    (g) => g.items.length
  );
  const allowed = groups.flatMap((g) => g.items.map((i) => i.id));
  const unread = useUnreadNotifications();

  // Un technicien arrive directement sur ses rendez-vous
  useEffect(() => {
    if (!allowed.includes(adminPage)) setAdminPage(allowed[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const fullName = `${user!.firstName} ${user!.lastName}`.trim() || user!.email;

  return (
    <div className="min-h-screen flex bg-[#0B0C0E] text-[#F4F4F6]">
      <ResponsiveSidebar open={menuOpen} onClose={() => setMenuOpen(false)} label="Menu de l’espace professionnel">
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-white/10">
            <button
              type="button"
              onClick={() => setPortalMode('public')}
              className="text-left font-display font-extrabold tracking-wider text-sm text-white"
            >
              PERFECTION <span className="text-[#D49A3D] block text-[10px] font-normal">ESPACE PROFESSIONNEL</span>
            </button>
          </div>
          <nav className="p-4 flex flex-col gap-1" aria-label="Espace professionnel">
            {groups.map((g) => (
              <React.Fragment key={g.group || 'root'}>
                {g.group && (
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold px-3 pt-3 pb-1">
                    {g.group}
                  </p>
                )}
                {g.items.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAdminPage(id)}
                    aria-current={adminPage === id ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-3 lg:py-2 rounded-lg text-sm lg:text-xs font-medium whitespace-nowrap transition-colors ${
                      adminPage === id
                        ? 'bg-[#D49A3D]/15 text-[#D49A3D] border border-[#D49A3D]/40 font-semibold'
                        : 'text-neutral-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">{label}</span>
                    {id === 'notifications' && <UnreadBadge count={unread.data} />}
                  </button>
                ))}
              </React.Fragment>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-1 p-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => setPortalMode('public')}
            className="flex items-center gap-2 px-3 py-3 lg:py-2 rounded-lg text-sm lg:text-xs text-neutral-400 hover:text-white hover:bg-white/5"
          >
            <Globe className="w-3.5 h-3.5 text-[#D49A3D]" /> Voir le site public
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 px-3 py-3 lg:py-2 rounded-lg text-sm lg:text-xs text-neutral-400 hover:text-white hover:bg-white/5"
          >
            <LogOut className="w-3.5 h-3.5 text-[#D49A3D]" /> Se déconnecter
          </button>
        </div>
      </ResponsiveSidebar>

      <div className="flex-1 flex flex-col min-w-0 bg-[#F4F5F7] text-[#111317]">
        <header className="h-16 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <MenuButton tone="light" onClick={() => setMenuOpen(true)} />
            <span className="text-xs text-neutral-500 truncate">
              <span className="hidden sm:inline">{ROLE_LABELS[role]} · </span>
              <strong className="text-[#111317]">{fullName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setAdminPage('notifications')}
              className="relative w-10 h-10 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:text-[#111317]"
              aria-label={`Notifications${unread.data ? ` (${unread.data} non lues)` : ''}`}
            >
              <Bell className="w-4 h-4" />
              <UnreadBadge count={unread.data} className="absolute -top-1.5 -right-1.5" />
            </button>
            <span className="hidden md:inline text-xs font-mono text-neutral-500 capitalize">{formatDayLong(isoDay(new Date()))}</span>
            <span className="w-8 h-8 rounded-full bg-[#111317] text-[#D49A3D] font-bold text-xs flex items-center justify-center">
              {initials(fullName)}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {adminPage === 'dashboard' && <DashboardPage />}
          {adminPage === 'appointments' && <AppointmentsPage />}
          {adminPage === 'customers' && <CustomersPage />}
          {adminPage === 'vehicles' && <VehiclesPage />}
          {adminPage === 'services' && <ServicesPage />}
          {adminPage === 'team' && <TeamPage />}
          {adminPage === 'payments' && <PaymentsPage />}
          {adminPage === 'invoices' && <InvoicesPage />}
          {adminPage === 'gallery' && <GalleryPage />}
          {adminPage === 'statistics' && <StatisticsPage />}
          {adminPage === 'notifications' && (
            <>
              <h1 className="text-2xl font-bold font-display mb-1">Notifications</h1>
              <p className="text-xs text-neutral-500 mb-6">Ce qui demande votre attention à l’atelier.</p>
              <NotificationsList
                tone="light"
                onChanged={unread.reload}
                onOpen={(n) => n.appointmentId && setAdminPage('appointments')}
              />
            </>
          )}
          {adminPage === 'settings' && (
            <ComingSoon
              tone="light"
              title="Paramètres"
              phase="Disponible via l’administration Django"
              description="Horaires d’ouverture, fermetures exceptionnelles, utilisateurs et rôles se gèrent pour l’instant dans /admin/ (back-office Django)."
            />
          )}
        </main>
      </div>
    </div>
  );
};
