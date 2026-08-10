from django.urls import path
from .views import PharmacistViewSet, DoctorPrescriptionViewSet, PatientPharmacyViewSet, PublicPharmacyViewSet

urlpatterns = [
    # ====================== PHARMACIEN ======================
    path('pharmacist/cities/', PharmacistViewSet.as_view({'get': 'list_cities'})),
    path('pharmacist/create-pharmacy/', PharmacistViewSet.as_view({'post': 'create_pharmacy'})),
    path('pharmacist/my-pharmacy/', PharmacistViewSet.as_view({'get': 'my_pharmacy', 'patch': 'my_pharmacy'})),
    path('pharmacist/medications/', PharmacistViewSet.as_view({'get': 'medications_manage', 'post': 'medications_manage'})),
    path('pharmacist/stock/', PharmacistViewSet.as_view({'get': 'stock_manage', 'post': 'stock_manage'})),
    path('pharmacist/stock/<int:pk>/', PharmacistViewSet.as_view({'patch': 'stock_item_manage', 'delete': 'stock_item_manage'})),
    path('pharmacist/prescriptions/', PharmacistViewSet.as_view({'get': 'list_prescriptions'})),
    path('pharmacist/sales/', PharmacistViewSet.as_view({'get': 'list_sales'})),
    path('pharmacist/create-sale/', PharmacistViewSet.as_view({'post': 'create_sale'})),
    path('pharmacist/stats/', PharmacistViewSet.as_view({'get': 'stats'})),

    # ====================== MÉDECIN ======================
    path('doctor/prescriptions/', DoctorPrescriptionViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('doctor/patients/', DoctorPrescriptionViewSet.as_view({'get': 'list_patients'})), 

    # ====================== PATIENT ======================
    path('patient/my-prescriptions/', PatientPharmacyViewSet.as_view({'get': 'my_prescriptions'})),
    path('patient/my-purchases/', PatientPharmacyViewSet.as_view({'get': 'my_purchases'})),
    
    # ====================== ANNUAIRE PUBLIC ======================
    path('public/pharmacies/', PublicPharmacyViewSet.as_view({'get': 'list'})),
    path('public/pharmacies/<int:pk>/', PublicPharmacyViewSet.as_view({'get': 'retrieve'})), # ✅ AJOUTE CETTE LIGNE
]