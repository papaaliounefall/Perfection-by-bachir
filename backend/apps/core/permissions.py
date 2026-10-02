"""Permissions par rôle (RBAC) — toujours vérifiées côté serveur."""

from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import Role


def has_role(user, *roles) -> bool:
    return bool(user and user.is_authenticated and user.role in roles)


def is_staff_member(user) -> bool:
    return has_role(user, Role.TECHNICIAN, Role.MANAGER, Role.ADMIN)


def is_manager(user) -> bool:
    return has_role(user, Role.MANAGER, Role.ADMIN)


class IsStaffMember(BasePermission):
    def has_permission(self, request, view):
        return is_staff_member(request.user)


class IsManager(BasePermission):
    def has_permission(self, request, view):
        return is_manager(request.user)


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return has_role(request.user, Role.ADMIN)


class ReadStaffWriteManager(BasePermission):
    """Lecture pour tout le personnel, écriture réservée manager/admin."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return is_staff_member(request.user)
        return is_manager(request.user)
