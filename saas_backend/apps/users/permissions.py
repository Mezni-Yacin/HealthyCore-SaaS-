# apps/users/permissions.py
from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    """
    Seuls les super_admin ont accès
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'super_admin'


class IsSuperAdminOrAdmin(permissions.BasePermission):
    """
    Super admin ou admin ont accès
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['super_admin', 'admin']


class IsOwnerOrSuperAdmin(permissions.BasePermission):
    """
    Le propriétaire du compte ou un super admin
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'super_admin':
            return True
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return obj == request.user