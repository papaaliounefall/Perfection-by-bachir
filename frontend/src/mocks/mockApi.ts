// SIMULATION — implémentation en mémoire de ApiClient pour le mode démo.
// Reproduit les règles du backend (apps/appointments/workflow.py et
// availability.py) afin que l'interface se comporte comme en production.
// Rien ici n'est persistant : un rechargement de page réinitialise tout.

import { ApiClient, ApiError } from '../api/client';
import { IMAGES } from '../config/business';
import { STATUS_LABELS } from '../lib/labels';
import {
  AppNotification,
  Appointment,
  AppointmentPhoto,
  WorkshopStep,
  AppointmentAction,
  AppointmentStatus,
  CurrentUser,
  Customer,
  Employee,
  OpeningHoursEntry,
  ServiceCategory,
  ServiceItem,
  Vehicle,
} from '../types';
import { DEMO_PORTFOLIO_RAW, DEMO_SERVICES } from './demoCatalog';
import { DEMO_HIGHLIGHTS, DEMO_TESTIMONIALS } from './demoContent';

// ---------- Règles (miroir de backend/config/settings.py WORKSHOP) ----------

const RULES = {
  capacity: 2,
  stepMinutes: 30,
  bufferMinutes: 15,
  minNoticeHours: 2,
  horizonDays: 60,
  cancellationMinHours: 24,
};

// Lundi → samedi 08:30–18:30, dimanche fermé (index 0 = lundi)
const OPENING: OpeningHoursEntry[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(
  (label, weekday) => ({
    weekday,
    label,
    isClosed: weekday === 6,
    opensAt: weekday === 6 ? null : '08:30',
    closesAt: weekday === 6 ? null : '18:30',
  })
);

const TRANSITIONS: Record<AppointmentAction, { from: AppointmentStatus[]; to: AppointmentStatus }> = {
  confirm: { from: ['pending', 'rescheduled'], to: 'confirmed' },
  refuse: { from: ['pending'], to: 'refused' },
  check_in: { from: ['confirmed'], to: 'received' },
  start: { from: ['received'], to: 'in_progress' },
  submit_quality_check: { from: ['in_progress'], to: 'quality_check' },
  rework: { from: ['quality_check'], to: 'in_progress' },
  complete: { from: ['quality_check'], to: 'done' },
  deliver: { from: ['done'], to: 'delivered' },
  no_show: { from: ['confirmed'], to: 'no_show' },
  cancel: { from: ['pending', 'confirmed', 'rescheduled'], to: 'cancelled' },
};
const TECHNICIAN_ACTIONS: AppointmentAction[] = ['start', 'submit_quality_check'];
// Comptoir : le client dépose et récupère lui-même son véhicule
const COUNTER_ACTIONS: AppointmentAction[] = ['check_in', 'deliver'];
const MAIN_FLOW: AppointmentStatus[] = ['pending', 'confirmed', 'received', 'in_progress', 'quality_check', 'done', 'delivered'];
const NON_BLOCKING: AppointmentStatus[] = ['cancelled', 'refused', 'no_show'];

// Dakar = UTC+0 sans heure d'été : heure locale = UTC.
const MIN = 60_000;
const at = (day: string, time: string) => new Date(`${day}T${time}:00Z`).getTime();
const dayOf = (ts: number) => new Date(ts).toISOString().slice(0, 10);
const addDays = (day: string, n: number) => dayOf(at(day, '00:00') + n * 1440 * MIN);
const weekdayIndex = (day: string) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
const today = () => dayOf(Date.now());
const nextOpenDay = (offset: number) => {
  let day = addDays(today(), offset);
  while (OPENING[weekdayIndex(day)].isClosed) day = addDays(day, 1);
  return day;
};

// ---------- Comptes démo ----------

export const DEMO_PASSWORD = 'demo';
export const DEMO_ACCOUNTS = [
  { email: 'client@demo.local', label: 'Client' },
  { email: 'manager@demo.local', label: 'Manager' },
  { email: 'technicien@demo.local', label: 'Technicien' },
];

// ---------- État en mémoire ----------

interface Row {
  id: number;
  reference: string;
  status: AppointmentStatus;
  serviceId: number;
  vehicleId: number;
  customerId: number;
  start: number;
  end: number;
  price: number | null;
  customerNotes: string;
  internalNotes: string;
  employeeId: number | null;
  history: Appointment['history'];
  steps?: WorkshopStep[];
}

const photos = new Map<number, AppointmentPhoto[]>();
const PHOTO_LABELS = { inspection: 'Inspection à la réception', before: 'Avant', after: 'Après' } as const;

const CATEGORY: Record<string, ServiceCategory> = {
  Detailing: 'detailing',
  Nettoyage: 'cleaning',
  Polissage: 'polishing',
  Protection: 'protection',
  Préparation: 'preparation',
};

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// « 2h - 4h » → 240 minutes planifiées (borne haute)
const durationMinutes = (label: string) => Number(label.match(/(\d+)h(?!.*\d+h)/)?.[1] ?? 2) * 60;

let services: ServiceItem[] = DEMO_SERVICES.map((s, i) => ({
  id: i + 1,
  name: s.name,
  slug: slugify(s.name),
  category: CATEGORY[s.category],
  shortDescription: s.shortDescription,
  description: s.fullDescription,
  pricingType: 'from',
  price: s.price,
  durationMinutes: durationMinutes(s.duration),
  durationLabel: s.duration,
  image: s.image,
  benefits: s.benefits,
  processSteps: s.processSteps,
  available: true,
  sortOrder: i,
}));

let customers: Omit<Customer, 'completedAmount' | 'lastServiceAt'>[] = [
  { id: 1, name: 'Client Démo', email: 'client@demo.local', phone: '+221700000001', address: 'Dakar', segment: 'active', internalNotes: 'Fiche de démonstration.', hasAccount: true, createdAt: new Date(Date.now() - 90 * 1440 * MIN).toISOString() },
  { id: 2, name: 'Second Client Démo', email: 'client2@demo.local', phone: '+221700000002', address: 'Dakar', segment: 'new', internalNotes: '', hasAccount: false, createdAt: new Date(Date.now() - 5 * 1440 * MIN).toISOString() },
];

let vehicles: Omit<Vehicle, 'customerName'>[] = [
  { id: 1, customerId: 1, brand: 'Toyota', model: 'Land Cruiser 300', year: 2024, registration: 'DK-0001-DEMO', color: 'Noir', fuel: 'diesel', photo: IMAGES.landCruiser, notes: '' },
  { id: 2, customerId: 1, brand: 'Mercedes-Benz', model: 'Classe S', year: 2023, registration: 'DK-0002-DEMO', color: 'Gris', fuel: 'petrol', photo: IMAGES.heroSedan, notes: '' },
  { id: 3, customerId: 2, brand: 'Kia', model: 'Sportage', year: 2022, registration: 'DK-0003-DEMO', color: 'Blanc', fuel: 'petrol', photo: '', notes: '' },
];

let employees: Omit<Employee, 'todayAppointments'>[] = [
  { id: 1, name: 'Chef d’atelier (démo)', jobTitle: 'Chef d’atelier', specialty: 'Correction de peinture', phone: '', email: 'manager@demo.local', status: 'available', isActive: true },
  { id: 2, name: 'Technicien (démo)', jobTitle: 'Technicien detailing', specialty: 'Céramique', phone: '', email: 'technicien@demo.local', status: 'available', isActive: true },
];

const users: (CurrentUser & { password: string })[] = [
  { id: 1, email: 'client@demo.local', firstName: 'Client', lastName: 'Démo', role: 'client', customerId: 1, employeeId: null, password: DEMO_PASSWORD },
  { id: 2, email: 'manager@demo.local', firstName: 'Manager', lastName: 'Démo', role: 'manager', customerId: null, employeeId: 1, password: DEMO_PASSWORD },
  { id: 3, email: 'technicien@demo.local', firstName: 'Technicien', lastName: 'Démo', role: 'technician', customerId: null, employeeId: 2, password: DEMO_PASSWORD },
];

let rows: Row[] = [];
let notifications: (AppNotification & { userId: number })[] = [];

// Miroir de backend/apps/notifications/services.py (étapes visibles par le client)
const NOTIFY: Partial<Record<string, string>> = {
  create: 'Demande de rendez-vous enregistrée',
  confirm: 'Rendez-vous confirmé',
  refuse: 'Demande non retenue',
  reschedule: 'Rendez-vous reporté',
  check_in: 'Véhicule reçu',
  start: 'Prestation commencée',
  complete: 'Votre véhicule est prêt',
  deliver: 'Véhicule restitué',
  no_show: 'Rendez-vous manqué',
  cancel: 'Rendez-vous annulé',
};
const STAFF_NOTIFY: Partial<Record<string, { to: 'managers' | 'assignee'; title: string }>> = {
  create: { to: 'managers', title: 'Nouvelle demande de réservation' },
  cancel: { to: 'managers', title: 'Rendez-vous annulé par le client' },
  submit_quality_check: { to: 'managers', title: 'Contrôle final à valider' },
  assign: { to: 'assignee', title: 'Nouvelle prestation affectée' },
  check_in: { to: 'assignee', title: 'Véhicule déposé' },
};
let sequence = 0;
let currentUser: CurrentUser | null = null;

const nextId = (list: { id: number }[]) => Math.max(0, ...list.map((x) => x.id)) + 1;

function seedRow(serviceId: number, vehicleId: number, day: string, time: string, status: AppointmentStatus, employeeId: number | null) {
  const service = services.find((s) => s.id === serviceId)!;
  const vehicle = vehicles.find((v) => v.id === vehicleId)!;
  const start = at(day, time);
  sequence += 1;
  rows.push({
    id: sequence,
    reference: `RDV-${day.slice(0, 4)}${String(sequence).padStart(4, '0')}`,
    status,
    serviceId,
    vehicleId,
    customerId: vehicle.customerId,
    start,
    end: start + service.durationMinutes * MIN,
    price: service.price,
    customerNotes: '',
    internalNotes: '',
    employeeId,
    history: [],
  });
}

seedRow(4, 1, nextOpenDay(-20), '09:00', 'delivered', 2);
seedRow(1, 2, nextOpenDay(-6), '10:00', 'done', 2);
seedRow(1, 1, nextOpenDay(0), '08:30', 'in_progress', 2);
seedRow(2, 3, nextOpenDay(1), '14:00', 'pending', null);
seedRow(5, 2, nextOpenDay(3), '09:00', 'confirmed', 1);

// ---------- Helpers ----------

const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(value)), 120));
const fail = (message: string, status: number): never => {
  throw new ApiError(message, status);
};

const isStaff = (u: CurrentUser | null) => !!u && u.role !== 'client';
const isManager = (u: CurrentUser | null) => !!u && (u.role === 'manager' || u.role === 'admin');
const requireUser = () => currentUser ?? fail('Accès refusé. Veuillez vous connecter.', 403);
const requireManager = () => (isManager(currentUser) ? currentUser! : fail('Action réservée au manager.', 403));
const requireStaff = () => (isStaff(currentUser) ? currentUser! : fail('Accès réservé au personnel.', 403));

function roleAllows(row: Row, action: AppointmentAction) {
  const u = currentUser;
  if (isManager(u)) return true;
  if (u?.role === 'technician')
    return COUNTER_ACTIONS.includes(action) || (TECHNICIAN_ACTIONS.includes(action) && row.employeeId === u.employeeId);
  if (u?.role === 'client' && action === 'cancel')
    return row.customerId === u.customerId && row.start - Date.now() >= RULES.cancellationMinHours * 60 * MIN;
  return false;
}

function visibleRows() {
  const u = requireUser();
  if (u.role === 'technician')
    return rows.filter(
      (r) =>
        r.employeeId === u.employeeId ||
        (r.status === 'confirmed' && dayOf(r.start) === today()) ||
        r.status === 'done'
    );
  if (u.role === 'client') return rows.filter((r) => r.customerId === u.customerId);
  return rows;
}

function toAppointment(r: Row): Appointment {
  const service = services.find((s) => s.id === r.serviceId)!;
  const vehicle = vehicles.find((v) => v.id === r.vehicleId)!;
  const customer = customers.find((c) => c.id === r.customerId)!;
  const employee = employees.find((e) => e.id === r.employeeId);
  const staff = isStaff(currentUser);
  return {
    id: r.id,
    reference: r.reference,
    status: r.status,
    statusLabel: STATUS_LABELS[r.status],
    progress: progressOf(r),
    steps: r.steps ?? [],
    allowedActions: (Object.keys(TRANSITIONS) as AppointmentAction[]).filter(
      (a) => TRANSITIONS[a].from.includes(r.status) && roleAllows(r, a)
    ),
    serviceId: service.id,
    serviceName: service.name,
    vehicleId: vehicle.id,
    vehicleName: `${vehicle.brand} ${vehicle.model}`,
    vehicleRegistration: vehicle.registration,
    vehiclePhoto: vehicle.photo,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    startAt: new Date(r.start).toISOString(),
    endAt: new Date(r.end).toISOString(),
    price: r.price,
    customerNotes: r.customerNotes,
    assignedEmployeeId: r.employeeId,
    assignedEmployeeName: employee?.name ?? null,
    ...(staff ? { internalNotes: r.internalNotes, history: r.history, invoice: null } : {}),
  };
}

// Miroir de backend/apps/workshop/services.py : avancement par étapes validées
function progressOf(r: Row) {
  if (!MAIN_FLOW.includes(r.status)) return null;
  const span = 100 / (MAIN_FLOW.length - 1);
  let value = MAIN_FLOW.indexOf(r.status) * span;
  if (r.status === 'in_progress' && r.steps?.length) value += (span * r.steps.filter((s) => s.done).length) / r.steps.length;
  return Math.round(value);
}

function log(r: Row, action: string, from: string, note = '') {
  r.history!.push({
    action,
    fromStatus: from,
    toStatus: r.status,
    note,
    changedBy: currentUser?.email ?? null,
    createdAt: new Date().toISOString(),
  });
  const title = NOTIFY[action];
  const owner = users.find((u) => u.customerId === r.customerId);
  if (title && owner) {
    const vehicle = vehicles.find((v) => v.id === r.vehicleId)!;
    notifications.unshift({
      id: notifications.length + 1,
      userId: owner.id,
      kind: action,
      title,
      message: `${r.reference} · ${vehicle.brand} ${vehicle.model} · ${new Date(r.start).toISOString().slice(0, 16).replace('T', ' à ')}`,
      appointmentId: r.id,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  // Équipe (miroir de notify_staff) : jamais pour sa propre action
  const staff = STAFF_NOTIFY[action];
  if (!staff || (action === 'cancel' && currentUser?.role !== 'client')) return;
  const recipients =
    staff.to === 'managers'
      ? users.filter((u) => u.role === 'manager' || u.role === 'admin')
      : users.filter((u) => u.employeeId !== null && u.employeeId === r.employeeId);
  for (const u of recipients.filter((x) => x.id !== currentUser?.id)) {
    notifications.unshift({
      id: notifications.length + 1,
      userId: u.id,
      kind: action,
      title: staff.title,
      message: `${r.reference} · ${customers.find((c) => c.id === r.customerId)?.name ?? ''}`,
      appointmentId: r.id,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
}

function computeSlots(service: ServiceItem, day: string, excludeId?: number) {
  const now = Date.now();
  if (day < today() || day > addDays(today(), RULES.horizonDays)) return [];
  const hours = OPENING[weekdayIndex(day)];
  if (hours.isClosed || !hours.opensAt || !hours.closesAt) return [];
  const open = at(day, hours.opensAt);
  const close = at(day, hours.closesAt);
  const duration = service.durationMinutes * MIN;
  const buffer = RULES.bufferMinutes * MIN;
  const intervals = rows
    .filter((r) => !NON_BLOCKING.includes(r.status) && r.id !== excludeId)
    .map((r) => [r.start - buffer, r.end + buffer] as const)
    .filter(([s, e]) => s < close + buffer && e > open - buffer);
  const slots: { start: number; available: boolean }[] = [];
  for (let start = open; start + duration <= close; start += RULES.stepMinutes * MIN) {
    const end = start + duration;
    const points = [start, ...intervals.map(([s]) => s).filter((s) => s > start && s < end)];
    const concurrency = Math.max(...points.map((p) => intervals.filter(([s, e]) => s <= p && p < e).length));
    slots.push({ start, available: concurrency < RULES.capacity && start >= now + RULES.minNoticeHours * 60 * MIN });
  }
  return slots;
}

const isAvailable = (service: ServiceItem, start: number, excludeId?: number) =>
  computeSlots(service, dayOf(start), excludeId).some((s) => s.start === start && s.available);

const findRow = (id: number) => visibleRows().find((r) => r.id === id) ?? fail('Rendez-vous introuvable.', 404);

const withCustomerName = (v: Omit<Vehicle, 'customerName'>): Vehicle => ({
  ...v,
  customerName: customers.find((c) => c.id === v.customerId)?.name ?? '',
});

function toCustomer(c: (typeof customers)[number]): Customer {
  const done = rows.filter((r) => r.customerId === c.id && (r.status === 'done' || r.status === 'delivered'));
  const last = Math.max(0, ...done.map((r) => r.start));
  return {
    ...c,
    completedAmount: done.reduce((sum, r) => sum + (r.price ?? 0), 0),
    lastServiceAt: last ? new Date(last).toISOString() : null,
  };
}

const normalizeRegistration = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '-');

// ---------- Implémentation ----------

export const mockApi: ApiClient = {
  auth: {
    me: () => delay(currentUser),
    async login(email, password) {
      const user = users.find((u) => u.email === email.trim().toLowerCase() && u.password === password);
      if (!user) fail('Email ou mot de passe incorrect.', 400);
      const { password: _pw, ...publicUser } = user!;
      currentUser = publicUser;
      return delay(currentUser);
    },
    async logout() {
      currentUser = null;
      return delay(undefined);
    },
    requestPasswordReset: () => delay(undefined),
    confirmPasswordReset: () => fail('Réinitialisation indisponible en mode démo.', 400),
    async register(input) {
      const email = input.email.trim().toLowerCase();
      if (users.some((u) => u.email === email)) fail('Un compte existe déjà avec cet email.', 400);
      const customer = { id: nextId(customers), name: input.fullName, email, phone: input.phone, address: '', segment: 'new' as const, internalNotes: '', hasAccount: true, createdAt: new Date().toISOString() };
      customers = [customer, ...customers];
      const user = { id: nextId(users), email, firstName: input.fullName, lastName: '', role: 'client' as const, customerId: customer.id, employeeId: null, password: input.password };
      users.push(user);
      const { password: _pw, ...publicUser } = user;
      currentUser = publicUser;
      return delay(currentUser);
    },
  },

  services: {
    list: () => delay(isStaff(currentUser) ? services : services.filter((s) => s.available)),
    async create(input) {
      requireManager();
      const service: ServiceItem = { ...input, id: nextId(services), slug: input.slug || slugify(input.name) };
      services = [...services, service];
      return delay(service);
    },
    async update(id, patch) {
      requireManager();
      services = services.map((s) => (s.id === id ? { ...s, ...patch } : s));
      return delay(services.find((s) => s.id === id)!);
    },
  },

  customers: {
    async list(query = '') {
      requireStaff();
      const q = query.trim().toLowerCase();
      const matches = customers.filter(
        (c) =>
          !q ||
          [c.name, c.email, c.phone].some((f) => f.toLowerCase().includes(q)) ||
          vehicles.some((v) => v.customerId === c.id && v.registration.toLowerCase().includes(q))
      );
      return delay(matches.map(toCustomer));
    },
    async create(input) {
      requireManager();
      const customer = { id: nextId(customers), name: input.name, email: input.email.toLowerCase(), phone: input.phone, address: input.address ?? '', segment: 'new' as const, internalNotes: '', hasAccount: false, createdAt: new Date().toISOString() };
      customers = [customer, ...customers];
      return delay(toCustomer(customer));
    },
    async update(id, patch) {
      requireManager();
      customers = customers.map((c) => (c.id === id ? { ...c, ...patch } : c));
      return delay(toCustomer(customers.find((c) => c.id === id)!));
    },
    async me() {
      const u = requireUser();
      const c = customers.find((x) => x.id === u.customerId) ?? fail('Aucune fiche client liée à ce compte.', 404);
      return delay({ id: c.id, name: c.name, email: c.email, phone: c.phone, address: c.address });
    },
    async updateMe(patch) {
      const u = requireUser();
      customers = customers.map((c) => (c.id === u.customerId ? { ...c, ...patch } : c));
      return mockApi.customers.me();
    },
  },

  vehicles: {
    async list() {
      const u = requireUser();
      const list = isStaff(u) ? vehicles : vehicles.filter((v) => v.customerId === u.customerId);
      return delay(list.map(withCustomerName));
    },
    async create(input) {
      const u = requireUser();
      if (isStaff(u) && !isManager(u)) fail('Action réservée au manager.', 403);
      const customerId = isManager(u) ? input.customerId ?? fail('Client obligatoire.', 400) : u.customerId!;
      const registration = normalizeRegistration(input.registration);
      if (vehicles.some((v) => v.customerId === customerId && v.registration === registration))
        fail('Ce véhicule est déjà enregistré.', 400);
      const vehicle = { id: nextId(vehicles), customerId, brand: input.brand, model: input.model, year: input.year, registration, color: input.color, fuel: input.fuel, photo: '', notes: input.notes ?? '' };
      vehicles = [vehicle, ...vehicles];
      return delay(withCustomerName(vehicle));
    },
    async uploadPhoto(id, file) {
      const u = requireUser();
      const vehicle = vehicles.find((v) => v.id === id && (isManager(u) || v.customerId === u.customerId)) ?? fail('Véhicule introuvable.', 404);
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) fail('Formats acceptés : JPEG, PNG ou WebP.', 400);
      if (file.size > 5 * 1024 * 1024) fail('Image trop lourde (5 Mo maximum).', 400);
      vehicle.photo = URL.createObjectURL(file);
      return delay(withCustomerName(vehicle));
    },
    async removePhoto(id) {
      const u = requireUser();
      const vehicle = vehicles.find((v) => v.id === id && (isManager(u) || v.customerId === u.customerId)) ?? fail('Véhicule introuvable.', 404);
      vehicle.photo = '';
      return delay(withCustomerName(vehicle));
    },
  },

  // La facturation n'est pas simulée : elle se montre avec le vrai serveur
  invoices: {
    list: () => delay([]),
    create: () => fail('Facturation indisponible en mode démo.', 400),
    cancel: () => fail('Facturation indisponible en mode démo.', 400),
    recordPayment: () => fail('Encaissement indisponible en mode démo.', 400),
  },

  payments: {
    cashReport: (date) => delay({ date, total: 0, cashTotal: 0, byMethod: [], byPerson: [], payments: [] }),
    refund: () => fail('Remboursement indisponible en mode démo.', 400),
  },

  workshop: {
    async setStep(appointmentId, stepId, done) {
      const row = findRow(appointmentId);
      if (row.status !== 'in_progress') fail('Les étapes se valident pendant le traitement (statut « En cours »).', 409);
      const u = requireStaff();
      if (!isManager(u) && row.employeeId !== u.employeeId)
        fail('Seul le technicien affecté ou un manager peut valider les étapes.', 403);
      const step = row.steps?.find((s) => s.id === stepId) ?? fail('Étape introuvable.', 404);
      step.done = done;
      step.doneAt = done ? new Date().toISOString() : null;
      return delay(progressOf(row));
    },
    async photos(appointmentId) {
      findRow(appointmentId);
      return delay(photos.get(appointmentId) ?? []);
    },
    async uploadPhoto(appointmentId, file, kind, caption) {
      findRow(appointmentId);
      requireStaff();
      const photo = { id: Date.now(), kind, kindLabel: PHOTO_LABELS[kind], caption, url: URL.createObjectURL(file), createdAt: new Date().toISOString() };
      photos.set(appointmentId, [...(photos.get(appointmentId) ?? []), photo]);
      return delay(photo);
    },
    async deletePhoto(appointmentId, photoId) {
      requireStaff();
      photos.set(appointmentId, (photos.get(appointmentId) ?? []).filter((p) => p.id !== photoId));
      return delay(undefined);
    },
  },

  notifications: {
    async list() {
      const u = requireUser();
      return delay(notifications.filter((n) => n.userId === u.id).map(({ userId: _u, ...n }) => n));
    },
    async unreadCount() {
      const u = requireUser();
      return delay(notifications.filter((n) => n.userId === u.id && !n.read).length);
    },
    async markRead(id) {
      const u = requireUser();
      notifications = notifications.map((n) => (n.id === id && n.userId === u.id ? { ...n, read: true } : n));
      return delay(undefined);
    },
    async markAllRead() {
      const u = requireUser();
      notifications = notifications.map((n) => (n.userId === u.id ? { ...n, read: true } : n));
      return delay(undefined);
    },
  },

  employees: {
    async list() {
      requireStaff();
      const day = today();
      return delay(
        employees.map((e) => ({
          ...e,
          todayAppointments: rows.filter((r) => r.employeeId === e.id && dayOf(r.start) === day && !NON_BLOCKING.includes(r.status)).length,
        }))
      );
    },
    async setStatus(id, status) {
      requireManager();
      employees = employees.map((e) => (e.id === id ? { ...e, status } : e));
      return (await mockApi.employees.list()).find((e) => e.id === id)!;
    },
  },

  appointments: {
    async list(f = {}) {
      let list = visibleRows();
      if (f.status?.length) list = list.filter((r) => f.status!.includes(r.status));
      if (f.date) list = list.filter((r) => dayOf(r.start) === f.date);
      if (f.dateFrom) list = list.filter((r) => dayOf(r.start) >= f.dateFrom!);
      if (f.dateTo) list = list.filter((r) => dayOf(r.start) <= f.dateTo!);
      if (f.customerId) list = list.filter((r) => r.customerId === f.customerId);
      if (f.vehicleId) list = list.filter((r) => r.vehicleId === f.vehicleId);
      return delay([...list].sort((a, b) => b.start - a.start).map(toAppointment));
    },
    async transition(id, action, note = '') {
      const row = findRow(id);
      const t = TRANSITIONS[action] ?? fail('Action inconnue.', 400);
      if (!t.from.includes(row.status)) fail(`Action impossible pour un rendez-vous « ${STATUS_LABELS[row.status]} ».`, 409);
      if (!roleAllows(row, action)) fail("Vous n'avez pas le droit d'effectuer cette action.", 403);
      if (action === 'submit_quality_check' && row.steps?.some((s) => !s.done))
        fail('Toutes les étapes de traitement doivent être validées avant le contrôle final.', 409);
      const from = row.status;
      row.status = t.to;
      if (action === 'check_in' && !row.steps?.length) {
        const service = services.find((s) => s.id === row.serviceId)!;
        const titles = service.processSteps.map((p) => p.title).filter(Boolean);
        row.steps = (titles.length ? titles : ['Diagnostic et préparation', 'Exécution du protocole', 'Finition et nettoyage']).map(
          (title, i) => ({ id: row.id * 100 + i + 1, order: i + 1, title, done: false, doneAt: null })
        );
      }
      log(row, action, from, note);
      return delay(toAppointment(row));
    },
    async reschedule(id, date, time, note = '') {
      requireManager();
      const row = findRow(id);
      if (!['pending', 'confirmed', 'rescheduled'].includes(row.status)) fail('Ce rendez-vous ne peut plus être reporté.', 409);
      const service = services.find((s) => s.id === row.serviceId)!;
      const start = at(date, time);
      if (!isAvailable(service, start, row.id)) fail("Ce créneau n'est pas disponible.", 409);
      const from = row.status;
      const duration = row.end - row.start;
      row.start = start;
      row.end = start + duration;
      row.status = 'rescheduled';
      log(row, 'reschedule', from, note);
      return delay(toAppointment(row));
    },
    async assign(id, employeeId) {
      requireManager();
      const row = findRow(id);
      row.employeeId = employeeId;
      log(row, 'assign', row.status, `Affecté à ${employees.find((e) => e.id === employeeId)?.name ?? 'personne'}`);
      return delay(toAppointment(row));
    },
    async updateNotes(id, internalNotes) {
      requireStaff();
      const row = findRow(id);
      row.internalNotes = internalNotes;
      return delay(toAppointment(row));
    },
  },

  bookings: {
    async create(input) {
      const service = services.find((s) => s.id === input.serviceId && s.available) ?? fail("Cette prestation n'est plus réservable.", 400);
      let customerId: number;
      if (isManager(currentUser)) {
        customerId = input.customerId ?? fail('Client obligatoire.', 400);
      } else if (currentUser?.customerId) {
        customerId = currentUser.customerId;
      } else {
        const c = input.contact ?? fail('Coordonnées obligatoires.', 400);
        const guest = customers.find((x) => !x.hasAccount && x.email === c.email.toLowerCase() && x.phone === c.phone);
        customerId = guest?.id ?? nextId(customers);
        if (!guest) customers = [{ id: customerId, name: c.fullName, email: c.email.toLowerCase(), phone: c.phone, address: '', segment: 'new', internalNotes: '', hasAccount: false, createdAt: new Date().toISOString() }, ...customers];
      }
      let vehicleId = input.vehicleId;
      if (vehicleId !== undefined) {
        if (!vehicles.some((v) => v.id === vehicleId && v.customerId === customerId)) fail('Véhicule inconnu.', 400);
      } else {
        const spec = input.newVehicle ?? fail('Véhicule obligatoire.', 400);
        const registration = normalizeRegistration(spec.registration);
        const existing = vehicles.find((v) => v.customerId === customerId && v.registration === registration);
        vehicleId = existing?.id ?? nextId(vehicles);
        if (!existing) vehicles = [{ id: vehicleId, customerId, brand: spec.brand, model: spec.model, year: spec.year, registration, color: spec.color, fuel: spec.fuel, photo: '', notes: '' }, ...vehicles];
      }
      const start = at(input.date, input.time);
      if (!isAvailable(service, start)) fail("Ce créneau n'est plus disponible. Merci d'en choisir un autre.", 409);
      sequence += 1;
      const row: Row = {
        id: nextId(rows),
        reference: `RDV-${input.date.slice(0, 4)}${String(sequence).padStart(4, '0')}`,
        status: 'pending',
        serviceId: service.id,
        vehicleId,
        customerId,
        start,
        end: start + service.durationMinutes * MIN,
        price: service.price,
        customerNotes: input.notes ?? '',
        internalNotes: '',
        employeeId: null,
        history: [],
      };
      rows.push(row);
      log(row, 'create', '');
      return delay(toAppointment(row));
    },
  },

  availability: {
    async days(serviceId, from = today(), days = 14) {
      const service = services.find((s) => s.id === serviceId) ?? fail('Prestation inconnue.', 400);
      return delay(
        Array.from({ length: days }, (_, i) => {
          const date = addDays(from, i);
          return { date, availableSlots: computeSlots(service, date).filter((s) => s.available).length };
        })
      );
    },
    async slots(serviceId, date) {
      const service = services.find((s) => s.id === serviceId) ?? fail('Prestation inconnue.', 400);
      return delay(
        computeSlots(service, date).map((s) => ({ time: new Date(s.start).toISOString().slice(11, 16), available: s.available }))
      );
    },
    openingHours: () => delay(OPENING),
  },

  dashboard: {
    async summary() {
      requireManager();
      const day = today();
      return delay({
        date: day,
        appointmentsToday: rows.filter((r) => dayOf(r.start) === day && !NON_BLOCKING.includes(r.status)).length,
        toConfirm: rows.filter((r) => r.status === 'pending').length,
        inWorkshop: rows.filter((r) => ['received', 'in_progress', 'quality_check', 'done'].includes(r.status)).length,
        inProgress: rows.filter((r) => r.status === 'in_progress').length,
        completedToday: rows.filter((r) => ['done', 'delivered'].includes(r.status) && dayOf(r.start) === day).length,
        newCustomers30d: customers.filter((c) => Date.now() - new Date(c.createdAt).getTime() < 30 * 1440 * MIN).length,
      });
    },
  },

  analytics: {
    // Démo : pas de facturation simulée, donc chiffre d'affaires nul ; rendez-vous issus des données fictives
    async summary(from, to) {
      requireManager();
      const inRange = rows.filter((r) => dayOf(r.start) >= from && dayOf(r.start) <= to);
      const byStatus: Record<string, number> = {};
      inRange.forEach((r) => (byStatus[STATUS_LABELS[r.status]] = (byStatus[STATUS_LABELS[r.status]] ?? 0) + 1));
      const counts = new Map<string, number>();
      inRange
        .filter((r) => !NON_BLOCKING.includes(r.status))
        .forEach((r) => {
          const name = services.find((s) => s.id === r.serviceId)!.name;
          counts.set(name, (counts.get(name) ?? 0) + 1);
        });
      const cancellations = inRange.filter((r) => NON_BLOCKING.includes(r.status)).length;
      return delay({
        from,
        to,
        revenue: 0,
        revenueSeries: [],
        revenueByMethod: [],
        appointments: {
          total: inRange.length,
          byStatus,
          cancellations,
          cancellationRate: inRange.length ? Math.round((cancellations * 1000) / inRange.length) / 10 : 0,
        },
        popularServices: [...counts].map(([service, count]) => ({ service, count })).sort((a, b) => b.count - a.count).slice(0, 5),
        newCustomers: customers.filter((c) => c.createdAt.slice(0, 10) >= from && c.createdAt.slice(0, 10) <= to).length,
        returningCustomers: 0,
        vehiclesTreated: new Set(inRange.filter((r) => ['done', 'delivered'].includes(r.status)).map((r) => r.vehicleId)).size,
      });
    },
    exportUrl: () => '#export-indisponible-en-demo',
  },

  contact: {
    send: () => delay(undefined),
  },

  content: {
    portfolio: () =>
      delay(
        DEMO_PORTFOLIO_RAW.map((p) => ({
          id: p.id,
          title: p.title,
          vehicle: p.vehicle,
          category: p.category,
          servicesPerformed: p.servicesPerformed,
          description: p.description,
          duration: p.duration,
          completionDate: p.completionDate,
          beforeImage: p.beforeImage,
          afterImage: p.afterImage,
        }))
      ),
    testimonials: () => delay(DEMO_TESTIMONIALS),
    highlights: () => delay(DEMO_HIGHLIGHTS),
  },
};
