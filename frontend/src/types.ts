// Types du domaine, alignés sur l'API Django /api/v1/ (voir api/http/mappers.ts).

/** 'space' = espace connecté : le rôle du compte décide (client → espace client, personnel → espace pro). */
export type PortalMode = 'public' | 'space';

export type PublicPage =
  | 'home'
  | 'services'
  | 'service-detail'
  | 'realisations'
  | 'about'
  | 'contact'
  | 'booking';

export type CustomerPage =
  | 'dashboard'
  | 'vehicles'
  | 'appointments'
  | 'history'
  | 'invoices'
  | 'notifications'
  | 'profile';

export type AdminPage =
  | 'dashboard'
  | 'appointments'
  | 'customers'
  | 'vehicles'
  | 'services'
  | 'team'
  | 'payments'
  | 'invoices'
  | 'gallery'
  | 'statistics'
  | 'settings'
  | 'notifications';

// --- Comptes ---

export type Role = 'client' | 'technician' | 'manager' | 'admin';

export interface CurrentUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  customerId: number | null;
  employeeId: number | null;
}

// --- Catalogue ---

export type ServiceCategory = 'detailing' | 'cleaning' | 'polishing' | 'protection' | 'preparation';
export type PricingType = 'fixed' | 'from' | 'quote';

export interface ServiceItem {
  id: number;
  name: string;
  slug: string;
  category: ServiceCategory;
  shortDescription: string;
  description: string;
  pricingType: PricingType;
  price: number | null; // FCFA, null si « sur devis »
  durationMinutes: number; // durée bloquée au planning
  durationLabel: string; // durée affichée, ex. « 2h - 4h »
  image: string;
  benefits: string[];
  processSteps: { step: string; title: string; description: string }[];
  available: boolean;
  sortOrder: number;
}

export type ServiceInput = Omit<ServiceItem, 'id' | 'slug'> & { slug?: string };

// --- Clients & véhicules ---

export type CustomerSegment = 'new' | 'active' | 'vip';

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  segment: CustomerSegment;
  internalNotes: string;
  hasAccount: boolean;
  completedAmount: number; // montant des prestations terminées (estimé)
  lastServiceAt: string | null;
  createdAt: string;
}

export interface CustomerProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export type Fuel = 'diesel' | 'petrol' | 'hybrid' | 'electric' | '';

export interface Vehicle {
  id: number;
  customerId: number;
  customerName: string;
  brand: string;
  model: string;
  year: number | null;
  registration: string;
  color: string;
  fuel: Fuel;
  photo: string;
  notes: string;
}

export interface VehicleInput {
  customerId?: number;
  brand: string;
  model: string;
  registration: string;
  year: number | null;
  fuel: Fuel;
  color: string;
  notes?: string;
}

// --- Équipe ---

export type EmployeeStatus = 'available' | 'busy' | 'break' | 'absent';

export interface Employee {
  id: number;
  name: string;
  jobTitle: string;
  specialty: string;
  phone: string;
  email: string;
  status: EmployeeStatus;
  isActive: boolean;
  todayAppointments: number;
}

// --- Rendez-vous ---

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'received'
  | 'in_progress'
  | 'quality_check'
  | 'done'
  | 'delivered'
  | 'cancelled'
  | 'refused'
  | 'no_show'
  | 'rescheduled';

export type AppointmentAction =
  | 'confirm'
  | 'refuse'
  | 'check_in'
  | 'start'
  | 'submit_quality_check'
  | 'rework'
  | 'complete'
  | 'deliver'
  | 'no_show'
  | 'cancel';

export interface StatusHistoryEntry {
  action: string;
  fromStatus: string;
  toStatus: string;
  note: string;
  changedBy: string | null;
  createdAt: string;
}

export interface Appointment {
  id: number;
  reference: string;
  status: AppointmentStatus;
  statusLabel: string;
  progress: number | null; // déduit des étapes validées
  allowedActions: AppointmentAction[]; // calculé par le serveur selon le rôle
  serviceId: number;
  serviceName: string;
  vehicleId: number;
  vehicleName: string;
  vehicleRegistration: string;
  vehiclePhoto: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  startAt: string; // ISO
  endAt: string;
  price: number | null;
  customerNotes: string;
  assignedEmployeeId: number | null;
  assignedEmployeeName: string | null;
  steps: WorkshopStep[];
  // Personnel uniquement
  internalNotes?: string;
  history?: StatusHistoryEntry[];
  invoice?: InvoiceSummary | null;
}

export interface WorkshopStep {
  id: number;
  order: number;
  title: string;
  done: boolean;
  doneAt: string | null;
}

export interface InvoiceSummary {
  id: number;
  number: string;
  total: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
}

export type PhotoKind = 'inspection' | 'before' | 'after';

export interface AppointmentPhoto {
  id: number;
  kind: PhotoKind;
  kindLabel: string;
  caption: string;
  url: string;
  createdAt: string;
}

export type PaymentMethod = 'wave' | 'orange_money' | 'card' | 'cash' | 'transfer';

export interface CashReport {
  date: string;
  total: number;
  cashTotal: number;
  byMethod: { method: string; amount: number; count: number }[];
  byPerson: { person: string; amount: number; count: number; cash: number }[];
  payments: {
    id: number;
    invoiceNumber: string;
    customerName: string;
    amount: number;
    method: string;
    reference: string;
    receivedAt: string;
    recordedBy: string | null;
    refunded: boolean;
  }[];
}

export interface AppointmentFilters {
  status?: AppointmentStatus[];
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: number;
  vehicleId?: number;
}

export interface BookingInput {
  serviceId: number;
  date: string; // AAAA-MM-JJ
  time: string; // HH:MM
  vehicleId?: number;
  newVehicle?: Omit<VehicleInput, 'customerId' | 'notes'>;
  contact?: { fullName: string; phone: string; email: string };
  customerId?: number; // saisie par le personnel
  notes?: string;
}

// --- Disponibilités & atelier ---

export interface AvailableDay {
  date: string;
  availableSlots: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface OpeningHoursEntry {
  weekday: number;
  label: string;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export interface DashboardSummary {
  date: string;
  appointmentsToday: number;
  toConfirm: number;
  inWorkshop: number;
  inProgress: number;
  completedToday: number;
  newCustomers30d: number;
}

export interface AppNotification {
  id: number;
  kind: string;
  title: string;
  message: string;
  appointmentId: number | null;
  read: boolean;
  createdAt: string;
}

export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'cancelled';

export interface Invoice {
  id: number;
  number: string;
  status: InvoiceStatus;
  statusLabel: string;
  customerName: string;
  appointmentId: number | null;
  appointmentReference: string | null;
  vehicle: string | null;
  issuedAt: string;
  lines: { label: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  balance: number;
  payments: { id: number; amount: number; method: string; reference: string; receivedAt: string; refunded: boolean; recordedBy: string | null }[];
  notes: string;
  cancelReason: string;
  pdfUrl: string;
}

export interface InvoiceLineInput {
  label: string;
  quantity: number;
  unitPrice: number;
}

export type StatsGroup = 'day' | 'week' | 'month';

export interface AnalyticsSummary {
  from: string;
  to: string;
  revenue: number;
  revenueSeries: { period: string; amount: number }[];
  revenueByMethod: { method: string; amount: number; count: number }[];
  appointments: { total: number; byStatus: Record<string, number>; cancellations: number; cancellationRate: number };
  popularServices: { service: string; count: number }[];
  newCustomers: number;
  returningCustomers: number;
  vehiclesTreated: number;
}

// --- Gestion des contenus publics (manager) ---

export interface ManagedProject {
  id: number;
  title: string;
  vehicleLabel: string;
  category: ServiceCategory;
  description: string;
  servicesPerformed: string;
  durationLabel: string;
  completedOn: string | null;
  beforeUrl: string;
  afterUrl: string;
  isPublished: boolean;
  featured: boolean;
}

export type ProjectInput = Omit<ManagedProject, 'id' | 'beforeUrl' | 'afterUrl'>;

export interface ManagedTestimonial {
  id: number;
  author: string;
  role: string;
  vehicleLabel: string;
  quote: string;
  consentObtained: boolean;
  isPublished: boolean;
}

export interface ManagedHighlight {
  id: number;
  value: string;
  label: string;
  isPublished: boolean;
  sortOrder: number;
}

export interface ContactInput {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

// --- Contenu éditorial (galerie, avis) — phase 4, fourni uniquement par les mocks pour l'instant ---

export interface PortfolioProject {
  id: string;
  title: string;
  vehicle: string;
  category: string;
  servicesPerformed: string[];
  description: string;
  duration: string;
  completionDate: string;
  beforeImage: string;
  afterImage: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  vehicle: string;
}

export interface Highlight {
  value: string;
  label: string;
}
