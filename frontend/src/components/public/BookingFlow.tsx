import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Plus } from 'lucide-react';
import { api, ApiError, errorMessage } from '../../api';
import { useApp } from '../../context/AppContext';
import { formatDateTime, formatDayLong, FUEL_LABELS, priceLabel } from '../../lib/labels';
import { useApiData } from '../../lib/useApiData';
import { Appointment, AvailableDay, CustomerProfile, Fuel, TimeSlot, Vehicle } from '../../types';
import { EmptyState, ErrorState, LoadingState, SmartImage, StatusIndicator } from '../ui/DesignSystem';

const STEPS = ['Service', 'Véhicule', 'Date', 'Horaire', 'Informations', 'Récapitulatif', 'Confirmation'];

const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg bg-[#0B0C0E] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D49A3D]';

const EMPTY_VEHICLE = { brand: '', model: '', registration: '', year: null as number | null, fuel: '' as Fuel, color: '' };

const selectableCard = (selected: boolean) =>
  `text-left rounded-xl border transition-all ${
    selected ? 'border-[#D49A3D] bg-[#181B22]' : 'border-white/10 bg-[#15171C] hover:border-white/25'
  }`;

export const BookingFlow: React.FC = () => {
  const { services, servicesLoading, user, bookingPreselectedServiceId, setPortalMode, setCustomerPage, reloadServices } =
    useApp();
  const isClient = user?.role === 'client';
  const isStaff = !!user && user.role !== 'client';
  const bookable = services.filter((s) => s.available);

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<number | null>(bookingPreselectedServiceId);
  const [vehicleMode, setVehicleMode] = useState<'existing' | 'new'>(isClient ? 'existing' : 'new');
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [newVehicle, setNewVehicle] = useState(EMPTY_VEHICLE);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [contact, setContact] = useState({ fullName: '', phone: '', email: '' });
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);

  useEffect(() => {
    if (bookingPreselectedServiceId) setServiceId(bookingPreselectedServiceId);
  }, [bookingPreselectedServiceId]);

  const service = services.find((s) => s.id === serviceId) ?? null;

  const myVehicles = useApiData<Vehicle[]>(() => (isClient ? api.vehicles.list() : Promise.resolve([])), [isClient], []);
  const profile = useApiData<CustomerProfile | null>(
    () => (isClient ? api.customers.me() : Promise.resolve(null)),
    [isClient],
    null
  );
  const days = useApiData<AvailableDay[]>(
    () => (serviceId ? api.availability.days(serviceId, undefined, 21) : Promise.resolve([])),
    [serviceId],
    []
  );
  const slots = useApiData<TimeSlot[]>(
    () => (serviceId && date ? api.availability.slots(serviceId, date) : Promise.resolve([])),
    [serviceId, date],
    []
  );

  useEffect(() => {
    if (!vehicleId && myVehicles.data.length) setVehicleId(myVehicles.data[0].id);
    if (isClient && !myVehicles.loading && myVehicles.data.length === 0) setVehicleMode('new');
  }, [myVehicles.data, myVehicles.loading, vehicleId, isClient]);

  // Un changement de prestation invalide la date et l'heure choisies
  useEffect(() => {
    setDate(null);
    setTime(null);
  }, [serviceId]);
  useEffect(() => setTime(null), [date]);

  const currentVehicle = myVehicles.data.find((v) => v.id === vehicleId);
  const vehicleSummary =
    vehicleMode === 'existing' && currentVehicle
      ? `${currentVehicle.brand} ${currentVehicle.model} (${currentVehicle.registration})`
      : newVehicle.brand
      ? `${newVehicle.brand} ${newVehicle.model} (${newVehicle.registration.toUpperCase()})`
      : '—';
  const contactSummary = isClient && profile.data ? profile.data : { name: contact.fullName, ...contact };
  const startIso = useMemo(() => (date && time ? `${date}T${time}:00Z` : null), [date, time]);

  const validate = (): string | null => {
    if (step === 1 && !service) return 'Veuillez choisir une prestation.';
    if (step === 2) {
      if (vehicleMode === 'existing' && !currentVehicle) return 'Veuillez choisir un véhicule.';
      if (vehicleMode === 'new' && (!newVehicle.brand.trim() || !newVehicle.model.trim() || !newVehicle.registration.trim()))
        return 'Veuillez renseigner la marque, le modèle et l’immatriculation du véhicule.';
    }
    if (step === 3 && !date) return 'Veuillez choisir une date.';
    if (step === 4 && !time) return 'Veuillez choisir un créneau.';
    if (step === 5 && !isClient) {
      if (!contact.fullName.trim() || !contact.phone.trim() || !contact.email.trim())
        return 'Veuillez renseigner votre nom, téléphone et email.';
      if (!/^\S+@\S+\.\S+$/.test(contact.email)) return 'Adresse email invalide.';
    }
    return null;
  };

  const submit = async () => {
    if (!service || !date || !time) return;
    setSubmitting(true);
    try {
      const created = await api.bookings.create({
        serviceId: service.id,
        date,
        time,
        vehicleId: vehicleMode === 'existing' ? currentVehicle?.id : undefined,
        newVehicle: vehicleMode === 'new' ? newVehicle : undefined,
        contact: isClient ? undefined : contact,
        notes,
      });
      setConfirmed(created);
      setStep(7);
    } catch (err) {
      setFormError(errorMessage(err));
      if (err instanceof ApiError && err.status === 409) {
        // Créneau pris entre-temps : retour au choix de l'horaire
        setTime(null);
        slots.reload();
        setStep(4);
      }
      if (err instanceof ApiError && err.status === 400) reloadServices();
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    const problem = validate();
    setFormError(problem);
    if (problem) return;
    if (step === 6) submit();
    else setStep((s) => s + 1);
  };

  return (
    <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-widest text-[#D49A3D] font-semibold mb-2">Réservation en ligne</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white font-display">Réservez votre service</h1>
        <p className="text-neutral-400 text-sm md:text-base mt-2 max-w-xl">
          Les créneaux proposés tiennent compte en temps réel du planning et de la capacité de l’atelier.
        </p>
      </div>

      {isStaff && (
        <div className="mb-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs">
          Vous êtes connecté avec un compte du personnel. La réservation en ligne est destinée aux clients ; pour
          planifier un rendez-vous pour un client, utilisez l’espace professionnel.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 xl:col-span-3 bg-[#121418] border border-white/10 rounded-xl p-5">
          <ol className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
            {STEPS.map((label, i) => {
              const number = i + 1;
              const active = step === number;
              const done = step > number;
              return (
                <li key={label} className="shrink-0 lg:w-full">
                  <button
                    type="button"
                    disabled={!done || step === 7}
                    onClick={() => setStep(number)}
                    aria-current={active ? 'step' : undefined}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-lg text-left transition-colors ${
                      active
                        ? 'bg-[#D49A3D]/15 border border-[#D49A3D]/50 text-white'
                        : done
                        ? 'text-neutral-200 hover:bg-white/5'
                        : 'text-neutral-500 cursor-default'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-semibold shrink-0 ${
                        active
                          ? 'bg-[#D49A3D] text-[#0B0C0E]'
                          : done
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'border border-white/15 text-neutral-400'
                      }`}
                    >
                      {done ? <Check className="w-3.5 h-3.5" /> : number}
                    </span>
                    <span className="text-sm font-medium whitespace-nowrap">{label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="lg:col-span-8 xl:col-span-9 bg-[#121418] border border-white/10 rounded-xl p-6 md:p-8">
          {formError && (
            <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm" role="alert">
              {formError}
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-white font-display mb-6">1. Choisissez votre service</h2>
              {servicesLoading ? (
                <LoadingState />
              ) : bookable.length === 0 ? (
                <EmptyState message="Aucune prestation n’est réservable en ligne pour le moment." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {bookable.map((srv) => (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setServiceId(srv.id)}
                      aria-pressed={srv.id === serviceId}
                      className={`${selectableCard(srv.id === serviceId)} overflow-hidden flex flex-col`}
                    >
                      <div className="h-36 w-full overflow-hidden">
                        <SmartImage src={srv.image} alt={srv.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-4 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-bold text-white font-display">{srv.name}</h3>
                          {srv.id === serviceId && <CheckCircle2 className="w-4 h-4 text-[#D49A3D] shrink-0" />}
                        </div>
                        <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{srv.shortDescription}</p>
                        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                          <span className="text-neutral-400 font-mono">Durée : {srv.durationLabel}</span>
                          <span className="text-[#D49A3D] font-mono font-semibold">{priceLabel(srv)}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-white font-display mb-6">2. Votre véhicule</h2>
              {isClient && myVehicles.data.length > 0 && (
                <div className="flex items-center gap-2 p-1 bg-[#0B0C0E] border border-white/10 rounded-lg w-fit mb-6">
                  {(['existing', 'new'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setVehicleMode(m)}
                      className={`px-4 py-2 rounded-md text-xs font-medium whitespace-nowrap inline-flex items-center gap-1.5 ${
                        vehicleMode === m ? 'bg-[#D49A3D] text-[#0B0C0E] font-semibold' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {m === 'new' && <Plus className="w-3.5 h-3.5" />}
                      {m === 'existing' ? `Mes véhicules (${myVehicles.data.length})` : 'Nouveau véhicule'}
                    </button>
                  ))}
                </div>
              )}

              {vehicleMode === 'existing' ? (
                myVehicles.loading ? (
                  <LoadingState />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {myVehicles.data.map((veh) => (
                      <button
                        key={veh.id}
                        type="button"
                        onClick={() => setVehicleId(veh.id)}
                        aria-pressed={veh.id === vehicleId}
                        className={`${selectableCard(veh.id === vehicleId)} p-4 flex items-center gap-4`}
                      >
                        <SmartImage
                          src={veh.photo}
                          alt={`${veh.brand} ${veh.model}`}
                          className="w-20 h-16 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white truncate">
                            {veh.brand} {veh.model}
                          </h3>
                          <p className="text-xs text-[#D49A3D] font-mono mt-0.5">{veh.registration}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#15171C] p-5 rounded-xl border border-white/10">
                  {(
                    [
                      ['brand', 'Marque *', 'Ex : Toyota'],
                      ['model', 'Modèle *', 'Ex : Land Cruiser 300'],
                      ['registration', 'Immatriculation *', 'Ex : DK-1234-AB'],
                      ['color', 'Couleur', 'Ex : Noir'],
                    ] as const
                  ).map(([field, label, placeholder]) => (
                    <div key={field}>
                      <label htmlFor={`veh-${field}`} className="block text-xs text-neutral-300 mb-1.5">
                        {label}
                      </label>
                      <input
                        id={`veh-${field}`}
                        placeholder={placeholder}
                        value={newVehicle[field]}
                        onChange={(e) => setNewVehicle({ ...newVehicle, [field]: e.target.value })}
                        className={`${inputClass} ${field === 'registration' ? 'font-mono uppercase' : ''}`}
                      />
                    </div>
                  ))}
                  <div>
                    <label htmlFor="veh-year" className="block text-xs text-neutral-300 mb-1.5">
                      Année
                    </label>
                    <input
                      id="veh-year"
                      type="number"
                      min={1950}
                      value={newVehicle.year ?? ''}
                      onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value ? Number(e.target.value) : null })}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label htmlFor="veh-fuel" className="block text-xs text-neutral-300 mb-1.5">
                      Motorisation
                    </label>
                    <select
                      id="veh-fuel"
                      value={newVehicle.fuel}
                      onChange={(e) => setNewVehicle({ ...newVehicle, fuel: e.target.value as Fuel })}
                      className={inputClass}
                    >
                      <option value="">Non précisé</option>
                      {Object.entries(FUEL_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-white font-display mb-6">3. Choisissez la date</h2>
              {days.loading ? (
                <LoadingState />
              ) : days.error ? (
                <ErrorState message={days.error} onRetry={days.reload} />
              ) : days.data.every((d) => d.availableSlots === 0) ? (
                <EmptyState message="Aucun créneau disponible sur les trois prochaines semaines. Contactez l’atelier." />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {days.data.map((d) => {
                    const full = d.availableSlots === 0;
                    return (
                      <button
                        key={d.date}
                        type="button"
                        disabled={full}
                        onClick={() => setDate(d.date)}
                        aria-pressed={d.date === date}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          d.date === date
                            ? 'border-[#D49A3D] bg-[#D49A3D]/15 text-white'
                            : full
                            ? 'border-white/5 bg-[#101216] text-neutral-600 cursor-not-allowed'
                            : 'border-white/10 bg-[#15171C] text-neutral-300 hover:border-white/25'
                        }`}
                      >
                        <span className="block text-xs capitalize">{formatDayLong(d.date)}</span>
                        <span className="block text-[11px] mt-1 font-mono">
                          {full ? 'Complet / fermé' : `${d.availableSlots} créneau(x)`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 4 && date && (
            <div>
              <h2 className="text-xl font-bold text-white font-display mb-1">4. Choisissez l’horaire</h2>
              <p className="text-xs text-neutral-400 mb-6 capitalize">{formatDayLong(date)}</p>
              {slots.loading ? (
                <LoadingState />
              ) : slots.error ? (
                <ErrorState message={slots.error} onRetry={slots.reload} />
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {slots.data.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setTime(slot.time)}
                      aria-pressed={slot.time === time}
                      className={`p-3 rounded-xl border font-mono text-sm flex items-center justify-center gap-2 ${
                        slot.time === time
                          ? 'border-[#D49A3D] bg-[#D49A3D]/15 text-white'
                          : slot.available
                          ? 'border-white/10 bg-[#15171C] text-white hover:border-white/25'
                          : 'border-white/5 bg-[#101216] text-neutral-600 line-through cursor-not-allowed'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-xl font-bold text-white font-display mb-6">5. Vos coordonnées</h2>
              {isClient ? (
                profile.data && (
                  <div className="p-4 rounded-xl bg-[#15171C] border border-white/10 text-sm text-neutral-200 space-y-1">
                    <p className="font-semibold text-white">{profile.data.name}</p>
                    <p className="font-mono text-xs">
                      {profile.data.phone} · {profile.data.email}
                    </p>
                    <p className="text-xs text-neutral-500">Modifiables depuis votre profil.</p>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="c-name" className="block text-xs text-neutral-300 mb-1.5">
                      Nom complet *
                    </label>
                    <input
                      id="c-name"
                      autoComplete="name"
                      value={contact.fullName}
                      onChange={(e) => setContact({ ...contact, fullName: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="c-phone" className="block text-xs text-neutral-300 mb-1.5">
                      Téléphone / WhatsApp *
                    </label>
                    <input
                      id="c-phone"
                      type="tel"
                      autoComplete="tel"
                      value={contact.phone}
                      onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="c-email" className="block text-xs text-neutral-300 mb-1.5">
                      Email *
                    </label>
                    <input
                      id="c-email"
                      type="email"
                      autoComplete="email"
                      value={contact.email}
                      onChange={(e) => setContact({ ...contact, email: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
              <div className="mt-4">
                <label htmlFor="c-notes" className="block text-xs text-neutral-300 mb-1.5">
                  Instructions particulières (optionnel)
                </label>
                <textarea
                  id="c-notes"
                  rows={3}
                  maxLength={2000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {step === 6 && service && startIso && (
            <div>
              <h2 className="text-xl font-bold text-white font-display mb-6">6. Récapitulatif</h2>
              <div className="bg-[#15171C] border border-white/10 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                <div>
                  <span className="text-xs text-neutral-400 block">Prestation</span>
                  <span className="font-semibold text-white">{service.name}</span>
                  <span className="block text-xs text-neutral-400">Durée estimée : {service.durationLabel}</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-400 block">Tarif indicatif</span>
                  <span className="font-bold text-[#D49A3D] font-mono">{priceLabel(service)}</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-400 block">Véhicule</span>
                  <span className="font-semibold text-white">{vehicleSummary}</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-400 block">Date & heure</span>
                  <span className="font-semibold text-white font-mono">{formatDateTime(startIso)}</span>
                </div>
                <div>
                  <span className="text-xs text-neutral-400 block">Client</span>
                  <span className="font-semibold text-white">{contactSummary.name}</span>
                  <span className="block text-xs text-neutral-400 font-mono">
                    {contactSummary.phone} · {contactSummary.email}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-neutral-400 block">Statut initial</span>
                  <StatusIndicator status="À confirmer" />
                </div>
              </div>
            </div>
          )}

          {step === 7 && confirmed && (
            <div className="py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs uppercase tracking-widest text-[#D49A3D] font-semibold">
                Demande enregistrée · Réf. {confirmed.reference}
              </p>
              <h2 className="text-2xl font-bold text-white font-display mt-1">Votre demande de rendez-vous est enregistrée</h2>
              <p className="text-sm text-neutral-300 mt-2 max-w-xl">
                Créneau demandé : <span className="text-white font-mono">{formatDateTime(confirmed.startAt)}</span>. Il sera
                confirmé par l’atelier. Le jour venu, déposez votre véhicule à l’atelier à l’heure choisie ; nous vous
                préviendrons quand il sera prêt à être récupéré. Conservez votre référence.
              </p>
              {isClient && (
                <button
                  type="button"
                  onClick={() => {
                    setPortalMode('space');
                    setCustomerPage('appointments');
                  }}
                  className="mt-8 px-5 py-2.5 rounded-lg bg-[#D49A3D] text-[#0B0C0E] font-semibold text-xs hover:bg-[#e0a84b]"
                >
                  Suivre dans mon espace client
                </button>
              )}
            </div>
          )}

          {step < 7 && (
            <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setStep((s) => s - 1);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 text-xs font-medium text-neutral-200 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Étape précédente
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={submitting || (step === 6 && isStaff)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#D49A3D] text-[#0B0C0E] text-xs font-semibold hover:bg-[#e0a84b] disabled:opacity-50"
              >
                {step === 6 ? (submitting ? 'Envoi…' : 'Confirmer la demande') : 'Suivant'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
