import React, { useEffect } from 'react';
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
import { AppointmentsPage } from './pages/AppointmentsPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
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
      { id: 'payments', label: 'Paiements', icon: CreditCard, roles: MANAGERS },
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
  const { adminPage, setAdminPage, setPortalMode, user, logout } = useApp();
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
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0B0C0E] text-[#F4F4F6]">
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between shrink-0">
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-white/10">
            <button
              type="button"
              onClick={() => setPortalMode('public')}
              className="text-left font-display font-extrabold tracking-wider text-sm text-white"
            >
              PERFECTION <span className="text-[#D49A3D] block text-[10px] font-normal">ESPACE PROFESSIONNEL</span>
            </button>
            <button
              type="button"
              onClick={logout}
              className="md:hidden p-2 rounded border border-white/15 text-neutral-300"
              aria-label="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <nav className="p-3 md:p-4 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible" aria-label="Espace professionnel">
            {groups.map((g) => (
              <React.Fragment key={g.group || 'root'}>
                {g.group && (
                  <p className="hidden md:block text-[10px] uppercase tracking-wider text-neutral-500 font-semibold px-3 pt-3 pb-1">
                    {g.group}
                  </p>
                )}
                {g.items.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAdminPage(id)}
                    aria-current={adminPage === id ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
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
        <div className="hidden md:flex flex-col gap-1 p-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => setPortalMode('public')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-white/5"
          >
            <Globe className="w-3.5 h-3.5 text-[#D49A3D]" /> Voir le site public
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-white/5"
          >
            <LogOut className="w-3.5 h-3.5 text-[#D49A3D]" /> Se déconnecter
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#F4F5F7] text-[#111317]">
        <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between shrink-0">
          <span className="text-xs text-neutral-500">
            {ROLE_LABELS[role]} · <strong className="text-[#111317]">{fullName}</strong>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAdminPage('notifications')}
              className="relative p-2 rounded-lg border border-neutral-200 text-neutral-600 hover:text-[#111317]"
              aria-label={`Notifications${unread.data ? ` (${unread.data} non lues)` : ''}`}
            >
              <Bell className="w-4 h-4" />
              <UnreadBadge count={unread.data} className="absolute -top-1.5 -right-1.5" />
            </button>
            <span className="hidden sm:inline text-xs font-mono text-neutral-500 capitalize">{formatDayLong(isoDay(new Date()))}</span>
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
          {(adminPage === 'payments' || adminPage === 'invoices') && (
            <ComingSoon
              tone="light"
              title={adminPage === 'payments' ? 'Paiements' : 'Facturation'}
              phase="Phase 3 — Finances"
              description="Encaissements (Wave, Orange Money, carte, espèces, virement), factures INV-AAAA-XXXX en PDF et suivi du reste à payer."
            />
          )}
          {adminPage === 'gallery' && (
            <ComingSoon
              tone="light"
              title="Galerie Avant / Après"
              phase="Phase 4 — Contenu"
              description="Publication et dépublication des réalisations, synchronisées avec la page publique « Réalisations »."
            />
          )}
          {adminPage === 'statistics' && (
            <ComingSoon
              tone="light"
              title="Statistiques"
              phase="Phase 4 — Analyse"
              description="Chiffre d’affaires, rendez-vous, annulations, services populaires, clients récurrents et exports CSV, calculés à partir des données réelles."
            />
          )}
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
