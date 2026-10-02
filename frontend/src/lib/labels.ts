import {
  AppointmentAction,
  AppointmentStatus,
  CustomerSegment,
  EmployeeStatus,
  Fuel,
  ServiceCategory,
  ServiceItem,
} from '../types';

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'À confirmer',
  confirmed: 'Confirmé',
  received: 'Véhicule reçu',
  in_progress: 'En cours',
  quality_check: 'Contrôle final',
  done: 'Terminé',
  delivered: 'Restitué',
  cancelled: 'Annulé',
  refused: 'Refusé',
  no_show: 'Absent',
  rescheduled: 'Reporté',
};

export const ACTION_LABELS: Record<AppointmentAction, string> = {
  confirm: 'Confirmer',
  refuse: 'Refuser',
  check_in: 'Véhicule déposé',
  start: 'Démarrer',
  submit_quality_check: 'Contrôle final',
  rework: 'Reprendre',
  complete: 'Valider et terminer',
  deliver: 'Restituer au client',
  no_show: 'Client absent',
  cancel: 'Annuler',
};

/** Actions affichées comme destructives (confirmation demandée). */
export const DESTRUCTIVE_ACTIONS: AppointmentAction[] = ['cancel', 'refuse', 'no_show'];

export const UPCOMING_STATUSES: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'rescheduled',
  'received',
  'in_progress',
  'quality_check',
];
export const COMPLETED_STATUSES: AppointmentStatus[] = ['done', 'delivered'];
export const CLOSED_STATUSES: AppointmentStatus[] = ['cancelled', 'refused', 'no_show'];
export const IN_WORKSHOP_STATUSES: AppointmentStatus[] = ['received', 'in_progress', 'quality_check', 'done'];

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  detailing: 'Detailing',
  cleaning: 'Nettoyage',
  polishing: 'Polissage',
  protection: 'Protection',
  preparation: 'Préparation',
};

export const FUEL_LABELS: Record<Exclude<Fuel, ''>, string> = {
  diesel: 'Diesel',
  petrol: 'Essence',
  hybrid: 'Hybride',
  electric: 'Électrique',
};

export const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  new: 'Nouveau',
  active: 'Actif',
  vip: 'VIP',
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  available: 'Disponible',
  busy: 'Occupé',
  break: 'En pause',
  absent: 'Absent',
};

export const fuelLabel = (fuel: Fuel) => (fuel ? FUEL_LABELS[fuel] : '—');

export const formatFcfa = (amount: number | null | undefined) =>
  amount == null ? '—' : `${amount.toLocaleString('fr-FR')} FCFA`;

export const priceLabel = (service: Pick<ServiceItem, 'pricingType' | 'price'>) => {
  if (service.pricingType === 'quote' || service.price == null) return 'Sur devis';
  const amount = formatFcfa(service.price);
  return service.pricingType === 'from' ? `À partir de ${amount}` : amount;
};

const TZ = 'Africa/Dakar';

export const formatDate = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }).format(
        new Date(iso)
      )
    : '—';

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(new Date(iso));

export const formatDateTime = (iso: string) => `${formatDate(iso)} à ${formatTime(iso)}`;

/** Date locale (Dakar) au format AAAA-MM-JJ. */
export const isoDay = (date: Date | string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(typeof date === 'string' ? new Date(date) : date);

export const formatDayLong = (day: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(`${day}T00:00:00Z`)
  );

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
