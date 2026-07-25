from django.urls import path
from .views import DoctorLabViewSet, LabStaffLabViewSet, PatientLabViewSet, SuperAdminLabViewSet

urlpatterns = [
    # ====================== DOCTOR ======================
    path('doctor/catalog/', DoctorLabViewSet.as_view({'get': 'catalog_list'})),
    path('doctor/catalog/<int:pk>/', DoctorLabViewSet.as_view({'get': 'catalog_detail'})),
    path('doctor/labs/', DoctorLabViewSet.as_view({'get': 'labs_list'})),
    path('doctor/requests/', DoctorLabViewSet.as_view({'get': 'requests_list', 'post': 'requests_create'})),
    path('doctor/requests/<int:pk>/', DoctorLabViewSet.as_view({'get': 'requests_retrieve'})),
    path('doctor/requests/<int:pk>/result/', DoctorLabViewSet.as_view({'get': 'request_result'})),

    # ====================== LAB STAFF ======================
    # Villes
    path('staff/cities/', LabStaffLabViewSet.as_view({'get': 'cities_list'})),
    # Laboratoire
    path('staff/create-lab/', LabStaffLabViewSet.as_view({'post': 'create_my_lab'})),
    path('staff/my-lab/', LabStaffLabViewSet.as_view({'get': 'my_lab_detail', 'patch': 'my_lab_update'})),
    # Catalogue Tests
    path('staff/tests/', LabStaffLabViewSet.as_view({'get': 'tests_list', 'post': 'tests_create'})),
    path('staff/tests/<int:pk>/', LabStaffLabViewSet.as_view({'get': 'tests_retrieve', 'patch': 'tests_update', 'delete': 'tests_destroy'})),
    # Demandes
    path('staff/requests/', LabStaffLabViewSet.as_view({'get': 'requests_list'})),
    path('staff/requests/<int:pk>/', LabStaffLabViewSet.as_view({'get': 'requests_retrieve'})),
    path('staff/requests/<int:pk>/status/', LabStaffLabViewSet.as_view({'patch': 'update_status'})),
    path('staff/requests/<int:pk>/result/', LabStaffLabViewSet.as_view({'get': 'get_result'})),

    path('staff/requests/<int:pk>/results/', LabStaffLabViewSet.as_view({'post': 'create_update_results', 'put': 'create_update_results'})),
    path('staff/requests/<int:pk>/results/validate/', LabStaffLabViewSet.as_view({'post': 'validate_results'})),
    # Stats
    path('staff/stats/', LabStaffLabViewSet.as_view({'get': 'stats'})),

    # ====================== PATIENT ======================
    path('patient/requests/', PatientLabViewSet.as_view({'get': 'requests_list'})),
    path('patient/requests/<int:pk>/', PatientLabViewSet.as_view({'get': 'requests_retrieve'})),
    path('patient/requests/<int:pk>/result/', PatientLabViewSet.as_view({'get': 'request_result'})),

    # ====================== SUPER ADMIN ======================
    # Labs
    path('superadmin/labs/', SuperAdminLabViewSet.as_view({'get': 'labs_list', 'post': 'labs_create'})),
    path('superadmin/labs/<int:pk>/', SuperAdminLabViewSet.as_view({'get': 'labs_retrieve', 'patch': 'labs_update', 'delete': 'labs_destroy'})),
    # Tests
    path('superadmin/tests/', SuperAdminLabViewSet.as_view({'get': 'tests_list', 'post': 'tests_create'})),
    path('superadmin/tests/<int:pk>/', SuperAdminLabViewSet.as_view({'get': 'tests_retrieve', 'patch': 'tests_update', 'delete': 'tests_destroy'})),
    # Requests
    path('superadmin/requests/', SuperAdminLabViewSet.as_view({'get': 'requests_list'})),
    path('superadmin/requests/<int:pk>/', SuperAdminLabViewSet.as_view({'get': 'requests_retrieve', 'delete': 'requests_destroy'})),
    # Results (Lecture globale admin)
    path('superadmin/results/', SuperAdminLabViewSet.as_view({'get': 'results_list'})),
    path('superadmin/results/<int:pk>/', SuperAdminLabViewSet.as_view({'get': 'results_retrieve'})),
    # Stats
    path('superadmin/stats/', SuperAdminLabViewSet.as_view({'get': 'stats'})),
]