from django.urls import path
from .views import (
    DoctorAppointmentViewSet,
    PatientAppointmentViewSet,
    SecretaryAppointmentViewSet,
)


# ====================== RENDEZ-VOUS DU MÉDECIN ======================
# Prefix : /api/appointments/

urlpatterns = [
    # ── CRUD Rendez-vous Médecin ──
    path('doctor/', DoctorAppointmentViewSet.as_view({
        'get': 'list',
        'post': 'create',
    }), name='doctor-appointments-list'),

    path('doctor/stats/', DoctorAppointmentViewSet.as_view({
        'get': 'stats',
    }), name='doctor-appointments-stats'),

    path('doctor/patients-dropdown/', DoctorAppointmentViewSet.as_view({
        'get': 'patients_dropdown',
    }), name='doctor-appointments-patients-dropdown'),

    path('doctor/cabinets-dropdown/', DoctorAppointmentViewSet.as_view({
        'get': 'cabinets_dropdown',
    }), name='doctor-appointments-cabinets-dropdown'),

    path('doctor/<int:pk>/', DoctorAppointmentViewSet.as_view({
        'get': 'retrieve',
        'patch': 'partial_update',
        'delete': 'destroy',
    }), name='doctor-appointments-detail'),

    # ── Actions statut Médecin ──
    path('doctor/<int:pk>/confirm/', DoctorAppointmentViewSet.as_view({
        'post': 'confirm_appointment',
    }), name='doctor-appointments-confirm'),

    path('doctor/<int:pk>/start/', DoctorAppointmentViewSet.as_view({
        'post': 'start_appointment',
    }), name='doctor-appointments-start'),

    path('doctor/<int:pk>/complete/', DoctorAppointmentViewSet.as_view({
        'post': 'complete_appointment',
    }), name='doctor-appointments-complete'),

    path('doctor/<int:pk>/cancel/', DoctorAppointmentViewSet.as_view({
        'post': 'cancel_appointment',
    }), name='doctor-appointments-cancel'),

    # ====================== RENDEZ-VOUS DU PATIENT ======================
    path('patient/records/', PatientAppointmentViewSet.as_view({
        'get': 'list',
    }), name='patient-appointments-list'),

    path('patient/records/upcoming/', PatientAppointmentViewSet.as_view({
        'get': 'upcoming',
    }), name='patient-appointments-upcoming'),

    path('patient/records/<int:pk>/', PatientAppointmentViewSet.as_view({
        'get': 'retrieve',
    }), name='patient-appointments-detail'),

    path('patient/records/<int:pk>/cancel/', PatientAppointmentViewSet.as_view({
        'post': 'cancel_appointment',
    }), name='patient-appointments-cancel'),

    # ====================== RENDEZ-VOUS DU SECRÉTAIRE ======================
    path('secretary/records/', SecretaryAppointmentViewSet.as_view({
        'get': 'list',
        'post': 'create',
    }), name='secretary-appointments-list'),

    path('secretary/records/stats/', SecretaryAppointmentViewSet.as_view({
        'get': 'stats',
    }), name='secretary-appointments-stats'),

    path('secretary/records/doctors-dropdown/', SecretaryAppointmentViewSet.as_view({
        'get': 'doctors_dropdown',
    }), name='secretary-appointments-doctors-dropdown'),

    path('secretary/records/patients-dropdown/', SecretaryAppointmentViewSet.as_view({
        'get': 'patients_dropdown',
    }), name='secretary-appointments-patients-dropdown'),

    path('secretary/records/cabinets-dropdown/', SecretaryAppointmentViewSet.as_view({
        'get': 'cabinets_dropdown',
    }), name='secretary-appointments-cabinets-dropdown'),

    path('secretary/records/<int:pk>/', SecretaryAppointmentViewSet.as_view({
        'get': 'retrieve',
        'patch': 'partial_update',
    }), name='secretary-appointments-detail'),

    path('secretary/records/<int:pk>/cancel/', SecretaryAppointmentViewSet.as_view({
        'post': 'cancel_appointment',
    }), name='secretary-appointments-cancel'),
]