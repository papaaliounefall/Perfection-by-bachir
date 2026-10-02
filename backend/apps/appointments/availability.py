"""Calcul des créneaux réellement disponibles.

Prend en compte : horaires d'ouverture, fermetures, durée de la prestation,
capacité de l'atelier, rendez-vous existants, marge entre prestations,
délai minimum de prévenance et horizon de réservation.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from django.conf import settings
from django.utils import timezone

from .models import Appointment, Closure, OpeningHours


@dataclass(frozen=True)
class Slot:
    start: datetime
    end: datetime
    available: bool


def opening_window(day: date):
    """(ouverture, fermeture) en datetimes locaux, ou None si l'atelier est fermé."""
    if Closure.objects.filter(start_date__lte=day, end_date__gte=day).exists():
        return None
    hours = OpeningHours.objects.filter(weekday=day.weekday()).first()
    if hours is None or hours.is_closed or not hours.opens_at or not hours.closes_at:
        return None
    tz = timezone.get_current_timezone()
    return (
        timezone.make_aware(datetime.combine(day, hours.opens_at), tz),
        timezone.make_aware(datetime.combine(day, hours.closes_at), tz),
    )


def _max_concurrency(intervals, start, end):
    """Nombre maximal d'intervalles simultanés sur [start, end)."""
    points = [start] + [s for s, _ in intervals if start < s < end]
    return max(sum(1 for s, e in intervals if s <= p < e) for p in points)


def compute_slots(service, day: date, *, exclude_appointment_id=None, now=None) -> list[Slot]:
    cfg = settings.WORKSHOP
    now = now or timezone.now()
    today = timezone.localdate(now)
    if day < today or day > today + timedelta(days=cfg["BOOKING_HORIZON_DAYS"]):
        return []

    window = opening_window(day)
    if window is None:
        return []
    open_at, close_at = window

    duration = timedelta(minutes=service.duration_minutes)
    buffer = timedelta(minutes=cfg["BUFFER_MINUTES"])
    step = timedelta(minutes=cfg["SLOT_STEP_MINUTES"])
    earliest = now + timedelta(hours=cfg["MIN_NOTICE_HOURS"])

    existing = Appointment.objects.filter(
        start_at__lt=close_at + buffer, end_at__gt=open_at - buffer
    ).exclude(status__in=Appointment.NON_BLOCKING_STATUSES)
    if exclude_appointment_id:
        existing = existing.exclude(pk=exclude_appointment_id)
    # Chaque rendez-vous occupe sa plage augmentée de la marge
    intervals = [(s - buffer, e + buffer) for s, e in existing.values_list("start_at", "end_at")]

    slots = []
    start = open_at
    while start + duration <= close_at:
        end = start + duration
        free = _max_concurrency(intervals, start, end) < cfg["CAPACITY"]
        slots.append(Slot(start=start, end=end, available=free and start >= earliest))
        start += step
    return slots


def is_slot_available(service, start_at: datetime, *, exclude_appointment_id=None) -> bool:
    day = timezone.localdate(start_at)
    return any(
        slot.start == start_at and slot.available
        for slot in compute_slots(service, day, exclude_appointment_id=exclude_appointment_id)
    )
