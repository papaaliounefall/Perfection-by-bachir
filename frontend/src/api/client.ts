import {
  AnalyticsSummary,
  AppNotification,
  Appointment,
  AppointmentPhoto,
  CashReport,
  PaymentMethod,
  PhotoKind,
  StatsGroup,
  AppointmentAction,
  AppointmentFilters,
  AvailableDay,
  BookingInput,
  ContactInput,
  CurrentUser,
  Invoice,
  InvoiceLineInput,
  Customer,
  CustomerProfile,
  DashboardSummary,
  Employee,
  EmployeeStatus,
  Highlight,
  OpeningHoursEntry,
  PortfolioProject,
  ServiceInput,
  ServiceItem,
  Testimonial,
  TimeSlot,
  Vehicle,
  VehicleInput,
} from '../types';

/**
 * Contrat unique d'accès aux données. Deux implémentations :
 *  - api/http : l'API Django réelle (/api/v1/)
 *  - mocks/   : simulation en mémoire pour la démo (VITE_USE_MOCKS=true)
 * Les composants ne connaissent que cette interface.
 */
export interface ApiClient {
  auth: {
    me(): Promise<CurrentUser | null>;
    login(email: string, password: string): Promise<CurrentUser>;
    logout(): Promise<void>;
    register(input: { fullName: string; email: string; phone: string; password: string }): Promise<CurrentUser>;
    /** Toujours « OK » : ne révèle pas si l'email est inscrit. */
    requestPasswordReset(email: string): Promise<void>;
    confirmPasswordReset(uid: string, token: string, newPassword: string): Promise<void>;
  };
  invoices: {
    list(): Promise<Invoice[]>;
    /** Manager : facture d'une prestation terminée (lignes libres pour un devis). */
    create(input: { appointmentId: number; lines?: InvoiceLineInput[]; discount: number; notes?: string }): Promise<Invoice>;
    /** Manager : uniquement si aucun paiement actif (rembourser d'abord). */
    cancel(invoiceId: number, reason: string): Promise<Invoice>;
    /** Encaissement (manager, ou technicien au comptoir). */
    recordPayment(invoiceId: number, amount: number, method: PaymentMethod, reference?: string): Promise<void>;
  };
  payments: {
    /** Journal de caisse d'une journée (manager). */
    cashReport(date: string): Promise<CashReport>;
    refund(paymentId: number, reason: string): Promise<void>;
  };
  workshop: {
    /** Coche / décoche une étape ; renvoie l'avancement recalculé. */
    setStep(appointmentId: number, stepId: number, done: boolean): Promise<number | null>;
    photos(appointmentId: number): Promise<AppointmentPhoto[]>;
    uploadPhoto(appointmentId: number, file: File, kind: PhotoKind, caption: string): Promise<AppointmentPhoto>;
    deletePhoto(appointmentId: number, photoId: number): Promise<void>;
  };
  services: {
    list(): Promise<ServiceItem[]>;
    create(input: ServiceInput): Promise<ServiceItem>;
    update(id: number, patch: Partial<ServiceInput>): Promise<ServiceItem>;
  };
  customers: {
    list(query?: string): Promise<Customer[]>;
    create(input: { name: string; email: string; phone: string; address?: string }): Promise<Customer>;
    update(id: number, patch: Partial<Pick<Customer, 'name' | 'email' | 'phone' | 'address' | 'segment' | 'internalNotes'>>): Promise<Customer>;
    me(): Promise<CustomerProfile>;
    updateMe(patch: Partial<Pick<CustomerProfile, 'name' | 'phone' | 'address'>>): Promise<CustomerProfile>;
  };
  vehicles: {
    list(): Promise<Vehicle[]>;
    create(input: VehicleInput): Promise<Vehicle>;
    /** Photo privée : JPEG/PNG/WebP, 5 Mo max, redimensionnée par le serveur. */
    uploadPhoto(id: number, file: File): Promise<Vehicle>;
    removePhoto(id: number): Promise<Vehicle>;
  };
  notifications: {
    list(): Promise<AppNotification[]>;
    unreadCount(): Promise<number>;
    markRead(id: number): Promise<void>;
    markAllRead(): Promise<void>;
  };
  employees: {
    list(): Promise<Employee[]>;
    setStatus(id: number, status: EmployeeStatus): Promise<Employee>;
  };
  appointments: {
    list(filters?: AppointmentFilters): Promise<Appointment[]>;
    transition(id: number, action: AppointmentAction, note?: string): Promise<Appointment>;
    reschedule(id: number, date: string, time: string, note?: string): Promise<Appointment>;
    assign(id: number, employeeId: number | null): Promise<Appointment>;
    updateNotes(id: number, internalNotes: string): Promise<Appointment>;
  };
  bookings: {
    create(input: BookingInput): Promise<Appointment>;
  };
  availability: {
    days(serviceId: number, from?: string, days?: number): Promise<AvailableDay[]>;
    slots(serviceId: number, date: string): Promise<TimeSlot[]>;
    openingHours(): Promise<OpeningHoursEntry[]>;
  };
  dashboard: {
    summary(): Promise<DashboardSummary>;
  };
  analytics: {
    /** Statistiques de la période (manager). Chiffre d'affaires = paiements encaissés, remboursements exclus. */
    summary(from: string, to: string, group: StatsGroup): Promise<AnalyticsSummary>;
    /** Lien de téléchargement CSV (ouvre directement dans Excel). */
    exportUrl(type: 'appointments' | 'payments', from: string, to: string): string;
  };
  contact: {
    send(input: ContactInput): Promise<void>;
  };
  /** Contenu éditorial publié par l'atelier (galerie, avis, chiffres clés).
   *  Seuls les contenus validés et publiés sont renvoyés. */
  content: {
    portfolio(): Promise<PortfolioProject[]>;
    testimonials(): Promise<Testimonial[]>;
    highlights(): Promise<Highlight[]>;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: Record<string, string[]> = {}
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const errorMessage = (err: unknown) =>
  err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Erreur inattendue.';
