# -*- coding: utf-8 -*-
from django.urls import path
from .views import (
    DoctorWaitingQueueViewSet,
    PatientWaitingQueueViewSet,
    SecretaryWaitingQueueViewSet,
)


urlpatterns = [
    # ══════════ MÉDECIN ══════════
    path('doctor/', DoctorWaitingQueueViewSet.as_view({
        'get': 'list',
        'post': 'create',
    }), name='doctor-waiting-queue-list'),

    path('doctor/today/', DoctorWaitingQueueViewSet.as_view({
        'get': 'today',
    }), name='doctor-waiting-queue-today'),

    path('doctor/stats/', DoctorWaitingQueueViewSet.as_view({
        'get': 'stats',
    }), name='doctor-waiting-queue-stats'),

    path('doctor/patients-dropdown/', DoctorWaitingQueueViewSet.as_view({
        'get': 'patients_dropdown',
    }), name='doctor-waiting-queue-patients'),

    path('doctor/<int:pk>/', DoctorWaitingQueueViewSet.as_view({
        'get': 'retrieve',
        'patch': 'partial_update',
        'delete': 'destroy',
    }), name='doctor-waiting-queue-detail'),

    path('doctor/<int:pk>/call/', DoctorWaitingQueueViewSet.as_view({
        'post': 'call_patient',
    }), name='doctor-waiting-queue-call'),

    path('doctor/<int:pk>/complete/', DoctorWaitingQueueViewSet.as_view({
        'post': 'complete_consultation',
    }), name='doctor-waiting-queue-complete'),

    path('doctor/<int:pk>/no-show/', DoctorWaitingQueueViewSet.as_view({
        'post': 'mark_no_show',
    }), name='doctor-waiting-queue-no-show'),

    # ══════════ PATIENT ══════════
    path('patient/', PatientWaitingQueueViewSet.as_view({
        'get': 'list',
    }), name='patient-waiting-queue-list'),

    path('patient/current/', PatientWaitingQueueViewSet.as_view({
        'get': 'current',
    }), name='patient-waiting-queue-current'),

    path('patient/join/', PatientWaitingQueueViewSet.as_view({
        'post': 'join',
    }), name='patient-waiting-queue-join'),

    path('patient/doctors/', PatientWaitingQueueViewSet.as_view({
        'get': 'doctors_available',
    }), name='patient-waiting-queue-doctors'),

    path('patient/<int:pk>/leave/', PatientWaitingQueueViewSet.as_view({
        'post': 'leave',
    }), name='patient-waiting-queue-leave'),

    # ══════════ SECRÉTAIRE ══════════
    path('secretary/', SecretaryWaitingQueueViewSet.as_view({
        'get': 'list',
    }), name='secretary-waiting-queue-list'),

    path('secretary/today/', SecretaryWaitingQueueViewSet.as_view({
        'get': 'today',
    }), name='secretary-waiting-queue-today'),

    path('secretary/stats/', SecretaryWaitingQueueViewSet.as_view({
        'get': 'stats',
    }), name='secretary-waiting-queue-stats'),

    path('secretary/doctors/', SecretaryWaitingQueueViewSet.as_view({
        'get': 'doctors_dropdown',
    }), name='secretary-waiting-queue-doctors'),

    path('secretary/<int:pk>/', SecretaryWaitingQueueViewSet.as_view({
        'get': 'retrieve',
    }), name='secretary-waiting-queue-detail'),
]