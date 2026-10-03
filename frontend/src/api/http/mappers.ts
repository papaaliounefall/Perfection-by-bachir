// Conversion DTO Django (snake_case) ↔ types du domaine (camelCase).

import {
  Appointment,
  CurrentUser,
  Customer,
  CustomerProfile,
  DashboardSummary,
  Employee,
  OpeningHoursEntry,
  ServiceInput,
  ServiceItem,
  Vehicle,
} from '../../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Dto = Record<string, any>;

export const toUser = (d: Dto): CurrentUser => ({
  id: d.id,
  email: d.email,
  firstName: d.first_name,
  lastName: d.last_name,
  role: d.role,
  customerId: d.customer_id,
  employeeId: d.employee_id,
});

export const toService = (d: Dto): ServiceItem => ({
  id: d.id,
  name: d.name,
  slug: d.slug,
  category: d.category,
  shortDescription: d.short_description,
  description: d.description,
  pricingType: d.pricing_type,
  price: d.price,
  durationMinutes: d.duration_minutes,
  durationLabel: d.duration_label,
  image: d.image_url,
  benefits: d.benefits ?? [],
  processSteps: d.process_steps ?? [],
  available: d.is_active,
  sortOrder: d.sort_order,
});

export const fromService = (s: Partial<ServiceInput>): Dto => {
  const map: Record<string, string> = {
    name: 'name',
    slug: 'slug',
    category: 'category',
    shortDescription: 'short_description',
    description: 'description',
    pricingType: 'pricing_type',
    price: 'price',
    durationMinutes: 'duration_minutes',
    durationLabel: 'duration_label',
    image: 'image_url',
    benefits: 'benefits',
    processSteps: 'process_steps',
    available: 'is_active',
    sortOrder: 'sort_order',
  };
  return Object.fromEntries(
    Object.entries(s)
      .filter(([k, v]) => k in map && v !== undefined)
      .map(([k, v]) => [map[k], v])
  );
};

export const toCustomer = (d: Dto): Customer => ({
  id: d.id,
  name: d.full_name,
  email: d.email,
  phone: d.phone,
  address: d.address,
  segment: d.segment,
  internalNotes: d.internal_notes,
  hasAccount: d.has_account,
  completedAmount: d.completed_amount ?? 0,
  lastServiceAt: d.last_service_at,
  createdAt: d.created_at,
});

export const toProfile = (d: Dto): CustomerProfile => ({
  id: d.id,
  name: d.full_name,
  email: d.email,
  phone: d.phone,
  address: d.address,
});

export const toVehicle = (d: Dto): Vehicle => ({
  id: d.id,
  customerId: d.customer,
  customerName: d.customer_name,
  brand: d.brand,
  model: d.model,
  year: d.year,
  registration: d.registration,
  color: d.color,
  fuel: d.fuel,
  photo: d.photo_url,
  notes: d.notes,
});

export const toEmployee = (d: Dto): Employee => ({
  id: d.id,
  name: d.full_name,
  jobTitle: d.job_title,
  specialty: d.specialty,
  phone: d.phone,
  email: d.email,
  status: d.status,
  isActive: d.is_active,
  todayAppointments: d.today_appointments ?? 0,
});

export const toAppointment = (d: Dto): Appointment => ({
  id: d.id,
  reference: d.reference,
  status: d.status,
  statusLabel: d.status_display,
  progress: d.progress,
  allowedActions: d.allowed_actions ?? [],
  serviceId: d.service_id,
  serviceName: d.service_name,
  vehicleId: d.vehicle.id,
  vehicleName: `${d.vehicle.brand} ${d.vehicle.model}`,
  vehicleRegistration: d.vehicle.registration,
  vehiclePhoto: d.vehicle.photo_url,
  customerId: d.customer.id,
  customerName: d.customer.full_name,
  customerPhone: d.customer.phone,
  customerEmail: d.customer.email,
  startAt: d.start_at,
  endAt: d.end_at,
  price: d.price_estimate,
  customerNotes: d.customer_notes,
  assignedEmployeeId: d.assigned_employee ?? null,
  assignedEmployeeName: d.assigned_employee_name,
  internalNotes: d.internal_notes,
  steps: (d.steps ?? []).map((s: Dto) => ({ id: s.id, order: s.order, title: s.title, done: s.done, doneAt: s.done_at })),
  invoice: d.invoice
    ? {
        id: d.invoice.id,
        number: d.invoice.number,
        total: d.invoice.total,
        paidAmount: d.invoice.paid_amount,
        balance: d.invoice.balance,
        status: d.invoice.status,
      }
    : d.invoice,
  history: d.history?.map((h: Dto) => ({
    action: h.action,
    fromStatus: h.from_status,
    toStatus: h.to_status,
    note: h.note,
    changedBy: h.changed_by,
    createdAt: h.created_at,
  })),
});

export const toSummary = (d: Dto): DashboardSummary => ({
  date: d.date,
  appointmentsToday: d.appointments_today,
  toConfirm: d.to_confirm,
  inWorkshop: d.in_workshop,
  inProgress: d.in_progress,
  completedToday: d.completed_today,
  newCustomers30d: d.new_customers_30d,
});

export const toOpeningHours = (d: Dto): OpeningHoursEntry => ({
  weekday: d.weekday,
  label: d.label,
  isClosed: d.is_closed,
  opensAt: d.opens_at,
  closesAt: d.closes_at,
});
