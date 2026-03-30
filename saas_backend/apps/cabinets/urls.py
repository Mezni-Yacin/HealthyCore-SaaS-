from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CabinetViewSet, DoctorViewSet, DoctorCabinetViewSet,
    DoctorAvailabilityViewSet, DoctorUnavailabilityViewSet,
    DoctorSecretaryViewSet, PublicCabinetViewSet,
)

# =============== ROUTER POUR CABINETS SEULEMENT ===============
router = DefaultRouter()
router.register(r'', CabinetViewSet, basename='cabinet')

urlpatterns = [
    # =============== ANNUAIRE PUBLIC (pour patients) — EN PREMIER ! ===============
    path('directory/', PublicCabinetViewSet.as_view({
        'get': 'list',
    }), name='public-directory-list'),

    path('directory/filters/', PublicCabinetViewSet.as_view({
        'get': 'filters',
    }), name='public-directory-filters'),

    path('directory/<int:pk>/', PublicCabinetViewSet.as_view({
        'get': 'retrieve',
    }), name='public-directory-detail'),

    # =============== DOCTORS MANAGEMENT — ROUTES EXPLICITES ===============
    path('doctors-management/', DoctorViewSet.as_view({
        'get': 'list', 'post': 'create',
    }), name='doctor-management-list'),

    path('doctors-management/available-users/', DoctorViewSet.as_view({
        'get': 'available_users',
    }), name='doctor-management-available-users'),

    path('doctors-management/stats/', DoctorViewSet.as_view({
        'get': 'stats',
    }), name='doctor-management-stats'),

    path('doctors-management/<int:pk>/', DoctorViewSet.as_view({
        'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy',
    }), name='doctor-management-detail'),

    path('doctors-management/<int:pk>/toggle_patients/', DoctorViewSet.as_view({
        'post': 'toggle_patients',
    }), name='doctor-management-toggle-patients'),

    path('doctors-management/<int:pk>/toggle_tele/', DoctorViewSet.as_view({
        'post': 'toggle_tele',
    }), name='doctor-management-toggle-tele'),

    # =============== MY CABINETS — ROUTES EXPLICITES (MÉDECIN PROPRIÉTAIRE) ===============
    path('my-cabinets/', DoctorCabinetViewSet.as_view({
        'get': 'list', 'post': 'create',
    }), name='my-cabinet-list'),

    path('my-cabinets/dropdown_specialties/', DoctorCabinetViewSet.as_view({
        'get': 'dropdown_specialties',
    }), name='my-cabinet-dropdown-specialties'),

    path('my-cabinets/dropdown_cities/', DoctorCabinetViewSet.as_view({
        'get': 'dropdown_cities',
    }), name='my-cabinet-dropdown-cities'),

    path('my-cabinets/dropdown_governorates/', DoctorCabinetViewSet.as_view({
        'get': 'dropdown_governorates',
    }), name='my-cabinet-dropdown-governorates'),

    path('my-cabinets/stats/', DoctorCabinetViewSet.as_view({
        'get': 'stats',
    }), name='my-cabinet-stats'),

    path('my-cabinets/<int:pk>/', DoctorCabinetViewSet.as_view({
        'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy',
    }), name='my-cabinet-detail'),

    path('my-cabinets/<int:pk>/toggle_active/', DoctorCabinetViewSet.as_view({
        'post': 'toggle_active',
    }), name='my-cabinet-toggle-active'),

    # =============== DISPONIBILITÉS DU MÉDECIN — ROUTES EXPLICITES ===============
    path('my-availabilities/', DoctorAvailabilityViewSet.as_view({
        'get': 'list', 'post': 'create',
    }), name='my-availability-list'),

    path('my-availabilities/<int:pk>/', DoctorAvailabilityViewSet.as_view({
        'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy',
    }), name='my-availability-detail'),

    path('my-availabilities/<int:pk>/toggle/', DoctorAvailabilityViewSet.as_view({
        'post': 'toggle',
    }), name='my-availability-toggle'),

    # =============== INDISPONIBILITÉS DU MÉDECIN — ROUTES EXPLICITES ===============
    path('my-unavailabilities/', DoctorUnavailabilityViewSet.as_view({
        'get': 'list', 'post': 'create',
    }), name='my-unavailability-list'),

    path('my-unavailabilities/<int:pk>/', DoctorUnavailabilityViewSet.as_view({
        'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy',
    }), name='my-unavailability-detail'),

    # =============== SECRÉTAIRES DU MÉDECIN — ROUTES EXPLICITES ===============
    path('my-secretaries/', DoctorSecretaryViewSet.as_view({
        'get': 'list', 'post': 'create',
    }), name='my-secretary-list'),

    path('my-secretaries/assign/', DoctorSecretaryViewSet.as_view({
        'post': 'assign',
    }), name='my-secretary-assign'),

    path('my-secretaries/unassign/', DoctorSecretaryViewSet.as_view({
        'post': 'unassign',
    }), name='my-secretary-unassign'),

    path('my-secretaries/available/', DoctorSecretaryViewSet.as_view({
        'get': 'available',
    }), name='my-secretary-available'),

    path('my-secretaries/my_cabinets/', DoctorSecretaryViewSet.as_view({
        'get': 'my_cabinets',
    }), name='my-secretary-cabinets'),

    path('my-secretaries/<int:pk>/', DoctorSecretaryViewSet.as_view({
        'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy',
    }), name='my-secretary-detail'),

    # =============== CABINETS — VIA ROUTER (Super Admin) — EN DERNIER ! ===============
    path('', include(router.urls)),
]