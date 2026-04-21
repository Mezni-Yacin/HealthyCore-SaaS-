from django.urls import path
from .views import (
    DoctorMedicalRecordViewSet,
    PatientMedicalRecordViewSet,
    SecretaryMedicalRecordViewSet,
)


urlpatterns = [
    # ====================== DOCTEUR ======================
    path('doctor/', DoctorMedicalRecordViewSet.as_view({
        'get': 'list',
        'post': 'create',
    }), name='doctor-medical-records-list'),

    path('doctor/stats/', DoctorMedicalRecordViewSet.as_view({
        'get': 'stats',
    }), name='doctor-medical-records-stats'),

    path('doctor/patients-dropdown/', DoctorMedicalRecordViewSet.as_view({
        'get': 'patients_dropdown',
    }), name='doctor-medical-records-patients-dropdown'),

    path('doctor/<int:pk>/', DoctorMedicalRecordViewSet.as_view({
        'get': 'retrieve',
        'patch': 'partial_update',
        'delete': 'destroy',
    }), name='doctor-medical-records-detail'),

    path('doctor/<int:pk>/attachments/upload/', DoctorMedicalRecordViewSet.as_view({
        'post': 'upload_attachment',
    }), name='doctor-medical-records-upload-attachment'),

    path('doctor/<int:pk>/attachments/<int:attachment_id>/', DoctorMedicalRecordViewSet.as_view({
        'delete': 'remove_attachment',
    }), name='doctor-medical-records-remove-attachment'),

    path('doctor/<int:pk>/prescriptions/', DoctorMedicalRecordViewSet.as_view({
        'get': 'prescriptions_list',
        'post': 'prescriptions_create',
    }), name='doctor-medical-records-prescriptions'),

    path('doctor/<int:pk>/prescriptions/<int:prescription_id>/', DoctorMedicalRecordViewSet.as_view({
        'patch': 'prescription_update',
        'delete': 'prescription_delete',
    }), name='doctor-medical-records-prescription-detail'),

    # ====================== PATIENT ======================
    path('patient/', PatientMedicalRecordViewSet.as_view({
        'get': 'list',
    }), name='patient-medical-records-list'),

    path('patient/stats/', PatientMedicalRecordViewSet.as_view({
        'get': 'stats',
    }), name='patient-medical-records-stats'),

    path('patient/<int:pk>/', PatientMedicalRecordViewSet.as_view({
        'get': 'retrieve',
    }), name='patient-medical-records-detail'),

    path('patient/<int:pk>/prescriptions/', PatientMedicalRecordViewSet.as_view({
        'get': 'prescriptions',
    }), name='patient-medical-records-prescriptions'),

    path('patient/<int:pk>/attachments/<int:attachment_id>/download/', PatientMedicalRecordViewSet.as_view({
        'get': 'download_attachment',
    }), name='patient-medical-records-download'),

    # ====================== SECRÉTAIRE ======================
    path('secretary/', SecretaryMedicalRecordViewSet.as_view({
        'get': 'list',
    }), name='secretary-medical-records-list'),

    path('secretary/stats/', SecretaryMedicalRecordViewSet.as_view({
        'get': 'stats',
    }), name='secretary-medical-records-stats'),

    path('secretary/<int:pk>/', SecretaryMedicalRecordViewSet.as_view({
        'get': 'retrieve',
    }), name='secretary-medical-records-detail'),

    path('secretary/<int:pk>/prescriptions/', SecretaryMedicalRecordViewSet.as_view({
        'get': 'prescriptions',
    }), name='secretary-medical-records-prescriptions'),

    path('secretary/<int:pk>/attachments/<int:attachment_id>/download/', SecretaryMedicalRecordViewSet.as_view({
        'get': 'download_attachment',
    }), name='secretary-medical-records-download'),
]