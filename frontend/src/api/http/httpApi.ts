import { formatDate } from '../../lib/labels';
import { ApiClient, ApiError } from '../client';
import {
  fromService,
  toAppointment,
  toCustomer,
  toEmployee,
  toOpeningHours,
  toProfile,
  toService,
  toSummary,
  toUser,
  toVehicle,
} from './mappers';
import { request, requestAll, upload } from './request';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Dto = Record<string, any>;

const toInvoice = (d: Dto) => ({
  id: d.id,
  number: d.number,
  status: d.status,
  statusLabel: d.status_display,
  customerName: d.customer_name,
  appointmentId: d.appointment,
  appointmentReference: d.appointment_reference,
  vehicle: d.vehicle,
  issuedAt: d.issued_at,
  lines: d.lines.map((l: Dto) => ({ label: l.label, quantity: l.quantity, unitPrice: l.unit_price, total: l.total })),
  subtotal: d.subtotal,
  discount: d.discount,
  total: d.total,
  paidAmount: d.paid_amount,
  balance: d.balance,
  payments: d.payments.map((p: Dto) => ({
    id: p.id,
    amount: p.amount,
    method: p.method_display,
    reference: p.reference,
    receivedAt: p.received_at,
    refunded: p.refunded,
    recordedBy: p.recorded_by,
  })),
  notes: d.notes,
  cancelReason: d.cancel_reason,
  pdfUrl: `/api/v1/invoices/${d.id}/pdf/`,
});

const toPhoto = (p: Dto) => ({
  id: p.id,
  kind: p.kind,
  kindLabel: p.kind_display,
  caption: p.caption,
  url: p.url,
  createdAt: p.created_at,
});

const query = (params: Record<string, string | number | undefined>) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][]
  ).toString();
  return qs ? `?${qs}` : '';
};

export const httpApi: ApiClient = {
  auth: {
    async me() {
      try {
        return toUser(await request<Dto>('GET', '/auth/me/'));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    login: async (email, password) => toUser(await request<Dto>('POST', '/auth/login/', { email, password })),
    logout: () => request('POST', '/auth/logout/'),
    requestPasswordReset: async (email) => {
      await request('POST', '/auth/password/reset/', { email });
    },
    confirmPasswordReset: async (uid, token, newPassword) => {
      await request('POST', '/auth/password/reset/confirm/', { uid, token, new_password: newPassword });
    },
    register: async (input) =>
      toUser(
        await request<Dto>('POST', '/auth/register/', {
          full_name: input.fullName,
          email: input.email,
          phone: input.phone,
          password: input.password,
        })
      ),
  },

  services: {
    list: async () => (await request<Dto[]>('GET', '/services/')).map(toService),
    create: async (input) => toService(await request<Dto>('POST', '/services/', fromService(input))),
    update: async (id, patch) => toService(await request<Dto>('PATCH', `/services/${id}/`, fromService(patch))),
  },

  customers: {
    list: async (q) => (await requestAll<Dto>(`/customers/${query({ q })}`)).map(toCustomer),
    create: async (input) =>
      toCustomer(
        await request<Dto>('POST', '/customers/', {
          full_name: input.name,
          email: input.email,
          phone: input.phone,
          address: input.address ?? '',
        })
      ),
    update: async (id, patch) => {
      const body: Dto = {};
      if (patch.name !== undefined) body.full_name = patch.name;
      if (patch.email !== undefined) body.email = patch.email;
      if (patch.phone !== undefined) body.phone = patch.phone;
      if (patch.address !== undefined) body.address = patch.address;
      if (patch.segment !== undefined) body.segment = patch.segment;
      if (patch.internalNotes !== undefined) body.internal_notes = patch.internalNotes;
      return toCustomer(await request<Dto>('PATCH', `/customers/${id}/`, body));
    },
    me: async () => toProfile(await request<Dto>('GET', '/customers/me/')),
    updateMe: async (patch) => {
      const body: Dto = {};
      if (patch.name !== undefined) body.full_name = patch.name;
      if (patch.phone !== undefined) body.phone = patch.phone;
      if (patch.address !== undefined) body.address = patch.address;
      return toProfile(await request<Dto>('PATCH', '/customers/me/', body));
    },
  },

  vehicles: {
    list: async () => (await requestAll<Dto>('/vehicles/')).map(toVehicle),
    create: async (input) =>
      toVehicle(
        await request<Dto>('POST', '/vehicles/', {
          customer: input.customerId,
          brand: input.brand,
          model: input.model,
          registration: input.registration,
          year: input.year,
          fuel: input.fuel,
          color: input.color,
          notes: input.notes ?? '',
        })
      ),
    uploadPhoto: async (id, file) => {
      const form = new FormData();
      form.append('photo', file);
      return toVehicle(await upload<Dto>(`/vehicles/${id}/photo/`, form));
    },
    removePhoto: async (id) => toVehicle(await request<Dto>('DELETE', `/vehicles/${id}/photo/`)),
  },

  invoices: {
    list: async () => (await requestAll<Dto>('/invoices/')).map(toInvoice),
    create: async ({ appointmentId, lines, discount, notes }) =>
      toInvoice(
        await request<Dto>('POST', '/invoices/', {
          appointment: appointmentId,
          ...(lines ? { lines: lines.map((l) => ({ label: l.label, quantity: l.quantity, unit_price: l.unitPrice })) } : {}),
          discount,
          notes: notes ?? '',
        })
      ),
    cancel: async (invoiceId, reason) => toInvoice(await request<Dto>('POST', `/invoices/${invoiceId}/cancel/`, { reason })),
    recordPayment: async (invoiceId, amount, method, reference) => {
      await request('POST', `/invoices/${invoiceId}/payments/`, { amount, method, reference: reference ?? '' });
    },
  },

  payments: {
    cashReport: async (date) => {
      const d = await request<Dto>('GET', `/payments/cash-report/?date=${date}`);
      return {
        date: d.date,
        total: d.total,
        cashTotal: d.cash_total,
        byMethod: d.by_method,
        byPerson: d.by_person,
        payments: d.payments.map((p: Dto) => ({
          id: p.id,
          invoiceNumber: p.invoice_number,
          customerName: p.customer_name,
          amount: p.amount,
          method: p.method_display,
          reference: p.reference,
          receivedAt: p.received_at,
          recordedBy: p.recorded_by,
          refunded: p.refunded,
        })),
      };
    },
    refund: async (paymentId, reason) => {
      await request('POST', `/payments/${paymentId}/refund/`, { reason });
    },
  },

  workshop: {
    setStep: async (appointmentId, stepId, done) =>
      (await request<Dto>('POST', `/appointments/${appointmentId}/steps/${stepId}/`, { done })).progress,
    photos: async (appointmentId) =>
      (await request<Dto[]>('GET', `/appointments/${appointmentId}/photos/`)).map(toPhoto),
    uploadPhoto: async (appointmentId, file, kind, caption) => {
      const form = new FormData();
      form.append('photo', file);
      form.append('kind', kind);
      form.append('caption', caption);
      return toPhoto(await upload<Dto>(`/appointments/${appointmentId}/photos/`, form));
    },
    deletePhoto: async (appointmentId, photoId) => {
      await request('DELETE', `/appointments/${appointmentId}/photos/${photoId}/`);
    },
  },

  notifications: {
    list: async () =>
      (await requestAll<Dto>('/notifications/')).map((n) => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        message: n.message,
        appointmentId: n.appointment,
        read: n.read,
        createdAt: n.created_at,
      })),
    unreadCount: async () => (await request<Dto>('GET', '/notifications/unread-count/')).count,
    markRead: async (id) => {
      await request('POST', `/notifications/${id}/read/`);
    },
    markAllRead: async () => {
      await request('POST', '/notifications/read-all/');
    },
  },

  employees: {
    list: async () => (await requestAll<Dto>('/employees/')).map(toEmployee),
    setStatus: async (id, status) => toEmployee(await request<Dto>('PATCH', `/employees/${id}/`, { status })),
  },

  appointments: {
    list: async (f = {}) =>
      (
        await requestAll<Dto>(
          `/appointments/${query({
            status: f.status?.join(','),
            date: f.date,
            date_from: f.dateFrom,
            date_to: f.dateTo,
            customer: f.customerId,
            vehicle: f.vehicleId,
          })}`
        )
      ).map(toAppointment),
    transition: async (id, action, note) =>
      toAppointment(await request<Dto>('POST', `/appointments/${id}/transition/`, { action, note: note ?? '' })),
    reschedule: async (id, date, time, note) =>
      toAppointment(await request<Dto>('POST', `/appointments/${id}/reschedule/`, { date, time, note: note ?? '' })),
    assign: async (id, employeeId) =>
      toAppointment(await request<Dto>('POST', `/appointments/${id}/assign/`, { employee: employeeId })),
    updateNotes: async (id, internalNotes) =>
      toAppointment(await request<Dto>('PATCH', `/appointments/${id}/notes/`, { internal_notes: internalNotes })),
  },

  bookings: {
    create: async (input) =>
      toAppointment(
        await request<Dto>('POST', '/bookings/', {
          service: input.serviceId,
          date: input.date,
          time: input.time,
          vehicle: input.vehicleId,
          new_vehicle: input.newVehicle,
          contact: input.contact && {
            full_name: input.contact.fullName,
            phone: input.contact.phone,
            email: input.contact.email,
          },
          customer: input.customerId,
          notes: input.notes ?? '',
        })
      ),
  },

  availability: {
    days: async (serviceId, from, days) =>
      (await request<Dto[]>('GET', `/availability/days/${query({ service: serviceId, from, days })}`)).map((d) => ({
        date: d.date,
        availableSlots: d.available_slots,
      })),
    slots: async (serviceId, date) =>
      (await request<Dto>('GET', `/availability/${query({ service: serviceId, date })}`)).slots,
    openingHours: async () => (await request<Dto[]>('GET', '/opening-hours/')).map(toOpeningHours),
  },

  dashboard: {
    summary: async () => toSummary(await request<Dto>('GET', '/dashboard/summary/')),
  },

  contact: {
    send: (input) =>
      request('POST', '/contact/', {
        full_name: input.fullName,
        email: input.email,
        phone: input.phone,
        message: input.message,
      }),
  },

  content: {
    portfolio: async () =>
      (await request<Dto[]>('GET', '/gallery/projects/')).map((p) => ({
        id: String(p.id),
        title: p.title,
        vehicle: p.vehicle_label,
        category: p.category_display,
        servicesPerformed: p.services_performed ? p.services_performed.split(',').map((s: string) => s.trim()) : [],
        description: p.description,
        duration: p.duration_label,
        completionDate: p.completed_on ? formatDate(p.completed_on) : '',
        beforeImage: p.before_url,
        afterImage: p.after_url,
      })),
    testimonials: async () =>
      (await request<Dto[]>('GET', '/content/testimonials/')).map((t) => ({
        quote: t.quote,
        author: t.author,
        role: t.role,
        vehicle: t.vehicle_label,
      })),
    highlights: async () =>
      (await request<Dto[]>('GET', '/content/highlights/')).map((h) => ({ value: h.value, label: h.label })),
  },
};
