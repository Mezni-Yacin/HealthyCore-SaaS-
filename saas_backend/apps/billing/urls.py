# apps/billing/urls.py

from django.urls import path
from .views import (
    DoctorInvoiceViewSet,
    SecretaryInvoiceViewSet,
    PatientInvoiceViewSet,
    SuperAdminInvoiceViewSet,
    StripeWebhookView,
)

urlpatterns = [
    # ====================== DOCTOR ======================
    path('doctor/invoices/', DoctorInvoiceViewSet.as_view({'get': 'list', 'post': 'create'}), name='doctor-invoices-list'),
    path('doctor/invoices/<int:pk>/', DoctorInvoiceViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'}), name='doctor-invoices-detail'),
    path('doctor/invoices/<int:pk>/validate/', DoctorInvoiceViewSet.as_view({'post': 'validate_invoice'}), name='doctor-invoice-validate'),
    path('doctor/invoices/<int:pk>/pay/', DoctorInvoiceViewSet.as_view({'post': 'pay'}), name='doctor-invoice-pay'),
    path('doctor/invoices/<int:pk>/pdf/', DoctorInvoiceViewSet.as_view({'get': 'generate_pdf'}), name='doctor-invoice-pdf'),
    path('doctor/stats/', DoctorInvoiceViewSet.as_view({'get': 'stats'}), name='doctor-invoices-stats'),

    # ====================== SECRETARY ======================
    path('secretary/invoices/', SecretaryInvoiceViewSet.as_view({'get': 'list', 'post': 'create'}), name='secretary-invoices-list'),
    path('secretary/invoices/<int:pk>/', SecretaryInvoiceViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='secretary-invoices-detail'),
    path('secretary/invoices/<int:pk>/validate/', SecretaryInvoiceViewSet.as_view({'post': 'validate_invoice'}), name='secretary-invoice-validate'),
    path('secretary/invoices/<int:pk>/pay/', SecretaryInvoiceViewSet.as_view({'post': 'pay'}), name='secretary-invoice-pay'),
    path('secretary/invoices/<int:pk>/pdf/', SecretaryInvoiceViewSet.as_view({'get': 'generate_pdf'}), name='secretary-invoice-pdf'),
    path('secretary/stats/', SecretaryInvoiceViewSet.as_view({'get': 'stats'}), name='secretary-invoices-stats'),

    # ====================== PATIENT ======================
    path('patient/invoices/', PatientInvoiceViewSet.as_view({'get': 'list'}), name='patient-invoices-list'),
    path('patient/invoices/<int:pk>/', PatientInvoiceViewSet.as_view({'get': 'retrieve'}), name='patient-invoices-detail'),
    path('patient/invoices/<int:pk>/payments/', PatientInvoiceViewSet.as_view({'get': 'invoice_payments'}), name='patient-invoice-payments'),
    path('patient/invoices/<int:pk>/pdf/', PatientInvoiceViewSet.as_view({'get': 'generate_pdf'}), name='patient-invoice-pdf'),
    path('patient/stats/', PatientInvoiceViewSet.as_view({'get': 'stats'}), name='patient-invoices-stats'),
    
    # ✅ ENDPOINTS STRIPE POUR LE PATIENT
    path('patient/invoices/<int:pk>/pay-stripe/', PatientInvoiceViewSet.as_view({'post': 'pay_with_stripe'}), name='patient-invoice-pay-stripe'),
    path('patient/invoices/<int:pk>/stripe-status/', PatientInvoiceViewSet.as_view({'get': 'check_stripe_status'}), name='patient-invoice-stripe-status'),
    
    # ✅ NOUVELLE LIGNE À AJOUTER ICI :
    path('patient/invoices/<int:pk>/verify-payments/', PatientInvoiceViewSet.as_view({'post': 'verify_payments'}), name='patient-invoice-verify-payments'),

    # ====================== SUPER ADMIN ======================
    path('superadmin/invoices/', SuperAdminInvoiceViewSet.as_view({'get': 'list', 'post': 'create'}), name='superadmin-invoices-list'),
    path('superadmin/invoices/<int:pk>/', SuperAdminInvoiceViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='superadmin-invoices-detail'),
    path('superadmin/invoices/<int:pk>/validate/', SuperAdminInvoiceViewSet.as_view({'post': 'validate_invoice'}), name='superadmin-invoice-validate'),
    path('superadmin/invoices/<int:pk>/pay/', SuperAdminInvoiceViewSet.as_view({'post': 'pay'}), name='superadmin-invoice-pay'),
    path('superadmin/invoices/<int:pk>/pdf/', SuperAdminInvoiceViewSet.as_view({'get': 'generate_pdf'}), name='superadmin-invoice-pdf'),
    path('superadmin/stats/', SuperAdminInvoiceViewSet.as_view({'get': 'stats'}), name='superadmin-invoices-stats'),
    path('superadmin/overdue/', SuperAdminInvoiceViewSet.as_view({'get': 'overdue_list'}), name='superadmin-invoices-overdue'),

    # ✅ WEBHOOK STRIPE (doit être accessible sans authentification)
    path('stripe/webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
]